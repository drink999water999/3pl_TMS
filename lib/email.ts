// Server-only email helper. Picks a provider from environment variables so the
// same call works whether the user configured a personal mailbox (Gmail / any
// SMTP) or Resend. Priority: SMTP (Gmail or generic) → Resend → not configured.
//
// EASIEST SETUP (Gmail): in .env.local set
//   GMAIL_USER="you@gmail.com"
//   GMAIL_APP_PASSWORD="xxxx xxxx xxxx xxxx"   (a 16-char App Password)
// Create the App Password at https://myaccount.google.com/apppasswords
// (requires 2-Step Verification on the account). That's it — no domain needed.
import nodemailer from "nodemailer";
import { Resend } from "resend";

export type MailAttachment = { filename: string; content: Buffer };
export type SendResult = { error?: string };

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  auth: { user: string; pass: string };
  from: string;
};

// Resolve an SMTP config from env. Gmail is a one-liner shortcut; a generic
// SMTP block covers Outlook/Office365, a company mail server, SendGrid SMTP, etc.
function smtpConfig(): SmtpConfig | null {
  const gUser = process.env.GMAIL_USER;
  const gPass = process.env.GMAIL_APP_PASSWORD;
  if (gUser && gPass) {
    return {
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: gUser, pass: gPass.replace(/\s+/g, "") },
      from: process.env.SMTP_FROM || gUser,
    };
  }

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (host && user && pass) {
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = process.env.SMTP_SECURE
      ? process.env.SMTP_SECURE === "true"
      : port === 465;
    return {
      host,
      port,
      secure,
      auth: { user, pass },
      from: process.env.SMTP_FROM || user,
    };
  }
  return null;
}

// True when *some* provider is set up. Used by the UI to decide whether to show
// the Email action as available.
export function emailConfigured(): boolean {
  return smtpConfig() !== null || !!process.env.RESEND_API_KEY;
}

const NOT_CONFIGURED =
  "Email isn't set up yet. Easiest option: add GMAIL_USER and GMAIL_APP_PASSWORD " +
  "to .env.local (create an App Password at https://myaccount.google.com/apppasswords), " +
  "then restart. You can also use any SMTP server (SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS) " +
  "or a Resend API key. See .env.local.example.";

export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: MailAttachment[];
}): Promise<SendResult> {
  const { to, subject, text, html, attachments } = opts;

  // 1) Personal / company mailbox over SMTP (Gmail is the easy path).
  const smtp = smtpConfig();
  if (smtp) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth: smtp.auth,
      });
      await transporter.sendMail({
        from: smtp.from,
        to,
        subject,
        text,
        html,
        attachments: attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
        })),
      });
      return {};
    } catch (e) {
      const msg = e instanceof Error ? e.message : "SMTP send failed.";
      return {
        error:
          `Could not send via SMTP (${smtp.host}): ${msg}. ` +
          "For Gmail, make sure GMAIL_APP_PASSWORD is a 16-character App Password " +
          "(not your normal password) and 2-Step Verification is on.",
      };
    }
  }

  // 2) Resend (kept for backwards compatibility / hosted sending).
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    const resend = new Resend(apiKey);
    const from =
      process.env.RESEND_FROM_EMAIL ??
      "FastLane Logistics <onboarding@resend.dev>";
    const { error } = await resend.emails.send({
      from,
      to,
      subject,
      text,
      html,
      attachments: attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
      })),
    });
    if (error) return { error: error.message };
    return {};
  }

  // 3) Nothing configured.
  return { error: NOT_CONFIGURED };
}
