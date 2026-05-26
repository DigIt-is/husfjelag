import logging
from datetime import date, timedelta

import bugsnag
from celery import shared_task
from django.utils.timezone import now as tz_now

logger = logging.getLogger(__name__)


@shared_task(name="associations.tasks.send_event_reminders")
def send_event_reminders() -> dict:
    """Send reminder emails for events whose reminder window has arrived.

    Runs daily. For each non-deleted event that has a reminder configured and
    has not been reminded yet, if today is on/after (event_date - reminder_days)
    and the event has not already passed, email the audience matching the event's
    visibility (BOARD → CHAIR/CFO; ALL → all current active owners). Each event is
    stamped reminder_sent_at once processed so it never fires twice.
    """
    from associations.models import AssociationEvent
    from associations.events import event_recipient_emails
    from associations.notifications import send_email

    today = date.today()
    events = AssociationEvent.objects.filter(
        deleted=False,
        reminder_days__isnull=False,
        reminder_sent_at__isnull=True,
    ).select_related("association")

    processed = 0
    for event in events:
        trigger = event.event_date - timedelta(days=event.reminder_days)
        if today < trigger or today > event.event_date:
            continue

        recipients = event_recipient_emails(event)

        when = event.event_date.strftime("%d.%m.%Y")
        if event.event_time:
            when += f" kl. {event.event_time.strftime('%H:%M')}"
        subject = f"Áminning: {event.title} – {when}"
        html = (
            f"<p>Áminning um viðburð hjá {event.association.name}.</p>"
            f"<p><strong>{event.title}</strong><br>{when}</p>"
            + (f"<p>{event.description}</p>" if event.description else "")
        )

        delivered = 0
        for email in recipients:
            try:
                if send_email(email, subject, html):
                    delivered += 1
            except Exception as exc:
                logger.error(
                    "send_event_reminders: send failed for event %s → %s: %s",
                    event.id, email, exc,
                )
                bugsnag.notify(
                    exc,
                    context="celery:send_event_reminders",
                    extra_data={"event_id": event.id, "recipient": email},
                )

        event.reminder_sent_at = tz_now()
        event.save(update_fields=["reminder_sent_at"])
        processed += 1
        logger.info(
            "send_event_reminders: event=%s recipients=%s delivered=%s",
            event.id, len(recipients), delivered,
        )

    return {"events_processed": processed}
