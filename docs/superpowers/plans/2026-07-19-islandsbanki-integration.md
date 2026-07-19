# Íslandsbanki Bank Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Íslandsbanki as a second live bank (transaction sync, retrieve claims, create claims) behind a new provider-dispatch layer, using SOAP.

**Architecture:** Íslandsbanki is SOAP/XML with WS-Security (`UsernameToken` + mandatory X.509 signing). All live SOAP/signing is isolated in one thin, mockable module (`isb_soap.py`) whose internals are finalized by the Phase 0 spike; every other task tests against that seam mocked, so the spike outcome never invalidates the plan. A `BankProvider` ABC + `get_provider(settings)` resolver route views/tasks to the right bank. Landsbankinn is wrapped unchanged.

**Tech Stack:** Python `zeep` (SOAP), `xmlsec` (or `signxml` per spike), `cryptography` (PFX→PEM), Fernet, Celery, Django REST Framework, React + MUI.

Spec: `docs/superpowers/specs/2026-07-19-islandsbanki-bank-integration-design.md`

## Global Constraints

- Backend commands run wrapped: `doppler run -- poetry run python3 manage.py ...` (never bare `python`).
- Never `Response(None)` — use `Response({"detail": "..."}, status=...)`.
- All frontend API calls go through `src/api.js:apiFetch()`; frontend follows `docs/style.md`; UI copy is Icelandic.
- Secrets/creds are Fernet-encrypted via `associations.models._get_fernet()`; passwords are never returned in cleartext by any endpoint.
- One shared `BUNADARSKILRIKI` PFX (Doppler) is reused for Íslandsbanki signing — **do not add `ISB_BUNADARSKILRIKI`**.
- Íslandsbanki SOAP suite is **proprietary** (`yfirlit`, `krofur`); base URLs test `https://ws-test.isb.is/adgerdirv1/`, prod `https://ws.isb.is/adgerdirv1/`.
- Next migration number is `0040`.
- Write operations require `_require_chair_or_cfo`; behavior for existing Landsbankinn associations must stay byte-for-byte unchanged.

---

## File Structure

**Create:**
- `associations/banks/provider_base.py` — `BankProvider` ABC (replaces dead `base_provider.py`).
- `associations/banks/dispatch.py` — `get_provider(settings) -> BankProvider`.
- `associations/banks/landsbankinn_provider.py` — thin wrapper adapting existing `landsbankinn.py` functions to the ABC.
- `associations/banks/isb_soap.py` — the SOAP/signing seam (spike-finalized): `invoke(...)`, client construction, audit logging.
- `associations/banks/isb_mappers.py` — pure functions: account parsing, transaction mapping, composite ids, claim-key build/parse, claim payload, status mapping.
- `associations/banks/tests/test_isb_mappers.py`, `test_provider_dispatch.py`, `test_isb_provider.py`, `test_settings_isb_fields.py`.

**Modify:**
- `associations/models.py` — `AssociationBankSettings` ISB fields + helpers.
- `associations/banks/cert.py` — `load_pem()`.
- `associations/banks/islandsbanki.py` — implement `IslandsbankiProvider`.
- `associations/banks/views.py` — accept ISB settings; route through `get_provider`.
- `associations/banks/tasks.py` — route through `get_provider`.
- `config/settings/base.py` — `BANK_ISLANDSBANKI_*` URLs.
- `pyproject.toml` — add `zeep`, `xmlsec` (or `signxml`).
- `HusfelagJS/src/controlers/BankSettingsPage.js` (+ accounts UI) — ISB fields, manual account add.

**Delete:**
- `associations/banks/base_provider.py` — after `provider_base.py` replaces it (Task 3).

---

## Phase 0 — Spike (de-risk signing + deploy)

### Task 0: xmlsec/zeep signing spike

**This is an investigation task, not TDD. Deliverable: a written decision + the finalized `isb_soap` signing approach. Throwaway code otherwise.**

**Files:**
- Create (throwaway): `scratch/isb_spike.py`
- Modify: `pyproject.toml`

- [ ] **Step 1: Add SOAP deps**

```bash
cd HusfelagPy
poetry add zeep xmlsec
```

- [ ] **Step 2: Write a signed sandbox call**

Create `scratch/isb_spike.py` that: loads the PFX (`associations.banks.cert.load`), extracts PEM key+cert, builds a `zeep.Client` for `https://ws-test.isb.is/adgerdirv1/wsdl/yfirlit.wsdl` with `wsse=[UsernameToken(<test_user>, <test_pwd>), BinarySignature(key, cert, pwd)]`, and calls `SaekjaReikningsyfirlit` for the test account/date range.

```python
# scratch/isb_spike.py — run with: doppler run -- poetry run python3 scratch/isb_spike.py
import os, tempfile
from zeep import Client
from zeep.wsse.username import UsernameToken
from zeep.wsse.signature import BinarySignature
from cryptography.hazmat.primitives.serialization import pkcs12, Encoding, PrivateFormat, NoEncryption, BestAvailableEncryption
from associations.banks import cert as cert_module
import django; os.environ.setdefault("DJANGO_SETTINGS_MODULE","config.settings.dev"); django.setup()

pfx_bytes, pwd = cert_module.load()
key, crt, _ = pkcs12.load_key_and_certificates(pfx_bytes, pwd.encode())
key_pem = key.private_bytes(Encoding.PEM, PrivateFormat.PKCS8, NoEncryption())
crt_pem = crt.public_bytes(Encoding.PEM)
kf = tempfile.NamedTemporaryFile(suffix=".pem", delete=False); kf.write(key_pem); kf.close()
cf = tempfile.NamedTemporaryFile(suffix=".pem", delete=False); cf.write(crt_pem); cf.close()

client = Client(
    "https://ws-test.isb.is/adgerdirv1/wsdl/yfirlit.wsdl",
    wsse=[UsernameToken(os.environ["ISB_TEST_USER"], os.environ["ISB_TEST_PWD"]),
          BinarySignature(kf.name, cf.name)],
)
print(client.service.SaekjaReikningsyfirlit(
    banki=int(os.environ["ISB_TEST_BANKI"]), hofudbok=int(os.environ["ISB_TEST_HB"]),
    reikningsnumer=int(os.environ["ISB_TEST_ACC"]),
    fra="2026-01-01T00:00:00", til="2026-07-19T00:00:00", faerslaFra=0, faerslaTil=0))
```

- [ ] **Step 3: Run locally**

Run: `doppler run -- poetry run python3 scratch/isb_spike.py`
Expected: a non-fault response (a list of `ReikningsyfirlitFaersla`, possibly empty). Any SOAP fault about the signature means the signing shape is wrong — iterate on canonicalization/digest/`BinarySignature` args until accepted.

- [ ] **Step 4: Verify DigitalOcean deploy path**

Push a temporary branch to a DO preview (or run in the DO console): confirm `pip install xmlsec` succeeds in the buildpack and the signed call works from the deployed environment.
- If it works → **decision: zeep + xmlsec**. Record how key/cert are passed (file paths vs buffers).
- If `xmlsec` will not install/build on the buildpack → **fallback A: `signxml`** (`poetry remove xmlsec && poetry add signxml`; sign the envelope via a custom zeep plugin). If signature acceptance is unreachable with signxml → **fallback B: Dockerfile deploy** on DO, keep xmlsec.

- [ ] **Step 5: Record the decision**

Append the "Signing approach" note to the spec's risk section. Keep `zeep` + the chosen signing dep in `pyproject.toml`. **Keep `scratch/isb_spike.py`** — it is the proven reference implementation Task 5 ports from; it is deleted at the end of Task 5, not here.

```bash
git add pyproject.toml poetry.lock docs/superpowers/specs/2026-07-19-islandsbanki-bank-integration-design.md
git commit -m "chore: add zeep + xmlsec; record signing spike outcome"
```

> **SPIKE RESULT (2026-07-19): `zeep` + `xmlsec` (BinarySignature), accepted by the sandbox.** Deps already added. `scratch/isb_spike.py` contains the working `BinarySignatureTokenFirst` + `WsseBundle` classes — Task 5 ports them. DO-deploy verification (Step 4) is still pending and tracked separately; it does not block Tasks 1–4 (bank-agnostic refactor, no xmlsec import).

