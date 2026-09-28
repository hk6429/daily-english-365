# 英語日日聽 daily-english-365 — 設計規格

日期：2026-09-28

## 目的
每天一個生活情境、5 句實用對話，讓使用者「先聽、再看英文、再看中譯」練聽力。對象：國高中生、想重拾英文的成人。成功條件：365 天每天打開都有新情境＋配圖＋語音；手機單手可操作；免帳號。

## 決策（使用者已確認）
- 語音：預先生成 mp3（edge-tts 神經語音，A/B 角色分男女聲）
- 配圖：先 3 張樣張確認風格，再背景批次跑完 365 張（codex exec，不耗 API）
- 互動：聽 → 遮字 → 揭曉 ＋ 逐句重播；不做聽寫
- 站名／repo：daily-english-365（英語日日聽），GitHub 公開，部署 CF Pages＋Netlify（Vercel 全域暫停）

## 架構
純靜態站，無 build step。`~/projects/daily-english-365`：
```
index.html          今日情境＋練習介面
archive.html        365 情境總覽（依主題分組，可跳任一日）
js/app.js css/style.css
data/scenes.json    365 筆
img/NNN.webp        365 張 4:3，≤200KB
audio/NNN-K.mp3     1825 檔，K=1..5
scripts/            gen-scenes 驗證、gen-images.sh、gen-audio.py、validate.js
```

### 資料格式 `data/scenes.json`
```json
{"id":1,"category":"交通","title_en":"Taking a Taxi","title_zh":"搭計程車",
 "scene_zh":"上車後司機問你要去哪裡",
 "lines":[{"speaker":"A","en":"Where are you headed today?","zh":"你今天要去哪裡？"}, ...5 句]}
```
規則：id 1–365 唯一；每筆恰 5 句；speaker 只有 A/B（A=男 Andrew，B=女 Jenny）；英文 3–14 字、日常口語；title_en 全庫不重複；12 大主題約各 30 個情境（交通／餐飲／購物／住宿旅遊／工作／學校／醫療健康／金融郵政／社交人際／家庭生活／休閒運動／緊急與服務）。

### 日期對應
台北時區 day-of-year（1–365；閏年 366 → 對應 365）。`?d=N` 可看任一天；上一天／下一天；archive 可跳。

### 練習流程（app.js）
1. 頁面顯示配圖＋主題，五句預設遮字。
2. 「聽全部」依序播 5 句，句間停 1 秒；每句有單獨播放鈕；語速 0.75× / 1× 切換（`audio.playbackRate`）。
3. 「看英文」揭曉英文；「看中譯」揭曉中譯；可逐句點擊揭曉。
4. 「完成今日」→ localStorage 記錄日期集合＋連續天數，首頁顯示「已練 N 天／連續 M 天」。
5. 無網路時 audio 失敗 → 退回 Web Speech API 朗讀（單行 fallback）。

### 視覺
水墨風 UI：米白宣紙底、墨色標題、硃砂點綴；Noto Serif TC 標題＋系統無襯線內文；手機優先 480px 單欄。

### 配圖 prompt（固定模板，只換場景句）
「Splash-ink painting (潑墨) illustration, American cartoon energy fused with Chinese ink-wash aesthetics: bold black ink splashes, loose wet brush strokes, rice-paper texture, sparse accent colors (vermilion, indigo, ochre) bleeding into ink, generous white space. Chibi characters with head-to-body ratio exactly 1:1, big expressive eyes, rounded American-cartoon proportions. Scene: {scene}. No text, no letters, no watermark. 4:3 landscape.」
產線：`scripts/gen-images.sh` 序列跑、每張 `timeout 300`、已存在且 >100KB 者跳過（可續跑）、PNG 原檔存 `~/projects/_daily-english-365-png/`（不進 repo），ffmpeg 轉 1200px webp 進 `img/`。完成後 Telegram 通知。

### 語音產線
`scripts/gen-audio.py`：`uvx edge-tts`，A→en-US-AndrewNeural、B→en-US-JennyNeural，4 路並行，已存在跳過；輸出 `audio/{id:03d}-{k}.mp3`。

### 內容產出
以子代理（sonnet）分 12 批（每批一個主題、約 30 情境）產 JSON，主控端合併；`scripts/validate.js` 硬閘門：筆數 365、id 連續、5 句、speaker A/B、title_en 不重複、英文字數範圍、每句 en/zh 非空。

### 測試
`npm test` = validate.js（資料）＋ assets check（每 id 有 webp 與 5 mp3；樣張階段允許缺圖，上線前必全綠）。Playwright WebKit iPhone 13 煙霧：首頁載入、播放鈕存在、揭曉切換。

### 部署
GitHub `hk6429/daily-english-365`（公開；無真實師生姓名）。CF Pages `daily-english-365.pages.dev`（`.cf-branch`=main）＋ Netlify `daily-english-365.netlify.app`（先 `netlify status` 核對站台）。部署後 curl 回讀 `data/scenes.json` 與 index.html 比 md5。GoatCounter 計數器 vendored（`js/vendor/`）。

### 不做（YAGNI）
聽寫填空、帳號、PWA、多語系、後端。
