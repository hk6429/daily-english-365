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

// 連續天數＋保護卡：從第一筆紀錄逐日走到今天；每連續練滿 7 天得 1 張保護卡（最多存 2 張），
// 漏練一天自動用掉 1 張、連續不歸零；今天還沒練不算漏。
export function streakInfo(list, today = taipeiDateKey()) {
  const days = new Set(list.map(x => x.d));
  if (!days.size) return { streak: 0, freezes: 0, used: 0 };
  let cur = [...days].sort()[0], run = 0, freezes = 0, used = 0;
  while (cur <= today) {
    if (days.has(cur)) { run++; if (run % 7 === 0 && freezes < 2) freezes++; }
    else if (cur !== today) { if (run > 0 && freezes > 0) { freezes--; used++; } else run = 0; }
    cur = shiftDateKey(cur, 1);
  }
  return { streak: run, freezes, used };
}
export const streak = (list, today = taipeiDateKey()) => streakInfo(list, today).streak;

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

// 里程碑：累計練習天數、累計開口次數（口說任務每計一次 +1）
const BADGES = [
  { label: '七日', days: 7 }, { label: '廿一', days: 21 }, { label: '五十', days: 50 }, { label: '百日', days: 100 }, { label: '一年', days: 365 },
  { label: '開口五百', voice: 500 }, { label: '開口一千', voice: 1000 }, { label: '開口五千', voice: 5000 },
];
const got = (b, days, voice) => (b.days ? days >= b.days : voice >= b.voice);
export const earnedBadges = (days, voice) => BADGES.filter(b => got(b, days, voice));
export function nextBadge(days, voice) {
  const b = BADGES.find(x => x.days && !got(x, days, voice)) || BADGES.find(x => !got(x, days, voice));
  return b ? { label: b.label, left: b.days ? `還差 ${b.days - days} 天` : `還差開口 ${b.voice - voice} 次` } : null;
}
const VKEY = 'de365.voice';
export function loadVoice() { try { return Math.max(0, parseInt(localStorage.getItem(VKEY), 10) || 0); } catch { return 0; } }
export function addVoice() { try { localStorage.setItem(VKEY, String(loadVoice() + 1)); } catch {} }