---

## Phase 1 — Foundation (no behavior change for Landsbankinn)

### Task 1: `AssociationBankSettings` ISB fields

**Files:**
- Modify: `associations/models.py` (class `AssociationBankSettings`, ~line 392)
- Create: `associations/banks/tests/test_settings_isb_fields.py`
- Migration: `associations/migrations/0040_islandsbanki_settings.py` (generated)

**Interfaces:**
- Produces: `AssociationBankSettings.isb_username: str`, `.isb_password: str` (encrypted), `.isb_claim_account: str`, `.get_isb_password() -> str`, `.set_isb_password(plaintext: str) -> None`.

- [ ] **Step 1: Write the failing test**

```python
# associations/banks/tests/test_settings_isb_fields.py
import pytest
from associations.models import Association, AssociationBankSettings

@pytest.mark.django_db
def test_isb_password_roundtrip_and_encrypted():
    a = Association.objects.create(ssn="1234567890", name="Test", address="A", postal_code="101", city="Rvk")
    bs = AssociationBankSettings.objects.create(association=a, bank="islandsbanki",
                                                isb_username="user1", isb_claim_account="0133-26-000001")
    bs.set_isb_password("s3cret")
    bs.save()
    bs.refresh_from_db()
    assert bs.get_isb_password() == "s3cret"
    assert bs.isb_password != "s3cret"          # stored encrypted
    assert bs.isb_username == "user1"
    assert bs.isb_claim_account == "0133-26-000001"

@pytest.mark.django_db
def test_isb_password_empty_returns_blank():
    a = Association.objects.create(ssn="1234567891", name="T2", address="A", postal_code="101", city="Rvk")
    bs = AssociationBankSettings.objects.create(association=a)
    assert bs.get_isb_password() == ""
```

- [ ] **Step 2: Run test to verify it fails**

Run: `doppler run -- poetry run pytest associations/banks/tests/test_settings_isb_fields.py -v`
Expected: FAIL — `isb_username`/`get_isb_password` do not exist.

- [ ] **Step 3: Add fields + helpers**

In `associations/models.py`, inside `AssociationBankSettings` after `template_id`:

```python
    isb_username      = models.CharField(max_length=64, blank=True)   # WS-Security UsernameToken user
    isb_password      = models.TextField(blank=True)                  # Fernet-encrypted
    isb_claim_account = models.CharField(max_length=32, blank=True)   # claimant collection account (ledger 66)
```

After `set_api_key`:

```python
    def get_isb_password(self) -> str:
        if not self.isb_password:
            return ""
        return _get_fernet().decrypt(self.isb_password.encode()).decode()

    def set_isb_password(self, plaintext: str) -> None:
        self.isb_password = _get_fernet().encrypt(plaintext.encode()).decode() if plaintext else ""
```

- [ ] **Step 4: Make + apply migration, run tests**

Run:
```bash
doppler run -- poetry run python3 manage.py makemigrations associations
doppler run -- poetry run python3 manage.py migrate
doppler run -- poetry run pytest associations/banks/tests/test_settings_isb_fields.py -v
```
Expected: migration `0040_islandsbanki_settings` created; PASS.

- [ ] **Step 5: Commit**

```bash
git add associations/models.py associations/migrations/0040_islandsbanki_settings.py associations/banks/tests/test_settings_isb_fields.py
git commit -m "feat: add per-association Íslandsbanki settings fields"
```

### Task 2: `cert.load_pem()` — PFX → PEM for signing

**Files:**
- Modify: `associations/banks/cert.py`
- Modify: `associations/banks/tests/test_cert.py`

**Interfaces:**
- Produces: `cert.load_pem() -> tuple[bytes, bytes]` returning `(key_pem, cert_pem)` from the shared PFX; cached in-process.

- [ ] **Step 1: Write the failing test**

```python
# append to associations/banks/tests/test_cert.py
def test_load_pem_returns_key_and_cert(monkeypatch, valid_pfx_b64_and_pwd):
    from associations.banks import cert as cert_module
    cert_module.clear_cache()
    b64, pwd = valid_pfx_b64_and_pwd
    monkeypatch.setattr(cert_module.settings, "BUNADARSKILRIKI", b64, raising=False)
    monkeypatch.setattr(cert_module.settings, "BUNADARSKILRIKI_PWD", pwd, raising=False)
    key_pem, cert_pem = cert_module.load_pem()
    assert b"PRIVATE KEY" in key_pem
    assert b"BEGIN CERTIFICATE" in cert_pem
```

(Reuse whatever PFX fixture `test_cert.py` already uses; if it constructs a self-signed PFX inline, mirror that into a `valid_pfx_b64_and_pwd` fixture.)

- [ ] **Step 2: Run test to verify it fails**

Run: `doppler run -- poetry run pytest associations/banks/tests/test_cert.py::test_load_pem_returns_key_and_cert -v`
Expected: FAIL — `load_pem` not defined.

- [ ] **Step 3: Implement `load_pem`**

In `associations/banks/cert.py`:

```python
_PEM_CACHE: tuple[bytes, bytes] | None = None

def load_pem() -> tuple[bytes, bytes]:
    """Return (key_pem, cert_pem) extracted from the shared BUNADARSKILRIKI PFX, for XML signing."""
    global _PEM_CACHE
    if _PEM_CACHE is not None:
        return _PEM_CACHE
    pfx_bytes, pwd = load()
    from cryptography.hazmat.primitives.serialization import (
        pkcs12, Encoding, PrivateFormat, NoEncryption,
    )
    key, crt, _ = pkcs12.load_key_and_certificates(pfx_bytes, pwd.encode())
    key_pem = key.private_bytes(Encoding.PEM, PrivateFormat.PKCS8, NoEncryption())
    cert_pem = crt.public_bytes(Encoding.PEM)
    _PEM_CACHE = (key_pem, cert_pem)
    return _PEM_CACHE
```

Also add `_PEM_CACHE = None` reset inside `clear_cache()`:

```python
def clear_cache() -> None:
    global _CACHE, _PEM_CACHE
    _CACHE = None
    _PEM_CACHE = None
```

- [ ] **Step 4: Run test to verify it passes**

Run: `doppler run -- poetry run pytest associations/banks/tests/test_cert.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add associations/banks/cert.py associations/banks/tests/test_cert.py
git commit -m "feat: export PEM key/cert from shared PFX for XML signing"
```

### Task 3: `BankProvider` ABC + dispatch + Landsbankinn wrapper

**Files:**
- Create: `associations/banks/provider_base.py`
- Create: `associations/banks/landsbankinn_provider.py`
- Create: `associations/banks/dispatch.py`
- Delete: `associations/banks/base_provider.py`
- Create: `associations/banks/tests/test_provider_dispatch.py`

**Interfaces:**
- Consumes: existing `associations.banks.landsbankinn` functions (`discover_and_sync_accounts(association, api_key)`, `sync_account_transactions(account, from_date, to_date, api_key)`, `create_claim(collection, settings_obj)`, `get_claim_status(claim_id, association_id, api_key)`, `fetch_incoming_claims(association_id, api_key, payor_ssn, due_date_from)`).
- Produces: `BankProvider` ABC (methods below); `get_provider(settings) -> BankProvider`; `LandsbankinnProvider`.
- ABC method signatures (all take the `AssociationBankSettings` object as `settings`):
  - `discover_and_sync_accounts(self, association, settings) -> dict`
  - `sync_account_transactions(self, account, from_date, to_date, settings) -> dict`
  - `create_claim(self, collection, settings) -> dict`
  - `get_claim_status(self, claim_id, settings) -> str`
  - `list_claims(self, association, settings, **filters) -> list[dict]`
  - `fetch_incoming_claims(self, association, settings, due_date_from) -> list[dict]`

- [ ] **Step 1: Write the failing test**

