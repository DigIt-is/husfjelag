# Íslandsbanki Bank Integration Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Íslandsbanki as a second live bank alongside Landsbankinn, covering three capabilities: (1) account transaction sync, (2) retrieve claims, (3) create claims. Introduce a provider-dispatch layer so views/tasks are bank-agnostic.

**Architecture:** Íslandsbanki is **SOAP/XML** (Landsbankinn is REST/JSON), so it needs an entirely separate transport and auth model. Auth is WS-Security `UsernameToken` (per-association username + cleartext password over TLS) **plus** mandatory X.509 message signing using Húsfjelag's single shared Búnaðarskilríki. We build against Íslandsbanki's **proprietary** SOAP suite (`yfirlit.wsdl`, `krofur.wsdl`), not the standardized cross-bank schema. A new dispatch layer routes calls to the correct provider based on `AssociationBankSettings.bank`.

**Tech Stack:** Python `zeep` (SOAP client) + `xmlsec` (WS-Security BinarySignature), Fernet for per-association password encryption, the existing `cryptography` PFX loader extended to export PEM key/cert for signing, Celery for scheduled sync, Django REST Framework endpoints, React + MUI frontend (per `docs/style.md`).

---

## Decisions (locked during brainstorming)

1. **Credentials — per association.** Each húsfélag supplies its own Íslandsbanki web-service username/password. Stored encrypted per-association.
2. **Signing certificate — one shared app-level cert.** Reuse Húsfjelag's existing `BUNADARSKILRIKI` PFX (Doppler) for XML message signing. **No new `ISB_BUNADARSKILRIKI` env var.** Dev override, if ever needed, happens in Doppler dev variables.
3. **Routing — dispatch layer.** Add a `get_provider(settings)` resolver + a `BankProvider` ABC that matches reality. Views/tasks stop importing `landsbankinn` directly. The dead PSD2 `base_provider.py` ABC is replaced.
4. **Accounts — manual entry + Yfirlit fetch.** Neither the proprietary nor standardized Íslandsbanki service enumerates accounts. The CFO enters the account number; `SaekjaReikningsyfirlit` fetches its transactions.
5. **SOAP suite — proprietary** (`yfirlit` + `krofur`). Matches the Tengistrengir onboarding path and the test environment; the dispatch layer hides per-bank wire formats, so cross-bank uniformity buys little.

---

## WSDL Reference (grounded from `ws-test.isb.is/adgerdirv1/wsdl/`)

**`yfirlit.wsdl`**
- `SaekjaReikningsyfirlit(banki: int, hofudbok: int, reikningsnumer: int, fra: dateTime, til: dateTime, faerslaFra: int, faerslaTil: int)` → list of `ReikningsyfirlitFaersla`.
  - `ReikningsyfirlitFaersla` fields: `Faerslulykill`, `Textalykill`, `Tilvisunarnumer`, `Vaxtadagur`, `Sedilnumer`, `Hreyfingardagur`, `Upphaed` (decimal), `Innlausnarbanki`, `Bunkanumer`, `Stada` (decimal).
- `SaekjaGengi(...)` → exchange rates (out of scope).
- **No account-enumeration operation.**

**`krofur.wsdl`**
- Create: `StofnaKrofu` (single), `StofnaKrofubunka` / `StofnaKrofuskra` (batch — out of scope).
- Query: `SaekjaKrofu` (one), `SaekjaKrofur` (list), `SaekjaKrofubunkasvar`, `SaekjaKrofuskrasvar`, `SaekjaKrofuupplysingaskra`.
- Payment status: `SaekjaGreidsluKrofu`, `SaekjaGreidslurKrafna`, `SaekjaGreidslurKrafnaTimabil`.
- Modify/cancel: `BreytaKrofu`, `FellaKrofu`, `EndurvekjaKrofu` (out of scope for now).
- `Krafa` fields: `KennitalaKrofuhafa`, `KennitalaGreidanda`, `Gjalddagi`, `Eindagi`, `Nidurfellingardagur`, `Upphaed`, `Tilvisun`, `Vidskiptanumer`, `Drattavaxtaprosenta`, `Drattavaxtaregla`, `Vanskilagjald1/2`, `TilkynningarOgGreidslugjald1/2`, `Afslattur1/2`, `Afslattarkodi`.

