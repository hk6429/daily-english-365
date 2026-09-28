# 英語日日聽 daily-english-365

每天一個生活情境、5 句實用英語對話。先聽、再看英文、再看中譯，逐句重播、0.75× 慢速、跟讀模式、今日關鍵句標示、1／3／7／21 天間隔複習，記錄已練天數與連續天數（可補課接回）。365 個情境依「台北時區一年第幾天」輪播，各主題輪流交錯出現，`?d=N` 可跳任一天，`archive.html` 依主題總覽（每則附插圖、各主題全版背景）。

- 純靜態站，無框架、無後端、免帳號。
- 12 大主題：交通、餐飲、購物、住宿旅遊、工作、學校、醫療健康、金融郵政、社交人際、家庭生活、休閒運動、緊急與服務。
- 配圖：潑墨水墨 × 美式 Q 版（1:1 頭身），AI 生成。
- 語音：edge-tts 神經語音（A＝en-US-Andrew 語速 −10%、B＝en-US-Jenny；`voice: male|female|child` 可逐句覆寫，child＝en-US-Ana），頭尾靜音已修剪。
- 內容經四方審查修正（語言學習專家、學習專家、英文學習教授、全美語教學老師），紀錄見 `scripts/apply-review-fixes.cjs`。

## 結構

```
index.html / archive.html
css/style.css  js/app.js  js/day.js  js/progress.js  js/cats.js
data/scenes.json   365 筆 {id, category, title_en, title_zh, scene_zh, image_prompt_en, roles{A,B}, key_phrase, key_phrase_zh, lines[5]{speaker,en,zh,voice?}}
img/NNN.webp       365 張 4:3
bg/<slug>.webp     13 張全版背景（generic + 12 主題）
audio/NNN-K.mp3    1825 檔
scripts/           validate.cjs / check-assets.cjs / merge-batches.cjs / merge-roles.cjs / apply-review-fixes.cjs / gen-audio.py / gen-image.sh / gen-images-all.sh / gen-bg.sh
test/              day.test.mjs（node --test）、smoke.mjs（Playwright WebKit）
```

## 開發

```bash
npm test                      # 日期邏輯 + 資料驗證 + 資產檢查
STRICT_IMG=1 npm test         # 上線前：缺圖視為錯誤
python3 scripts/gen-audio.py  # 產 mp3（依 audio/.manifest.json 雜湊，只重產有變動的句子）
scripts/gen-images-all.sh     # 補產缺的配圖（codex exec，LANES=4 並行）
npx serve .                   # 本機預覽
```

## 授權

對話文字 CC BY-NC 4.0；插畫為 AI 生成、語音為合成人聲，僅供學習用途。
