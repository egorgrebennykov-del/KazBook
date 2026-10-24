/**
 * Email dispatch service for Litera customer support.
 * Uses Resend API to deliver administrator replies to unregistered guest users.
 */

const RESEND_API_URL = "https://api.resend.com/emails";
const DEFAULT_SUPPORT_EMAIL = "litera.eu@gmail.com";
const DEFAULT_FROM = "Litera Support <onboarding@resend.dev>";

export async function sendGuestInquiryEmail({
  to,
  subject,
  text,
  adminName,
}) {
  if (!to || !text) {
    throw new Error("Missing required email fields: to, text");
  }

  const cleanTo = String(to).trim().toLowerCase();
  const cleanText = String(text).trim();
  const senderName = adminName ? String(adminName).trim() : "Служба поддержки Litera";
  const mailSubject = subject || "Ответ от службы поддержки Litera";

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY environment variable is not configured");
  }
  const supportEmail =
    process.env.SUPPORT_EMAIL || process.env.RESEND_REPLY_TO || DEFAULT_SUPPORT_EMAIL;
  const fromAddress =
    process.env.RESEND_FROM || DEFAULT_FROM;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${mailSubject}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 32px 16px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); overflow: hidden;">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 28px 32px; color: #ffffff;">
                  <h1 style="margin: 0 0 6px 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">Litera</h1>
                  <p style="margin: 0; font-size: 14px; opacity: 0.9; font-weight: 500;">Книжный интернет-магазин • Служба поддержки читателей</p>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding: 32px;">
                  <p style="font-size: 16px; margin: 0 0 16px 0; color: #334155; line-height: 1.5;">
                    Здравствуйте!
                  </p>
                  <p style="font-size: 15px; margin: 0 0 20px 0; color: #475569; line-height: 1.5;">
                    Администратор <strong>${senderName}</strong> ответил на ваше обращение на сайте Litera:
                  </p>

                  <!-- Message Bubble -->
                  <div style="background-color: #f1f5f9; border-left: 4px solid #6366f1; border-radius: 8px; padding: 18px 20px; margin: 24px 0; font-size: 15px; line-height: 1.6; color: #0f172a; white-space: pre-wrap;">${cleanText}</div>

                  <p style="font-size: 14px; color: #64748b; line-height: 1.5; margin: 24px 0 0 0;">
                    Если у вас остались вопросы, вы можете просто ответить на это письмо (ответ поступит на <strong>${supportEmail}</strong>) или продолжить общение в онлайн-чате на сайте.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; font-size: 12px; color: #94a3b8; line-height: 1.5;">
                  <p style="margin: 0 0 6px 0;">
                    Вы получили это письмо, так как указали свой email в чате с администратором на сайте <a href="https://litera.md" style="color: #6366f1; text-decoration: none; font-weight: 600;">Litera</a>.
                  </p>
                  <p style="margin: 0;">
                    Litera Bookstore © ${new Date().getFullYear()} • Связь с поддержкой: <a href="mailto:${supportEmail}" style="color: #6366f1; text-decoration: none;">${supportEmail}</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const payload = {
    from: fromAddress,
    to: [cleanTo],
    reply_to: supportEmail,
    subject: mailSubject,
    text: `Здравствуйте!\n\nАдминистратор ${senderName} ответил на ваше обращение:\n\n${cleanText}\n\nСлужба поддержки Litera\nКонтакты: ${supportEmail}`,
    html: htmlContent,
  };

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseData = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error("[Resend API Error]", res.status, responseData);
      throw new Error(
        responseData?.message || `Resend dispatch failed with status ${res.status}`
      );
    }

    console.log(
      `[Resend Success] Email dispatched to ${cleanTo} via Resend. Message ID: ${responseData?.id}`
    );

    return {
      success: true,
      id: responseData?.id,
      provider: "resend",
      recipient: cleanTo,
    };
  } catch (err) {
    console.error("[EmailService Error] Failed to send email via Resend:", err.message);
    throw err;
  }
}
