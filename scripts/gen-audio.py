#!/usr/bin/env python3
"""edge-tts 批次：A=Andrew(男) B=Jenny(女)，4 路並行，已存在跳過。"""
import json, os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOICE={'A':'en-US-AndrewNeural','B':'en-US-JennyNeural'}
scenes=json.load(open(f'{ROOT}/data/scenes.json'))
jobs=[]
for x in scenes:
    for k,l in enumerate(x['lines'],1):
        out=f"{ROOT}/audio/{x['id']:03d}-{k}.mp3"
        if os.path.exists(out) and os.path.getsize(out)>3000: continue
        jobs.append((out,VOICE[l['speaker']],l['en']))
def run(j):
    out,v,t=j
    for _ in range(3):
        r=subprocess.run(['uvx','edge-tts','--voice',v,'--text',t,'--write-media',out],capture_output=True)
        if r.returncode==0 and os.path.getsize(out)>3000: return out
    return 'FAIL '+out
with ThreadPoolExecutor(4) as ex:
    for i,r in enumerate(ex.map(run,jobs),1):
        if r.startswith('FAIL') or i%100==0: print(i,len(jobs),r,flush=True)
print('done',len(jobs))