Base URLs: test `https://ws-test.isb.is/adgerdirv1/`, prod `https://ws.isb.is/adgerdirv1/`.
Operation endpoints (proprietary, `.asmx`): `yfirlit.asmx`, `krofur.asmx`.

---

## Scope

**In scope**
- Transaction sync via `SaekjaReikningsyfirlit`.
- Retrieve claims via `SaekjaKrofu` (single status) and `SaekjaKrofur` (list).
- Create claims via `StofnaKrofu`.
- Provider dispatch refactor (Landsbankinn wrapped, behavior unchanged).
- Per-association ISB settings + frontend to enter them.

**Out of scope (available later)**
- `FellaKrofu` / `BreytaKrofu` / `EndurvekjaKrofu` (cancel/modify/revive).
- Payments (`greidslur`), batch claim creation, exchange rates, foreign payments.
- Account auto-enumeration (no such op exists).

---

## Transport & Auth

### SOAP client
- **`zeep`** parses the WSDLs and marshals complex types.
- One `zeep.Client` per (service, association) call context; the WSDL can be cached locally (vendored) to avoid a network fetch on every call.

### WS-Security
- **`UsernameToken`** — per-association `isb_username` + decrypted `isb_password`, `PasswordText` (cleartext over TLS, per the Sambankaskema spec).
- **`BinarySignature`** — X.509 message signing with the shared Búnaðarskilríki. `zeep.wsse.Signature` requires **`xmlsec`**.
- Combine both handlers on the client (`wsse=[UsernameToken(...), Signature(...)]`).

### Certificate handling (`cert.py`)
- Reuse the existing `BUNADARSKILRIKI` / `BUNADARSKILRIKI_PWD` env vars — **no new vars**.
- Add a loader that extracts the **private key + certificate as PEM** from the same PFX (xmlsec/`zeep.wsse.Signature` needs key/cert files or PEM buffers, not raw PFX bytes). Cache in-process like the existing `load()`. Nothing written to disk where avoidable; if xmlsec requires file paths, use short-lived temp files with restrictive permissions, cleaned up after signing (decide during the Phase 0 spike).

### Risk — #1 to de-risk first
`xmlsec` (python-xmlsec) needs native `libxmlsec1`. Modern releases ship self-contained manylinux wheels, so `pip install xmlsec` **should** work on DigitalOcean's buildpack without apt — but this is unverified for our deploy. **Phase 0 spike** signs one real `SaekjaReikningsyfirlit` against `ws-test.isb.is` and confirms it both runs locally and deploys on DO. Fallbacks, in order of preference: (a) `signxml` (pure-Python, over `lxml`+`cryptography`) injected through a custom zeep wsse plugin; (b) switch the DO backend to a Dockerfile deploy so system libs are installable.

---

## Provider Dispatch (the refactor)

Replace `associations/banks/base_provider.py` (dead PSD2/OAuth ABC) with an interface matching what the app actually calls:

```python
class BankProvider(ABC):
    def discover_and_sync_accounts(self, association, settings) -> dict: ...
    def sync_account_transactions(self, account, from_date, to_date, settings) -> dict: ...
    def create_claim(self, collection, settings) -> dict: ...
    def get_claim_status(self, claim_id, settings) -> str: ...
    def list_claims(self, association, settings, **filters) -> list[dict]: ...
    def fetch_incoming_claims(self, association, settings, due_date_from) -> list[dict]: ...
```

- **Every method takes the `AssociationBankSettings` object** so each provider pulls its own creds/cert. This normalizes today's mismatched `(association_id, api_key)` signatures.
- New resolver: `get_provider(settings) -> BankProvider`, keyed on `settings.bank` (`BankProvider.LANDSBANKINN` / `ISLANDSBANKI`; `ARION` raises `NotImplementedError`).
- **`LandsbankinnProvider`** is a **thin wrapper** over the existing `landsbankinn.py` module functions — it adapts `settings` → `(association_id, api_key)` and calls them unchanged. No rewrite; existing `landsbankinn.py` and its tests stay intact.
- **`IslandsbankiProvider`** is the new SOAP implementation (replaces the `NotImplementedError` stub in `islandsbanki.py`).
- [`views.py`](../../../HusfelagPy/associations/banks/views.py) and [`tasks.py`](../../../HusfelagPy/associations/banks/tasks.py) stop importing `landsbankinn` directly and call `get_provider(settings).<method>(...)`. Landsbankinn-specific error parsing (`_parse_landsbankinn_error`) becomes a provider concern or a per-bank error mapper.

