from urllib.parse import quote

import pytest

from app.core.config import settings
from app.services.email_service import EmailDeliveryError, send_verification_email


def test_send_verification_email_includes_multipart_cta_links(monkeypatch):
    sent_messages = []

    class FakeSMTP:
        def __init__(self, host, port, timeout):
            self.host = host
            self.port = port
            self.timeout = timeout

        def __enter__(self):
            return self

        def __exit__(self, *_):
            return False

        def starttls(self):
            return None

        def login(self, *_):
            return None

        def send_message(self, message):
            sent_messages.append(message)

    monkeypatch.setattr("app.services.email_service.smtplib.SMTP", FakeSMTP)
    monkeypatch.setattr(settings, "SMTP_ENABLED", True)
    monkeypatch.setattr(settings, "SMTP_TLS", False)
    monkeypatch.setattr(settings, "SMTP_USER", None)
    monkeypatch.setattr(settings, "FRONTEND_URL", "https://app.aurelinx.com")

    token = "token with spaces"
    code = "123456"
    send_verification_email("user@example.com", code, token, 600)

    assert len(sent_messages) == 1
    message = sent_messages[0]
    plain = message.get_body(preferencelist=("plain",)).get_content()
    html = message.get_body(preferencelist=("html",)).get_content()
    verify_link = (
        f"https://app.aurelinx.com/login?verify_email={quote(token, safe='')}"
    )

    assert "Your Aurelinx verification code is: 123456" in plain
    assert verify_link in plain
    assert "Open Aurelinx" in html
    assert "Verify from email" in html
    assert code in html
    assert verify_link in html


def test_send_verification_email_requires_enabled_smtp(monkeypatch):
    monkeypatch.setattr(settings, "SMTP_ENABLED", False)
    with pytest.raises(EmailDeliveryError, match="not enabled"):
        send_verification_email("user@example.com", "123456", "token", 600)
