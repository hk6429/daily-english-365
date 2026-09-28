// 台北時區的「一年第幾天」、日期 key，以及「第幾天 ↔ 情境 id」的交錯對應。瀏覽器與 Node 共用（ESM）。
const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' });

export function taipeiDateKey(now = new Date()) {
  return fmt.format(now); // YYYY-MM-DD
}

export function todayIndex(now = new Date()) {
  const [y, m, d] = taipeiDateKey(now).split('-').map(Number);
  const start = Date.UTC(y, 0, 1);
  const cur = Date.UTC(y, m - 1, d);
  const doy = Math.round((cur - start) / 86400000) + 1;
  return Math.min(doy, 365);
}

export function parseDay(qs) {
  const m = /[?&]d=(\d+)(?:&|$)/.exec(qs || '');
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 1 && n <= 365 ? n : null;
}

// 主題交錯：第 1 天＝主題1 的第 1 個、第 2 天＝主題2 的第 1 個 … 第 13 天＝主題1 的第 2 個。
// 回傳 order[day-1] = scene id。主題順序依 scenes.json 首次出現順序。
export function buildOrder(scenes) {
  const groups = new Map();
  for (const s of scenes) { if (!groups.has(s.category)) groups.set(s.category, []); groups.get(s.category).push(s.id); }
  const lists = [...groups.values()];
  const order = [];
  for (let i = 0; order.length < scenes.length; i++) for (const l of lists) if (i < l.length) order.push(l[i]);
  return order;
}

export function dayOfScene(order, id) { return order.indexOf(id) + 1; }

// 兩個 YYYY-MM-DD 相差天數（b - a）
export function daysBetween(a, b) {
  const p = s => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round((p(b) - p(a)) / 86400000);
}

export function shiftDateKey(key, days) {
  const [y, m, d] = key.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return t.toISOString().slice(0, 10);
}
