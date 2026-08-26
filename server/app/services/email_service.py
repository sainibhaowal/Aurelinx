"""Small SMTP delivery service used by authentication emails."""

import smtplib
from email.message import EmailMessage

from app.core.config import settings


class EmailDeliveryError(Exception):
    """Raised when a verification email could not be delivered."""


def send_verification_email(recipient: str, code: str, expires_in: int) -> None:
    """Send a plain-text OTP email through the configured SMTP relay."""
    if not settings.SMTP_ENABLED:
        raise EmailDeliveryError("SMTP delivery is not enabled")

    minutes = max(1, expires_in // 60)
    message = EmailMessage()
    message["Subject"] = "Your Aurelinx verification code"
    message["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM}>"
    message["To"] = recipient
    message.set_content(
        f"Your Aurelinx verification code is: {code}\n\n"
        f"It expires in {minutes} minute{'s' if minutes != 1 else ''}. "
        "If you did not request this, you can safely ignore this email."
    )

    try:
        with smtplib.SMTP(
            settings.SMTP_HOST,
            settings.SMTP_PORT,
            timeout=settings.SMTP_TIMEOUT_SECONDS,
        ) as smtp:
            if settings.SMTP_TLS:
                smtp.starttls()
            if settings.SMTP_USER:
                smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD or "")
            smtp.send_message(message)
    except (OSError, smtplib.SMTPException) as exc:
        raise EmailDeliveryError("Unable to deliver the verification email") from exc
