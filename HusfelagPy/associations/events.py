from datetime import date


def seed_default_events(association):
    """Create the standard recurring calendar events for an association (current
    year). Idempotent — does nothing if the association already has any events."""
    from .models import AssociationEvent, EventType, EventVisibility

    if AssociationEvent.objects.filter(association=association).exists():
        return

    year = date.today().year
    defaults = [
        {
            "title": "Ársreikningur",
            "description": "Senda út ársreikning a.m.k. tveimur vikum fyrir aðalfund.",
            "event_type": EventType.STATEMENT,
            "event_date": date(year, 4, 15),
        },
        {
            "title": "Aðalfundur",
            "description": "Aðalfundur húsfélags skal haldinn ár hvert fyrir lok aprílmánaðar.",
            "event_type": EventType.MEETING,
            "event_date": date(year, 4, 30),
        },
        {
            "title": "Búa til áætlun",
            "description": "Undirbúa fjárhagsáætlun fyrir næsta ár.",
            "event_type": EventType.BUDGET,
            "event_date": date(year, 12, 10),
        },
    ]
    AssociationEvent.objects.bulk_create([
        AssociationEvent(association=association, visibility=EventVisibility.ALL, **d)
        for d in defaults
    ])


def event_recipient_emails(event):
    """Return de-duplicated recipient emails for an event reminder, matching the
    event's visibility: BOARD → active CHAIR/CFO; ALL → all current active owners."""
    from .models import (
        AssociationAccess, AssociationRole, ApartmentOwnership, EventVisibility,
    )

    if event.visibility == EventVisibility.BOARD:
        users = [
            a.user for a in AssociationAccess.objects.filter(
                association=event.association, active=True,
                role__in=[AssociationRole.CHAIR, AssociationRole.CFO],
            ).select_related("user")
        ]
    else:
        users = [
            o.user for o in ApartmentOwnership.objects.filter(
                apartment__association=event.association,
                apartment__deleted=False, deleted=False,
            ).select_related("user")
        ]

    seen = set()
    emails = []
    for u in users:
        if u.email and u.id not in seen:
            seen.add(u.id)
            emails.append(u.email)
    return emails
