const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY ?? "";
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN ?? "";
const MAILGUN_FROM = process.env.MAILGUN_FROM ?? "Hypertune <affiliate@hello.hypertune.gg>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://hypertune-affiliate.vercel.app";

interface SendEmailOpts {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOpts) {
  if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN) {
    console.warn("[email] Mailgun not configured, skipping email to:", to);
    return;
  }

  const form = new URLSearchParams();
  form.append("from", MAILGUN_FROM);
  form.append("to", to);
  form.append("subject", subject);
  form.append("html", html);

  const res = await fetch(
    `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`api:${MAILGUN_API_KEY}`).toString("base64")}`,
      },
      body: form,
    },
  );

  if (!res.ok) {
    const body = await res.text();
    console.error(`[email] Mailgun error ${res.status}:`, body);
  }
}

// ─── Branded wrapper ─────────────────────────────────────────────────────────

function wrap(heading: string, body: string, cta?: { label: string; url: string }, footer?: string) {
  const ctaBlock = cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
<tr><td align="center" style="background-color:#E1261B;background-image:linear-gradient(#E1261B,#C41A0E);border-radius:8px;">
<a href="${cta.url}" style="display:inline-block;padding:12px 32px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:-0.01em;">${cta.label}</a>
</td></tr></table>`
    : "";

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><!--[if mso]><style>body{font-family:Arial,sans-serif!important;}</style><![endif]--></head>
<body style="margin:0;padding:0;-webkit-text-size-adjust:none;text-size-adjust:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#09090b;background-image:linear-gradient(#09090b,#09090b);">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#09090b;background-image:linear-gradient(#09090b,#09090b);">
<tr><td align="center" style="padding:48px 20px;">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;width:100%;">
<tr><td align="center" style="padding:0 0 32px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="vertical-align:middle;padding-right:10px;"><img src="https://hypertune-affiliate.vercel.app/hypertune-logo.svg" alt="" width="28" height="30" style="display:block;border:0;"></td>
<td style="vertical-align:middle;"><span style="font-size:20px;font-weight:700;letter-spacing:0.08em;color:#ffffff;text-transform:uppercase;">Hypertune</span></td>
</tr></table>
</td></tr>
<tr><td style="background-color:#0a0a0a;background-image:linear-gradient(#0a0a0a,#0a0a0a);border:1px solid #27272a;border-radius:12px;overflow:hidden;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td style="height:3px;background:#E1261B;background-image:linear-gradient(90deg,#E1261B 0%,#7A1510 100%);font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:40px 32px;text-align:center;">
<h1 style="margin:0 0 12px;font-size:22px;font-weight:600;color:#ffffff;letter-spacing:-0.02em;">${heading}</h1>
<p style="margin:0 0 32px;font-size:15px;line-height:1.6;color:#a1a1aa;">${body}</p>
${ctaBlock}
</td></tr>
</table>
</td></tr>
<tr><td style="padding:24px 0 0;text-align:center;"><p style="margin:0 0 8px;font-size:12px;color:#3f3f46;">${footer ?? ""}</p><p style="margin:0;font-size:11px;color:#27272a;">Hypertune &middot; hypertune.gg</p></td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function fmtCurrency(amount: number) {
  return `$${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

// ─── Template functions ──────────────────────────────────────────────────────

export function sendWelcomeEmail(to: string, name: string) {
  return sendEmail({
    to,
    subject: "Your Hypertune affiliate account is ready",
    html: wrap(
      `Welcome, ${name}`,
      "Your affiliate account has been activated. You can now access your dashboard to view your referral link and account details.",
      { label: "Go to Dashboard", url: `${APP_URL}/dashboard` },
      "You received this email because you registered for the Hypertune affiliate program.",
    ),
  });
}

export function sendCommissionApprovedEmail(to: string, name: string, amount: number, count: number) {
  return sendEmail({
    to,
    subject: `Hypertune: ${count} commission${count > 1 ? "s" : ""} approved`,
    html: wrap(
      "Commission update",
      `${name}, ${count} commission${count > 1 ? "s" : ""} totaling <strong style="color:#ffffff;">${fmtCurrency(amount)}</strong> ${count > 1 ? "have" : "has"} been reviewed and approved. ${count > 1 ? "They" : "It"} will be included in your next scheduled payout.`,
      { label: "View Account", url: `${APP_URL}/earnings` },
      "You received this email because commissions on your Hypertune affiliate account were updated.",
    ),
  });
}

export function sendPayoutProcessedEmail(to: string, name: string, amount: number) {
  return sendEmail({
    to,
    subject: `Hypertune: Payout of ${fmtCurrency(amount)} processed`,
    html: wrap(
      "Payout confirmation",
      `${name}, a payout of <strong style="color:#ffffff;">${fmtCurrency(amount)}</strong> has been processed for your account. Please allow time for the funds to arrive at your configured payout method.`,
      { label: "View Account", url: `${APP_URL}/earnings` },
      "You received this email because a payout was completed on your Hypertune affiliate account.",
    ),
  });
}

export function sendCommissionEarnedEmail(to: string, name: string, amount: number, customerEmail: string) {
  return sendEmail({
    to,
    subject: "Hypertune: New activity on your account",
    html: wrap(
      "New commission recorded",
      `${name}, a commission of <strong style="color:#ffffff;">${fmtCurrency(amount)}</strong> has been recorded from a payment by ${customerEmail}. It is currently pending review.`,
      { label: "View Dashboard", url: `${APP_URL}/dashboard` },
      "You received this email because a referred customer made a payment linked to your Hypertune account.",
    ),
  });
}

export function sendNewAffiliateNotification(adminEmail: string, affiliateName: string, affiliateEmail: string) {
  return sendEmail({
    to: adminEmail,
    subject: `Hypertune: New affiliate registration — ${affiliateName}`,
    html: wrap(
      "New affiliate registered",
      `<strong style="color:#ffffff;">${affiliateName}</strong> (${affiliateEmail}) has completed registration on the affiliate portal.`,
      { label: "Review Affiliates", url: `${APP_URL}/admin` },
      "You received this email because you are an administrator on Hypertune.",
    ),
  });
}
