import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { absoluteLink, emailConfig, renderEmail } from '../server/lib/email.js';

test('email settings: off without a key and a sender', () => {
  assert.equal(emailConfig({}).enabled, false);
  assert.equal(emailConfig({ RESEND_API_KEY: 'k' }).enabled, false);
  assert.equal(emailConfig({ RESEND_API_KEY: 'k', EMAIL_FROM: 'DataPlus <a@b.c>' }).enabled, true);
  assert.equal(emailConfig({ EMAIL_BATCH_SIZE: '500' }).batchSize, 100);
});

test('links stay inside the academy and content is escaped', () => {
  assert.equal(absoluteLink('/student/assignments', 'https://x.test'), 'https://x.test/student/assignments');
  assert.equal(absoluteLink('https://evil.test', 'https://x.test'), 'https://x.test');
  assert.equal(absoluteLink('//evil.test', 'https://x.test'), 'https://x.test');
  const email = renderEmail({ title: 'Graded <b>', body: 'Score: 82/100', link: '/student/scores', name: 'Aline Uwase' }, 'https://x.test');
  assert.equal(email.subject, 'Graded <b>');
  assert.match(email.html, /Graded &lt;b&gt;/);
  assert.match(email.text, /Hello Aline,/);
  assert.match(email.html, /https:\/\/x\.test\/student\/scores/);
});

test('sender: refuses strangers, sends the queue, marks rows', async (t) => {
  const rows = [
    { id: 'n1', user_id: 'u1', title: 'Your work was graded', body: '82/100', link: '/student/scores', email_status: 'pending' },
    { id: 'n2', user_id: 'u2', title: 'Application received', body: null, link: null, email_status: 'pending' },
  ];
  const sentMail = [];
  const server = http.createServer((req, res) => {
    let raw = ''; req.on('data', (c) => { raw += c; });
    req.on('end', () => {
      const url = new URL(req.url, 'http://x');
      const json = (b, s = 200) => { res.writeHead(s, { 'content-type': 'application/json' }); res.end(JSON.stringify(b)); };
      if (url.pathname === '/rest/v1/notifications' && req.method === 'GET') return json(rows.filter((r) => r.email_status === 'pending'));
      if (url.pathname === '/rest/v1/notifications' && req.method === 'PATCH') {
        const id = url.searchParams.get('id').replace('eq.', ''); Object.assign(rows.find((r) => r.id === id), JSON.parse(raw)); return json([]);
      }
      if (url.pathname === '/rest/v1/profiles') return json([{ id: 'u1', email: 'aline@example.test', full_name: 'Aline Uwase' }]);
      return json({}, 404);
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  t.after(() => server.close());
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    if (String(input).startsWith('https://api.resend.com/')) { sentMail.push(JSON.parse(init.body)); return new Response('{"id":"e1"}', { status: 200 }); }
    return realFetch(input, init);
  };
  t.after(() => { globalThis.fetch = realFetch; });
  const saved = { ...process.env };
  t.after(() => { process.env = saved; });
  Object.assign(process.env, {
    SUPABASE_URL: `http://127.0.0.1:${server.address().port}`, SUPABASE_SERVICE_ROLE_KEY: 'service',
    RESEND_API_KEY: 're_test', EMAIL_FROM: 'DataPlus <hi@x.test>', CRON_SECRET: 'cron', SITE_URL: 'https://x.test',
  });
  const { default: handler } = await import('../api/send-notification-emails.js');
  const call = (headers) => new Promise((resolve) => {
    const out = {}; const res = { status(c) { out.status = c; return res; }, json(v) { out.json = v; resolve(out); } };
    handler({ method: 'GET', headers }, res);
  });
  assert.equal((await call({})).status, 401);
  assert.equal((await call({ authorization: 'Bearer wrong' })).status, 401);
  const result = await call({ authorization: 'Bearer cron' });
  assert.deepEqual(result.json, { sent: 1, failed: 0 });
  assert.equal(sentMail.length, 1);
  assert.deepEqual(sentMail[0].to, ['aline@example.test']);
  assert.equal(rows[0].email_status, 'sent');
  assert.equal(rows[1].email_status, 'skipped', 'no email address: skipped, not retried forever');
});