---

## Data Model Changes

### `AssociationBankSettings` (new fields)
```python
isb_username      = CharField(max_length=64, blank=True)   # WS-Security UsernameToken user
isb_password      = TextField(blank=True)                  # Fernet-encrypted
isb_claim_account = CharField(max_length=32, blank=True)   # claimant collection account (ledger 66) for StofnaKrofu
```
- Add `get_isb_password()` / `set_isb_password()` helpers mirroring `get_api_key()` / `set_api_key()`.
- Existing Landsbankinn fields (`api_key`, `template_id`) are untouched.
- One migration adds the three nullable/blank fields (no data backfill).

### `BankAccount` — no changes
- `account_number` "XXXX-XX-XXXXXX" is parsed into `banki` (XXXX) / `hofudbok` (XX) / `reikningsnumer` (XXXXXX) for `SaekjaReikningsyfirlit`. No new columns.

### `BankClaim` — no changes
- Íslandsbanki has no single opaque claim ID; identity is the composite **ClaimKey** (`KennitalaKrofuhafa` + `Account` + `Gjalddagi`). Store it in `claim_id` (CharField(64)) as a delimited string (e.g. `"{ssn}:{account}:{yyyy-mm-dd}"`) so `get_claim_status` can reconstruct the key for `SaekjaKrofu`.

### `BankApiAuditLog` — reused as-is
- For SOAP: `endpoint` = operation name (e.g. `SaekjaReikningsyfirlit`), `http_method` = `"POST"`, `status_code` = `200` on success or the SOAP fault's mapped code on failure.

---

## Data Mapping

### Transactions: `ReikningsyfirlitFaersla` → `Transaction`
| Transaction field | Source |
|---|---|
| `date` | `Hreyfingardagur` |
| `amount` | `Upphaed` (→ `Decimal(str(...))`) |
| `reference` | `Tilvisunarnumer` |
| `payer_kennitala` | `Tilvisunarnumer` when it parses as a kennitala, else `""` |
| `description` | `Textalykill` (transaction text key), optionally joined with `Sedilnumer` |
| `source` | `TransactionSource.BANK_SYNC` |
| `external_id` | **composite hash** of `account_number + Hreyfingardagur + Upphaed + Tilvisunarnumer + Bunkanumer` |

- **Dedup:** there is no bank-provided globally-unique transaction id. Compute a stable composite hash for `external_id` and dedup on it exactly as Landsbankinn dedups on `tx.id`. Document this clearly — two genuinely identical same-day transactions (same amount/reference/batch) would collide; acceptable, matches how a human reads a statement.
- **Pagination:** `SaekjaReikningsyfirlit` supports `faerslaFra`/`faerslaTil` (entry range). Page through in blocks if the response is capped; otherwise a single call per date window.

### Claims: `Collection` → `StofnaKrofu(Krafa)`
| Krafa field | Source |
|---|---|
| `KennitalaKrofuhafa` | `collection.budget.association.ssn` |
| `KennitalaGreidanda` | `collection.payer.kennitala` |
| `Upphaed` | `collection.amount_total` |
| `Gjalddagi` | last day of `(budget.year, collection.month)` |
| `Eindagi` | same as `Gjalddagi` (mirrors Landsbankinn) |
| `Tilvisun` | `"Húsfélagsgjald MM/YYYY"` |
| `Account` (ClaimKey) | `settings.isb_claim_account` |
| fees / interest / discount | all zeroed (mirrors Landsbankinn `create_claim`) |

- On success, persist a `BankClaim` with `claim_id` = composite ClaimKey string.

### Retrieve: `SaekjaKrofu` / `SaekjaKrofur`
- `get_claim_status(claim_id, settings)`: split the composite `claim_id`, call `SaekjaKrofu`, map the returned claim state → `BankClaimStatus` (`UNPAID` / `PAID` / `CANCELLED`).
- `list_claims(association, settings, **filters)`: call `SaekjaKrofur` filtered by claimant SSN; normalize to the same dict shape `fetch_incoming_claims` returns today so the frontend is unchanged.

---

## API / Views / Tasks

