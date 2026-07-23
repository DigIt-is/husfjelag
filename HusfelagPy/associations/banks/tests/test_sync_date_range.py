import pytest
from datetime import date
from unittest.mock import patch, MagicMock


def _mock_provider():
    """A provider whose discovery is a no-op and whose sync captures the date range."""
    provider = MagicMock()
    provider.discover_and_sync_accounts.return_value = {"created": 0, "connected": 1, "disconnected": 0}
    return provider


@pytest.mark.django_db
def test_sync_uses_one_day_before_last_transaction():
    """When transactions exist, from_date = last_tx_date - 1 day."""
    from associations.models import (
        Association, BankAccount, Transaction, TransactionSource, AssociationBankSettings,
    )

    assoc = Association.objects.create(
        ssn="1234567890", name="Test BA", address="Test st", postal_code="100", city="Reykjavik"
    )
    bs = AssociationBankSettings.objects.create(association=assoc, bank="landsbankinn")
    bs.set_api_key("x"); bs.save()
    account = BankAccount.objects.create(
        association=assoc, name="Main", account_number="0101010101", is_connected=True
    )
    Transaction.objects.create(
        bank_account=account,
        date=date(2026, 3, 15),
        amount="1000",
        description="Test tx",
        source=TransactionSource.BANK_SYNC,
    )

    captured = {}

    def fake_sync(account_arg, from_date, to_date, settings_arg):
        captured["from_date"] = from_date
        captured["to_date"] = to_date
        return {"created": 0, "skipped": 0}

    provider = _mock_provider()
    provider.sync_account_transactions.side_effect = fake_sync

    from associations.banks import tasks
    with patch.object(tasks, "get_provider", return_value=provider):
        tasks.sync_transactions(assoc.id)

    assert captured["from_date"] == date(2026, 3, 14)  # one day before last tx


@pytest.mark.django_db
def test_sync_uses_jan_1_for_first_sync():
    """When no transactions exist, from_date = January 1st of current year."""
    from associations.models import Association, BankAccount, AssociationBankSettings

    assoc = Association.objects.create(
        ssn="9876543210", name="Empty BA", address="Test st", postal_code="100", city="Reykjavik"
    )
    bs = AssociationBankSettings.objects.create(association=assoc, bank="landsbankinn")
    bs.set_api_key("x"); bs.save()
    BankAccount.objects.create(
        association=assoc, name="Main", account_number="0202020202", is_connected=True
    )

    captured = {}

    def fake_sync(account_arg, from_date, to_date, settings_arg):
        captured["from_date"] = from_date
        return {"created": 0, "skipped": 0}

    provider = _mock_provider()
    provider.sync_account_transactions.side_effect = fake_sync

    from associations.banks import tasks
    with patch.object(tasks, "get_provider", return_value=provider):
        tasks.sync_transactions(assoc.id)

    today = date.today()
    assert captured["from_date"] == date(today.year, 1, 1)
