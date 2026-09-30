import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildQuiz } from '../js/quiz.js';

const scenes = JSON.parse(readFileSync(new URL('../data/scenes.json', import.meta.url), 'utf8'));

test('每個情境都出滿 5 題、4 選 1、答案正確且選項不重複', () => {
  for (const s of scenes) {
    const qs = buildQuiz(scenes, s.id);
    assert.equal(qs.length, s.lines.length, `scene ${s.id}`);
    qs.forEach((q, i) => {
      assert.equal(q.k, i + 1);
      assert.equal(q.options.length, 4);
      assert.equal(q.options[q.answer], s.lines[i].en);
      assert.equal(new Set(q.options.map(t => t.toLowerCase())).size, 4, `scene ${s.id} q${i + 1} 選項重複`);
    });
  }
});

test('同一情境題目固定（seed）', () => {
  assert.deepEqual(buildQuiz(scenes, 7), buildQuiz(scenes, 7));
});

test('不存在的情境回空陣列', () => {
  assert.deepEqual(buildQuiz(scenes, 9999), []);
});
