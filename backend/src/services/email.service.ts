import nodemailer from "nodemailer";

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  EMAIL_FROM,
  FRONTEND_URL,
} = process.env;

const emailConfigured =
  Boolean(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS && EMAIL_FROM) &&
  !process.env.DISABLE_EMAIL;

const transporter = emailConfigured
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    })
  : null;

export async function sendPasswordResetEmail({
  to,
  token,
  recipientName,
}: {
  to: string;
  token: string;
  recipientName?: string | null;
}) {
  if (!emailConfigured || !transporter) {
    console.warn(
      "[email] SMTP configuration missing or disabled. Skipping password reset email.",
    );
    return false;
  }

  const resetUrlBase = FRONTEND_URL || "http://localhost:5173";
  const resetUrl = `${resetUrlBase.replace(/\/$/, "")}/reset-password?token=${token}`;

  const name = recipientName?.trim() || "there";
  const subject = "Reset your Classroom Clicker password";
  const text = `Hi ${name},

You (or someone pretending to be you) requested a password reset for Classroom Clicker.

Follow this link to set a new password:
${resetUrl}

If you did not request this, you can safely ignore this email.

Thanks,
Classroom Clicker Team`;

  const html = `
    <p>Hi ${name},</p>
    <p>You (or someone pretending to be you) requested a password reset for Classroom Clicker.</p>
    <p><a href="${resetUrl}" target="_blank" rel="noopener noreferrer">Click here to set a new password</a>.</p>
    <p>If you did not request this, you can safely ignore this email.</p>
    <p>Thanks,<br/>Classroom Clicker Team</p>
  `;

  await transporter.sendMail({
    from: EMAIL_FROM,
    to,
    subject,
    text,
    html,
  });

  return true;
}
