"""Small SMTP delivery service used by authentication emails."""

import smtplib
from email.message import EmailMessage
from urllib.parse import quote

from app.core.config import settings


class EmailDeliveryError(Exception):
    """Raised when a verification email could not be delivered."""


def send_verification_email(
    recipient: str, code: str, token: str, expires_in: int
) -> None:
    """Send a multipart verification email through the configured SMTP relay."""
    if not settings.SMTP_ENABLED:
        raise EmailDeliveryError("SMTP delivery is not enabled")

    minutes = max(1, expires_in // 60)
    frontend_url = settings.FRONTEND_URL.rstrip("/")
    verify_link = f"{frontend_url}/login?verify_email={quote(token, safe='')}&email={quote(recipient, safe='')}"
    message = EmailMessage()
    message["Subject"] = "Your Aurelinx verification code"
    message["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM}>"
    message["To"] = recipient
    message.set_content(
        f"Your Aurelinx verification code is: {code}\n\n"
        f"It expires in {minutes} minute{'s' if minutes != 1 else ''}. "
        "Use this one-click link to verify from email:\n"
        f"{verify_link}\n\n"
        "Open Aurelinx:\n"
        f"{frontend_url}\n\n"
        "If you did not request this, you can safely ignore this email."
    )
    message.add_alternative(
        f"""
        <html>
          <body style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.5;">
            <p>Your Aurelinx verification code:</p>
            <p style="font-size: 40px; font-weight: 700; letter-spacing: 6px; margin: 16px 0;">
              {code}
            </p>
            <p>
              Expires in {minutes} minute{'s' if minutes != 1 else ''}.
            </p>
            <p style="margin: 24px 0;">
              <a href="{frontend_url}" style="display: inline-block; background: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 6px; margin-right: 8px;">Open Aurelinx</a>
              <a href="{verify_link}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 6px;">Verify from email</a>
            </p>
            <p>If you did not request this, you can safely ignore this email.</p>
          </body>
        </html>
        """,
        subtype="html",
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
