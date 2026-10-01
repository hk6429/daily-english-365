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
