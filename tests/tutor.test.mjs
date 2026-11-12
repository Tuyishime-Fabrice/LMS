import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {
  HISTORY_TURNS, TUTOR_INSTRUCTIONS, buildLessonContext, buildMessages, cleanQuestion, isUuid,
  normalizeLanguage, tutorConfig,
} from '../server/lib/tutor.js';

const STUDENT = '00000000-0000-0000-0000-00000000000c';
const OUTSIDER = '00000000-0000-0000-0000-00000000000d';
const LESSON = '00000000-0000-0000-0000-0000000000e1';

test('tutor settings: off without a key, sensible defaults, overridable', () => {
  assert.equal(tutorConfig({}).enabled, false);
  const defaults = tutorConfig({ ANTHROPIC_API_KEY: 'k' });
  assert.deepEqual(defaults, { enabled: true, model: 'claude-opus-5-5', dailyLimit: 30, useFallbacks: true });
  const custom = tutorConfig({ ANTHROPIC_API_KEY: 'k', TUTOR_MODEL: 'claude-haiku-5-5', TUTOR_DAILY_LIMIT: '10' });
  assert.equal(custom.model, 'claude-haiku-5-5');
  assert.equal(custom.dailyLimit, 10);
  assert.equal(custom.useFallbacks, false, 'no fallback parameter for models that do not accept it');
  assert.equal(tutorConfig({ TUTOR_DAILY_LIMIT: '-4' }).dailyLimit, 30);
});

test('questions are trimmed and bounded; ids and language are validated', () => {
  assert.equal(cleanQuestion('  What is a pivot table?  '), 'What is a pivot table?');
  assert.equal(cleanQuestion('   '), null);
  assert.equal(cleanQuestion('x'.repeat(2001)), null);
  assert.equal(cleanQuestion({ text: 'x' }), null);
  assert.equal(isUuid(LESSON), true);
  assert.equal(isUuid("1' OR '1'='1"), false);
  assert.equal(normalizeLanguage('fr-RW'), 'fr');
  assert.equal(normalizeLanguage('rw'), 'en');
});

test('history becomes alternating turns that start with the learner and end with the new question', () => {
  const history = [
    { role: 'assistant', content: 'orphan answer' },
    { role: 'user', content: 'q1' },
    { role: 'user', content: 'q1 again (first answer was cut off)' },
    { role: 'assistant', content: 'a1' },
  ];
  assert.deepEqual(buildMessages(history, 'q2'), [
    { role: 'user', content: 'q1\n\nq1 again (first answer was cut off)' },
    { role: 'assistant', content: 'a1' },
    { role: 'user', content: 'q2' },
  ]);
  const long = Array.from({ length: 40 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `m${i}` }));
  const messages = buildMessages(long, 'new');
  assert.ok(messages.length <= HISTORY_TURNS + 1);
  assert.equal(messages[0].role, 'user');
  assert.equal(messages.at(-1).content.endsWith('new'), true);
  assert.deepEqual(buildMessages([], 'first'), [{ role: 'user', content: 'first' }]);
});

test('lesson context names the lesson and flags graded work', () => {
  const context = buildLessonContext({
    course: { title: 'Data Analysis', learning_outcomes: ['Clean data'] },
    chapter: { title: 'Module 1' },
    lesson: { title: 'Check your understanding', content_type: 'quiz', description: 'Five questions' },
    siblings: [{ title: 'Welcome' }, { title: 'Check your understanding' }],
    learnerName: 'Aline', language: 'fr',
  });
  assert.match(context, /Course: Data Analysis/);
  assert.match(context, /graded quiz/);
  assert.match(context, /do not give the answer/);
  assert.match(context, /Interface language: French/);
  assert.match(TUTOR_INSTRUCTIONS, /cannot see the lesson video/);
});

/* -------------------------------------------------------------------- */
/* The endpoint, against stand-ins for Supabase and the Claude API        */
/* -------------------------------------------------------------------- */