```python
# associations/banks/tests/test_provider_dispatch.py
import pytest
from unittest.mock import patch
from associations.models import Association, AssociationBankSettings
from associations.banks.dispatch import get_provider
from associations.banks.landsbankinn_provider import LandsbankinnProvider
from associations.banks.islandsbanki import IslandsbankiProvider

@pytest.mark.django_db
def test_get_provider_landsbankinn():
    a = Association.objects.create(ssn="1", name="L", address="A", postal_code="101", city="Rvk")
    bs = AssociationBankSettings.objects.create(association=a, bank="landsbankinn")
    assert isinstance(get_provider(bs), LandsbankinnProvider)

@pytest.mark.django_db
def test_get_provider_islandsbanki():
    a = Association.objects.create(ssn="2", name="I", address="A", postal_code="101", city="Rvk")
    bs = AssociationBankSettings.objects.create(association=a, bank="islandsbanki")
    assert isinstance(get_provider(bs), IslandsbankiProvider)

@pytest.mark.django_db
def test_landsbankinn_wrapper_delegates_create_claim():
    a = Association.objects.create(ssn="3", name="L", address="A", postal_code="101", city="Rvk")
    bs = AssociationBankSettings.objects.create(association=a, bank="landsbankinn")
    with patch("associations.banks.landsbankinn.create_claim", return_value={"id": "X"}) as m:
        out = LandsbankinnProvider().create_claim("COLL", bs)
    m.assert_called_once_with("COLL", bs)
    assert out == {"id": "X"}

@pytest.mark.django_db
def test_landsbankinn_wrapper_adapts_status_signature():
    a = Association.objects.create(ssn="4", name="L", address="A", postal_code="101", city="Rvk")
    bs = AssociationBankSettings.objects.create(association=a, bank="landsbankinn")
    bs.set_api_key("KEY"); bs.save()
    with patch("associations.banks.landsbankinn.get_claim_status", return_value="paid") as m:
        out = LandsbankinnProvider().get_claim_status("CID", bs)
    m.assert_called_once_with("CID", a.id, "KEY")
    assert out == "paid"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `doppler run -- poetry run pytest associations/banks/tests/test_provider_dispatch.py -v`
Expected: FAIL — modules/classes not defined.

- [ ] **Step 3: Create the ABC**

```python
# associations/banks/provider_base.py
from abc import ABC, abstractmethod
from datetime import date


class BankProvider(ABC):
    """Uniform interface every bank integration implements. Methods take the
    AssociationBankSettings object so each provider pulls its own creds/cert."""

    @abstractmethod
    def discover_and_sync_accounts(self, association, settings) -> dict: ...

    @abstractmethod
    def sync_account_transactions(self, account, from_date: date, to_date: date, settings) -> dict: ...

    @abstractmethod
    def create_claim(self, collection, settings) -> dict: ...

    @abstractmethod
    def get_claim_status(self, claim_id: str, settings) -> str: ...

    @abstractmethod
    def list_claims(self, association, settings, **filters) -> list[dict]: ...

    @abstractmethod
    def fetch_incoming_claims(self, association, settings, due_date_from: date) -> list[dict]: ...
```

- [ ] **Step 4: Create the Landsbankinn wrapper**

```python
# associations/banks/landsbankinn_provider.py
from datetime import date
from associations.banks.provider_base import BankProvider
from associations.banks import landsbankinn as lb


class LandsbankinnProvider(BankProvider):
    """Adapts the existing landsbankinn.py module functions to BankProvider.
    No behavior change — only maps `settings` to (association_id, api_key)."""

    def discover_and_sync_accounts(self, association, settings) -> dict:
        return lb.discover_and_sync_accounts(association, settings.get_api_key())

    def sync_account_transactions(self, account, from_date: date, to_date: date, settings) -> dict:
        return lb.sync_account_transactions(account, from_date, to_date, settings.get_api_key())

    def create_claim(self, collection, settings) -> dict:
        return lb.create_claim(collection, settings)

    def get_claim_status(self, claim_id: str, settings) -> str:
        return lb.get_claim_status(claim_id, settings.association_id, settings.get_api_key())

    def list_claims(self, association, settings, **filters) -> list[dict]:
        # Landsbankinn: reuse incoming-claims listing filtered by claimant when needed.
        due_from = filters.get("due_date_from", date(association.__class__.objects.none().count() or 1970, 1, 1))
        return lb.fetch_incoming_claims(association.id, settings.get_api_key(), association.ssn, due_from)

    def fetch_incoming_claims(self, association, settings, due_date_from: date) -> list[dict]:
        return lb.fetch_incoming_claims(association.id, settings.get_api_key(), association.ssn, due_date_from)
```

Note: `list_claims` for Landsbankinn is a convenience mapping only; Íslandsbanki (Task 9/10) provides the real claimant listing. Keep `list_claims` simple — if not needed by any Landsbankinn caller, implement it as `return self.fetch_incoming_claims(association, settings, filters.get("due_date_from", date(1970, 1, 1)))`.

- [ ] **Step 5: Create the dispatcher**

```python
# associations/banks/dispatch.py
from associations.models import BankProvider as BankChoice
from associations.banks.provider_base import BankProvider
from associations.banks.landsbankinn_provider import LandsbankinnProvider
from associations.banks.islandsbanki import IslandsbankiProvider


def get_provider(settings) -> BankProvider:
    """Return the BankProvider implementation for the association's configured bank."""
    if settings.bank == BankChoice.ISLANDSBANKI:
        return IslandsbankiProvider()
    if settings.bank == BankChoice.LANDSBANKINN:
        return LandsbankinnProvider()
    raise NotImplementedError(f"No provider for bank '{settings.bank}'")
```

- [ ] **Step 6: Make `IslandsbankiProvider` subclass the ABC (still stubbed)**

Replace the body of `associations/banks/islandsbanki.py` so it subclasses `provider_base.BankProvider` with the six methods raising `NotImplementedError("Íslandsbanki: implemented in a later task")`. (Full bodies land in Tasks 7, 9, 10, 12.) Delete `associations/banks/base_provider.py`.

```python
# associations/banks/islandsbanki.py
from datetime import date
from associations.banks.provider_base import BankProvider


