import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STAGES, TOTAL, initial, advance, needsAudio, progress, loadMission, saveMission } from '../js/mission.js';

test('四關定義', () => {
  assert.equal(STAGES.length, 4);
  assert.deepEqual(STAGES.map(s => [s.en, s.zh, s.audio]), [[true, true, 'each'], [true, false, 'first'], [false, false, 'first'], [false, false, 'none']]);
});
test('連念 100 次剛好完成，進度逐次 +1', () => {
  let st = initial();
  for (let i = 0; i < TOTAL; i++) { assert.equal(st.done, false); assert.equal(progress(st), i); st = advance(st); }
  assert.equal(st.done, true); assert.equal(progress(st), 100);
  assert.deepEqual(advance(st), st); // 完成後不再變
});
test('關一第 1 句念滿 5 次換第 2 句；第 5 句滿換關二', () => {
  let st = initial();
  for (let i = 0; i < 5; i++) st = advance(st);
  assert.deepEqual(st, { stage: 1, k: 2, n: 0, done: false });
  for (let i = 0; i < 20; i++) st = advance(st);
  assert.deepEqual(st, { stage: 2, k: 1, n: 0, done: false });
});
test('關四逐句前進、5 句一輪', () => {
  let st = { stage: 4, k: 1, n: 0, done: false };
  for (let i = 0; i < 5; i++) st = advance(st);
  assert.deepEqual(st, { stage: 4, k: 1, n: 1, done: false });
  st = { stage: 4, k: 5, n: 4, done: false };
  assert.equal(advance(st).done, true);
});
test('needsAudio：關一每次、關二三每句第一次、關四不播', () => {
  assert.equal(needsAudio({ stage: 1, k: 3, n: 4 }), true);
  assert.equal(needsAudio({ stage: 2, k: 2, n: 0 }), true);
  assert.equal(needsAudio({ stage: 3, k: 2, n: 1 }), false);
  assert.equal(needsAudio({ stage: 4, k: 1, n: 0 }), false);
});
test('load/save：同日接續、跨日重來、壞資料回初始', () => {
  const mem = {}; globalThis.localStorage = { getItem: k => mem[k] ?? null, setItem: (k, v) => { mem[k] = v; } };
  saveMission(7, { stage: 2, k: 3, n: 1, done: false }, '2026-10-01');
  assert.deepEqual(loadMission(7, '2026-10-01'), { stage: 2, k: 3, n: 1, done: false });
  assert.deepEqual(loadMission(8, '2026-10-01'), initial());
  assert.deepEqual(loadMission(7, '2026-10-02'), initial());
  saveMission(9, initial(), '2026-10-02');
  assert.equal(Object.keys(JSON.parse(mem['de365.mission'])).join(), '2026-10-02'); // 只留今天
  mem['de365.mission'] = JSON.stringify({ '2026-10-02': { 9: { stage: 9, k: 0, n: 'x' } } });
  assert.deepEqual(loadMission(9, '2026-10-02'), initial());
  mem['de365.mission'] = '{壞掉';
  assert.deepEqual(loadMission(9, '2026-10-02'), initial());
  delete globalThis.localStorage;
});