function startBackend() {
  const state = { tutorRows: [], anthropicRequests: [], failAnthropic: false };
  const lesson = {
    id: LESSON, title: 'Cleaning data', description: 'Remove duplicates', content_type: 'video', chapter_id: 'ch1',
    learning_objectives: ['Spot duplicates'],
    course_chapters: { id: 'ch1', title: 'Module 1', course_id: 'c1', courses: { id: 'c1', title: 'Data Analysis', teacher_id: 't1', learning_outcomes: [] } },
  };
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      const json = (body, status = 200, headers = {}) => { res.writeHead(status, { 'content-type': 'application/json', ...headers }); res.end(JSON.stringify(body)); };
      const single = (req.headers.accept || '').includes('vnd.pgrst.object');
      const eq = (key) => (url.searchParams.get(key) || '').replace(/^eq\./, '');
      const bearer = (req.headers.authorization || '').replace('Bearer ', '');

      if (url.pathname === '/auth/v1/user') {
        return [STUDENT, OUTSIDER].includes(bearer) ? json({ id: bearer, aud: 'authenticated' }) : json({ message: 'invalid' }, 401);
      }
      if (url.pathname === '/rest/v1/tutor_messages') {
        if (req.method === 'POST') {
          const row = { id: `row${state.tutorRows.length + 1}`, created_at: new Date().toISOString(), ...JSON.parse(raw) };
          state.tutorRows.push(row);
          return json(single ? row : [row], 201);
        }
        if (req.method === 'DELETE') {
          state.tutorRows = state.tutorRows.filter((row) => row.id !== eq('id'));
          return json([], 200);
        }
        const mine = state.tutorRows.filter((row) => row.user_id === eq('user_id')
          && (!url.searchParams.get('role') || row.role === eq('role')));
        if (req.method === 'HEAD') { res.writeHead(200, { 'content-range': `0-0/${mine.length}` }); return res.end(); }
        return json([...mine].reverse(), 200, { 'content-range': `0-${mine.length}/${mine.length}` });
      }
      // Rows come back as a list unless the client asks for a single object.
      const rows = (list) => (single
        ? (list.length ? json(list[0]) : json({ code: 'PGRST116', message: 'no rows', details: 'The result contains 0 rows' }, 406))
        : json(list));
      if (url.pathname === '/rest/v1/course_lessons') {
        return url.searchParams.has('id') ? rows([lesson]) : json([{ title: 'Welcome', order_index: 0 }, { title: 'Cleaning data', order_index: 1 }]);
      }
      if (url.pathname === '/rest/v1/course_enrollments') return rows(eq('student_id') === STUDENT ? [{ id: 'e1' }] : []);
      if (url.pathname === '/rest/v1/profiles') return rows([{ role: 'student', is_suspended: false, full_name: 'Aline Uwase' }]);

      if (url.pathname === '/v1/messages') {
        state.anthropicRequests.push({ body: JSON.parse(raw), beta: req.headers['anthropic-beta'] });
        if (state.failAnthropic) return json({ type: 'error', error: { type: 'overloaded_error', message: 'Overloaded' } }, 529);
        res.writeHead(200, { 'content-type': 'text/event-stream' });
        const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify({ type: event, ...data })}\n\n`);
        send('message_start', { message: { id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-opus-5-5', content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 900, output_tokens: 1 } } });
        send('content_block_start', { index: 0, content_block: { type: 'text', text: '' } });
        send('content_block_delta', { index: 0, delta: { type: 'text_delta', text: 'A duplicate is a row ' } });
        send('content_block_delta', { index: 0, delta: { type: 'text_delta', text: 'that appears twice.' } });
        send('content_block_stop', { index: 0 });
        send('message_delta', { delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 12 } });
        send('message_stop', {});
        return res.end();
      }
      return json({ error: `unexpected ${req.method} ${url.pathname}` }, 500);
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, state, url: `http://127.0.0.1:${server.address().port}` })));
}

