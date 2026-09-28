#!/bin/bash
# 13 張全版背景（12 主題＋generic），無人物、留白多、供文字覆蓋。輸出 bg/<slug>.webp
set -u
ROOT="$HOME/projects/daily-english-365"; PNGDIR="$HOME/projects/_daily-english-365-png/bg"; mkdir -p "$PNGDIR"
gen() {
  local slug="$1" scene="$2" TMP="/tmp/de365-bg-$1.png" WEBP="$ROOT/bg/$1.webp"
  if [ -f "$WEBP" ] && [ "$(stat -f%z "$WEBP")" -gt 20000 ]; then echo "skip $slug"; return 0; fi
  local PROMPT="請生成一張圖片，存成 ${TMP} 。Wide atmospheric background illustration in splash-ink (潑墨) style fused with American cartoon color accents: loose wet black ink washes, rice-paper texture, sparse accent colors (vermilion red, indigo, ochre) bleeding into ink, lots of soft white space especially in the center, low contrast and gentle so text can be overlaid on top. Scene, environment only, NO people, NO characters, NO animals: $scene. No text, no letters, no signs with words, no watermark. Landscape 3:2 (1536x1024)."
  /bin/rm -f "$TMP"
  (cd "$HOME/Library/Mobile Documents/com~apple~CloudDocs/naicheng-codex-agent" && perl -e 'alarm 300; exec @ARGV' command codex exec --skip-git-repo-check "$PROMPT" </dev/null >"/tmp/de365-bg-$slug.log" 2>&1)
  if [ -f "$TMP" ] && [ "$(stat -f%z "$TMP")" -gt 100000 ]; then
    mv "$TMP" "$PNGDIR/$slug.png"
    ffmpeg -y -loglevel error -i "$PNGDIR/$slug.png" -vf "scale=1600:-2" -c:v libwebp -quality 72 "$WEBP" && echo "ok $slug $(stat -f%z "$WEBP")"
  else echo "FAIL $slug"; return 1; fi
}
gen generic   "a misty ink-wash city skyline with an arched bridge over a river, distant mountains, a few red maple branches"
gen jiaotong  "a quiet city street seen from above with a yellow taxi, a bus, a metro train on an elevated track, traffic lights and crosswalk stripes"
gen canyin    "a cozy cafe and restaurant interior with wooden tables, steaming cups and bowls, hanging pendant lamps, a window with plum branches"
gen gouwu     "a lively shopping street with small storefronts, striped awnings, shopping bags and a fruit stand, paper lanterns"
gen zhusu     "a hotel lobby with a reception desk, a rolling suitcase, and through the window an airplane in a soft sky and distant landmarks"
gen gongzuo   "a bright open office with desks, laptops, a long meeting table, a whiteboard with only doodles, tall windows"
gen xuexiao   "a school classroom with wooden desks, a blank blackboard, a globe, backpacks, and a school building with a clock tower outside"
gen yiliao    "a calm clinic waiting room with a reception counter, a stethoscope on a desk, potted plants, a hospital corridor in soft light"
gen jinrong   "a bank counter with a queue rope, an ATM, a post office with red mailboxes, envelopes and coins"
gen shejiao   "a park with a bench under a tree, a small cafe table for two with two cups, string lights and balloons"
gen jiating   "a warm living room and kitchen with a sofa, houseplants, a kettle on the stove, laundry drying by a sunny window"
gen xiuxian   "a riverside park with bicycles, a basketball court, mountains and a hiking trail, a cinema marquee without words"
gen jinji     "a street corner with a fire hydrant, a small repair shop with tools, a hair salon chair, rain and an umbrella, a police car light"
