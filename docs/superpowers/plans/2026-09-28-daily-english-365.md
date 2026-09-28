# 英語日日聽 daily-english-365 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 靜態網站，依台北日期每天輪播 365 個生活英語情境（5 句 A/B 對話＋中譯＋mp3＋潑墨 Q 版配圖），聽→遮字→揭曉練聽力。

**Architecture:** 純靜態（index.html / archive.html / js / css / data/scenes.json / img / audio），無 build step。內容由子代理分 12 主題批次產出，`scripts/validate.js` 當硬閘門；配圖走 `scripts/gen-image.sh`（codex exec）序列背景跑；語音走 `scripts/gen-audio.py`（edge-tts）。部署 CF Pages＋Netlify。

**Tech Stack:** vanilla HTML/CSS/JS、Node 22（測試腳本）、uvx edge-tts、codex exec、ffmpeg、wrangler、netlify CLI。

**Spec:** `docs/superpowers/specs/2026-09-28-daily-english-365-design.md`

## Global Constraints
- 365 筆 id 1–365 連續唯一；每筆恰 5 句；speaker 只有 A/B；title_en 不重複；英文每句 3–14 字。
- A＝`en-US-AndrewNeural`、B＝`en-US-JennyNeural`；音檔 `audio/{id:03d}-{k}.mp3`。
- 圖 `img/{id:03d}.webp` 4:3、寬 1200、≤300KB；PNG 原檔存 `~/projects/_daily-english-365-png/`，不進 repo。
- 日期對應：`Asia/Taipei` day-of-year；閏年第 366 天→365。
- 不做：聽寫、帳號、PWA、後端。repo 不得含真實師生姓名。
- 部署禁 Vercel；CF 帶 production branch main；部署後 curl 回讀比 md5。

## Review Focus
1. `?d=0`、`?d=999`、`?d=abc` → 一律退回今天，不能白頁。（Task 4 測試）
2. 圖或 mp3 404（生圖批次未完）→ 顯示佔位墨點／退回 Web Speech 朗讀，不能卡在「聽全部」。（Task 4）
3. 跨午夜／不同時區使用者→以台北時間為準，localStorage 日期 key 用 `YYYY-MM-DD`（台北）。（Task 4）
4. 子代理產的 JSON 夾雜 markdown code fence→合併腳本先剝 fence 再 parse，失敗批次重跑。（Task 1）
5. 「聽全部」播放中再按一次→應停止而非疊播。（Task 4）

---

### Task 1: 365 情境內容
**Files:** Create `data/scenes.json`、`scripts/validate.js`、`scripts/merge-batches.js`、`package.json`；批次暫存 `scratch/batch-NN.json`（gitignore）。
**Produces:** `data/scenes.json` = `[{id, category, title_en, title_zh, scene_zh, image_prompt_en, lines:[{speaker,en,zh}×5]}]`。`image_prompt_en` 供 Task 2 用。

