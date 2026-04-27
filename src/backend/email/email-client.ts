import { env } from "@backend/config/env";

/**
 * Email delivery wrapper. SMTP only — zero-cost, no domain required.
 * If SMTP env is unset, sends are no-op'd (caller surfaces the URL
 * to the user as a fallback). All sends best-effort; throws on failure.
 */

export class EmailDeliveryError extends Error {
  constructor(
    message: string,
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = "EmailDeliveryError";
  }
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  /** Optional plain-text fallback. Strongly recommended. */
  text?: string;
  /** Internal correlation tag — surfaces in logs but not the email. */
  tag?: string;
}

function smtpConfigured(): boolean {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
}

function resolveFrom(): string {
  // Most providers (Gmail) rewrite From to the authenticated user.
  return env.EMAIL_FROM ?? env.SMTP_USER ?? "";
}

// Lazy singleton transporter — only paid on first send.

type NodemailerTransporter = {
  sendMail: (opts: {
    from: string;
    to: string;
    subject: string;
    html: string;
    text?: string;
  }) => Promise<unknown>;
};

let smtpTransporter: NodemailerTransporter | null = null;

async function getSmtpTransporter(): Promise<NodemailerTransporter> {
  if (smtpTransporter) return smtpTransporter;
  const nodemailer = await import("nodemailer");
  smtpTransporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE, // true for 465, false for 587 (STARTTLS).
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  }) as unknown as NodemailerTransporter;
  return smtpTransporter;
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  if (!smtpConfigured()) {
    // No SMTP configured: log subject only (never the body — invites carry tokens).
    console.info(
      `[email:noop] would send to=${input.to} subject="${input.subject}" tag=${input.tag ?? "none"}`,
    );
    return;
  }

  let transporter: NodemailerTransporter;
  try {
    transporter = await getSmtpTransporter();
  } catch (error) {
    throw new EmailDeliveryError("Failed to initialize SMTP transport", error);
  }
  try {
    await transporter.sendMail({
      from: resolveFrom(),
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
  } catch (error) {
    throw new EmailDeliveryError("SMTP send failed", error);
  }
}
