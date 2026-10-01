# 今日口說任務（四關跟讀）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在英語日日聽加入「今日口說任務」面板：四關跟讀（看英中同步念 → 只看英文 → 全遮先聽再念 → 全遮連背 5 輪），四關全過顯示完成徽章。

**Architecture:** 規則與進度放純函式模組 `js/mission.js`（無 DOM、可 node 測）；從寬判定與音量偵測加在 `js/speech.js`；`js/app.js` 新增面板與自動流程迴圈，開啟時取代句子列表（同小測驗模式）。

**Tech Stack:** 原生 ES modules、Web Speech API（SpeechRecognition）、Web Audio AnalyserNode、localStorage、node:test、Playwright WebKit。

**Spec:** `docs/superpowers/specs/2026-10-01-speaking-mission-design.md`

## Global Constraints
- 定位是加碼挑戰：**不寫入 `de365.done`**，不改「完成這一課」、連續天數、間隔複習。
- 存檔鍵 `de365.mission`，只保留今天的日期鍵；localStorage 讀寫一律 try/catch。
- 從寬判定：辨識分數 ≥ 0.4，或有聲累計 ≥ 500ms；無麥克風退「念完了」鈕。
- 每關 25 次，共 100 次；關一～三每句 5 次，關四 5 句一輪共 5 輪。
- 收音時長 `max(2500, 字數×450＋1200)` ms；關一再除以 `state.rate`。
- 介面文字繁中台灣用語；不推 Vercel。

## Review Focus
1. 重新整理／隔天回來：同日同課接續進度；跨日自動從關一開始（舊日期鍵被丟棄）→ Task 1 `load/save` 測試。
2. localStorage 存了壞資料（非物件、欄位越界）→ 回到 `initial()`，不當機 → Task 1 測試。
3. 練到一半按 ‹ › 換天或關閉面板：自動流程必須停止，不再播音、不再推進別課進度 → Task 3 煙霧測試「換天後計數不變」。
4. 辨識回傳 `null`（權限被拒、網路錯誤）→ 改用音量偵測；音量偵測也拿不到麥克風 → 顯示「念完了」鈕 → Task 2 `isPass` 測試＋Task 3 手動分支。
5. 開口任務不影響原完成狀態：四關全過後 `#doneBtn` 仍依原規則 → Task 3 煙霧測試。

---

### Task 1: 關卡規則與進度模組 `js/mission.js`

**Files:**
- Create: `js/mission.js`
- Test: `test/mission.test.mjs`
- Modify: `package.json`（test 腳本加入 `test/mission.test.mjs`）

**Interfaces:**
- Consumes: `taipeiDateKey()` from `js/day.js`
- Produces:
  - `STAGES: {n, name, en, zh, audio:'each'|'first'|'none'}[]`（長度 4）
  - `REPS = 5`, `TOTAL = 100`
  - `initial(): {stage:1, k:1, n:0, done:false}`
  - `advance(st) -> st'`（念過一次後的新狀態，不改原物件）
  - `needsAudio(st) -> boolean`（這一次開口前要不要先播原音）
  - `progress(st) -> 0..100`
  - `loadMission(id, today?) -> st`、`saveMission(id, st, today?)`

- [ ] **Step 1: Write the failing test** — `test/mission.test.mjs`

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/mission.test.mjs`
Expected: FAIL（`Cannot find module '../js/mission.js'`）

- [ ] **Step 3: Write minimal implementation** — `js/mission.js`

```js
// 今日口說任務：四關跟讀的規則與進度（純函式＋localStorage，不碰 DOM）。
import { taipeiDateKey } from './day.js';

export const STAGES = [
  { n: 1, name: '看英文＋中譯，跟著原音同步念', en: true, zh: true, audio: 'each' },
  { n: 2, name: '只看英文，先聽一次再自己念', en: true, zh: false, audio: 'first' },
  { n: 3, name: '字全遮，先聽一次再自己念', en: false, zh: false, audio: 'first' },
  { n: 4, name: '字全遮不播音，五句連著背出來', en: false, zh: false, audio: 'none' },
];
export const REPS = 5, LINES = 5, TOTAL = STAGES.length * REPS * LINES;
const KEY = 'de365.mission';

export const initial = () => ({ stage: 1, k: 1, n: 0, done: false });

