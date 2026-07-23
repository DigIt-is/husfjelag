import hashlib
from calendar import monthrange
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


def build_claim_key(banki, hofudbok, krofunumer, gjalddagi) -> str:
    return f"{int(banki)}:{int(hofudbok)}:{int(krofunumer)}:{_to_date(gjalddagi).isoformat()}"


def parse_claim_key(key: str) -> tuple:
    banki, hofudbok, krofunumer, gjalddagi = key.split(":")
    return int(banki), int(hofudbok), int(krofunumer), _to_date(gjalddagi)


# StadaKrofu enum (real, from krofur.wsdl): ÓGREIDD, GREIDD, NIÐURFELLD,
# MILLINNHEIMTA, LÖGFRÆÐIINNHEIMTA, VILLA. Matched case-insensitively.
_PAID = {"greidd", "greitt", "paid"}
_CANCELLED = {"niðurfelld", "nidurfelld", "felld", "afturkolluð", "afturkollud", "cancelled"}


def map_claim_state_to_status(raw: str) -> str:
    r = (raw or "").strip().lower()
    if r in _PAID:
        return "PAID"
    if r in _CANCELLED:
        return "CANCELLED"
    return "UNPAID"   # ÓGREIDD / MILLINNHEIMTA / LÖGFRÆÐIINNHEIMTA / VILLA / anything else


def _last_day_of_month(year: int, month: int) -> date:
    return date(year, month, monthrange(year, month)[1])


def build_stofnakrofu_payload(collection, settings) -> dict:
    banki = int(settings.isb_bank_number)
    due = _last_day_of_month(collection.budget.year, collection.month)
    cancel = date(due.year + 4, due.month, due.day)
    month_label = f"{collection.month:02d}/{collection.budget.year}"
    payload = {
        "KennitalaKrofuhafa": collection.budget.association.ssn,
        "KennitalaGreidanda": collection.payer.kennitala,
        "Bankanumer": banki,
        "Hofudbok": 66,                          # claims ledger (always 66)
        "Krofunumer": collection.id,             # caller-assigned (business decision: Collection.id)
        "Upphaed": float(collection.amount_total),
        "Gjalddagi": due.isoformat() + "T00:00:00",
        "Eindagi": due.isoformat() + "T00:00:00",
        "Nidurfellingardagur": cancel.isoformat() + "T00:00:00",
        "Tilvisun": f"HG {month_label}"[:16],    # ≤16 chars; full label goes in a note field
        # required fee/interest/discount fields — all zeroed (mirror Landsbankinn's no-fees claim)
        "TilkynningarOgGreidslugjald1": 0, "TilkynningarOgGreidslugjald2": 0,
        "Vanskilagjald1": 0, "Vanskilagjald2": 0,
        "DagafjoldiVanskilagjalds1": 0, "DagafjoldiVanskilagjalds2": 0,
        "AnnarKostnadur": 0, "AnnarVanskilakostnadur": 0,
        "Drattavaxtaprosenta": 0,
        "Afslattur1": 0, "Afslattur2": 0,
        "DagafjoldiAfslattar1": 0, "DagafjoldiAfslattar2": 0,
        "Gengisbanki": 0,
    }
    if settings.template_id:
        payload["Audkenni"] = settings.template_id   # ÍSB routing identifier (e.g. "IBB")
    return payload


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
