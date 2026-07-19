"""Signed, authenticated Íslandsbanki SOAP seam. Signing proven by the Phase 0 spike."""
import logging
from django.conf import settings as dj_settings
from zeep import Client
from zeep.helpers import serialize_object
from zeep.wsse.username import UsernameToken
from zeep.wsse.signature import BinarySignature, MemorySignature

from associations.banks import cert as cert_module

logger = logging.getLogger(__name__)

_SVC = {
    "yfirlit": lambda: (dj_settings.BANK_ISLANDSBANKI_YFIRLIT_WSDL,
                        dj_settings.BANK_ISLANDSBANKI_YFIRLIT_ENDPOINT,
                        "{http://ws.isb.is}YfirlitWSSoap"),
    "krofur":  lambda: (dj_settings.BANK_ISLANDSBANKI_KROFUR_WSDL,
                        dj_settings.BANK_ISLANDSBANKI_KROFUR_ENDPOINT,
                        "{http://ws.isb.is}KrofurWSSoap"),
}

_WSSE = "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd"


class BinarySignatureTokenFirst(BinarySignature):
    """zeep emits <ds:Signature> before the BinarySecurityToken; the .NET server rejects
    that with SecurityTokenUnavailable. Move the BST to be the first child of <wsse:Security>
    AFTER signing (only soap:Body is digested, so header reordering is signature-safe).

    Also overrides __init__: BinarySignature's parent (Signature) reads key/cert from disk
    via _read_file(key_file) — but we want in-memory PEM buffers (MemorySignature-style,
    nothing written to disk), so we bypass Signature.__init__ and call MemorySignature.__init__
    directly with the PEM bytes.
    """
    def __init__(self, key_pem: bytes, cert_pem: bytes, password=None,
                 signature_method=None, digest_method=None):
        MemorySignature.__init__(self, key_pem, cert_pem, password, signature_method, digest_method)

    def apply(self, envelope, headers):
        envelope, headers = super().apply(envelope, headers)
        security = envelope.find(f".//{{{_WSSE}}}Security")
        bst = security.find(f"{{{_WSSE}}}BinarySecurityToken") if security is not None else None
        if security is not None and bst is not None:
            security.remove(bst)
            security.insert(0, bst)
        return envelope, headers


class WsseBundle:
    """Chain UsernameToken + signature on apply; no-op verify (rely on TLS + fault inspection,
    not response-signature verification)."""
    def __init__(self, *handlers):
        self.handlers = handlers
    def apply(self, envelope, headers):
        for h in self.handlers:
            envelope, headers = h.apply(envelope, headers)
        return envelope, headers
    def verify(self, envelope):
        return envelope


def _client(settings_obj, service: str) -> tuple[Client, str, str]:
    wsdl, endpoint, binding = _SVC[service]()
    key_pem, cert_pem = cert_module.load_pem()
    wsse = WsseBundle(
        UsernameToken(settings_obj.isb_username, settings_obj.get_isb_password()),
        BinarySignatureTokenFirst(key_pem, cert_pem),   # MemorySignature-style: PEM buffers, nothing to disk
    )
    return Client(wsdl, wsse=wsse), endpoint, binding


def invoke(settings_obj, service: str, operation: str, **kwargs):
    """Call `operation` on the `service` SOAP endpoint (endpoint overridden — the WSDL
    soap:address points at prod); audit-log; return serialized dict(s)."""
    from associations.models import BankApiAuditLog
    client, endpoint, binding = _client(settings_obj, service)
    svc = client.create_service(binding, endpoint)   # override prod address from WSDL
    status_code = 200
    try:
        result = getattr(svc, operation)(**kwargs)
        return serialize_object(result)
    except Exception:
        status_code = 500
        logger.exception("ISB %s.%s failed", service, operation)  # never log the envelope (cleartext pwd)
        raise
    finally:
        BankApiAuditLog.objects.create(
            association_id=settings_obj.association_id, bank="islandsbanki",
            endpoint=operation, http_method="POST", status_code=status_code,
        )
