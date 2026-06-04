# Landsbankinn API Integration

## Overview

Húsfjelagið integrates with Landsbankinn's Open Banking API to:
1. Discover bank accounts belonging to an association
2. Import transactions automatically (daily, via Celery)
3. Send monthly housing fee claims (kröfur) to apartment owners — either directly via API or via bank service email

The integration uses **mTLS** (mutual TLS) for all API calls, meaning both parties authenticate with certificates. Our certificate is the Búnaðarskilríki (a PFX/PKCS#12 file issued to Húsfjelagið ehf.), and each association supplies its own **API key** (OAuth client ID) obtained from Landsbankinn.

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `BANK_LANDSBANKINN_AUTH_URL` | Token endpoint, e.g. `https://mtls-auth.landsbankinn.is/connect/token` |
| `BANK_LANDSBANKINN_API_BASE` | API root, e.g. `https://apisandbox.landsbankinn.is/api` |
| `BANK_LANDSBANKINN_EMAIL` | Email address to notify when using BANK_SERVICE claim mode |
| `BUNADARSKILRIKI` | Base64-encoded `.p12` PFX certificate file (Búnaðarskilríki) |
| `BUNADARSKILRIKI_PWD` | Password for the PFX file |
| `BANK_FERNET_KEY` | Fernet key used to encrypt `api_key` at rest and access tokens in the DB |

All stored in Doppler, never on disk or in `.env`.

Sandbox vs production: swap `AUTH_URL` and `API_BASE` — the sandbox uses `apisandbox.landsbankinn.is`, production uses `api.landsbankinn.is` (or the equivalent mTLS subdomain).

---

## Data Model

```
Association
  └── AssociationBankSettings   (bank, api_key [encrypted], template_id, claim_mode, last_sync_at)
  └── BankTokenCache            (bank, association FK, access_token [encrypted], expires_at)
  └── BankAccount               (account_number, is_connected, bank_status, opening_balance, opening_balance_date)
        └── Transaction         (date, amount, description, external_id, payer_kennitala)
  └── Budget
        └── Collection
              └── BankClaim     (claim_id, status, due_date, sent_at, synced_at)
```

**`AssociationBankSettings` fields:**
- `api_key` — Fernet-encrypted Landsbankinn client ID. Access via `get_api_key()` / `set_api_key()`.
- `template_id` — Landsbankinn claim template ID (required for `DIRECT_API` mode only).
- `claim_mode` — `DIRECT_API` (kröfur sent via API) or `BANK_SERVICE` (áætlun emailed to bank).
- `last_sync_at` — updated after every successful transaction sync.

**`BankTokenCache`:**
- One row per `(bank, association)`. Stores the OAuth access token Fernet-encrypted.
- Checked before every API call; refreshed 60 s before expiry.
- Rows are ephemeral — safe to delete; tokens are re-fetched automatically.

---

## API Authentication

### Step 1 — Get access token

`POST {BANK_LANDSBANKINN_AUTH_URL}` (form-encoded, with Búnaðarskilríki PFX attached as client certificate via `requests_pkcs12`):

```
grant_type                 = client_credentials
client_id                  = <association API key>
scope                      = external
access_token_configuration = external_client
```

Response:
```json
{ "access_token": "eyJ...", "expires_in": 1200 }
```

The `client_id` is **per-association** — each association applies separately and receives its own API key. The Búnaðarskilríki is Húsfjelagið's certificate as service provider (Þjónustuaðili); it is shared across all associations.

Token caching: `get_access_token(association_id, api_key)` checks `BankTokenCache` by `(bank, association_id)`. If a valid token exists (expires more than 60 s from now), it is returned as-is. Otherwise a new token is fetched, Fernet-encrypted, and stored.

### Step 2 — API request headers

Every API call requires:
```
Authorization: Bearer <access_token>
apikey:        <association api_key (client_id)>
```

Internal helpers `_get`, `_get_raw`, `_post` in `landsbankinn.py` accept `(path, association_id, api_key, ...)` and handle auth automatically.

---

## API Endpoints

### Accounts — `GET /Accounts/Accounts/v1/Accounts`

Returns all accounts the API key has read access to.

**Response:**
```json
{
  "data": [
    {
      "bban": "010126000001",
      "iban": "IS420101260000010101302989",
      "ownerNationalId": "0101302989",
      "product": { "id": "300106", "type": "currentAccount", "name": "Einkareikningur" },
      "currency": "ISK",
      "status": "open"
    }
  ]
}
```

Key fields:
- `bban` — 12-digit account number. We format it as `XXXX-XX-XXXXXX` for storage.
- `ownerNationalId` — must match `association.ssn` to be considered a valid account.
- `status` — `"open"` or `"closed"`. Only open accounts with matching SSN are connected.

### End-of-Day Balance — `GET /Accounts/Accounts/v1/EndOfDayFinancials`

Returns end-of-day balances for all accounts belonging to an owner on a specific date. Used once when a new account is connected to seed the opening balance (Dec 31 of the previous year).

Query parameters: `date` (ISO), `ownerNationalId`, `id` (bban).

Note: despite the `id` filter, the API returns **all accounts** for the owner — filter the response list by `id == bban`.

**Response:**
```json
{
  "data": [
    {
      "id": "010126000001",
      "date": "2025-12-31",
      "balance": { "amount": 1000, "currency": "ISK" }
    }
  ]
}
```

`balance.amount` is stored as `BankAccount.opening_balance`. Current displayed balance = `opening_balance + sum(transactions.amount)`.

### Transactions — `GET /Accounts/Accounts/v1/Accounts/{bban}/Transactions`

Query parameters: `bookingDateFrom`, `bookingDateTo`, `page`, `perPage` (we use 1000).

Pagination: total page count comes from the `X-Paging-TotalPages` response **header** (primary). Falls back to `totalPages` in the JSON body, then 1.

**Response:**
```json
{
  "data": [
    {
      "id": "12281818137",
      "amount": 10000,
      "bookingDate": "2026-03-10",
      "reference": "0101303019",
      "debtorNationalId": "0101302989",
      "debtorName": "Gunna Gunnarsdóttir",
      "creditorNationalId": "0101303019",
      "creditorName": "Jón Jónsson"
    }
  ],
  "totalPages": 1
}
```

Field mapping to our `Transaction` model:

| API field | Our field | Notes |
|---|---|---|
| `id` | `external_id` | Used to detect duplicates on re-sync |
| `bookingDate` | `date` | Settlement date |
| `amount` | `amount` | Positive = income, negative = expense |
| `creditorName` | `description` | Who received the money |
| `reference` | `reference` | Payment reference (often a kennitala) |
| `debtorNationalId` OR `creditorNationalId` | `payer_kennitala` | Debtor for income, creditor for expenses |

### Claims (Kröfur) — `POST /Claims/Claims/v1/Claims`

Creates a monthly payment request in the debtor's online banking. Used in `DIRECT_API` mode only.

Full request body (see `create_claim()` in `landsbankinn.py`):

```json
{
  "templateId": "A37",
  "payorNationalId": "0101302989",
  "principalAmount": 15000.0,
  "dueDate": "2026-05-31",
  "finalDueDate": "2026-05-31",
  "autoCancellation": "2030-05-31",
  "description": "Húsfélagsgjald 05/2026",
  "paymentSequenceType": "none",
  "isPartialPaymentAllowed": false,
  "defaultCharge": {
    "isPercentage": false,
    "dateReference": "dueDate",
    "firstDefaultCharge":  { "numberOfDays": 0, "value": 0 },
    "secondDefaultCharge": { "numberOfDays": 0, "value": 0 }
  },
  "discount": {
    "isPercentage": false,
    "dateReference": "dueDate",
    "firstDiscount":  { "numberOfDays": 0, "value": 0 },
    "secondDiscount": { "numberOfDays": 0, "value": 0 }
  },
  "noticeAndPaymentFee": { "printingFee": 0, "paperlessFee": 0 },
  "notifications": {
    "sendLatePaymentNotification": false,
    "sendSecondaryCollectionWarning": false
  },
  "secondaryCollection": {
    "collectionCompanyNationalId": "<association SSN>",
    "gracePeriodDays": 0
  }
}
```

Notes:
- `templateId` comes from `AssociationBankSettings.template_id` — the association creates this in Landsbankinn Netbanki under "Innheimta".
- `dueDate` and `finalDueDate` are both set to the last day of the collection month.
- `autoCancellation` is set 4 years after `dueDate`.
- `discount` and `secondaryCollection` are required in the payload even with zero values — removing them causes a 400 error.

**Success response:**
```json
{ "data": { "id": "013366781205441218001020260516" } }
```

**Error response (400):**
```json
{
  "errors": { "templateId": ["Kröfusniðmát fannst ekki eða er óvirkt"] },
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
  "title": "One or more validation errors occurred.",
  "status": 400
}
```

`_parse_landsbankinn_error(exc)` in `banks/views.py` extracts the human-readable message from `errors` fields for display in the UI and Bugsnag.

Known issue: Landsbankinn returns **HTTP 451 Unavailable For Legal Reasons** when claim creation is not yet authorized for a given template/association combination. This is a Landsbankinn-side configuration issue, not a code bug. Reference: `6321984959025990060-A`.

### Claim Status — `GET /Claims/Claims/v1/Claims/{claim_id}`

Returns the current status of a single claim. Used by `get_claim_status()` when polling.

```json
{ "status": "paid" }
```

Possible status values: `unpaid`, `paid`, `cancelled`.

### Incoming Claims — `GET /Claims/Claims/v1/Claims`

Returns claims where the association is the **payor** (bills the association owes to others). Used in the Association page to show outstanding bills.

Query parameters: `payorNationalId`, `status=unpaid`, `dueDateFrom` (ISO date).

Response shape same as claim list. `fetch_incoming_claims()` filters out `paid` and `cancelled` entries from the response and sorts by `dueDate` ascending.

Returned fields per claim: `id`, `claimantName`, `dueDate`, `totalAmountDue` (or `principal.amount` as fallback), `collectionStatus`, `billNumber`, `description`.

---

## Claim Modes

`AssociationBankSettings.claim_mode` controls how monthly housing fees are collected:

### `DIRECT_API` (default)

- `template_id` must be set on `AssociationBankSettings`.
- Chair/CFO clicks "Senda allar kröfur" in Collection, or "Senda kröfu" per row.
- `SendAllClaimsView` / `SendClaimView` call `create_claim()` which POSTs to `/Claims/Claims/v1/Claims`.
- A `BankClaim` row is created locally with the returned `claim_id`.
- `sync_claim_statuses` (Celery beat) polls the API and marks collections PAID when confirmed.

### `BANK_SERVICE`

- No `template_id` required.
- Send-claim buttons are hidden in the Collection UI.
- Chair/CFO activates the annual budget, then clicks "Senda áætlun til Landsbankans" on the Budget page.
- `NotifyBudgetView` sends an HTML email with all budget line items to `BANK_LANDSBANKINN_EMAIL`.
- Landsbankinn generates and mails monthly payment slips to owners independently.

---

## Sync Flow (Celery Tasks)

### Daily transaction sync

`sync_all_associations` (Celery beat, daily) → dispatches `sync_transactions(association_id)` per association.

`sync_transactions`:
1. Loads `AssociationBankSettings`; skips if missing or no `api_key`.
2. Calls `discover_and_sync_accounts` — creates/updates `BankAccount` records; fetches opening balance for new accounts.
3. For each connected account: calls `sync_account_transactions` with `from_date = last_tx_date - 1 day` (or Jan 1 current year on first run).
4. Updates `last_sync_at` on success.

### Daily claim status sync

`sync_all_claim_statuses` (Celery beat, daily) → dispatches `sync_claim_statuses(association_id)` per association with UNPAID claims.

`sync_claim_statuses`:
1. Fetches all UNPAID `BankClaim` rows for the association.
2. Calls `GET /Claims/Claims/v1/Claims` with `claimantNationalId=<assoc SSN>` and `dueDateFrom=<earliest unpaid due date>` — gets the set of still-unpaid claim IDs.
3. Any UNPAID `BankClaim` not in that set has changed — fetches its status individually via `get_claim_status()`.
4. If `paid`: updates `BankClaim.status = PAID` and `Collection.status = PAID`.
5. If `cancelled`: updates `BankClaim.status = CANCELLED`.

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| Token expired mid-request | 60 s early-refresh buffer prevents this. If it occurs, `HTTPError` is raised, logged to Bugsnag, and the task is aborted. |
| `ownerNationalId` mismatch | Account gets `is_connected=False` — never synced. |
| Closed account | Same as above. |
| Duplicate transaction | `external_id` checked before insert — re-syncing the same date range is safe. |
| Account discovery failure | Logged to Bugsnag; sync continues for previously-connected accounts. |
| No API key | Task returns `{"skipped": True, "reason": "api_key_missing"}`. |
| Claim creation 400 | `_parse_landsbankinn_error()` extracts field-level messages for UI display + Bugsnag. |
| Claim creation 451 | API access not yet authorized for this template/association. Landsbankinn-side issue; see ref `6321984959025990060-A`. |
| Opening balance fetch failure | `opening_balance` stays `0`, `opening_balance_date` stays `null`. Account is still usable. |

---

## How to Add the Next Bank

Adding support for a new bank (Íslandsbanki, Arion, or other) follows this pattern:

### 1. Backend module

Create `HusfelagPy/associations/banks/<bankname>.py` mirroring the structure of `landsbankinn.py`:

- `BANK = "BANKNAME"` constant (must match the `BankProvider` value).
- `get_access_token(association_id, api_key) -> str` — handles whatever auth the bank uses (OAuth, API key header, session, etc.). Cache tokens in `BankTokenCache` using the same `(BANK, association_id)` unique key and Fernet encryption.
- `_get(path, association_id, api_key, **params) -> dict` — authenticated GET.
- `_post(path, association_id, api_key, body) -> dict` — authenticated POST.
- `discover_and_sync_accounts(association, api_key) -> dict` — creates/updates `BankAccount` rows. Must convert the bank's account format to our `XXXX-XX-XXXXXX` format.
- `sync_account_transactions(account, from_date, to_date, api_key) -> dict` — fetches and upserts `Transaction` rows. Use the bank's transaction ID as `external_id` for deduplication.
- `fetch_opening_balance(association_id, api_key, ...)` — optional; fetch Dec 31 balance for new accounts.
- `create_claim(collection, settings_obj) -> dict` — only if the bank has a claims API.
- `get_claim_status(claim_id, association_id, api_key) -> str` — only if the bank has claim polling.

### 2. Add to `BankProvider`

In `associations/models.py`:
```python
class BankProvider(models.TextChoices):
    LANDSBANKINN = "landsbankinn", "Landsbankinn"
    ISLANDSBANKI = "islandsbanki", "Íslandsbanki"   # ← add
    ARION        = "arion",        "Arion"
```

No migration needed — `BankProvider` is just a TextChoices validator, not a DB-level constraint.

### 3. Wire into tasks

In `associations/banks/tasks.py`, `sync_transactions` and `sync_claim_statuses` currently import `landsbankinn` directly. Refactor to dispatch based on `bank_settings.bank`:

```python
if bank_settings.bank == BankProvider.LANDSBANKINN:
    from associations.banks.landsbankinn import discover_and_sync_accounts, sync_account_transactions
elif bank_settings.bank == BankProvider.ISLANDSBANKI:
    from associations.banks.islandsbanki import discover_and_sync_accounts, sync_account_transactions
```

Or introduce a `get_bank_module(bank)` helper that returns the right module.

### 4. Environment variables

Add the bank-specific vars to `config/settings/base.py` and `.env.example`, following the `BANK_<BANKNAME>_*` naming convention.

### 5. Frontend

In `BankSettingsPage.js`:
- The `BANKS` array already lists Íslandsbanki and Arion — the picker is already there.
- Replace the "not yet implemented" `Alert` in the `else` branch of the bank-specific setup section with the new bank's setup UI (API key input, any bank-specific fields).

### 6. Credentials and certificate

Each bank will have its own auth flow — check whether it requires:
- mTLS (like Landsbankinn) — store certificate in Doppler, load via a `cert.py` module
- API key only — store in `AssociationBankSettings.api_key` (Fernet-encrypted, same pattern)
- OAuth client credentials without mTLS — token caching works the same way

### Key invariants to maintain across banks

- `api_key` on `AssociationBankSettings` is always Fernet-encrypted. Never store or log plaintext.
- `BankTokenCache` is keyed by `(bank, association_id)` — one cached token per association per bank.
- `external_id` on `Transaction` is globally unique per bank account — always check before inserting.
- `is_connected` on `BankAccount` controls whether sync runs — always set it based on the bank's validity criteria (owner match + open status or equivalent).
- Bugsnag `context` strings follow the pattern `"celery:sync_transactions"`, `"send_claim"` etc. — keep them consistent for searchability.