// 念過一次 → 下一個狀態。關一～三：同句 n 滿 5 換下一句；關四：逐句前進，5 句一輪（n＝已完成輪數）
export function advance(st) {
  if (st.done) return st;
  let { stage, k, n } = st;
  if (stage < 4) { n++; if (n === REPS) { n = 0; k++; } if (k > LINES) { k = 1; stage++; } }
  else { k++; if (k > LINES) { k = 1; n++; } if (n === REPS) return { stage: 4, k: LINES, n: REPS, done: true }; }
  return { stage, k, n, done: false };
}

export function needsAudio(st) {
  const a = STAGES[st.stage - 1].audio;
  return a === 'each' || (a === 'first' && st.n === 0);
}

export function progress(st) {
  if (st.done) return TOTAL;
  const per = REPS * LINES;
  return (st.stage - 1) * per + (st.stage < 4 ? (st.k - 1) * REPS + st.n : st.n * LINES + (st.k - 1));
}

const valid = v => v && typeof v === 'object' && [1, 2, 3, 4].includes(v.stage) && v.k >= 1 && v.k <= LINES
  && Number.isInteger(v.n) && v.n >= 0 && v.n <= REPS && typeof v.done === 'boolean';
const readAll = () => { try { const o = JSON.parse(localStorage.getItem(KEY) || '{}'); return o && typeof o === 'object' ? o : {}; } catch { return {}; } };