class IslandsbankiProvider(BankProvider):
    def discover_and_sync_accounts(self, association, settings) -> dict:
        raise NotImplementedError("Íslandsbanki: implemented in a later task")

    def sync_account_transactions(self, account, from_date: date, to_date: date, settings) -> dict:
        raise NotImplementedError("Íslandsbanki: implemented in a later task")

    def create_claim(self, collection, settings) -> dict:
        raise NotImplementedError("Íslandsbanki: implemented in a later task")

    def get_claim_status(self, claim_id: str, settings) -> str:
        raise NotImplementedError("Íslandsbanki: implemented in a later task")

    def list_claims(self, association, settings, **filters) -> list[dict]:
        raise NotImplementedError("Íslandsbanki: implemented in a later task")

    def fetch_incoming_claims(self, association, settings, due_date_from: date) -> list[dict]:
        raise NotImplementedError("Íslandsbanki: implemented in a later task")
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `doppler run -- poetry run pytest associations/banks/tests/test_provider_dispatch.py -v`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add associations/banks/provider_base.py associations/banks/landsbankinn_provider.py associations/banks/dispatch.py associations/banks/islandsbanki.py associations/banks/tests/test_provider_dispatch.py
git rm associations/banks/base_provider.py
git commit -m "feat: bank provider dispatch layer + Landsbankinn wrapper"
```

### Task 4: Route views + tasks through the dispatcher

**Files:**
- Modify: `associations/banks/views.py` (call sites at ~318, ~401, ~765)
- Modify: `associations/banks/tasks.py` (imports at line 8, 140; call sites ~44, ~77, ~194)

**Interfaces:**
- Consumes: `get_provider(settings)` from Task 3.

- [ ] **Step 1: Run the existing bank suite as a regression baseline**

Run: `doppler run -- poetry run pytest associations/banks/tests/ -v`
Expected: PASS (record the count; it must not drop after this task).

- [ ] **Step 2: Replace direct Landsbankinn calls in `tasks.py`**

Replace `from associations.banks.landsbankinn import discover_and_sync_accounts, sync_account_transactions` and its call sites with provider calls. Example for the account-sync task body:

```python
from associations.banks.dispatch import get_provider
# ...
provider = get_provider(settings)          # `settings` is the AssociationBankSettings row
discovery = provider.discover_and_sync_accounts(association, settings)
# ...
result = provider.sync_account_transactions(account, from_date, to_date, settings)
```

For the claim-status task (line ~140/194):

```python
from associations.banks.dispatch import get_provider
provider = get_provider(settings)
new_status_raw = provider.get_claim_status(claim.claim_id, settings)
```

Keep the `_get`-based pre-checks only if they are Landsbankinn-specific health probes; otherwise drop them in favor of the provider call.

- [ ] **Step 3: Replace direct Landsbankinn calls in `views.py`**

At the create-claim sites (~318, ~401) and incoming-claims site (~765):

```python
from associations.banks.dispatch import get_provider
provider = get_provider(bank_settings)
api_response = provider.create_claim(collection, bank_settings)
# ...
claims = provider.fetch_incoming_claims(association, bank_settings, due_date_from)
```

Leave `_parse_landsbankinn_error` guarded so it only runs when `bank_settings.bank == BankProvider.LANDSBANKINN`; for other banks fall back to `str(exc)` (Íslandsbanki fault parsing is added in Task 12).

- [ ] **Step 4: Run the full bank suite**

Run: `doppler run -- poetry run pytest associations/banks/tests/ -v`
Expected: PASS with the same count as Step 1 (no regressions).

- [ ] **Step 5: Commit**

```bash
git add associations/banks/views.py associations/banks/tasks.py
git commit -m "refactor: route bank views/tasks through provider dispatch"
```

---

## Phase 2 — Transaction sync (Yfirlit)

### Task 5: `isb_soap` seam + `isb_mappers` account/transaction helpers

**Files:**
- Create: `associations/banks/isb_soap.py`
- Create: `associations/banks/isb_mappers.py`
- Create: `associations/banks/tests/test_isb_mappers.py`
- Modify: `config/settings/base.py`

**Interfaces:**
- Produces:
  - `isb_soap.invoke(settings, service: str, operation: str, **kwargs) -> list[dict] | dict` — builds a signed, authenticated zeep client for `service` in `{"yfirlit","krofur"}`, calls `operation`, writes a `BankApiAuditLog`, returns the response normalized to plain dict(s) via `zeep.helpers.serialize_object`.
  - `isb_mappers.parse_account_number(account_number: str) -> tuple[int,int,int]` → `(banki, hofudbok, reikningsnumer)`.
  - `isb_mappers.compute_external_id(account_number: str, booking_date, amount, tilvisun: str, bunkanumer: str) -> str`.
  - `isb_mappers.map_faersla_to_transaction_fields(faersla: dict, account_number: str) -> dict` → kwargs for `Transaction.objects.create` excluding `bank_account`/`source`.

- [ ] **Step 1: Add settings**

In `config/settings/base.py` near the `BANK_LANDSBANKINN_*` block. **Note the `WS_BASE` split** — the spike proved the WSDL's `<soap:address>` points at production, so the service endpoint host must be overridden from config separately from where the WSDL is fetched:

```python
BANK_ISLANDSBANKI_BASE = env("BANK_ISLANDSBANKI_BASE", default="https://ws-test.isb.is/adgerdirv1/")
BANK_ISLANDSBANKI_WS_BASE = env("BANK_ISLANDSBANKI_WS_BASE", default="https://ws-test.isb.is/adgerdirv1/")  # .asmx service host (test vs ws.isb.is prod)
BANK_ISLANDSBANKI_YFIRLIT_WSDL = env("BANK_ISLANDSBANKI_YFIRLIT_WSDL", default=BANK_ISLANDSBANKI_BASE + "wsdl/yfirlit.wsdl")
BANK_ISLANDSBANKI_KROFUR_WSDL  = env("BANK_ISLANDSBANKI_KROFUR_WSDL",  default=BANK_ISLANDSBANKI_BASE + "wsdl/krofur.wsdl")
BANK_ISLANDSBANKI_YFIRLIT_ENDPOINT = env("BANK_ISLANDSBANKI_YFIRLIT_ENDPOINT", default=BANK_ISLANDSBANKI_WS_BASE + "yfirlit.asmx")
BANK_ISLANDSBANKI_KROFUR_ENDPOINT  = env("BANK_ISLANDSBANKI_KROFUR_ENDPOINT",  default=BANK_ISLANDSBANKI_WS_BASE + "krofur.asmx")
```

- [ ] **Step 2: Write failing tests for the pure mappers**

```python
# associations/banks/tests/test_isb_mappers.py
from datetime import date
from decimal import Decimal
from associations.banks import isb_mappers as m

def test_parse_account_number():
    assert m.parse_account_number("0133-26-000123") == (133, 26, 123)

def test_compute_external_id_is_stable_and_distinct():
    a = m.compute_external_id("0133-26-000123", date(2026,7,1), Decimal("1000.00"), "1234567890", "B1")
    b = m.compute_external_id("0133-26-000123", date(2026,7,1), Decimal("1000.00"), "1234567890", "B1")
    c = m.compute_external_id("0133-26-000123", date(2026,7,1), Decimal("1000.00"), "1234567890", "B2")
    assert a == b and a != c and len(a) <= 64

def test_map_faersla_to_transaction_fields():
    faersla = {
        "Hreyfingardagur": "2026-07-01T00:00:00", "Upphaed": "1000.00",
        "Tilvisunarnumer": "1234567890", "Sedilnumer": "55", "Textalykill": "Millifærsla",
        "Bunkanumer": "B1",
    }
    out = m.map_faersla_to_transaction_fields(faersla, "0133-26-000123")
    assert out["date"] == date(2026, 7, 1)
    assert out["amount"] == Decimal("1000.00")
    assert out["reference"] == "1234567890"
    assert out["payer_kennitala"] == "1234567890"     # 10 digits → treated as kennitala
    assert "Millifærsla" in out["description"]
    assert out["external_id"] == m.compute_external_id("0133-26-000123", date(2026,7,1), Decimal("1000.00"), "1234567890", "B1")
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `doppler run -- poetry run pytest associations/banks/tests/test_isb_mappers.py -v`
Expected: FAIL — module not defined.

- [ ] **Step 4: Implement `isb_mappers.py`**

> **Amount scaling (spec Open item):** `Upphaed` is used as-is (whole krónur assumption). The spike saw large `Decimal` values; **do not add any ÷100 scaling** until Íslandsbanki confirms whether the field is krónur or aurar. If confirmed as aurar, the single change is in `map_faersla_to_transaction_fields`.

```python
# associations/banks/isb_mappers.py
import hashlib
from datetime import date, datetime
from decimal import Decimal


def parse_account_number(account_number: str) -> tuple[int, int, int]:
    parts = account_number.replace(" ", "").split("-")
    if len(parts) != 3:
        raise ValueError(f"Ógilt reikningsnúmer: {account_number!r} (vænti XXXX-XX-XXXXXX)")
    return int(parts[0]), int(parts[1]), int(parts[2])


def _to_date(value) -> date:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    return datetime.fromisoformat(str(value).replace("Z", "")).date()


def compute_external_id(account_number, booking_date, amount, tilvisun, bunkanumer) -> str:
    raw = f"{account_number}|{_to_date(booking_date).isoformat()}|{Decimal(str(amount))}|{tilvisun or ''}|{bunkanumer or ''}"
    return "isb_" + hashlib.sha256(raw.encode()).hexdigest()[:56]


def _looks_like_kennitala(s: str) -> bool:
    return bool(s) and s.isdigit() and len(s) == 10


def map_faersla_to_transaction_fields(faersla: dict, account_number: str) -> dict:
    booking = _to_date(faersla["Hreyfingardagur"])
    amount = Decimal(str(faersla["Upphaed"]))
    tilvisun = str(faersla.get("Tilvisunarnumer") or "")
    bunkanumer = str(faersla.get("Bunkanumer") or "")
    textalykill = str(faersla.get("Textalykill") or "")
    sedilnumer = str(faersla.get("Sedilnumer") or "")
    description = " ".join(p for p in (textalykill, sedilnumer) if p).strip()
    return {
        "date": booking,
        "amount": amount,
        "reference": tilvisun,
        "payer_kennitala": tilvisun if _looks_like_kennitala(tilvisun) else "",
        "description": description,
        "external_id": compute_external_id(account_number, booking, amount, tilvisun, bunkanumer),
    }
```

