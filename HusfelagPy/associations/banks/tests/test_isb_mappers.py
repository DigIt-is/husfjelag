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
    k = m.build_claim_key("1000000000", "0133-66-000001", date(2026,7,31))
    assert k == "1000000000:0133-66-000001:2026-07-31"
    ssn, acc, due = m.parse_claim_key(k)
    assert (ssn, acc, due) == ("1000000000", "0133-66-000001", date(2026,7,31))

def test_map_claim_state():
    assert m.map_claim_state_to_status("greidd") == "PAID"
    assert m.map_claim_state_to_status("ógreidd") == "UNPAID"
    assert m.map_claim_state_to_status("felld") == "CANCELLED"
    assert m.map_claim_state_to_status("eitthvað") == "UNPAID"