- [ ] Step 1 寫 `scripts/validate.js`（Node，無依賴）：
```js
const s = JSON.parse(require('fs').readFileSync('data/scenes.json','utf8'));
const errs=[]; if(s.length!==365) errs.push(`count ${s.length}`);
const titles=new Set();
s.forEach((x,i)=>{ if(x.id!==i+1) errs.push(`id ${x.id} at ${i}`);
 if(!x.category||!x.title_en||!x.title_zh||!x.scene_zh||!x.image_prompt_en) errs.push(`fields ${x.id}`);
 if(titles.has(x.title_en.toLowerCase())) errs.push(`dup title ${x.title_en}`); titles.add(x.title_en.toLowerCase());
 if(!Array.isArray(x.lines)||x.lines.length!==5) errs.push(`lines ${x.id}`);
 (x.lines||[]).forEach((l,k)=>{ if(!['A','B'].includes(l.speaker)) errs.push(`spk ${x.id}-${k}`);
  const w=(l.en||'').trim().split(/\s+/).length; if(w<3||w>14) errs.push(`len ${x.id}-${k}: ${l.en}`);
  if(!l.zh) errs.push(`zh ${x.id}-${k}`); });});
if(errs.length){console.error(errs.join('\n'));process.exit(1)} console.log('ok 365');
```
- [ ] Step 2 `package.json`：`{"name":"daily-english-365","private":true,"scripts":{"test":"node scripts/validate.js && node scripts/check-assets.js"}}`。
- [ ] Step 3 派 12 個 sonnet 子代理並行，每個給主題＋id 範圍（1–30 … 331–365）＋固定 JSON schema 與品質要求（日常口語、台灣人會遇到的情境、A/B 交替、台灣用語中譯、image_prompt_en 具體動作物件、no text in image），輸出 `scratch/batch-NN.json`。主題：交通/餐飲/購物/住宿旅遊/工作/學校/醫療健康/金融郵政/社交人際/家庭生活/休閒運動/緊急與服務。
- [ ] Step 4 `scripts/merge-batches.js`：讀 scratch/batch-*.json（剝 ``` fence），依 id 排序合併寫 `data/scenes.json`。
- [ ] Step 5 `node scripts/validate.js` → 失敗項目回派原批次修；直到 `ok 365`。
- [ ] Step 6 抽讀 12 筆（每主題 1 筆）確認口語自然；grep 簡體／大陸用語（视/说/么/软件/信息/视频）。
- [ ] Step 7 commit `feat(data): 365 scenes`。

### Task 2: 配圖批次（背景）
**Files:** `scripts/gen-image.sh`（已驗證）；Create `scripts/gen-images-all.sh`。
- [ ] Step 1 `gen-images-all.sh`：從 scenes.json 逐筆讀 id＋image_prompt_en → `gen-image.sh`；失敗記 `scratch/img-fail.txt`，跑完重試一輪；結束寫 `scratch/img-done`。
- [ ] Step 2 `nohup` 背景跑，記 PID。
- [ ] Step 3 完成後 `ls img | wc -l` = 365，每檔 >20KB；主控端發 Telegram 通知。

### Task 3: 語音批次
**Files:** Create `scripts/gen-audio.py`、`scripts/check-assets.js`。
- [ ] Step 1 `gen-audio.py`：每句 `uvx edge-tts --voice {A:Andrew,B:Jenny} --text ... --write-media audio/{id:03d}-{k}.mp3`；已存在 >3KB 跳過；4 路並行；失敗重試 2 次。
- [ ] Step 2 `check-assets.js`：每 id 5 個 mp3 存在 >3KB（error）；圖缺 warning，`STRICT_IMG=1` 時 error。
- [ ] Step 3 `ls audio | wc -l` = 1825；`npm test` 綠；commit。

### Task 4: 網站前端
**Files:** Create `index.html`、`archive.html`、`css/style.css`、`js/app.js`、`js/day.js`、`js/vendor/count.js`＋`gc-config.js`、`test/day.test.mjs`、`test/smoke.mjs`。
**Interfaces:** `day.js` 匯出 `todayIndex(now)`（台北 day-of-year 1–365）、`parseDay(qs)`（無效→null）、`taipeiDateKey(now)`。
- [ ] Step 1 `test/day.test.mjs`（node --test）：2026-01-01T00:30+08→1；2026-12-31T23:00+08→365；2028-12-31（閏年 366）→365；UTC 2026-01-01T15:59Z→1、16:00Z→2；`parseDay('?d=0')`/`?d=366`/`?d=abc`→null；`?d=42`→42。
- [ ] Step 2 實作 `js/day.js`（`Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei'})`），測試綠。
- [ ] Step 3 `index.html`＋`app.js`：載入 scenes.json→`parseDay ?? todayIndex`；圖 `onerror`→墨點佔位；5 句預設遮字；聽全部（序列、句間 1s、再按停止）、每句 ▶、1×/0.75×、看英文、看中譯、完成今日、← →；mp3 `onerror`→`speechSynthesis` fallback；localStorage `de365.done`＝台北日期 key 陣列；已練天數＋連續天數。
- [ ] Step 4 `archive.html`：依 category 分組列 365 筆連結，標記已練。
- [ ] Step 5 `style.css`：宣紙 `#f6f1e7`、墨 `#1c1c1c`、硃砂 `#c23a2b`，Noto Serif TC；480px 單欄；按鈕 ≥44px。
- [ ] Step 6 GoatCounter vendored（`js/vendor/`）。
- [ ] Step 7 `test/smoke.mjs`：Playwright WebKit iPhone 13：5 個 ▶、看英文後第一句可見、`?d=999` 仍渲染、聽全部按兩次全 paused。
- [ ] Step 8 commit。

### Task 5: 上線
- [ ] Step 1 README、`.cf-branch`=main、`_headers`（img/audio cache 1 年）。
- [ ] Step 2 `git show --stat` 確認無名冊實名；`gh repo create hk6429/daily-english-365 --public --source . --push`。
- [ ] Step 3 CF Pages project create（production branch main）＋ deploy `--branch main`。
- [ ] Step 4 Netlify sites:create → status 核對 → deploy --prod。
- [ ] Step 5 兩平台 curl `data/scenes.json` md5 比本機；首頁／一張圖／一個 mp3 200。
- [ ] Step 6 生圖批次若未完先上線（佔位圖），完成後 `STRICT_IMG=1 npm test` 綠再重部署；naicheng-tw works.ts 收錄。
