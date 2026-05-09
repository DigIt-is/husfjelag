# External Services

Services used by the Húsfjelag platform. Update costs and documentation links as they change.

---

## Authentication — Kenni

**Purpose:** Authenticates all users. Verifies the user's national ID (kennitala) via Icelandic national identity infrastructure and enables passkey login after initial verification.

**Used in:** `users/oidc.py` — OIDC/PKCE flow. Every login goes through Kenni.

**Documentation:** https://docs.kenni.is

**Cost:**
- 26 kr. per lookup
- 500 kr./month base fee

---

## Company Registry — Skatturinn (Fyrirtækjaskrá)

**Purpose:** When registering a new association, we look up the company by kennitala to get legal name, address, and prokura holders (who has power of attorney — used to verify the registering user is authorised to act on behalf of the association).

**Used in:** `associations/skattur_cloud.py` — `fetch_legal_entity()`, `extract_prokuruhafar()`, `parse_entity_for_association()`

**Documentation:** https://api.skatturinn.is/api-details#api=company-registry-legalentities-v2-210&operation=get-nationalid

**Cost:** Unknown — to be confirmed.

---

## Apartment Registry — Fasteignaskrá (HMS)

**Purpose:** Fetches apartment data for an association — unit numbers, property IDs (fnr/anr), sizes. Not a proper API; we scrape the result after the user performs a manual search on the HMS site and provides the resulting URL.

**Used in:** `associations/scraper.py` — `scrape_hms_apartments()`

**Site:** https://hms.is/fasteignaskra/

**Documentation:** None (scraping only)

**Cost:** None

**Known limitation:** Scraping is fragile. See [TODO.md](../TODO.md) — a proper API or alternative data source is needed.

---

## Person Lookup — Já (ja.is / Gagnatorg)

**Purpose:** Resolves a kennitala to a person's name (and optionally legal address) before they have logged into the system. Used when registering apartment owners by kennitala — instead of storing the kennitala as a placeholder name, we look up the person's real name.

**Used in:** `associations/views.py` — `OwnerView.post` and `ApartmentOwnerView.post` (stub user creation). *(See TODO.md — lookup not yet implemented; kennitala is currently used as placeholder name.)*

**Documentation:** https://gagnatorg.ja.is/docs/skra/v1/#

**Cost:**
- 14 kr. per lookup
- 2.350 kr./month base fee

---

## Bank APIs

Used to sync transactions and send payment claims (innheimta) to owners' bank accounts.

### Landsbankinn

**Documentation:** https://developers.landsbankinn.is/

**Used in:** `associations/banks/landsbankinn.py`

### Íslandsbanki

**Documentation:** TBD

**Used in:** `associations/banks/islandsbanki.py`

### Arion

**Documentation:** TBD

**Used in:** `associations/banks/arion.py`

---

*More services to be added.*
