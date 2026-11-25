import test from 'node:test';
import assert from 'node:assert/strict';
import { phase, registrationOpen, submissionsOpen, participantSteps } from '../src/features/competitions/rules.ts';

const now = new Date('2026-11-24T12:00:00Z');
const base = { status: 'open', registration_opens_at: null, registration_closes_at: null, starts_at: '2026-11-20T00:00:00Z', submission_deadline: '2026-12-01T00:00:00Z', results_published_at: null };

test('an open competition takes registrations and submissions until the deadline', () => {
  assert.equal(registrationOpen(base, now), true);
  assert.equal(submissionsOpen(base, now), true);
  assert.equal(phase(base, now), 'open');
  const late = { ...base, submission_deadline: '2026-11-23T00:00:00Z' };
  assert.equal(submissionsOpen(late, now), false);
  assert.equal(phase(late, now), 'judging');
});

test('drafts and closed competitions take nothing; published results win', () => {
  assert.equal(registrationOpen({ ...base, status: 'draft' }, now), false);
  assert.equal(registrationOpen({ ...base, status: 'closed' }, now), false);
  assert.equal(phase({ ...base, status: 'closed', results_published_at: '2026-11-22T00:00:00Z' }, now), 'results');
  assert.equal(phase({ ...base, status: 'upcoming', starts_at: '2026-12-10T00:00:00Z' }, now), 'upcoming');
});

test('participant steps follow registration, submission and results', () => {
  const keys = (steps) => steps.map((s) => `${s.key}:${s.state}`).join(' ');
  assert.equal(keys(participantSteps(base, null, [], now)), 'registered:current submitted:upcoming judging:upcoming results:upcoming');
  const reg = { status: 'registered', created_at: '2026-11-21T00:00:00Z' };
  assert.equal(keys(participantSteps(base, reg, [], now)), 'registered:done submitted:current judging:upcoming results:upcoming');
  const sub = [{ submitted_at: '2026-11-22T00:00:00Z', status: 'submitted' }];
  const judging = { ...base, status: 'judging' };
  assert.equal(keys(participantSteps(judging, reg, sub, now)), 'registered:done submitted:done judging:current results:upcoming');
  assert.equal(keys(participantSteps(judging, reg, [], now)), 'registered:done submitted:blocked judging:upcoming results:upcoming');
});
