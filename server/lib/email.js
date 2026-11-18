/**
 * Email for queued notifications (submission receipts, grades, applications,
 * certificates). Pure helpers, so they can be tested without a network.
 */

export function emailConfig(env = process.env) {
  return {
    enabled: Boolean(env.RESEND_API_KEY && env.EMAIL_FROM),
    apiKey: env.RESEND_API_KEY || '',
    from: env.EMAIL_FROM || '',
    siteUrl: (env.SITE_URL || 'https://dataplusacademy.com').replace(/\/$/, ''),
    batchSize: Math.min(Math.max(Number.parseInt(env.EMAIL_BATCH_SIZE || '', 10) || 50, 1), 100),
  };
}

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Only links inside the academy become absolute; anything else is dropped. */
export function absoluteLink(link, siteUrl) {
  if (!link || typeof link !== 'string' || !link.startsWith('/') || link.startsWith('//')) return siteUrl;
  return siteUrl + link;
}

/** Builds the subject, text and HTML of one notification email. */
export function renderEmail({ title, body, link, name }, siteUrl) {
  const url = absoluteLink(link, siteUrl);
  const greeting = name ? `Hello ${name.split(/\s+/)[0]},` : 'Hello,';
  const text = [greeting, '', title, body || '', '', `Open DataPlus Academy: ${url}`, '', 'DataPlus Academy, KG 5 Kimihurura, Kigali'].join('\n');
  const html = `<!doctype html><html><body style="margin:0;background:#F2F1EC;font-family:Inter,Segoe UI,Arial,sans-serif;color:#0E1433">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F2F1EC;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:10px;overflow:hidden">
<tr><td style="background:#060C2E;padding:18px 24px;color:#ffffff;font-weight:700;font-size:16px">DataPlus Academy</td></tr>
<tr><td style="padding:28px 24px">
<p style="margin:0 0 16px;font-size:15px">${escapeHtml(greeting)}</p>
<h1 style="margin:0 0 8px;font-size:20px;line-height:28px;color:#060C2E">${escapeHtml(title)}</h1>
${body ? `<p style="margin:0 0 24px;font-size:15px;line-height:24px;color:#3B4160">${escapeHtml(body)}</p>` : ''}
<a href="${escapeHtml(url)}" style="display:inline-block;background:#C9501F;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:8px">Open DataPlus Academy</a>
</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid #E1E2E7;font-size:12px;color:#5A5F72">DataPlus Academy, KG 5 Kimihurura, Kigali. You can choose which notifications you receive in Settings.</td></tr>
</table></td></tr></table></body></html>`;
  return { subject: title, text, html, url };
}
