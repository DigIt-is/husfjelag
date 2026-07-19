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


@pytest.mark.django_db
def test_discover_and_sync_accounts_validates_connected_accounts():
    a = Association.objects.create(ssn="1000000001", name="I2", address="A", postal_code="101", city="Rvk")
    bs = AssociationBankSettings.objects.create(association=a, bank="islandsbanki", isb_username="u")
    bs.set_isb_password("p"); bs.save()
    BankAccount.objects.create(association=a, account_number="0133-26-000123", name="Aðal", is_connected=True)

    with patch.object(IslandsbankiProvider, "sync_account_transactions", return_value={"created": 0, "skipped": 0}):
        result = IslandsbankiProvider().discover_and_sync_accounts(a, bs)

    assert result == {"created": 0, "connected": 1, "disconnected": 0}