- [ ] **Step 5: Implement `isb_soap.py` (port the spike-proven signing)**

Port the `BinarySignatureTokenFirst` and `WsseBundle` classes verbatim from `scratch/isb_spike.py` (proven accepted by the sandbox) — do not reinvent them. The three load-bearing pieces: (1) BST reordered before `<ds:Signature>` inside `apply()`; (2) `WsseBundle` so a two-handler wsse doesn't crash on response; (3) **endpoint override** via `create_service` because the WSDL points at prod. Use in-memory PEM buffers (`MemorySignature`-style) to avoid writing key material to disk.

```python
# associations/banks/isb_soap.py
"""Signed, authenticated Íslandsbanki SOAP seam. Signing proven by the Phase 0 spike."""
import logging
from django.conf import settings as dj_settings
from zeep import Client
from zeep.helpers import serialize_object
from zeep.wsse.username import UsernameToken
from zeep.wsse.signature import BinarySignature
from zeep.wsse import utils as wsse_utils

from associations.banks import cert as cert_module

logger = logging.getLogger(__name__)

_SVC = {
    "yfirlit": lambda: (dj_settings.BANK_ISLANDSBANKI_YFIRLIT_WSDL,
                        dj_settings.BANK_ISLANDSBANKI_YFIRLIT_ENDPOINT,
                        "{http://ws.isb.is}YfirlitWSSoap"),
    "krofur":  lambda: (dj_settings.BANK_ISLANDSBANKI_KROFUR_WSDL,
                        dj_settings.BANK_ISLANDSBANKI_KROFUR_ENDPOINT,
                        "{http://ws.isb.is}KrofurWSSoap"),   # confirm binding QName against krofur.wsdl
}

_WSSE = "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd"


class BinarySignatureTokenFirst(BinarySignature):
    """zeep emits <ds:Signature> before the BinarySecurityToken; the .NET server rejects
    that with SecurityTokenUnavailable. Move the BST to be the first child of <wsse:Security>
    AFTER signing (only soap:Body is digested, so header reordering is signature-safe)."""
    def apply(self, envelope, headers):
        envelope, headers = super().apply(envelope, headers)
        security = envelope.find(f".//{{{_WSSE}}}Security")
        bst = security.find(f"{{{_WSSE}}}BinarySecurityToken") if security is not None else None
        if security is not None and bst is not None:
            security.remove(bst)
            security.insert(0, bst)
        return envelope, headers


class WsseBundle:
    """Chain UsernameToken + signature on apply; no-op verify (rely on TLS + fault inspection,
    not response-signature verification)."""
    def __init__(self, *handlers):
        self.handlers = handlers
    def apply(self, envelope, headers):
        for h in self.handlers:
            envelope, headers = h.apply(envelope, headers)
        return envelope, headers
    def verify(self, envelope):
        return envelope


def _client(settings_obj, service: str) -> tuple[Client, str, str]:
    wsdl, endpoint, binding = _SVC[service]()
    key_pem, cert_pem = cert_module.load_pem()
    wsse = WsseBundle(
        UsernameToken(settings_obj.isb_username, settings_obj.get_isb_password()),
        BinarySignatureTokenFirst(key_pem, cert_pem),   # MemorySignature-style: PEM buffers, nothing to disk
    )
    return Client(wsdl, wsse=wsse), endpoint, binding


def invoke(settings_obj, service: str, operation: str, **kwargs):
    """Call `operation` on the `service` SOAP endpoint (endpoint overridden — the WSDL
    soap:address points at prod); audit-log; return serialized dict(s)."""
    from associations.models import BankApiAuditLog
    client, endpoint, binding = _client(settings_obj, service)
    svc = client.create_service(binding, endpoint)   # override prod address from WSDL
    status_code = 200
    try:
        result = getattr(svc, operation)(**kwargs)
        return serialize_object(result)
    except Exception:
        status_code = 500
        logger.exception("ISB %s.%s failed", service, operation)  # never log the envelope (cleartext pwd)
        raise
    finally:
        BankApiAuditLog.objects.create(
            association_id=settings_obj.association_id, bank="islandsbanki",
            endpoint=operation, http_method="POST", status_code=status_code,
        )
```

> The exact binding QNames (`YfirlitWSSoap`, `KrofurWSSoap`) and whether `MemorySignature` PEM-buffer construction needs a tweak are confirmed against `scratch/isb_spike.py` while porting. If in-memory buffers prove awkward, fall back to `0600` temp PEMs with cleanup. **Delete `scratch/isb_spike.py` at the end of this task** (`git rm HusfelagPy/scratch/isb_spike.py`).

- [ ] **Step 6: Run mapper tests to verify they pass**

Run: `doppler run -- poetry run pytest associations/banks/tests/test_isb_mappers.py -v`
Expected: PASS. (`isb_soap` is covered via mocking in Task 7.)

- [ ] **Step 7: Commit**

```bash
git add associations/banks/isb_soap.py associations/banks/isb_mappers.py associations/banks/tests/test_isb_mappers.py config/settings/base.py
git commit -m "feat: Íslandsbanki SOAP seam + transaction mappers"
```

### Task 6: `IslandsbankiProvider.sync_account_transactions`

**Files:**
- Modify: `associations/banks/islandsbanki.py`
- Create: `associations/banks/tests/test_isb_provider.py`

**Interfaces:**
- Consumes: `isb_soap.invoke`, `isb_mappers.parse_account_number`, `isb_mappers.map_faersla_to_transaction_fields`.
- Produces: `IslandsbankiProvider.sync_account_transactions(account, from_date, to_date, settings) -> {"created": int, "skipped": int}`.

- [ ] **Step 1: Write the failing test (isb_soap mocked)**

```python
# associations/banks/tests/test_isb_provider.py
import pytest
from datetime import date
from unittest.mock import patch
from associations.models import Association, AssociationBankSettings, BankAccount, Transaction
from associations.banks.islandsbanki import IslandsbankiProvider

@pytest.mark.django_db
def test_sync_creates_and_dedupes_transactions():
    a = Association.objects.create(ssn="1000000000", name="I", address="A", postal_code="101", city="Rvk")
    bs = AssociationBankSettings.objects.create(association=a, bank="islandsbanki", isb_username="u")
    bs.set_isb_password("p"); bs.save()
    acc = BankAccount.objects.create(association=a, account_number="0133-26-000123", name="Aðal", is_connected=True)
    faerslur = [
        {"Hreyfingardagur": "2026-07-01T00:00:00", "Upphaed": "1000.00", "Tilvisunarnumer": "1234567890", "Sedilnumer": "1", "Textalykill": "Greiðsla", "Bunkanumer": "B1"},
        {"Hreyfingardagur": "2026-07-02T00:00:00", "Upphaed": "2000.00", "Tilvisunarnumer": "2345678901", "Sedilnumer": "2", "Textalykill": "Greiðsla", "Bunkanumer": "B2"},
    ]
    with patch("associations.banks.islandsbanki.isb_soap.invoke", return_value=faerslur) as inv:
        r1 = IslandsbankiProvider().sync_account_transactions(acc, date(2026,7,1), date(2026,7,31), bs)
    assert r1 == {"created": 2, "skipped": 0}
    assert Transaction.objects.filter(bank_account=acc).count() == 2
    assert inv.call_args.kwargs["banki"] == 133 and inv.call_args.kwargs["reikningsnumer"] == 123

    with patch("associations.banks.islandsbanki.isb_soap.invoke", return_value=faerslur):
        r2 = IslandsbankiProvider().sync_account_transactions(acc, date(2026,7,1), date(2026,7,31), bs)
    assert r2 == {"created": 0, "skipped": 2}          # composite external_id dedup
    assert Transaction.objects.filter(bank_account=acc).count() == 2
```

- [ ] **Step 2: Run test to verify it fails**

Run: `doppler run -- poetry run pytest associations/banks/tests/test_isb_provider.py::test_sync_creates_and_dedupes_transactions -v`
Expected: FAIL — method raises `NotImplementedError`.

- [ ] **Step 3: Implement the method**

