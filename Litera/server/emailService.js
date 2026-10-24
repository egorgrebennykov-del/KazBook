import nodemailer from "nodemailer";

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
    });
  } else {
    // Development / fallback logger transporter
    transporter = {
      sendMail: async (options) => {
        console.log(
          `[EmailService: Simulated Send] To: ${options.to} | Subject: "${options.subject}"`,
        );
        console.log(
          `[EmailService: Content Preview]:\n${options.text || options.html?.slice(0, 300)}...`,
        );
        return { messageId: `mock_${Date.now()}`, simulated: true };
      },
    };
  }

  return transporter;
}

export async function sendGuestInquiryEmail({
  to,
  subject,
  text,
  adminName,
}) {
  if (!to || !text) {
    throw new Error("Missing required email fields: to, text");
  }

  const mailer = getTransporter();
  const mailSubject =
    subject || "Ответ от службы поддержки Litera";
  const senderName = adminName || "Служба поддержки Litera";
  const fromAddress =
    process.env.SMTP_FROM || `"Litera Books" <support@litera.md>`;

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
      <div style="border-bottom: 2px solid #4f46e5; padding-bottom: 16px; margin-bottom: 20px;">
        <h1 style="color: #1e1b4b; font-size: 22px; margin: 0 0 4px 0; font-weight: 700;">Litera</h1>
        <p style="color: #6366f1; font-size: 14px; margin: 0; font-weight: 500;">Служба поддержки читателей</p>
      </div>

      <p style="font-size: 15px; color: #374151; line-height: 1.5; margin-bottom: 16px;">
        Здравствуйте! Администратор <strong>${senderName}</strong> ответил на ваше обращение:
      </p>

      <div style="background-color: #f3f4f6; border-left: 4px solid #6366f1; padding: 16px; margin: 20px 0; border-radius: 6px; font-size: 15px; color: #1f2937; line-height: 1.6; white-space: pre-wrap;">${text}</div>

      <div style="border-top: 1px solid #f3f4f6; padding-top: 16px; margin-top: 24px; font-size: 12px; color: #9ca3af; line-height: 1.4;">
        <p style="margin: 0 0 6px 0;">Вы получили это письмо, так как указали свой email в чате с администратором на сайте <a href="https://litera.md" style="color: #6366f1; text-decoration: none;">Litera</a>.</p>
        <p style="margin: 0;">Если вы хотите продолжить диалог, вы можете ответить на это письмо или написать в чат на сайте.</p>
      </div>
    </div>
  `;

  return await mailer.sendMail({
    from: fromAddress,
    to,
    subject: mailSubject,
    text: `Здравствуйте! Администратор ${senderName} ответил на ваше обращение:\n\n${text}\n\nСлужба поддержки Litera`,
    html: htmlContent,
  });
}