export function loadMission(id, today = taipeiDateKey()) {
  const v = (readAll()[today] || {})[id];
  return valid(v) ? { stage: v.stage, k: v.k, n: v.n, done: v.done } : initial();
}
export function saveMission(id, st, today = taipeiDateKey()) {
  try { const day = readAll()[today] || {}; day[id] = st; localStorage.setItem(KEY, JSON.stringify({ [today]: day })); } catch {}
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/mission.test.mjs`
Expected: PASS（6 tests）

- [ ] **Step 5: 把測試接進 npm test**

`package.json` 的 test 腳本：`node --test test/day.test.mjs test/quiz.test.mjs test/speech.test.mjs test/mission.test.mjs && ...`（其餘不變）。Run: `npm test` → 全綠。

- [ ] **Step 6: Commit**

```bash
/usr/bin/git add js/mission.js test/mission.test.mjs package.json
/usr/bin/git commit -m "feat(mission): 四關跟讀規則與進度模組"
```

---

### Task 2: 從寬判定與音量偵測 `js/speech.js`

**Files:**
- Modify: `js/speech.js`（檔尾新增）
- Test: `test/speech.test.mjs`（新增 isPass 測試）

**Interfaces:**
- Consumes: 既有 `ensureMic()`
- Produces:
  - `PASS_SCORE = 0.4`, `PASS_VOICED_MS = 500`
  - `isPass({score?: number|null, voicedMs?: number}) -> boolean`（有 score 看 score，否則看 voicedMs）
  - `detectVoice(ms, threshold = 0.02) -> Promise<number|null>`（有聲累計毫秒；拿不到麥克風或 AudioContext 回 null）

- [ ] **Step 1: Write the failing test** — 追加到 `test/speech.test.mjs`

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/speech.test.mjs`
Expected: FAIL（`isPass` is not exported）

- [ ] **Step 3: Write minimal implementation** — `js/speech.js` 檔尾

```js
// 口說任務的從寬判定：有辨識分數就看分數，否則看麥克風收到聲音的時間
export const PASS_SCORE = 0.4, PASS_VOICED_MS = 500;
export function isPass({ score = null, voicedMs = 0 } = {}) {
  return score != null ? score >= PASS_SCORE : voicedMs >= PASS_VOICED_MS;
}
// 音量偵測：聽 ms 毫秒，回傳 RMS 超過門檻的累計毫秒數；拿不到麥克風回 null
export async function detectVoice(ms, threshold = 0.02) {
  const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  const s = AC ? await ensureMic() : null; if (!s) return null;
  let ctx; try { ctx = new AC(); await ctx.resume().catch(() => {}); } catch { return null; }
  const src = ctx.createMediaStreamSource(s), an = ctx.createAnalyser(); an.fftSize = 1024; src.connect(an);
  const buf = new Float32Array(an.fftSize); let voiced = 0, last = performance.now(); const end = last + ms;
  await new Promise(res => {
    const tick = () => {
      const now = performance.now(); an.getFloatTimeDomainData(buf);
      let sum = 0; for (const v of buf) sum += v * v;
      if (Math.sqrt(sum / buf.length) > threshold) voiced += now - last;
      last = now; now < end ? setTimeout(tick, 50) : res();
    };
    tick();
  });
  try { src.disconnect(); ctx.close(); } catch {}
  return Math.round(voiced);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/speech.test.mjs`
Expected: PASS（5 tests）

- [ ] **Step 5: Commit**

```bash
/usr/bin/git add js/speech.js test/speech.test.mjs
/usr/bin/git commit -m "feat(speech): 口說任務從寬判定與音量偵測"
```

---

### Task 3: 口說任務面板與自動流程

**Files:**
- Modify: `index.html`（`.quiz-bar` 前加任務按鈕列、`#quiz` 後加 `#mission` 面板；底部 `.hint` 加一句）
- Modify: `js/app.js`（import、render 內重置、open/close/render/loop、按鈕事件）
- Modify: `css/style.css`（`.mission*` 樣式）
- Test: `test/smoke.mjs`（假辨識＋預存進度）

**Interfaces:**
- Consumes: Task 1 `STAGES, REPS, TOTAL, advance, needsAudio, progress, loadMission, saveMission`；Task 2 `isPass, detectVoice`；既有 `recognize, alignWords, hasRecognition, playLine, stopAll, sleep, esc, scene, state`
- Produces: DOM `#missionBtn`、`#mission`（內含 `.m-stages li[data-s].on/.ok`、`.m-count`、`.m-msg`、`.m-go`、`.m-manual`、`.m-done`）

- [ ] **Step 1: 寫煙霧測試（先失敗）** — `test/smoke.mjs`

在 `const ctx = ...` 之後加假辨識（回傳 `window.__say`）：

```js
await ctx.addInitScript(() => {
  window.webkitSpeechRecognition = class {
    start() { this._t = setTimeout(() => this.onresult && this.onresult({ results: [[{ transcript: window.__say || '' }]] }), 150); }
    stop() { clearTimeout(this._t); setTimeout(() => this.onend && this.onend(), 0); }
    abort() { clearTimeout(this._t); }
  };
});
```

在 `await page.goto(BASE + '/archive.html');` 之前加：

```js
// ── 今日口說任務 ──
await page.goto(BASE + '/?d=42'); await page.waitForSelector('.line');
const doneBefore = (await t('#doneBtn'));
await page.click('#showEn');
await page.evaluate(() => { window.__say = [...document.querySelectorAll('.line .en .txt')].map(e => e.textContent).join(' '); });
await page.click('#missionBtn');
check('mission panel replaces lines', await page.locator('#mission').isVisible() && !(await page.locator('#lines').isVisible()));
check('mission starts at stage 1', (await page.locator('.m-stages li.on').getAttribute('data-s')) === '1');
await page.click('.m-go');
await page.waitForFunction(() => /2 \/ 100/.test(document.querySelector('.m-count')?.textContent || ''), null, { timeout: 30000 });
check('two passes counted', true);
await page.click('#next'); await page.waitForTimeout(3500);
await page.click('#prev'); await page.waitForSelector('.line');
check('leaving stops the loop; progress resumes', !(await page.locator('#mission').isVisible()));
await page.click('#missionBtn');
check('progress restored after leaving', (await t('.m-count')).includes('2 / 100'));
await page.click('#missionBtn');
// 預存到最後一次（關四第 5 輪第 5 句），念一次就完成
await page.evaluate(async () => {
  const { buildOrder, taipeiDateKey } = await import('/js/day.js');
  const sc = await (await fetch('/data/scenes.json')).json();
  const id = buildOrder(sc)[41];
  localStorage.setItem('de365.mission', JSON.stringify({ [taipeiDateKey()]: { [id]: { stage: 4, k: 5, n: 4, done: false } } }));
});
await page.reload(); await page.waitForSelector('.line');
await page.click('#showEn');
await page.evaluate(() => { window.__say = [...document.querySelectorAll('.line .en .txt')].map(e => e.textContent).join(' '); });
await page.click('#missionBtn'); await page.click('.m-go');
await page.waitForSelector('.m-done', { timeout: 20000 });
check('mission complete badge', (await t('.m-done')).includes('今日口說任務完成'));
await page.click('#missionBtn');
check('mission button shows done', (await t('#missionBtn')).includes('✓'));
check('done button unaffected', (await t('#doneBtn')) === doneBefore);
```

注意：`#showEn` 會把句子英文填入 `.txt`；任務面板在 `#lines` 之外，不受影響。

- [ ] **Step 2: Run to verify it fails**

Run（另一個終端先 `npx --yes serve -l 3000 .`）：`BASE=http://localhost:3000 node test/smoke.mjs`
Expected: FAIL（找不到 `#missionBtn`，逾時）

- [ ] **Step 3: index.html**

把 `<div class="quiz-bar"><button id="quizBtn" ...` 那行之前插入：

```html
    <div class="quiz-bar mission-bar"><button id="missionBtn" type="button" aria-expanded="false">今日口說任務（四關）</button></div>
```

在 `<section id="quiz" ...></section>` 之後插入：

```html
    <section id="mission" class="mission" hidden aria-label="今日口說任務"></section>
```

底部 `.hint` 句尾「→ 最後來個小測驗。」改為「→ 最後來個小測驗；想練口說就挑戰「今日口說任務」四關。」

- [ ] **Step 4: js/app.js**

(a) import 區加：

```js
import { STAGES, REPS, TOTAL, advance, needsAudio, progress, loadMission, saveMission } from './mission.js';
```

並把 speech import 改為：

```js
import { hasRecognition, hasRecorder, alignWords, recognize, record, ensureMic, isPass, detectVoice } from './speech.js';
```

(b) `render()` 第一行 `stopAll(); closeQuiz(); ...` 之後加 `closeMission();`，並在 `renderDone();` 之前加 `renderMissionBtn();`。

(c) 在 `$('#quizBtn').onclick = ...` 之前加整段：

```js
// ── 今日口說任務（四關跟讀）──
const MISSION_LABEL = '今日口說任務（四關）';
const ms = { st: null, run: 0, manual: false, srBroken: false };
const estMs = en => Math.max(2500, en.split(/\s+/).length * 450 + 1200);
const missionOpen = () => !$('#mission').hidden;

function renderMissionBtn() {
  const b = $('#missionBtn'); if (missionOpen()) return;
  b.textContent = loadMission(scene().id).done ? '✓ 今日口說任務完成' : MISSION_LABEL;
}
function closeMission() {
  ms.run++; stopAll();
  const box = $('#mission'); if (box.hidden) return;
  box.hidden = true; box.innerHTML = '';
  $('#lines').hidden = false; $('.controls').hidden = false;
  $('#keyPhrase').hidden = !$('#keyPhrase').innerHTML;
  $('#shadowHint').hidden = !state.shadow; $('#roleHint').hidden = !state.role;
  $('#quizBtn').hidden = $('#quizBtn').dataset.avail !== '1';
  const b = $('#missionBtn'); b.setAttribute('aria-expanded', 'false'); renderMissionBtn();
}
function openMission() {
  closeQuiz(); stopAll();
  ms.st = loadMission(scene().id); ms.manual = false;
  $('#lines').hidden = true; $('.controls').hidden = true; $('#shadowHint').hidden = true; $('#roleHint').hidden = true;
  $('#keyPhrase').hidden = true; $('#quizBtn').hidden = true; $('#mission').hidden = false;
  const b = $('#missionBtn'); b.setAttribute('aria-expanded', 'true'); b.textContent = '離開口說任務（進度會保留）';
  renderMission(false);
  $('#mission').scrollIntoView({ block: 'start', behavior: 'smooth' });
}
function setMsg(t) { const m = $('#mission .m-msg'); if (m) m.textContent = t; }
function renderMission(running) {
  const box = $('#mission'); const st = ms.st; const x = scene();
  const S = STAGES[st.stage - 1]; const l = x.lines[st.k - 1];
  const roles = x.roles || {}; const who = roles[l.speaker] ? `${l.speaker} · ${roles[l.speaker]}` : l.speaker;
  const stages = STAGES.map(s => `<li data-s="${s.n}" class="${st.done || s.n < st.stage ? 'ok' : s.n === st.stage ? 'on' : ''}">${st.done || s.n < st.stage ? '✓' : s.n}</li>`).join('');
  if (st.done) {
    box.innerHTML = `<ol class="m-stages">${stages}</ol><p class="m-done">✓ 今日口說任務完成</p><p class="m-sub">四關 ${TOTAL} 次開口全數過關，明天見！</p>`;
    return;
  }
  const dots = st.stage < 4 ? '●'.repeat(st.n) + '○'.repeat(REPS - st.n) : '';
  const where = st.stage < 4 ? `第 ${st.k} 句　${dots}` : `第 ${st.n + 1} / ${REPS} 輪　第 ${st.k} 句`;
  box.innerHTML = `<ol class="m-stages">${stages}</ol>
    <p class="m-name">第${'一二三四'[st.stage - 1]}關：${esc(S.name)}</p>
    <div class="m-line"><span class="spk">${esc(who)}</span>
      ${S.en ? `<div class="m-en">${esc(l.en)}</div>` : '<div class="m-en masked">‧‧‧‧‧‧</div>'}
      ${S.zh ? `<div class="m-zh">${esc(l.zh)}</div>` : ''}</div>
    <p class="m-where">${where}</p>
    <p class="m-count">總進度 ${progress(st)} / ${TOTAL}</p>
    <div class="m-bar"><i style="width:${progress(st)}%"></i></div>
    <p class="m-msg" aria-live="polite"></p><div class="m-fb"></div>
    <div class="m-act">${ms.manual
      ? `<button class="m-hear" type="button">▶ 聽原音</button><button class="m-manual" type="button">念完了</button>`
      : `<button class="m-go" type="button">${running ? '■ 暫停' : '▶ 開始'}</button>`}</div>
    <p class="hint-inline">戴耳機效果最好。從寬判定：有開口、大致念對就算一次；沒聽到會原地再來，不會扣次數。</p>`;
  const go = $('.m-go', box); if (go) go.onclick = () => (running ? pauseMission() : missionLoop());
  const hear = $('.m-hear', box); if (hear) hear.onclick = () => { stopAll(); playLine(st.k); };
  const man = $('.m-manual', box); if (man) man.onclick = () => { stopAll(); ms.st = advance(ms.st); saveMission(x.id, ms.st); renderMission(false); renderMissionBtn(); };
  if (ms.manual) setMsg(S.audio === 'none' ? '沒有麥克風：自己念完按「念完了」。' : '沒有麥克風：先聽原音，念完按「念完了」。');
}
function pauseMission() { ms.run++; stopAll(); renderMission(false); }
// 一次開口：有辨識看分數；辨識失敗或不支援改量音量；都不行回 {pass:null}
async function missionAttempt(text, dur) {
  if (hasRecognition && !ms.srBroken) {
    const [heard] = await Promise.all([recognize(dur), sleep(dur)]);
    if (heard !== null) { const a = alignWords(text, heard); return { pass: isPass({ score: a.score }), a }; }
    ms.srBroken = true;
  }
  const v = await detectVoice(dur);
  return v === null ? { pass: null } : { pass: isPass({ voicedMs: v }) };
}
async function missionLoop() {
  const run = ++ms.run; const x = scene();
  while (run === ms.run && !ms.st.done) {
    const st = ms.st; const l = x.lines[st.k - 1]; const dur = estMs(l.en);
    renderMission(true);
    let res;
    if (st.stage === 1) {
      setMsg('跟著原音一起念！');
      [res] = await Promise.all([missionAttempt(l.en, dur / state.rate), playLine(st.k)]);
    } else {
      if (needsAudio(st)) { setMsg('先聽一次原音…'); await playLine(st.k); if (run !== ms.run) return; }
      setMsg('● 換你念！'); res = await missionAttempt(l.en, dur);
    }
    if (run !== ms.run) return;
    if (res.pass === null) { ms.manual = true; renderMission(false); return; }
    if (res.a) $('#mission .m-fb').innerHTML = `<span class="fb-words">${res.a.words.map((w, i) => `<i class="${res.a.hit[i] ? 'hit' : 'miss'}">${esc(w)}</i>`).join(' ')}</span>`;
    if (res.pass) { ms.st = advance(st); saveMission(x.id, ms.st); setMsg('✓ 過關'); }
    else setMsg('沒聽到，再念一次');
    await sleep(900);
  }
  if (run === ms.run && ms.st.done) { renderMission(false); renderMissionBtn(); }
}
$('#missionBtn').onclick = () => (missionOpen() ? closeMission() : openMission());
```

> 註：關一的 `playLine` 會把句子記入 `state.played` 並呼叫 `renderDone()`，聽完 5 句會照常揭曉標題與開放小測驗——這是預期行為（等同聽過）。但 `renderDone` 在 `#quiz` 隱藏時會重設 `#quizBtn.hidden`，任務開啟中會讓測驗鈕冒出來，所以要在 `renderDone()` 中 `qb.dataset.avail = ...` 那行之後補：

```js
  if (!$('#mission').hidden) qb.hidden = true;
```

- [ ] **Step 5: css/style.css 檔尾**

```css
.mission-bar button#missionBtn{background:transparent;color:var(--indigo)}
.mission{margin:0 16px 12px;padding:14px;border:1px solid var(--line);border-radius:12px;background:rgba(255,255,255,.55);scroll-margin-top:12px}
.m-stages{display:flex;gap:8px;list-style:none;margin:0 0 10px;padding:0;justify-content:center}
.m-stages li{width:34px;height:34px;border-radius:50%;border:1px solid var(--line);display:grid;place-items:center;color:var(--ink3);font-weight:700}
.m-stages li.on{border-color:var(--indigo);color:var(--indigo);box-shadow:0 0 0 3px rgba(0,0,0,.04)}
.m-stages li.ok{background:var(--indigo);border-color:var(--indigo);color:#fff}
.m-name{font-weight:700;text-align:center;margin:0 0 10px}
.m-line{padding:10px 12px;border-radius:10px;background:rgba(255,255,255,.7);margin-bottom:8px}
.m-en{font-size:18px;line-height:1.5;margin-top:4px}.m-en.masked{color:var(--ink3);letter-spacing:4px}
.m-zh{color:var(--ink3);margin-top:2px}
.m-where{text-align:center;font-size:18px;letter-spacing:2px;margin:6px 0 2px}
.m-count{text-align:center;color:var(--ink3);font-size:13px;margin:0 0 4px}
.m-bar{height:6px;border-radius:3px;background:var(--line);overflow:hidden;margin-bottom:8px}.m-bar i{display:block;height:100%;background:var(--indigo);transition:width .3s}
.m-msg{text-align:center;min-height:1.4em;font-weight:700;margin:4px 0}
.m-act{display:flex;gap:8px}.m-act button{flex:1;min-height:46px;border-radius:10px;border:1px solid var(--indigo);background:var(--indigo);color:#fff;font-weight:700;font-size:15px;cursor:pointer}
.m-act .m-hear{background:transparent;color:var(--indigo)}
.m-done{text-align:center;font-size:20px;font-weight:700;color:var(--indigo);margin:10px 0 4px}
.m-sub{text-align:center;color:var(--ink3);margin:0}
.mission button:focus-visible{outline:3px solid var(--ochre);outline-offset:2px}
```

（`.fb-words i.hit/.miss` 沿用既有樣式；先 `grep -n "fb-words" css/style.css` 確認選擇器不限定在 `.line` 底下，若有限定則把該規則改成同時涵蓋 `.mission`。）

- [ ] **Step 6: Run tests**

Run: `npm test` → 全綠；`BASE=http://localhost:3000 node test/smoke.mjs` → `smoke ok`。

- [ ] **Step 7: 桌機 Chrome 手動實測**

`npx --yes serve -l 3000 .` 後開 `http://localhost:3000/?d=42`：開任務 → 允許麥克風 → 關一念兩次確認計數；暫停／離開／換天都會停；拒絕麥克風權限時出現「念完了」鈕。

- [ ] **Step 8: Commit**

```bash
/usr/bin/git add index.html js/app.js css/style.css test/smoke.mjs
/usr/bin/git commit -m "feat: 今日口說任務四關跟讀面板（看英中同步念→只看英文→全遮先聽→全遮連背）"
```

---

### Task 4: 部署（先口頭確認再執行）

- [ ] **Step 1:** `/bin/rm node_modules`（若是 symlink）；`/usr/bin/git status` 乾淨。
- [ ] **Step 2:** 依專案既有流程推 CF Pages（branch=main）＋Netlify，推 GitHub main。
- [ ] **Step 3:** curl 回讀 `https://daily-english-365.pages.dev/js/mission.js` 與 `https://daily-english-365.netlify.app/js/mission.js` 比本機 md5；首頁 grep `missionBtn`。
- [ ] **Step 4:** 更新 memory `project_daily_english_365_deploy.md`。
