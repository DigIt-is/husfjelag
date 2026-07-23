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

def test_claim_key_roundtrip():
    k = m.build_claim_key(133, 66, 4567, date(2026, 7, 31))
    assert k == "133:66:4567:2026-07-31"
    banki, hofudbok, krofunumer, due = m.parse_claim_key(k)
    assert (banki, hofudbok, krofunumer, due) == (133, 66, 4567, date(2026, 7, 31))


def test_map_claim_state():
    assert m.map_claim_state_to_status("GREIDD") == "PAID"
    assert m.map_claim_state_to_status("ÓGREIDD") == "UNPAID"
    assert m.map_claim_state_to_status("NIÐURFELLD") == "CANCELLED"
    assert m.map_claim_state_to_status("MILLINNHEIMTA") == "UNPAID"
    assert m.map_claim_state_to_status("VILLA") == "UNPAID"


class _Assoc: ssn = "1000000000"
class _Budget:
    year = 2026
    association = _Assoc()
class _Payer: kennitala = "2345678901"
class _Coll:
    id = 4567
    month = 7
    amount_total = Decimal("15000.00")
    budget = _Budget()
    payer = _Payer()
class _Settings:
    isb_bank_number = "0500"
    template_id = "IBB"

def test_build_stofnakrofu_payload():
    p = m.build_stofnakrofu_payload(_Coll(), _Settings())
    assert p["KennitalaKrofuhafa"] == "1000000000"
    assert p["KennitalaGreidanda"] == "2345678901"
    assert p["Bankanumer"] == 500          # isb_bank_number as int
    assert p["Hofudbok"] == 66             # claims ledger
    assert p["Krofunumer"] == 4567         # == Collection.id
    assert p["Upphaed"] == 15000.0
    assert p["Gjalddagi"].startswith("2026-07-31")
    assert p["Eindagi"].startswith("2026-07-31")
    assert p["Nidurfellingardagur"].startswith("2030-07-31")   # gjalddagi + 4y
    assert len(p["Tilvisun"]) <= 16                              # Tilvisun ≤ 16 chars
    assert p["Audkenni"] == "IBB"          # ÍSB routing identifier (from template_id)
    # all required fee/interest/discount fields present and zeroed:
    for k in ("TilkynningarOgGreidslugjald1", "Vanskilagjald1", "Drattavaxtaprosenta",
              "Afslattur1", "AnnarKostnadur", "Gengisbanki"):
        assert p[k] == 0
