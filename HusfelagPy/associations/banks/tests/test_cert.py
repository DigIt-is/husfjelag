"""
Unit tests for associations/banks/cert.py

All tests mock load_pkcs12 so no real PFX is required.
"""

import base64
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import pytest
from django.core.exceptions import ImproperlyConfigured


def _b64(data: bytes = b"fake-pfx-data") -> str:
    return base64.b64encode(data).decode()


@pytest.fixture
def valid_pfx_b64_and_pwd():
    """
    Build a real self-signed PFX (key + cert) in memory so tests that need to
    parse an actual PKCS#12 (e.g. load_pem()) don't have to mock pkcs12 internals.
    """
    from cryptography import x509
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.hazmat.primitives.serialization import pkcs12
    from cryptography.x509.oid import NameOID

    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    subject = issuer = x509.Name(
        [x509.NameAttribute(NameOID.COMMON_NAME, "test.husfjelag.is")]
    )
    cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(datetime.now(tz=timezone.utc) - timedelta(days=1))
        .not_valid_after(datetime.now(tz=timezone.utc) + timedelta(days=365))
        .sign(key, hashes.SHA256())
    )

    pwd = "secret"
    pfx_bytes = pkcs12.serialize_key_and_certificates(
        name=b"test",
        key=key,
        cert=cert,
        cas=None,
        encryption_algorithm=serialization.BestAvailableEncryption(pwd.encode()),
    )
    return base64.b64encode(pfx_bytes).decode(), pwd


@pytest.fixture(autouse=True)
def clear_cert_cache():
    """Reset the module-level cache between tests."""
    from associations.banks import cert
    cert.clear_cache()
    yield
    cert.clear_cache()


def test_load_missing_bunadarskilriki(settings):
    settings.BUNADARSKILRIKI = ""
    settings.BUNADARSKILRIKI_PWD = "secret"
    from associations.banks import cert
    with pytest.raises(ImproperlyConfigured, match="BUNADARSKILRIKI is not set"):
        cert.load()


def test_load_missing_password(settings):
    settings.BUNADARSKILRIKI = _b64()
    settings.BUNADARSKILRIKI_PWD = ""
    from associations.banks import cert
    with pytest.raises(ImproperlyConfigured, match="BUNADARSKILRIKI_PWD is not set"):
        cert.load()


def test_load_invalid_base64(settings):
    settings.BUNADARSKILRIKI = "not-valid-base64!!!"
    settings.BUNADARSKILRIKI_PWD = "secret"
    from associations.banks import cert
    with pytest.raises(ImproperlyConfigured, match="valid base64"):
        cert.load()


def test_load_bad_pfx(settings):
    """Valid base64 but garbage bytes — pkcs12 parse should fail."""
    settings.BUNADARSKILRIKI = _b64(b"this-is-not-a-pfx")
    settings.BUNADARSKILRIKI_PWD = "secret"
    from associations.banks import cert
    with pytest.raises(ImproperlyConfigured, match="could not be loaded as a PFX"):
        cert.load()


def test_load_success(settings):
    """Valid base64 + valid PFX parse → returns (bytes, str) and caches."""
    settings.BUNADARSKILRIKI = _b64(b"fake-pfx")
    settings.BUNADARSKILRIKI_PWD = "secret"

    mock_p12 = MagicMock()

    from associations.banks import cert
    with patch(
        "associations.banks.cert.load_pkcs12" if hasattr(cert, "load_pkcs12")
        else "cryptography.hazmat.primitives.serialization.pkcs12.load_pkcs12",
        return_value=mock_p12,
    ) as mock_load:
        # Patch inside the module's namespace
        with patch("associations.banks.cert.__builtins__", None):
            pass

    # Use a cleaner patch approach
    with patch("associations.banks.cert.load_pkcs12" if False else "builtins.__import__"):
        pass

    # Directly patch the import inside load()
    import associations.banks.cert as cert_module
    with patch(
        "cryptography.hazmat.primitives.serialization.pkcs12.load_pkcs12",
        return_value=mock_p12,
    ):
        result = cert_module.load()

    assert result == (b"fake-pfx", "secret")
    # Second call returns cache without re-parsing
    result2 = cert_module.load()
    assert result2 is result


def test_load_is_cached(settings):
    """load() is only called once — subsequent calls return the cached value."""
    settings.BUNADARSKILRIKI = _b64(b"fake-pfx")
    settings.BUNADARSKILRIKI_PWD = "secret"

    mock_p12 = MagicMock()

    import associations.banks.cert as cert_module
    with patch(
        "cryptography.hazmat.primitives.serialization.pkcs12.load_pkcs12",
        return_value=mock_p12,
    ) as mock_load:
        cert_module.load()
        cert_module.load()
        cert_module.load()
        # load_pkcs12 called only once for the initial parse
        assert mock_load.call_count == 1


def test_get_expiry_returns_utc_datetime(settings):
    """get_expiry() returns a UTC-aware datetime from the PFX certificate."""
    settings.BUNADARSKILRIKI = _b64(b"fake-pfx")
    settings.BUNADARSKILRIKI_PWD = "secret"

    future = datetime(2027, 12, 31, tzinfo=timezone.utc)
    mock_cert = MagicMock()
    mock_cert.not_valid_after_utc = future
    mock_p12 = MagicMock()
    mock_p12.cert.certificate = mock_cert

    import associations.banks.cert as cert_module
    with patch(
        "cryptography.hazmat.primitives.serialization.pkcs12.load_pkcs12",
        return_value=mock_p12,
    ):
        expiry = cert_module.get_expiry()

    assert expiry == future
    assert expiry.tzinfo is not None


def test_get_expiry_warning_threshold(settings):
    """Verify the 30-day warning threshold logic works with a near-expiry cert."""
    settings.BUNADARSKILRIKI = _b64(b"fake-pfx")
    settings.BUNADARSKILRIKI_PWD = "secret"

    near_future = datetime.now(tz=timezone.utc) + timedelta(days=15)
    mock_cert = MagicMock()
    mock_cert.not_valid_after_utc = near_future
    mock_p12 = MagicMock()
    mock_p12.cert.certificate = mock_cert

    import associations.banks.cert as cert_module
    with patch(
        "cryptography.hazmat.primitives.serialization.pkcs12.load_pkcs12",
        return_value=mock_p12,
    ):
        expiry = cert_module.get_expiry()

    days_remaining = (expiry - datetime.now(tz=timezone.utc)).days
    assert days_remaining < 30


def test_load_pem_returns_key_and_cert(monkeypatch, valid_pfx_b64_and_pwd):
    from associations.banks import cert as cert_module
    cert_module.clear_cache()
    b64, pwd = valid_pfx_b64_and_pwd
    monkeypatch.setattr(cert_module.settings, "BUNADARSKILRIKI", b64, raising=False)
    monkeypatch.setattr(cert_module.settings, "BUNADARSKILRIKI_PWD", pwd, raising=False)
    key_pem, cert_pem = cert_module.load_pem()
    assert b"PRIVATE KEY" in key_pem
    assert b"BEGIN CERTIFICATE" in cert_pem
