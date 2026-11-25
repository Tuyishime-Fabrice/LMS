import test from 'node:test';
import assert from 'node:assert/strict';
import { trackProgress } from '../src/features/tracks/progress.ts';

const items = [
  { courseId: 'excel', position: 0, required: true },
  { courseId: 'sql', position: 1, required: true },
  { courseId: 'extra', position: 2, required: false },
  { courseId: 'python', position: 3, required: true },
];

test('a learner with no enrolments has not started and is pointed at the first course', () => {
  const p = trackProgress(items, []);
  assert.equal(p.started, false);
  assert.equal(p.percent, 0);
  assert.equal(p.nextCourseId, 'excel');
  assert.equal(p.items.find((i) => i.courseId === 'sql').recommendedAfter, 'excel');
  assert.equal(p.items.find((i) => i.courseId === 'excel').recommendedAfter, null);
});

test('progress counts required courses only, in order', () => {
  const p = trackProgress(items, [
    { courseId: 'excel', completed: true, progress: 100 },
    { courseId: 'extra', completed: true, progress: 100 },
    { courseId: 'sql', completed: false, progress: 40 },
  ]);
  assert.equal(p.requiredTotal, 3);
  assert.equal(p.requiredCompleted, 1);
  assert.equal(p.percent, 33);
  assert.equal(p.nextCourseId, 'sql');
  assert.equal(p.items.find((i) => i.courseId === 'python').recommendedAfter, 'sql');
  assert.equal(p.items.find((i) => i.courseId === 'sql').state, 'in_progress');
});

test('the track is complete when every required course is complete', () => {
  const p = trackProgress(items, ['excel', 'sql', 'python'].map((courseId) => ({ courseId, completed: true, progress: 100 })));
  assert.equal(p.completed, true);
  assert.equal(p.percent, 100);
  assert.equal(p.nextCourseId, null);
});
