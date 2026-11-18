/**
 * Sends notification emails that the database queued (email_status = 'pending').
 *
 * Called by the Vercel cron in vercel.json (daily, the most a Vercel Hobby
 * plan allows; on Pro, change the schedule to every 10 minutes). Vercel sends
 * "Authorization: Bearer <CRON_SECRET>"; any other caller is refused.
 * Needs RESEND_API_KEY and EMAIL_FROM; without them nothing is sent.
 */

import { getSupabaseAdmin } from '../server/lib/supabase-payments.js';
import { emailConfig, renderEmail } from '../server/lib/email.js';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.authorization || req.headers.Authorization || '';
  if (!secret || auth !== `Bearer ${secret}`) return res.status(401).json({ error: 'Unauthorized' });

  const settings = emailConfig();
  if (!settings.enabled) return res.status(200).json({ sent: 0, skipped: 'Email is not configured' });

  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const { data: queued, error } = await supabase.from('notifications')
    .select('id, user_id, title, body, link')
    .eq('email_status', 'pending')
    .order('created_at', { ascending: true })
    .limit(settings.batchSize);
  if (error) {
    console.error('[email] queue read failed:', error.message);
    return res.status(500).json({ error: 'Queue read failed' });
  }
  if (!queued?.length) return res.status(200).json({ sent: 0 });

  const userIds = [...new Set(queued.map((row) => row.user_id))];
  const { data: people } = await supabase.from('profiles').select('id, email, full_name').in('id', userIds);
  const byId = new Map((people || []).map((person) => [person.id, person]));

  let sent = 0;
  let failed = 0;
  for (const row of queued) {
    const person = byId.get(row.user_id);
    if (!person?.email) {
      await supabase.from('notifications').update({ email_status: 'skipped' }).eq('id', row.id);
      continue;
    }
    const email = renderEmail({ title: row.title, body: row.body, link: row.link, name: person.full_name }, settings.siteUrl);
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${settings.apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `notification-${row.id}` },
        body: JSON.stringify({ from: settings.from, to: [person.email], subject: email.subject, text: email.text, html: email.html }),
      });
      if (!response.ok) throw new Error(`Resend ${response.status}: ${(await response.text()).slice(0, 200)}`);
      await supabase.from('notifications').update({ email_status: 'sent', email_sent_at: new Date().toISOString() }).eq('id', row.id);
      sent += 1;
    } catch (sendError) {
      console.error('[email] send failed for', row.id, sendError.message);
      // Left pending on rate limits and server errors so the next run retries; failed otherwise.
      const retry = /Resend (429|5\d\d)/.test(sendError.message) || !/Resend/.test(sendError.message);
      if (!retry) await supabase.from('notifications').update({ email_status: 'failed' }).eq('id', row.id);
      failed += 1;
    }
  }
  return res.status(200).json({ sent, failed });
}