Replace `sync_account_transactions` in `associations/banks/islandsbanki.py`; add imports at top:

```python
from decimal import Decimal
from associations.banks import isb_soap
from associations.banks import isb_mappers
```

```python
    def sync_account_transactions(self, account, from_date, to_date, settings) -> dict:
        from associations.models import Transaction, TransactionSource
        banki, hofudbok, reikningsnumer = isb_mappers.parse_account_number(account.account_number)
        faerslur = isb_soap.invoke(
            settings, "yfirlit", "SaekjaReikningsyfirlit",
            banki=banki, hofudbok=hofudbok, reikningsnumer=reikningsnumer,
            fra=from_date.isoformat() + "T00:00:00", til=to_date.isoformat() + "T00:00:00",
            faerslaFra=0, faerslaTil=0,
        ) or []
        created = skipped = 0
        for faersla in faerslur:
            fields = isb_mappers.map_faersla_to_transaction_fields(faersla, account.account_number)
            if Transaction.objects.filter(external_id=fields["external_id"]).exists():
                skipped += 1
                continue
            Transaction.objects.create(bank_account=account, source=TransactionSource.BANK_SYNC, **fields)
            created += 1
        return {"created": created, "skipped": skipped}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `doppler run -- poetry run pytest associations/banks/tests/test_isb_provider.py -v`
Expected: PASS.

- [ ] **Step 5: Implement `discover_and_sync_accounts` (validate-only) + test**

Íslandsbanki has no enumeration op; discovery validates existing manually-added connected accounts by attempting a 1-day statement fetch. Add:

```python
    def discover_and_sync_accounts(self, association, settings) -> dict:
        from associations.models import BankAccount
        from datetime import date
        checked = ok = 0
        today = date.today()
        for acc in BankAccount.objects.filter(association=association, is_connected=True):
            checked += 1
            try:
                self.sync_account_transactions(acc, today, today, settings)
                ok += 1
            except Exception:
                pass
        return {"created": 0, "connected": ok, "disconnected": checked - ok}
```

Add a test asserting it returns `{"created":0,"connected":1,"disconnected":0}` when `sync_account_transactions` is patched to succeed for one connected account.

- [ ] **Step 6: Run tests, commit**

Run: `doppler run -- poetry run pytest associations/banks/tests/test_isb_provider.py -v`
Expected: PASS.

```bash
git add associations/banks/islandsbanki.py associations/banks/tests/test_isb_provider.py
git commit -m "feat: Íslandsbanki transaction sync via SaekjaReikningsyfirlit"
```

---

## Phase 3 — Retrieve claims (SaekjaKrofu / SaekjaKrofur)

### Task 7: Claim-key helpers + `get_claim_status` + `list_claims`

**Files:**
- Modify: `associations/banks/isb_mappers.py`
- Modify: `associations/banks/islandsbanki.py`
- Modify: `associations/banks/tests/test_isb_mappers.py`, `test_isb_provider.py`

**Interfaces:**
- Produces:
  - `isb_mappers.build_claim_key(ssn: str, account: str, due_date) -> str` (`"{ssn}:{account}:{yyyy-mm-dd}"`).
  - `isb_mappers.parse_claim_key(key: str) -> tuple[str, str, date]`.
  - `isb_mappers.map_claim_state_to_status(raw: str) -> str` → one of `BankClaimStatus` values `"UNPAID"|"PAID"|"CANCELLED"`.
  - `IslandsbankiProvider.get_claim_status(claim_id, settings) -> str` (lowercased bank state).
  - `IslandsbankiProvider.list_claims(association, settings, **filters) -> list[dict]`.

- [ ] **Step 1: Write failing mapper tests**

```python
# append to test_isb_mappers.py
from datetime import date
def test_claim_key_roundtrip():
    k = m.build_claim_key("1000000000", "0133-66-000001", date(2026,7,31))
    assert k == "1000000000:0133-66-000001:2026-07-31"
    ssn, acc, due = m.parse_claim_key(k)
    assert (ssn, acc, due) == ("1000000000", "0133-66-000001", date(2026,7,31))

def test_map_claim_state():
    assert m.map_claim_state_to_status("greidd") == "PAID"
    assert m.map_claim_state_to_status("ógreidd") == "UNPAID"
    assert m.map_claim_state_to_status("felld") == "CANCELLED"
    assert m.map_claim_state_to_status("eitthvað") == "UNPAID"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `doppler run -- poetry run pytest associations/banks/tests/test_isb_mappers.py -k "claim" -v`
Expected: FAIL.

- [ ] **Step 3: Implement mapper helpers**

Add to `isb_mappers.py`:

```python
def build_claim_key(ssn: str, account: str, due_date) -> str:
    return f"{ssn}:{account}:{_to_date(due_date).isoformat()}"


def parse_claim_key(key: str) -> tuple:
    ssn, account, due = key.split(":")
    return ssn, account, _to_date(due)


_PAID = {"greidd", "greitt", "paid"}
_CANCELLED = {"felld", "afturkolluð", "afturkollud", "cancelled"}

def map_claim_state_to_status(raw: str) -> str:
    r = (raw or "").strip().lower()
    if r in _PAID:
        return "PAID"
    if r in _CANCELLED:
        return "CANCELLED"
    return "UNPAID"
```

- [ ] **Step 4: Write failing provider tests (isb_soap mocked)**

```python
# append to test_isb_provider.py
@pytest.mark.django_db
def test_get_claim_status_reconstructs_key():
    a = Association.objects.create(ssn="1000000001", name="I", address="A", postal_code="101", city="Rvk")
    bs = AssociationBankSettings.objects.create(association=a, bank="islandsbanki", isb_username="u")
    with patch("associations.banks.islandsbanki.isb_soap.invoke", return_value={"Stada": "greidd"}) as inv:
        out = IslandsbankiProvider().get_claim_status("1000000001:0133-66-000001:2026-07-31", bs)
    assert out == "paid"
    assert inv.call_args.kwargs["kennitalaKrofuhafa"] == "1000000001"

@pytest.mark.django_db
def test_list_claims_normalizes_rows():
    a = Association.objects.create(ssn="1000000002", name="I", address="A", postal_code="101", city="Rvk")
    bs = AssociationBankSettings.objects.create(association=a, bank="islandsbanki", isb_username="u")
    rows = [{"KennitalaGreidanda": "2345678901", "Gjalddagi": "2026-07-31T00:00:00", "Upphaed": "1000.00", "Stada": "ógreidd", "Tilvisun": "ref"}]
    with patch("associations.banks.islandsbanki.isb_soap.invoke", return_value=rows):
        out = IslandsbankiProvider().list_claims(a, bs)
    assert out[0]["amount"] == 1000.0 and out[0]["status"] == "UNPAID" and out[0]["payer_kennitala"] == "2345678901"
```

- [ ] **Step 5: Run tests to verify they fail**

Run: `doppler run -- poetry run pytest associations/banks/tests/test_isb_provider.py -k "claim" -v`
Expected: FAIL (`NotImplementedError`).

- [ ] **Step 6: Implement `get_claim_status` and `list_claims`**

In `islandsbanki.py`:

```python
    def get_claim_status(self, claim_id, settings) -> str:
        ssn, account, due = isb_mappers.parse_claim_key(claim_id)
        result = isb_soap.invoke(
            settings, "krofur", "SaekjaKrofu",
            kennitalaKrofuhafa=ssn, reikningur=account, gjalddagi=due.isoformat() + "T00:00:00",
        ) or {}
        return isb_mappers.map_claim_state_to_status(result.get("Stada", "")).lower()

    def list_claims(self, association, settings, **filters) -> list:
        rows = isb_soap.invoke(
            settings, "krofur", "SaekjaKrofur", kennitalaKrofuhafa=association.ssn,
        ) or []
        out = []
        for c in rows:
            out.append({
                "payer_kennitala": str(c.get("KennitalaGreidanda") or ""),
                "due_date": str(c.get("Gjalddagi") or "")[:10],
                "amount": float(c.get("Upphaed") or 0),
                "status": isb_mappers.map_claim_state_to_status(c.get("Stada", "")),
                "reference": str(c.get("Tilvisun") or ""),
            })
        return out

    def fetch_incoming_claims(self, association, settings, due_date_from) -> list:
        # Íslandsbanki: claims the association owes are queried the same way, filtered client-side by due date.
        return [c for c in self.list_claims(association, settings)
                if c["due_date"] and c["due_date"] >= due_date_from.isoformat()]
```

