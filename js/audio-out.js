// 原音播放。iPhone／iPad 改走 Web Audio：iOS Safari 只要用 <audio> 播過一次，之後麥克風收到的全是靜音
// （2026-10-02 iPhone 13／iOS 18.7 真機檢測：播過後辨識結果為空、音量峰值 0）。其他瀏覽器沿用 <audio>（慢速不變調）。
export const useWebAudio = typeof navigator !== 'undefined'
  && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
const el = !useWebAudio && typeof Audio !== 'undefined' ? new Audio() : null; // 單一元素重用：iOS 以外首次手勢後可自動連播
let ctx = null, cur = null;
const cache = new Map();

// 播 url：播完呼叫 onEnd，失敗呼叫 onFail（呼叫端自行退回語音合成）；被 stopOut() 中斷則兩者都不呼叫
export function playOut(url, rate, onEnd, onFail) {
  stopOut();
  if (el) {
    el.onended = onEnd; el.onerror = onFail; el.src = url; el.playbackRate = rate;
    el.play().catch(onFail);
    return;
  }
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  ctx.resume().catch(() => {}); // 須在點擊當下同步呼叫才解鎖
  const my = {}; cur = my;
  let buf = cache.get(url);
  if (!buf) {
    buf = fetch(url).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(a => new Promise((res, rej) => ctx.decodeAudioData(a, res, rej)));
    cache.set(url, buf);
  }
  buf.then(b => {
    if (cur !== my) return;
    const src = ctx.createBufferSource(); src.buffer = b; src.playbackRate.value = rate; src.connect(ctx.destination);
    src.onended = () => { if (cur === my) { cur = null; onEnd(); } };
    my.src = src; src.start(0);
  }, () => { cache.delete(url); if (cur === my) { cur = null; onFail(); } });
}

export function stopOut() {
  if (el) { el.onended = el.onerror = null; try { el.pause(); } catch {} }
  if (cur) { const s = cur.src; cur = null; try { s && s.stop(); } catch {} }
}

export function setOutRate(rate) {
  if (el) el.playbackRate = rate;
  if (cur && cur.src) cur.src.playbackRate.value = rate;
}
