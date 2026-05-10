import logging

from django.apps import AppConfig

logger = logging.getLogger(__name__)


class AssociationsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "associations"

    def ready(self):
        b64 = self._get_setting("BUNADARSKILRIKI")
        if not b64:
            logger.warning(
                "BUNADARSKILRIKI is not set — Landsbankinn mTLS will fail. "
                "Run 'doppler run --' to inject secrets."
            )
            return

        try:
            from associations.banks import cert
            cert.load()
            expiry = cert.get_expiry()

            from datetime import datetime, timezone
            days = (expiry - datetime.now(tz=timezone.utc)).days
            if days < 30:
                logger.warning(
                    "Landsbankinn mTLS certificate expires in %d days (%s) — renew soon.",
                    days, expiry.date(),
                )
            else:
                logger.info(
                    "Landsbankinn mTLS certificate OK — expires %s (%d days).",
                    expiry.date(), days,
                )
        except Exception as exc:
            raise RuntimeError(
                f"Landsbankinn mTLS certificate could not be loaded: {exc}"
            ) from exc

    @staticmethod
    def _get_setting(name: str) -> str:
        try:
            from django.conf import settings
            return getattr(settings, name, "") or ""
        except Exception:
            return ""
