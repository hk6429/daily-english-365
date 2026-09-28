#!/bin/bash
# 序列跑完 365 張；失敗記 scratch/img-fail.txt 並重試一輪；結束寫 scratch/img-done
cd "$(dirname "$0")/.." || exit 1
: > scratch/img-fail.txt
node -e "for(const x of require('./data/scenes.json'))console.log(String(x.id).padStart(3,'0')+'\t'+x.image_prompt_en)" > scratch/img-list.tsv
while IFS=$'\t' read -r id p; do
  scripts/gen-image.sh "$id" "$p" </dev/null || echo "$id	$p" >> scratch/img-fail.txt
done < scratch/img-list.tsv
cp scratch/img-fail.txt scratch/img-fail-round1.txt
while IFS=$'\t' read -r id p; do [ -n "$id" ] && scripts/gen-image.sh "$id" "$p" </dev/null; done < scratch/img-fail-round1.txt
ls img/*.webp | wc -l > scratch/img-done
