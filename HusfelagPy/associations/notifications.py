import logging

from django.conf import settings

logger = logging.getLogger(__name__)


def send_email(to, subject, html):
    """Send a single transactional email via Resend.

    Returns True if dispatched, False if email is not configured (no API key —
    e.g. local dev), and raises on Resend API errors so callers can report them.
    """
    api_key = getattr(settings, "RESEND_API_KEY", "")
    if not api_key:
        logger.info("send_email skipped (RESEND_API_KEY not set): to=%s subject=%s", to, subject)
        return False

    import resend

    resend.api_key = api_key
    resend.Emails.send({
        "from": settings.DEFAULT_FROM_EMAIL,
        "to": [to],
        "subject": subject,
        "html": html,
    })
    return True
