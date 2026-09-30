import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildQuiz, isQuestion } from '../js/quiz.js';

const scenes = JSON.parse(readFileSync(new URL('../data/scenes.json', import.meta.url), 'utf8'));
const wc = s => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim().split(' ').filter(Boolean).length;

test('每個情境都出滿 5 題、4 選 1、答案正確、選項不重複、涵蓋 5 句', () => {
  for (const s of scenes) {
    const qs = buildQuiz(scenes, s.id);
    assert.equal(qs.length, s.lines.length, `scene ${s.id}`);
    assert.deepEqual([...qs.map(q => q.k)].sort(), [1, 2, 3, 4, 5]);
    for (const q of qs) {
      assert.equal(q.options.length, 4);
      assert.equal(q.options[q.answer].en, s.lines[q.k - 1].en);
      assert.equal(new Set(q.options.map(o => o.en.toLowerCase())).size, 4, `scene ${s.id} q${q.k} 選項重複`);
      assert.ok(q.options.every(o => typeof o.zh === 'string' && o.zh), `scene ${s.id} q${q.k} 選項缺中譯`);
    }
  }
});

test('干擾項與正解同句型；≥90% 題目字數差 ≤2', () => {
  let n = 0, tight = 0;
  for (const s of scenes) for (const q of buildQuiz(scenes, s.id)) {
    n++;
    const t = isQuestion(q.en);
    assert.ok(q.options.every(o => isQuestion(o.en) === t), `scene ${s.id} q${q.k} 句型不一致`);
    if (q.options.every(o => Math.abs(wc(o.en) - wc(q.en)) <= 2)) tight++;
  }
  assert.ok(tight / n >= 0.9, `字數差 ≤2 比例 ${(tight / n * 100).toFixed(1)}%`);
});

test('同 round 題目固定；換 round 題序或選項會變', () => {
  assert.deepEqual(buildQuiz(scenes, 7, 0), buildQuiz(scenes, 7, 0));
  const a = buildQuiz(scenes, 7, 0), b = buildQuiz(scenes, 7, 1);
  assert.notDeepEqual(a.map(q => q.k), b.map(q => q.k));
});

test('不存在的情境回空陣列', () => {
  assert.deepEqual(buildQuiz(scenes, 9999), []);
});
