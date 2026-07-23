import pytest
from datetime import timedelta
from unittest.mock import patch, MagicMock
from django.utils.timezone import now
from django.test import override_settings

TEST_API_KEY = "test-api-key-abc123"
AUTH_URL = "https://mtls-auth.example.test/connect/token"


def _make_assoc(ssn):
    from associations.models import Association
    return Association.objects.create(
        ssn=ssn, name="BA", address="A", postal_code="100", city="RVK"
    )


@override_settings(BANK_LANDSBANKINN_AUTH_URL=AUTH_URL)
@pytest.mark.django_db
def test_get_access_token_returns_cached_token():
    """If BankTokenCache has a valid (not-yet-expiring) token, return it without HTTP call."""
    from cryptography.fernet import Fernet
    from associations.models import BankTokenCache
    from django.conf import settings

    key = settings.BANK_FERNET_KEY
    if not key:
        pytest.skip("BANK_FERNET_KEY not set")

    assoc = _make_assoc("5551110001")
    fernet = Fernet(key.encode() if isinstance(key, str) else key)
    encrypted = fernet.encrypt(b"cached-token-abc").decode()

    BankTokenCache.objects.update_or_create(
        bank="LANDSBANKINN",
        association=assoc,
        defaults={
            "access_token": encrypted,
            "expires_at": now() + timedelta(minutes=10),
        },
    )

    from associations.banks import landsbankinn
    with patch.object(landsbankinn, "requests_pkcs12") as mock_lib:
        result = landsbankinn.get_access_token(assoc.id, TEST_API_KEY)

    assert result == "cached-token-abc"
    mock_lib.post.assert_not_called()


@override_settings(BANK_LANDSBANKINN_AUTH_URL=AUTH_URL)
@pytest.mark.django_db
def test_get_access_token_refreshes_when_no_cache():
    """If no cache row exists, fetch a new token via mTLS POST."""
    from associations.models import BankTokenCache

    assoc = _make_assoc("5551110002")

    mock_resp = MagicMock()
    mock_resp.json.return_value = {"access_token": "fresh-token", "expires_in": 1200}
    mock_resp.raise_for_status = MagicMock()

    from associations.banks import landsbankinn, cert as cert_module
    with (
        patch.object(landsbankinn, "requests_pkcs12") as mock_lib,
        patch.object(cert_module, "load", return_value=(b"fake-pfx", "fake-pwd")),
    ):
        mock_lib.post.return_value = mock_resp
        result = landsbankinn.get_access_token(assoc.id, TEST_API_KEY)

    assert result == "fresh-token"
    assert BankTokenCache.objects.filter(bank="LANDSBANKINN", association=assoc).exists()
    mock_lib.post.assert_called_once()


@override_settings(BANK_LANDSBANKINN_AUTH_URL=AUTH_URL)
@pytest.mark.django_db
def test_get_access_token_per_association_isolation():
    """Tokens are cached independently per association — different associations don't share a token."""
    from cryptography.fernet import Fernet
    from associations.models import BankTokenCache
    from django.conf import settings

    key = settings.BANK_FERNET_KEY
    if not key:
        pytest.skip("BANK_FERNET_KEY not set")

    fernet = Fernet(key.encode() if isinstance(key, str) else key)
    a1 = _make_assoc("5551110003")
    a2 = _make_assoc("5551110004")

    for assoc, token_val in [(a1, "token-alpha"), (a2, "token-beta")]:
        BankTokenCache.objects.update_or_create(
            bank="LANDSBANKINN",
            association=assoc,
            defaults={
                "access_token": fernet.encrypt(token_val.encode()).decode(),
                "expires_at": now() + timedelta(minutes=10),
            },
        )

    from associations.banks import landsbankinn
    with patch.object(landsbankinn, "requests_pkcs12"):
        result_alpha = landsbankinn.get_access_token(a1.id, "key-alpha")
        result_beta = landsbankinn.get_access_token(a2.id, "key-beta")

    assert result_alpha == "token-alpha"
    assert result_beta == "token-beta"
    assert result_alpha != result_beta


@override_settings(BANK_LANDSBANKINN_AUTH_URL=AUTH_URL)
@pytest.mark.django_db
def test_get_access_token_refreshes_expired_token():
    """A token expiring within 60 s is treated as expired and refreshed."""
    from cryptography.fernet import Fernet
    from associations.models import BankTokenCache
    from django.conf import settings

    key = settings.BANK_FERNET_KEY
    if not key:
        pytest.skip("BANK_FERNET_KEY not set")

    assoc = _make_assoc("5551110005")
    fernet = Fernet(key.encode() if isinstance(key, str) else key)
    stale = fernet.encrypt(b"stale-token").decode()

    BankTokenCache.objects.update_or_create(
        bank="LANDSBANKINN",
        association=assoc,
        defaults={
            "access_token": stale,
            "expires_at": now() + timedelta(seconds=30),  # within 60-s refresh window
        },
    )

    mock_resp = MagicMock()
    mock_resp.json.return_value = {"access_token": "refreshed-token", "expires_in": 1200}
    mock_resp.raise_for_status = MagicMock()

    from associations.banks import landsbankinn, cert as cert_module
    with (
        patch.object(landsbankinn, "requests_pkcs12") as mock_lib,
        patch.object(cert_module, "load", return_value=(b"fake-pfx", "fake-pwd")),
    ):
        mock_lib.post.return_value = mock_resp
        result = landsbankinn.get_access_token(assoc.id, TEST_API_KEY)

    assert result == "refreshed-token"
    mock_lib.post.assert_called_once()
