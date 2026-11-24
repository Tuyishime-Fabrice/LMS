import test from 'node:test';
import assert from 'node:assert/strict';
import { normaliseInterests, matchInterest, recommendCourses } from '../src/features/discovery/interests.ts';

test('legacy profile interests map onto the taxonomy', () => {
  assert.deepEqual(normaliseInterests(['Data Analyst', 'AI', 'Programming', 'Tax', null]).sort(), ['ai', 'data_analysis', 'programming']);
  assert.deepEqual(normaliseInterests(['geospatial']), ['geospatial']);
});

test('matching uses whole words, so "ai" does not match "maintain"', () => {
  assert.equal(matchInterest(['ai'], { id: '1', title: 'Maintaining data pipelines' }), null);
  assert.deepEqual(matchInterest(['ai'], { id: '1', title: 'AI for managers' }), { interest: 'ai', strength: 2 });
});

test('recommendations are deterministic, exclude enrolled courses and rank title matches first', () => {
  const courses = [
    { id: 'a', title: 'Excel for analysis', category: 'Data' },
    { id: 'b', title: 'Leadership basics', summary: 'Use a dashboard to report' },
    { id: 'c', title: 'SQL for analysts' },
    { id: 'd', title: 'Python foundations' },
  ];
  const first = recommendCourses(['data_analysis'], courses, ['a']);
  assert.deepEqual(first.map((r) => r.course.id), ['c', 'b']);
  assert.deepEqual(recommendCourses(['data_analysis'], courses, ['a']), first);
  assert.deepEqual(recommendCourses([], courses, []), []);
});
