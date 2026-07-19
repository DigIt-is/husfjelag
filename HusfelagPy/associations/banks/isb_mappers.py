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
