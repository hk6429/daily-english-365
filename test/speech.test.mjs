import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alignWords } from '../js/speech.js';

test('全對', () => {
  const r = alignWords('Can you take the highway?', 'can you take the highway');
  assert.equal(r.score, 1); assert.ok(r.hit.every(Boolean));
});
test('漏字與多字', () => {
  const r = alignWords('The airport, please.', 'uh the airport');
  assert.deepEqual(r.hit, [true, true, false]); assert.ok(Math.abs(r.score - 2 / 3) < 1e-9);
});
test('空輸入', () => {
  assert.equal(alignWords('Hello there.', '').score, 0);
});
import { isPass } from '../js/speech.js';
test('isPass：有辨識分數看分數（≥0.4）', () => {
  assert.equal(isPass({ score: 0.4 }), true);
  assert.equal(isPass({ score: 0.39 }), false);
  assert.equal(isPass({ score: 0, voicedMs: 9999 }), false); // 有分數就不看音量
});
test('isPass：無分數看有聲時間（≥500ms）', () => {
  assert.equal(isPass({ voicedMs: 500 }), true);
  assert.equal(isPass({ voicedMs: 499 }), false);
  assert.equal(isPass({ score: null, voicedMs: 800 }), true);
  assert.equal(isPass({}), false);
});
