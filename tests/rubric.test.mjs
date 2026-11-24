import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRubric, rubricMax, scoreRubric, feedbackIsValid, parseScores } from '../src/features/rubrics/rubric.ts';

const rubric = { criteria: [
  { id: 'c1', title: 'Accuracy', levels: [{ label: 'Excellent', points: 10 }, { label: 'Weak', points: 2 }] },
  { id: 'c2', title: 'Communication', levels: [{ label: 'Clear', points: 5 }, { label: 'Unclear', points: 0 }] },
] };

test('parseRubric accepts the stored shape and rejects what the database rejects', () => {
  assert.equal(parseRubric(rubric).criteria.length, 2);
  for (const bad of [null, {}, { criteria: [] }, { criteria: [{ id: 'x', title: '', levels: [{ label: 'a', points: 1 }] }] },
    { criteria: [{ id: 'x', title: 'T', levels: [] }] }, { criteria: [{ id: 'x', title: 'T', levels: [{ label: 'a', points: -1 }] }] }]) {
    assert.equal(parseRubric(bad), null, JSON.stringify(bad));
  }
});

test('scores scale to a mark out of 100 and are capped per criterion', () => {
  assert.equal(rubricMax(rubric), 15);
  assert.deepEqual(scoreRubric(rubric, { c1: { points: 10 }, c2: { points: 5 } }), { points: 15, max: 15, complete: true, mark: 100 });
  const partial = scoreRubric(rubric, { c1: { points: 99 } });
  assert.equal(partial.points, 10);
  assert.equal(partial.complete, false);
  assert.equal(scoreRubric(rubric, { c1: { points: 2 }, c2: { points: 5 } }).mark, 47);
});

test('feedback must be a meaningful comment, as the database requires', () => {
  assert.equal(feedbackIsValid('Good.'), false);
  assert.equal(feedbackIsValid('   '), false);
  assert.equal(feedbackIsValid('Clear structure; label the axes next time.'), true);
  assert.deepEqual(parseScores({ c1: { points: 3, comment: 'ok' }, bad: 4 }), { c1: { points: 3, comment: 'ok' } });
});
