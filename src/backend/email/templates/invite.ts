/**
 * HTML / text templates for invite emails.
 *
 * Kept as plain template literals (no MJML, no React Email) because:
 *   - The total volume here is tiny — a single email type today.
 *   - Email clients are HTML 4 + inline CSS; modern abstractions give
 *     us little above what a tagged literal does.
 *   - One fewer dep to keep updated.
 *
 * Escapes user-supplied strings (family name, inviter name) before
 * interpolation. The URL is *not* escaped — it's our own `appUrl` +
 * a base64url token, both safe.
 */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface InviteEmailContext {
  inviteUrl: string;
  familyName: string;
  inviterName: string | null;
  recipientEmail: string;
  expiresAt: Date;
}

export function renderInviteEmail(ctx: InviteEmailContext): {
  subject: string;
  html: string;
  text: string;
} {
  const safeFamily = escapeHtml(ctx.familyName);
  const safeInviter = escapeHtml(ctx.inviterName ?? "A member");
  const expires = ctx.expiresAt.toUTCString();

  const subject = `${ctx.inviterName ?? "A member"} invited you to ${ctx.familyName}`;

  const html = `<!doctype html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #111;">
    <h2 style="margin: 0 0 16px;">You're invited to ${safeFamily}</h2>
    <p style="margin: 0 0 16px; line-height: 1.5;">
      ${safeInviter} invited you to share the <strong>${safeFamily}</strong> workspace
      on Pido Rich Tracker. Accept the invite to start logging expenses and goals together.
    </p>
    <p style="margin: 24px 0;">
      <a href="${ctx.inviteUrl}"
         style="display: inline-block; background: #111; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none;">
        Accept invite
      </a>
    </p>
    <p style="margin: 0 0 8px; color: #555; font-size: 13px;">
      This invite is for <strong>${escapeHtml(ctx.recipientEmail)}</strong> and expires on ${expires}.
    </p>
    <p style="margin: 0; color: #888; font-size: 12px;">
      If you weren't expecting this, you can safely ignore the email — the link can only
      be used once and only by the address above.
    </p>
  </body>
</html>`;

  const text = `${ctx.inviterName ?? "A member"} invited you to share the "${ctx.familyName}" workspace on Pido Rich Tracker.

Accept the invite: ${ctx.inviteUrl}

This invite is for ${ctx.recipientEmail} and expires on ${expires}.
If you weren't expecting this, you can safely ignore the email.`;

  return { subject, html, text };
}