Note: exact `SaekjaKrofu`/`SaekjaKrofur` argument names (`reikningur`, `gjalddagi`, filter params) are confirmed against the WSDL types during implementation; the response field names (`Stada`, `KennitalaGreidanda`, `Gjalddagi`, `Upphaed`, `Tilvisun`) come from the grounded `krofur.wsdl` schema.

- [ ] **Step 7: Run tests, commit**

Run: `doppler run -- poetry run pytest associations/banks/tests/test_isb_provider.py associations/banks/tests/test_isb_mappers.py -v`
Expected: PASS.

```bash
git add associations/banks/isb_mappers.py associations/banks/islandsbanki.py associations/banks/tests/test_isb_mappers.py associations/banks/tests/test_isb_provider.py
git commit -m "feat: Íslandsbanki claim retrieval (SaekjaKrofu/SaekjaKrofur)"
```

---

## Phase 4 — Create claims (StofnaKrofu)

### Task 8: Claim payload builder + `create_claim`

**Files:**
- Modify: `associations/banks/isb_mappers.py`
- Modify: `associations/banks/islandsbanki.py`
- Modify: `associations/banks/tests/test_isb_mappers.py`, `test_isb_provider.py`

**Interfaces:**
- Produces:
  - `isb_mappers.build_stofnakrofu_payload(collection, settings) -> dict` — kwargs for the `StofnaKrofu` operation.
  - `IslandsbankiProvider.create_claim(collection, settings) -> dict` — invokes `StofnaKrofu`, persists a `BankClaim` with `claim_id` = composite claim key, returns `{"claim_id": <key>, "raw": <response>}`.

- [ ] **Step 1: Write failing payload test**

```python
# append to test_isb_mappers.py
from decimal import Decimal
class _Assoc: ssn = "1000000000"
class _Budget:
    year = 2026
    association = _Assoc()
class _Payer: kennitala = "2345678901"
class _Coll:
    month = 7
    amount_total = Decimal("15000.00")
    budget = _Budget()
    payer = _Payer()
class _Settings: isb_claim_account = "0133-66-000001"

def test_build_stofnakrofu_payload():
    p = m.build_stofnakrofu_payload(_Coll(), _Settings())
    assert p["kennitalaKrofuhafa"] == "1000000000"
    assert p["kennitalaGreidanda"] == "2345678901"
    assert p["upphaed"] == 15000.0
    assert p["gjalddagi"].startswith("2026-07-31")
    assert p["reikningur"] == "0133-66-000001"
    assert "07/2026" in p["tilvisun"]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `doppler run -- poetry run pytest associations/banks/tests/test_isb_mappers.py -k stofnakrofu -v`
Expected: FAIL.

- [ ] **Step 3: Implement `build_stofnakrofu_payload`**

Add to `isb_mappers.py`:

```python
from calendar import monthrange

def _last_day_of_month(year: int, month: int) -> date:
    return date(year, month, monthrange(year, month)[1])

def build_stofnakrofu_payload(collection, settings) -> dict:
    due = _last_day_of_month(collection.budget.year, collection.month)
    month_label = f"{collection.month:02d}/{collection.budget.year}"
    return {
        "kennitalaKrofuhafa": collection.budget.association.ssn,
        "kennitalaGreidanda": collection.payer.kennitala,
        "reikningur": settings.isb_claim_account,
        "upphaed": float(collection.amount_total),
        "gjalddagi": due.isoformat() + "T00:00:00",
        "eindagi": due.isoformat() + "T00:00:00",
        "tilvisun": f"Húsfélagsgjald {month_label}",
        # fees / interest / discount left at bank defaults (zeroed), mirroring Landsbankinn
    }
```

- [ ] **Step 4: Write failing provider test (isb_soap mocked)**

```python
# append to test_isb_provider.py
from decimal import Decimal
from datetime import datetime, timezone
@pytest.mark.django_db
def test_create_claim_persists_bankclaim(django_user_model):
    from associations.models import Budget, Apartment, ApartmentOwnership, Collection, BankClaim
    a = Association.objects.create(ssn="1000000000", name="I", address="A", postal_code="101", city="Rvk")
    bs = AssociationBankSettings.objects.create(association=a, bank="islandsbanki", isb_username="u", isb_claim_account="0133-66-000001")
    payer = django_user_model.objects.create(kennitala="2345678901", name="Payer")
    budget = Budget.objects.create(association=a, year=2026)          # adjust to real Budget required fields
    apt = Apartment.objects.create(association=a, anr="01", fnr="F1")
    coll = Collection.objects.create(budget=budget, apartment=apt, payer=payer, month=7, amount_total=Decimal("15000.00"))
    with patch("associations.banks.islandsbanki.isb_soap.invoke", return_value={"ok": True}) as inv:
        out = IslandsbankiProvider().create_claim(coll, bs)
    assert inv.call_args.args[1] == "krofur" and inv.call_args.args[2] == "StofnaKrofu"
    bc = BankClaim.objects.get(collection=coll)
    assert bc.claim_id == "1000000000:0133-66-000001:2026-07-31"
    assert bc.payor_national_id == "2345678901" and bc.amount == Decimal("15000.00")
    assert out["claim_id"] == bc.claim_id
```

(Adjust `Budget`/`Apartment`/`Collection` creation to the models' actual required fields — check `associations/models.py` before running.)

- [ ] **Step 5: Run test to verify it fails**

Run: `doppler run -- poetry run pytest associations/banks/tests/test_isb_provider.py -k create_claim -v`
Expected: FAIL (`NotImplementedError`).

- [ ] **Step 6: Implement `create_claim`**

In `islandsbanki.py`:

```python
    def create_claim(self, collection, settings) -> dict:
        from associations.models import BankClaim
        from django.utils.timezone import now
        payload = isb_mappers.build_stofnakrofu_payload(collection, settings)
        response = isb_soap.invoke(settings, "krofur", "StofnaKrofu", **payload)
        claim_key = isb_mappers.build_claim_key(
            payload["kennitalaKrofuhafa"], payload["reikningur"], payload["gjalddagi"][:10]
        )
        BankClaim.objects.update_or_create(
            collection=collection,
            defaults={
                "claim_id": claim_key,
                "payor_national_id": payload["kennitalaGreidanda"],
                "amount": collection.amount_total,
                "due_date": isb_mappers.parse_claim_key(claim_key)[2],
                "status": "UNPAID",
                "sent_at": now(),
            },
        )
        return {"claim_id": claim_key, "raw": response}
```

- [ ] **Step 7: Run tests, commit**

Run: `doppler run -- poetry run pytest associations/banks/tests/ -v`
Expected: PASS (entire bank suite).

```bash
git add associations/banks/isb_mappers.py associations/banks/islandsbanki.py associations/banks/tests/
git commit -m "feat: Íslandsbanki claim creation (StofnaKrofu) + BankClaim persistence"
```

### Task 9: Íslandsbanki SOAP-fault error mapping in views

**Files:**
- Modify: `associations/banks/views.py`

**Interfaces:**
- Consumes: `zeep.exceptions.Fault`.

- [ ] **Step 1: Add an ISB fault parser and branch it in**

Add near `_parse_landsbankinn_error`:

```python
def _parse_islandsbanki_error(exc) -> str:
    from zeep.exceptions import Fault
    if isinstance(exc, Fault):
        return exc.message or str(exc)
    return str(exc)
```

At each create-claim catch site, select the parser by bank:

```python
detail = (_parse_islandsbanki_error(exc)
          if bank_settings.bank == BankProvider.ISLANDSBANKI
          else _parse_landsbankinn_error(exc))
```

- [ ] **Step 2: Run bank suite**

Run: `doppler run -- poetry run pytest associations/banks/tests/ -v`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add associations/banks/views.py
git commit -m "feat: map Íslandsbanki SOAP faults to user-facing detail"
```

---

