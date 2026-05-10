"""
Load the Landsbankinn mTLS client certificate from environment.

BUNADARSKILRIKI     — base64-encoded PFX (injected by Doppler)
BUNADARSKILRIKI_PWD — PFX password       (injected by Doppler)

The decoded bytes are cached in memory for the lifetime of the process.
Nothing is ever written to disk.
"""

import base64
import logging
from datetime import datetime, timezone

from django.conf import settings

logger = logging.getLogger(__name__)

_CACHE: tuple[bytes, str] | None = None


def load() -> tuple[bytes, str]:
    """
    Return (pfx_bytes, password).

    Decodes BUNADARSKILRIKI from base64, validates it can be parsed as a PFX,
    then caches the result.  Raises ImproperlyConfigured on any failure.
    """
    global _CACHE
    if _CACHE is not None:
        return _CACHE

    from django.core.exceptions import ImproperlyConfigured

    b64 = getattr(settings, "BUNADARSKILRIKI", "").strip()
    pwd = getattr(settings, "BUNADARSKILRIKI_PWD", "")

    if not b64:
        raise ImproperlyConfigured(
            "BUNADARSKILRIKI is not set. "
            "Run 'doppler setup' and use 'doppler run --' to inject it."
        )
    if not pwd:
        raise ImproperlyConfigured("BUNADARSKILRIKI_PWD is not set.")

    try:
        pfx_bytes = base64.b64decode(b64)
    except Exception as exc:
        raise ImproperlyConfigured(
            f"BUNADARSKILRIKI is not valid base64: {exc}"
        ) from exc

    try:
        from cryptography.hazmat.primitives.serialization.pkcs12 import load_pkcs12
        load_pkcs12(pfx_bytes, pwd.encode())
    except Exception as exc:
        raise ImproperlyConfigured(
            f"BUNADARSKILRIKI could not be loaded as a PFX: {exc}"
        ) from exc

    _CACHE = (pfx_bytes, pwd)
    return _CACHE


def get_expiry() -> datetime:
    """
    Return the notAfter datetime (UTC) of the end-entity certificate in the PFX.
    """
    pfx_bytes, pwd = load()
    from cryptography.hazmat.primitives.serialization.pkcs12 import load_pkcs12
    p12 = load_pkcs12(pfx_bytes, pwd.encode())
    cert = p12.cert.certificate
    if hasattr(cert, "not_valid_after_utc"):
        return cert.not_valid_after_utc
    return cert.not_valid_after.replace(tzinfo=timezone.utc)


def clear_cache() -> None:
    """Reset the in-process cache (used in tests)."""
    global _CACHE
    _CACHE = None
