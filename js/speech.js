// 跟讀／角色扮演的「開口」回饋：優先用瀏覽器語音辨識逐字比對；不支援時錄音回放。純瀏覽器模組。
const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
export const hasRecognition = !!SR;
export const hasRecorder = typeof window !== 'undefined' && !!(navigator.mediaDevices && window.MediaRecorder);

export const tokens = s => s.toLowerCase().replace(/[^a-z0-9' ]/g, ' ').split(/\s+/).filter(Boolean);

// 逐字比對：回傳目標句每個字是否被唸到（LCS 對齊，容忍漏字／多字）
export function alignWords(target, spoken) {
  const t = tokens(target), s = tokens(spoken);
  const n = t.length, m = s.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    dp[i][j] = t[i] === s[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const hit = new Array(n).fill(false);
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (t[i] === s[j]) { hit[i] = true; i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++;
  }
  return { words: t, hit, score: n ? hit.filter(Boolean).length / n : 0 };
}

// 聽 ms 毫秒，回傳辨識到的文字（可能為空字串）；失敗回 null
export function recognize(ms, lang = 'en-US') {
  if (!SR) return Promise.resolve(null);
  return new Promise(res => {
    const r = new SR(); r.lang = lang; r.interimResults = true; r.maxAlternatives = 3; r.continuous = true;
    let best = '', done = false;
    const finish = v => { if (done) return; done = true; clearTimeout(t); try { r.abort(); } catch {} res(v); };
    r.onresult = e => { best = Array.from(e.results).map(x => x[0].transcript).join(' '); };
    r.onerror = e => finish(e.error === 'no-speech' || e.error === 'aborted' ? best : null);
    r.onend = () => finish(best);
    const t = setTimeout(() => { try { r.stop(); } catch { finish(best); } }, ms);
    try { r.start(); } catch { finish(null); }
  });
}

let stream = null;
export async function ensureMic() {
  if (stream) return stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); return stream; } catch { return null; }
}
// 錄 ms 毫秒，回傳可播放的 object URL；失敗回 null
export async function record(ms) {
  const s = await ensureMic(); if (!s || !window.MediaRecorder) return null;
  return new Promise(res => {
    const chunks = []; let rec;
    try { rec = new MediaRecorder(s); } catch { return res(null); }
    rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    rec.onstop = () => res(chunks.length ? URL.createObjectURL(new Blob(chunks, { type: rec.mimeType })) : null);
    rec.start(); setTimeout(() => { try { rec.stop(); } catch { res(null); } }, ms);
  });
}
