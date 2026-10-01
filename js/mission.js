// 今日口說任務：四關跟讀的規則與進度（純函式＋localStorage，不碰 DOM）。
import { taipeiDateKey } from './day.js';

export const STAGES = [
  { n: 1, name: '看英文＋中譯，跟著原音同步念', en: true, zh: true, audio: 'each' },
  { n: 2, name: '只看英文，先聽一次再自己念', en: true, zh: false, audio: 'first' },
  { n: 3, name: '字全遮，先聽一次再自己念', en: false, zh: false, audio: 'first' },
  { n: 4, name: '字全遮不播音，五句連著背出來', en: false, zh: false, audio: 'none' },
];
export const REPS = 5, LINES = 5, TOTAL = STAGES.length * REPS * LINES;
const KEY = 'de365.mission';

export const initial = () => ({ stage: 1, k: 1, n: 0, done: false });

// 念過一次 → 下一個狀態。關一～三：同句 n 滿 5 換下一句；關四：逐句前進，5 句一輪（n＝已完成輪數）
export function advance(st) {
  if (st.done) return st;
  let { stage, k, n } = st;
  if (stage < 4) { n++; if (n === REPS) { n = 0; k++; } if (k > LINES) { k = 1; stage++; } }
  else { k++; if (k > LINES) { k = 1; n++; } if (n === REPS) return { stage: 4, k: LINES, n: REPS, done: true }; }
  return { stage, k, n, done: false };
}

export function needsAudio(st) {
  const a = STAGES[st.stage - 1].audio;
  return a === 'each' || (a === 'first' && st.n === 0);
}

export function progress(st) {
  if (st.done) return TOTAL;
  const per = REPS * LINES;
  return (st.stage - 1) * per + (st.stage < 4 ? (st.k - 1) * REPS + st.n : st.n * LINES + (st.k - 1));
}

const valid = v => v && typeof v === 'object' && [1, 2, 3, 4].includes(v.stage) && v.k >= 1 && v.k <= LINES
  && Number.isInteger(v.n) && v.n >= 0 && v.n <= REPS && typeof v.done === 'boolean';
const readAll = () => { try { const o = JSON.parse(localStorage.getItem(KEY) || '{}'); return o && typeof o === 'object' ? o : {}; } catch { return {}; } };

export function loadMission(id, today = taipeiDateKey()) {
  const v = (readAll()[today] || {})[id];
  return valid(v) ? { stage: v.stage, k: v.k, n: v.n, done: v.done } : initial();
}
export function saveMission(id, st, today = taipeiDateKey()) {
  try { const day = readAll()[today] || {}; day[id] = st; localStorage.setItem(KEY, JSON.stringify({ [today]: day })); } catch {}
}