function call(handler, { method = 'POST', token, body } = {}) {
  return new Promise((resolve) => {
    const out = { status: 200, headers: {}, text: '' };
    const res = {
      status(code) { out.status = code; return res; },
      setHeader(key, value) { out.headers[key.toLowerCase()] = value; },
      write(chunk) { out.text += chunk; },
      end(chunk) { if (chunk) out.text += chunk; resolve(out); },
      json(value) { out.json = value; resolve(out); },
    };
    Promise.resolve(handler({ method, headers: token ? { authorization: `Bearer ${token}` } : {}, body }, res))
      .catch((error) => resolve({ status: 599, error }));
  });
}

test('tutor endpoint: access, streaming, storage and the daily limit', async (t) => {
  const backend = await startBackend();
  t.after(() => backend.server.close());
  const saved = { ...process.env };
  t.after(() => { process.env = saved; });
  Object.assign(process.env, {
    SUPABASE_URL: backend.url, SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'service',
    ANTHROPIC_API_KEY: 'test-key', ANTHROPIC_BASE_URL: backend.url, TUTOR_DAILY_LIMIT: '2',
  });
  delete process.env.ANTHROPIC_AUTH_TOKEN;
  const { default: handler } = await import('../api/tutor.js');
  const ask = (token, message = 'What is a duplicate?') => call(handler, { token, body: { lessonId: LESSON, message, language: 'fr' } });

  assert.equal((await ask(undefined)).status, 401, 'signed-out requests are refused');
  assert.equal((await call(handler, { token: STUDENT, body: { lessonId: 'nope', message: 'hi' } })).status, 400);
  assert.equal((await ask(OUTSIDER)).status, 403, 'a learner who is not enrolled cannot use the tutor on this lesson');
  assert.equal(backend.state.tutorRows.length, 0, 'refused requests store nothing');

  const status = await call(handler, { method: 'GET', token: STUDENT });
  assert.deepEqual(status.json, { enabled: true, limit: 2, used: 0 });

  const first = await ask(STUDENT);
  assert.equal(first.status, 200);
  assert.equal(first.text, 'A duplicate is a row that appears twice.');
  assert.equal(first.headers['x-tutor-used'], '1');
  assert.deepEqual(backend.state.tutorRows.map((row) => [row.role, row.content]), [
    ['user', 'What is a duplicate?'],
    ['assistant', 'A duplicate is a row that appears twice.'],
  ]);
  assert.equal(backend.state.tutorRows[1].output_tokens, 12);

  const sent = backend.state.anthropicRequests[0];
  assert.equal(sent.body.model, 'claude-opus-5-5');
  assert.equal(sent.body.stream, true);
  assert.equal(sent.body.fallbacks, 'default');
  assert.match(sent.beta, /server-side-fallback-2026-07-01/);
  assert.deepEqual(sent.body.output_config, { effort: 'low' });
  assert.equal(sent.body.thinking, undefined, 'thinking is left to the model default');
  assert.match(sent.body.system[1].text, /Lesson: Cleaning data \(video\)/);
  assert.match(sent.body.system[1].text, /Interface language: French/);
  assert.deepEqual(sent.body.messages, [{ role: 'user', content: 'What is a duplicate?' }]);

  backend.state.failAnthropic = true;
  const busy = await ask(STUDENT, 'And a null value?');
  assert.equal(busy.status, 503);
  assert.equal(busy.json.code, 'busy');
  assert.equal(backend.state.tutorRows.length, 2, 'a question that got no answer does not count toward the limit');
  backend.state.failAnthropic = false;

  const second = await ask(STUDENT, 'And a null value?');
  assert.equal(second.status, 200);
  assert.deepEqual(backend.state.anthropicRequests.at(-1).body.messages.map((m) => m.role), ['user', 'assistant', 'user'],
    'earlier turns come from the stored conversation, not from the browser');

  const third = await ask(STUDENT, 'One more?');
  assert.equal(third.status, 429);
  assert.deepEqual(third.json, { code: 'daily_limit', limit: 2 });

  delete process.env.ANTHROPIC_API_KEY;
  assert.deepEqual((await call(handler, { method: 'GET', token: STUDENT })).json, { enabled: false, limit: 2, used: 0 });
  assert.equal((await ask(STUDENT)).status, 503, 'without a key the tutor is switched off');
});
