import test from 'node:test';
import assert from 'node:assert/strict';
import { buildJourney, needsAttention } from '../src/features/enrolment/journey.ts';

const at = (d) => `2026-11-${String(d).padStart(2, '0')}T10:00:00Z`;
const state = (journey) => Object.fromEntries(journey.steps.map((s) => [s.key, `${s.state}:${s.status}`]));

test('a paid course with no payment yet asks the learner to pay', () => {
  const j = buildJourney({ courseId: 'c', isFree: false, payments: [] });
  assert.equal(j.status, 'action_required');
  assert.equal(j.next, 'pay');
  assert.equal(state(j).payment, 'current:required');
  assert.equal(state(j).access, 'upcoming:pending');
  assert.ok(needsAttention(j));
});

test('a pending payment is shown as awaiting confirmation, never as paid', () => {
  const j = buildJourney({ courseId: 'c', isFree: false, payments: [{ status: 'pending', createdAt: at(2), updatedAt: null }] });
  assert.equal(j.status, 'waiting');
  assert.equal(j.next, null);
  assert.equal(state(j).payment, 'current:awaiting_confirmation');
});

test('the newest failed payment offers a retry; an older success wins over a later failure', () => {
  const failed = buildJourney({ courseId: 'c', isFree: false, payments: [
    { status: 'pending', createdAt: at(1), updatedAt: null }, { status: 'failed', createdAt: at(2), updatedAt: at(2) },
  ] });
  assert.equal(failed.next, 'retry_payment');
  assert.equal(state(failed).payment, 'blocked:failed');

  const paid = buildJourney({ courseId: 'c', isFree: false, payments: [
    { status: 'success', createdAt: at(1), updatedAt: at(1) }, { status: 'failed', createdAt: at(3), updatedAt: at(3) },
  ], enrollment: { enrolledAt: at(1), progress: 10, completed: false, completionDate: null } });
  assert.equal(state(paid).payment, 'done:confirmed');
  assert.equal(paid.status, 'active');
  assert.equal(paid.next, 'continue');
});

test('enrolment without a payment record is not labelled as paid', () => {
  const j = buildJourney({ courseId: 'c', isFree: false, payments: [], enrollment: { enrolledAt: at(1), progress: 0, completed: false, completionDate: null } });
  assert.equal(state(j).payment, 'done:not_needed');
  assert.equal(state(j).learning, 'current:not_started');
});

test('a cohort application under review holds payment until it is accepted', () => {
  const j = buildJourney({ courseId: 'c', isFree: false, application: { status: 'pending', createdAt: at(1), updatedAt: null }, payments: [] });
  assert.deepEqual(j.steps.map((s) => s.key), ['applied', 'review', 'payment', 'access', 'learning', 'certificate']);
  assert.equal(state(j).review, 'current:under_review');
  assert.equal(state(j).payment, 'upcoming:after_review');
  assert.equal(j.status, 'waiting');
  assert.equal(j.focus, 'review');
});

test('a rejected application is blocked and points back to the catalogue', () => {
  const j = buildJourney({ courseId: 'c', isFree: true, application: { status: 'rejected', createdAt: at(1), updatedAt: at(2) }, payments: [] });
  assert.equal(j.status, 'blocked');
  assert.equal(j.next, 'browse');
  assert.equal(j.focus, 'review');
});

test('free courses skip payment; completion and certificate follow the database', () => {
  const done = buildJourney({ courseId: 'c', isFree: true, payments: [],
    enrollment: { enrolledAt: at(1), progress: 100, completed: true, completionDate: at(9) },
    certificate: { status: 'approved', issuedAt: at(9) } });
  assert.equal(done.steps.some((s) => s.key === 'payment'), false);
  assert.equal(done.status, 'completed');
  assert.equal(done.next, 'view_certificate');
  assert.ok(!needsAttention(done));

  const waiting = buildJourney({ courseId: 'c', isFree: true, payments: [],
    enrollment: { enrolledAt: at(1), progress: 100, completed: true, completionDate: at(9) } });
  assert.equal(state(waiting).certificate, 'current:pending');
});
