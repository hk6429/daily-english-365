// 練習紀錄（localStorage）：[{d:'YYYY-MM-DD', id}]；連續天數、間隔複習。
import { taipeiDateKey, daysBetween, shiftDateKey } from './day.js';

const KEY = 'de365.done';

export function loadDone() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    return raw.map(x => (typeof x === 'string' ? { d: x, id: null } : x)).filter(x => x && x.d);
  } catch { return []; }
}
export function saveDone(list) { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {} }

export function markDone(id, today = taipeiDateKey()) {
  const list = loadDone();
  if (!list.some(x => x.d === today && x.id === id)) list.push({ d: today, id });
  saveDone(list);
  return list;
}

export function isDoneScene(list, id) { return list.some(x => x.id === id); }
export function isDoneToday(list, id, today = taipeiDateKey()) { return list.some(x => x.d === today && x.id === id); }

// 連續天數：從今天（或昨天，今天還沒練也不歸零）往回數連續有紀錄的日子
export function streak(list, today = taipeiDateKey()) {
  const days = new Set(list.map(x => x.d));
  let cur = days.has(today) ? today : shiftDateKey(today, -1);
  let n = 0;
  while (days.has(cur)) { n++; cur = shiftDateKey(cur, -1); }
  return n;
}

export function practicedDays(list) { return new Set(list.map(x => x.d)).size; }

// 間隔複習：1／3／7／21 天前練過的情境（去重、排除今天已練）
export function reviewDue(list, today = taipeiDateKey()) {
  const gaps = [1, 3, 7, 21];
  const doneToday = new Set(list.filter(x => x.d === today).map(x => x.id));
  const out = [];
  for (const x of list) {
    if (x.id == null || doneToday.has(x.id)) continue;
    const gap = daysBetween(x.d, today);
    if (gaps.includes(gap) && !out.some(o => o.id === x.id)) out.push({ id: x.id, gap });
  }
  return out.sort((a, b) => a.gap - b.gap);
}

// 完成紀錄記在哪天：補的是昨天那課、且昨天沒有紀錄 → 記昨天，讓「補一課」真的接回連續天數
export function doneDate(list, isYesterdayLesson, today = taipeiDateKey()) {
  const y = shiftDateKey(today, -1);
  return isYesterdayLesson && !list.some(x => x.d === y) ? y : today;
}
