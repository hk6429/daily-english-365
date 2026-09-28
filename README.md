# 英語日日聽 daily-english-365

每天一個生活情境、5 句實用英語對話。先聽、再看英文、再看中譯，逐句重播、0.75× 慢速，記錄已練天數與連續天數。365 個情境依「台北時區一年第幾天」輪播，`?d=N` 可跳任一天，`archive.html` 依主題總覽。

- 純靜態站，無框架、無後端、免帳號。
- 12 大主題：交通、餐飲、購物、住宿旅遊、工作、學校、醫療健康、金融郵政、社交人際、家庭生活、休閒運動、緊急與服務。
- 配圖：潑墨水墨 × 美式 Q 版（1:1 頭身），AI 生成。
- 語音：edge-tts 神經語音（A＝en-US-Andrew、B＝en-US-Jenny）。

## 結構

```
index.html / archive.html
css/style.css  js/app.js  js/day.js
data/scenes.json   365 筆 {id, category, title_en, title_zh, scene_zh, image_prompt_en, lines[5]{speaker,en,zh}}
img/NNN.webp       365 張 4:3
audio/NNN-K.mp3    1825 檔
scripts/           validate.cjs / check-assets.cjs / merge-batches.cjs / gen-audio.py / gen-image.sh / gen-images-all.sh
test/              day.test.mjs（node --test）、smoke.mjs（Playwright WebKit）
```

## 開發

```bash
npm test                      # 日期邏輯 + 資料驗證 + 資產檢查
STRICT_IMG=1 npm test         # 上線前：缺圖視為錯誤
python3 scripts/gen-audio.py  # 補產缺的 mp3（已存在跳過）
scripts/gen-images-all.sh     # 補產缺的配圖（codex exec，序列）
npx serve .                   # 本機預覽
```

## 授權

對話文字 CC BY-NC 4.0；插畫為 AI 生成、語音為合成人聲，僅供學習用途。