## Phase 5 — Settings endpoint + frontend

### Task 10: Accept ISB settings in the bank-settings endpoint

**Files:**
- Modify: `associations/banks/views.py` (GET response ~205, POST handler ~213-260)
- Create: test in `associations/banks/tests/test_bank_settings_view.py`

**Interfaces:**
- Consumes: `AssociationBankSettings.set_isb_password`, `.isb_username`, `.isb_claim_account`.

- [ ] **Step 1: Write the failing test**

```python
# append to test_bank_settings_view.py — follow the auth/client setup already used in this file
@pytest.mark.django_db
def test_post_islandsbanki_settings_sets_creds(auth_client_chair, association):
    resp = auth_client_chair.post(f"/associations/{association.id}/bank/settings", {
        "bank": "islandsbanki", "isb_username": "svc", "isb_password": "pw", "isb_claim_account": "0133-66-000001",
    }, format="json")
    assert resp.status_code == 200
    from associations.models import AssociationBankSettings
    bs = AssociationBankSettings.objects.get(association=association)
    assert bs.bank == "islandsbanki" and bs.isb_username == "svc" and bs.isb_claim_account == "0133-66-000001"
    assert bs.get_isb_password() == "pw"
    assert "isb_password" not in resp.json()          # never echoed back
    assert resp.json()["isb_username"] == "svc"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `doppler run -- poetry run pytest associations/banks/tests/test_bank_settings_view.py -k islandsbanki -v`
Expected: FAIL.

- [ ] **Step 3: Handle ISB fields in the POST handler**

In the POST handler, after the existing `defaults`/`update_or_create` block, add:

```python
        if "isb_username" in request.data:
            bs.isb_username = request.data["isb_username"].strip()
        if "isb_claim_account" in request.data:
            bs.isb_claim_account = request.data["isb_claim_account"].strip()
        if any(k in request.data for k in ("isb_username", "isb_claim_account")):
            bs.save(update_fields=["isb_username", "isb_claim_account"])
        if "isb_password" in request.data:
            bs.set_isb_password(request.data["isb_password"].strip())
            bs.save(update_fields=["isb_password"])
```

In the GET response dict, add (never expose the password):

```python
            "isb_username": bs.isb_username,
            "isb_password_set": bool(bs.isb_password),
            "isb_claim_account": bs.isb_claim_account,
```

Add the same three keys to the POST success response dict.

- [ ] **Step 4: Run test to verify it passes**

Run: `doppler run -- poetry run pytest associations/banks/tests/test_bank_settings_view.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add associations/banks/views.py associations/banks/tests/test_bank_settings_view.py
git commit -m "feat: bank-settings endpoint accepts Íslandsbanki credentials"
```

### Task 11: Frontend — ISB settings fields + manual account add

**Files:**
- Modify: `HusfelagJS/src/controlers/BankSettingsPage.js` (and the accounts section/component it renders)

**Interfaces:**
- Consumes: `apiFetch()`; the settings GET/POST keys from Task 10 (`isb_username`, `isb_password`, `isb_password_set`, `isb_claim_account`).

- [ ] **Step 1: Read the current page and match its patterns**

Read `HusfelagJS/src/controlers/BankSettingsPage.js`. Identify how the bank `<Select>` and the Landsbankinn `api_key`/`template_id` fields are rendered and submitted (state names, `apiFetch` call). Follow `docs/style.md` for layout/inputs.

- [ ] **Step 2: Render ISB fields when bank === "islandsbanki"**

Add controlled inputs shown only when the selected bank is Íslandsbanki, mirroring the existing field markup:
- **Notandanafn** (`isb_username`, text)
- **Lykilorð** (`isb_password`, `type="password"`, write-only; show "Lykilorð er stillt" when `isb_password_set` and the field is empty)
- **Innheimtureikningur** (`isb_claim_account`, text, placeholder `0133-66-000001`)

Submit them in the existing POST body (only include `isb_password` when the user typed a new one). Icelandic labels, per `docs/style.md`.

- [ ] **Step 3: Manual "add account" input for Íslandsbanki**

In the accounts area (which for Landsbankinn is auto-discovered), when bank is Íslandsbanki show an "Bæta við reikningi" input (account number `XXXX-XX-XXXXXX`) that POSTs to the existing add-account/create-`BankAccount` path. On success, trigger the existing sync action so `SaekjaReikningsyfirlit` validates the account. Show a success/failure chip per `docs/style.md`.

- [ ] **Step 4: Manual verification**

Run the frontend (`cd HusfelagJS && npm start`) against a local backend; with an association set to Íslandsbanki, confirm the fields save (reload shows `isb_username`/`isb_claim_account` populated, password masked as "stillt") and that adding an account number appears in the accounts list. Use the `run` skill if available.

- [ ] **Step 5: Commit**

```bash
git add HusfelagJS/src/controlers/BankSettingsPage.js
git commit -m "feat: Íslandsbanki bank settings UI + manual account add"
```

### Task 12: Opt-in live sandbox integration test

**Files:**
- Create: `associations/banks/tests/test_isb_live.py`

- [ ] **Step 1: Write a skip-unless-configured live test**

```python
# associations/banks/tests/test_isb_live.py
import os, pytest
pytestmark = pytest.mark.skipif(
    not os.environ.get("ISB_TEST_USER"), reason="Íslandsbanki sandbox creds not configured"
)

@pytest.mark.django_db
def test_live_saekjareikningsyfirlit_signs_and_returns():
    from associations.models import Association, AssociationBankSettings, BankAccount
    from associations.banks.islandsbanki import IslandsbankiProvider
    from datetime import date
    a = Association.objects.create(ssn=os.environ["ISB_TEST_SSN"], name="Live", address="A", postal_code="101", city="Rvk")
    bs = AssociationBankSettings.objects.create(association=a, bank="islandsbanki", isb_username=os.environ["ISB_TEST_USER"])
    bs.set_isb_password(os.environ["ISB_TEST_PWD"]); bs.save()
    acc = BankAccount.objects.create(association=a, account_number=os.environ["ISB_TEST_ACCOUNT"], name="Live", is_connected=True)
    result = IslandsbankiProvider().sync_account_transactions(acc, date(2026,1,1), date.today(), bs)
    assert set(result) == {"created", "skipped"}      # a signed call was accepted (no SOAP fault)
```

- [ ] **Step 2: Run it (only when creds present)**

Run: `ISB_TEST_USER=... ISB_TEST_PWD=... ISB_TEST_SSN=... ISB_TEST_ACCOUNT=... doppler run -- poetry run pytest associations/banks/tests/test_isb_live.py -v`
Expected: PASS live; SKIPPED in CI (no env).

- [ ] **Step 3: Commit**

```bash
git add associations/banks/tests/test_isb_live.py
git commit -m "test: opt-in live Íslandsbanki sandbox integration test"
```

---

## Final verification

- [ ] Run the full bank suite: `doppler run -- poetry run pytest associations/banks/tests/ -v` — all pass, Landsbankinn count unchanged from the Task 4 baseline.
- [ ] Run the full project suite: `doppler run -- poetry run pytest -q`.
- [ ] Confirm migration `0040` applies cleanly on a fresh DB.
- [ ] Use `superpowers:finishing-a-development-branch` to decide merge/PR.

---

## Self-Review Notes (coverage against spec)

- Transport/auth (zeep + WS-Security + signing) → Task 0 (decision) + Task 5 (`isb_soap`).
- Per-association creds + shared cert reuse → Task 1 + Task 2 (`load_pem`, no new env var).
- Dispatch layer + Landsbankinn wrapper + delete dead ABC → Task 3; views/tasks rerouted → Task 4.
- Manual accounts + Yfirlit sync + composite dedup → Tasks 5–6.
- Retrieve claims (SaekjaKrofu/SaekjaKrofur) + composite ClaimKey → Task 7.
- Create claims (StofnaKrofu) + BankClaim → Task 8; SOAP-fault mapping → Task 9.
- Settings endpoint + frontend + manual account add → Tasks 10–11.
- Testing (mocked unit + opt-in live) → throughout + Task 12.
- Out-of-scope (Fella/Breyta/payments/batch) → not implemented, noted in spec.
