import { test } from 'node:test';
import assert from 'node:assert/strict';
import { todayIndex, parseDay, taipeiDateKey, buildOrder, dayOfScene, daysBetween, shiftDateKey } from '../js/day.js';
import { streak, reviewDue, doneDate } from '../js/progress.js';

test('day of year in Taipei', () => {
  assert.equal(todayIndex(new Date('2026-01-01T00:30:00+08:00')), 1);
  assert.equal(todayIndex(new Date('2026-12-31T23:00:00+08:00')), 365);
  assert.equal(todayIndex(new Date('2028-12-31T12:00:00+08:00')), 365); // leap 366 → 365
  assert.equal(todayIndex(new Date('2026-01-01T15:59:00Z')), 1); // 台北 23:59
  assert.equal(todayIndex(new Date('2026-01-01T16:00:00Z')), 2); // 台北 00:00 次日
  assert.equal(todayIndex(new Date('2026-03-01T08:00:00+08:00')), 60);
});

test('taipeiDateKey / shift / between', () => {
  assert.equal(taipeiDateKey(new Date('2026-01-01T16:00:00Z')), '2026-01-02');
  assert.equal(shiftDateKey('2026-03-01', -1), '2026-02-28');
  assert.equal(daysBetween('2026-01-01', '2026-01-08'), 7);
});

test('parseDay', () => {
  assert.equal(parseDay('?d=0'), null);
  assert.equal(parseDay('?d=366'), null);
  assert.equal(parseDay('?d=abc'), null);
  assert.equal(parseDay(''), null);
  assert.equal(parseDay('?d=42'), 42);
  assert.equal(parseDay('?x=1&d=365'), 365);
});

test('buildOrder interleaves categories', () => {
  const scenes = [
    { id: 1, category: 'a' }, { id: 2, category: 'a' }, { id: 3, category: 'a' },
    { id: 4, category: 'b' }, { id: 5, category: 'b' },
    { id: 6, category: 'c' },
  ];
  const order = buildOrder(scenes);
  assert.deepEqual(order, [1, 4, 6, 2, 5, 3]);
  assert.equal(dayOfScene(order, 5), 5);
  assert.equal(new Set(order).size, 6);
});

test('streak counts through yesterday when today not done', () => {
  const list = [{ d: '2026-09-26', id: 1 }, { d: '2026-09-27', id: 2 }, { d: '2026-09-28', id: 3 }];
  assert.equal(streak(list, '2026-09-29'), 3);
  assert.equal(streak(list, '2026-09-28'), 3);
  assert.equal(streak(list, '2026-09-30'), 0);
});

test('reviewDue picks 1/3/7/21 day gaps', () => {
  const list = [{ d: '2026-09-28', id: 1 }, { d: '2026-09-26', id: 2 }, { d: '2026-09-22', id: 3 }, { d: '2026-09-08', id: 4 }, { d: '2026-09-27', id: 5 }, { d: '2026-09-29', id: 1 }];
  assert.deepEqual(reviewDue(list, '2026-09-29').map(x => x.id), [2, 3, 4]);
});

test('doneDate: 補昨天那課且昨天沒紀錄 → 記昨天，連續天數接得回來', () => {
  const list = [{ d: '2026-09-27', id: 1 }, { d: '2026-09-28', id: 2 }];
  assert.equal(doneDate(list, true, '2026-09-30'), '2026-09-29');
  assert.equal(streak([...list, { d: '2026-09-29', id: 3 }], '2026-09-30'), 3);
  assert.equal(doneDate(list, false, '2026-09-30'), '2026-09-30');
  assert.equal(doneDate([...list, { d: '2026-09-29', id: 9 }], true, '2026-09-30'), '2026-09-30');
});
