from datetime import date
from decimal import Decimal
from associations.banks.provider_base import BankProvider
from associations.banks import isb_soap
from associations.banks import isb_mappers


class IslandsbankiProvider(BankProvider):
    def discover_and_sync_accounts(self, association, settings) -> dict:
        from associations.models import BankAccount
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

    def sync_account_transactions(self, account, from_date: date, to_date: date, settings) -> dict:
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

    def create_claim(self, collection, settings) -> dict:
        raise NotImplementedError("Íslandsbanki: implemented in a later task")

    def get_claim_status(self, claim_id: str, settings) -> str:
        raise NotImplementedError("Íslandsbanki: implemented in a later task")

    def list_claims(self, association, settings, **filters) -> list[dict]:
        raise NotImplementedError("Íslandsbanki: implemented in a later task")

    def fetch_incoming_claims(self, association, settings, due_date_from: date) -> list[dict]:
        raise NotImplementedError("Íslandsbanki: implemented in a later task")