- **Settings endpoint:** the existing bank-settings write path (`views.py`, currently keyed to `bank` in the request body) accepts `isb_username`, `isb_password`, `isb_claim_account` when `bank == islandsbanki`; validates presence before allowing sync/claim actions.
- **Bank status endpoint** (`GET /associations/{id}/bank/status`): `configured` becomes true when the ISB fields are present (not just a row existing).
- **Sync / create-claim / status views:** switch from direct `landsbankinn` imports to `get_provider(settings).<method>()`. Behavior for existing Landsbankinn associations is byte-for-byte unchanged (guarded by tests).
- **Celery tasks** (`tasks.py`): the account-sync and claim-status-refresh tasks resolve the provider per association instead of importing `landsbankinn`.

---

## Frontend (per `docs/style.md`)

- Bank settings page: when Íslandsbanki is the selected bank, show fields for **username**, **password** (write-only; never returned in cleartext), and **claim account**. Landsbankinn keeps its `api_key` / `template_id` fields.
- Account setup: a "Bæta við reikningi" (add account) input for the ISB account number, since there's no auto-discovery. Validation attempts one statement fetch and reports success/failure.
- No new routes; extends the existing bank settings + accounts UI.

---

## Testing

- **Unit tests** mock the `zeep.Client` (or its transport) with fixture SOAP responses — no network in CI. Cover: transaction mapping + composite dedup, claim body construction, ClaimKey round-trip, status mapping, error/fault handling, provider dispatch selecting the right implementation.
- **Provider-dispatch tests:** `get_provider(settings)` returns the correct class; Landsbankinn wrapper delegates to the existing module functions unchanged.
- **One opt-in live integration test** against `ws-test.isb.is` using the test creds/cert, `skipif` the ISB test env vars are absent (so CI stays green without secrets).
- Reuse the patterns in `associations/banks/tests/`.

---

## Configuration / Deployment

- **Settings** (`config/settings/base.py`): `BANK_ISLANDSBANKI_YFIRLIT_URL`, `BANK_ISLANDSBANKI_KROFUR_URL` (default to the `ws-test` sandbox in dev, `ws.isb.is` in prod), `BANK_ISLANDSBANKI_EMAIL` (parity with `BANK_LANDSBANKINN_EMAIL` if the email/manual fallback flow applies).
- **Doppler:** reuse `BUNADARSKILRIKI` / `BUNADARSKILRIKI_PWD`. Per-association `isb_username` / `isb_password` are entered through the app, not Doppler.
- **Dependencies:** add `zeep` and `xmlsec` (or `signxml` per the spike outcome) to `pyproject.toml`; regenerate `poetry.lock`.
- No change to the DO run command; migrations apply automatically on deploy as today.

---

## Phasing (for the implementation plan)

0. **Spike** — signed `SaekjaReikningsyfirlit` against sandbox with zeep + xmlsec + shared PFX; verify local run **and** DO deploy path. Decide xmlsec-vs-signxml here.
1. **Foundation** — `AssociationBankSettings` fields + migration; PEM export in `cert.py`; new `BankProvider` ABC + `get_provider` dispatch + `LandsbankinnProvider` wrapper; switch views/tasks to the dispatcher. **No behavior change** for existing associations (regression-tested).
2. **Transaction sync** — `IslandsbankiProvider.sync_account_transactions` via `SaekjaReikningsyfirlit`; mapping + composite dedup; wire into the sync task.
3. **Retrieve claims** — `get_claim_status` / `list_claims` via `SaekjaKrofu` / `SaekjaKrofur`.
4. **Create claims** — `create_claim` via `StofnaKrofu`; persist `BankClaim` with composite ClaimKey.
5. **Frontend** — ISB settings fields + manual account add, per `docs/style.md`.

---

## Open Questions / Assumptions

- Exact `banki` / `hofudbok` / `reikningsnumer` decomposition and the `StofnaKrofu` fee/interest/discount envelope will be finalized against the WSDL types and the test claims during Phase 2–4.
- The `SaekjaReikningsyfirlit` pagination cap (whether `faerslaFra`/`faerslaTil` is mandatory or convenience) is confirmed in the spike.
- The claimant claim account (`isb_claim_account`) format (whether it is the same XXXX-XX-XXXXXX form or a ledger-66 claim number) is confirmed against a real test claim.
