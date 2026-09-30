#!/usr/bin/env python3
"""關鍵句替換版本音檔：audio/NNN-v1.mp3、NNN-v2.mp3。聲音沿用關鍵句那句的說話者；雜湊記在 audio/.manifest.json（key: NNN-vN）。"""
import json, os, subprocess, hashlib
from concurrent.futures import ThreadPoolExecutor
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOICES={'male':('en-US-AndrewNeural','-10%'),'female':('en-US-JennyNeural','+0%'),'child':('en-US-AnaNeural','+0%')}
DEFAULT={'A':'male','B':'female'}
MAN=f'{ROOT}/audio/.manifest.json'
manifest=json.load(open(MAN)) if os.path.exists(MAN) else {}
scenes={x['id']:x for x in json.load(open(f'{ROOT}/data/scenes.json'))}
extras=json.load(open(f'{ROOT}/data/extras.json'))
jobs=[]
for e in extras:
    x=scenes[e['id']]
    line=next(l for l in x['lines'] if x['key_phrase'] in l['en'])
    voice,rate=VOICES[line.get('voice') or DEFAULT[line['speaker']]]
    for i,v in enumerate(e['variants'],1):
        name=f"{x['id']:03d}-v{i}"; out=f"{ROOT}/audio/{name}.mp3"
        key=hashlib.md5(f"{voice}|{rate}|{v['en']}|v2".encode()).hexdigest()
        if manifest.get(name)==key and os.path.exists(out) and os.path.getsize(out)>1500: continue
        jobs.append((name,out,voice,rate,v['en'],key))
def run(j):
    name,out,voice,rate,text,key=j
    tmp=out+'.raw.mp3'
    for _ in range(3):
        r=subprocess.run(['uvx','edge-tts','--voice',voice,f'--rate={rate}','--text',text,'--write-media',tmp],capture_output=True)
        if r.returncode==0 and os.path.exists(tmp) and os.path.getsize(tmp)>2000:
            f=subprocess.run(['ffmpeg','-y','-loglevel','error','-i',tmp,'-af',
                'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.15,areverse',
                '-c:a','libmp3lame','-q:a','4',out],capture_output=True)
            if f.returncode==0 and os.path.exists(out) and os.path.getsize(out)>1500:
                os.remove(tmp); return (name,key)
    return (name,None)
print('jobs',len(jobs),flush=True)
with ThreadPoolExecutor(4) as ex:
    for i,(name,key) in enumerate(ex.map(run,jobs),1):
        if key: manifest[name]=key
        else: print('FAIL',name,flush=True)
        if i%100==0:
            print(i,len(jobs),flush=True); json.dump(manifest,open(MAN,'w'))
json.dump(manifest,open(MAN,'w'))
print('done',len(jobs))
