// 聽音選句：每句出 4 選 1，播音檔（不顯示字）→ 選正確英文句。干擾項優先取同主題其他情境的句子。
// 純函式、seed 固定（同一情境每次題目相同），瀏覽器與 Node 共用。

const hash = s => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const rng = seed => () => { seed = (seed + 0x6d2b79f5) >>> 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const shuffle = (a, r) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const norm = s => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();

export function buildQuiz(scenes, id) {
  const cur = scenes.find(s => s.id === id);
  if (!cur) return [];
  const others = scenes.filter(s => s.id !== id);
  const same = others.filter(s => s.category === cur.category).flatMap(s => s.lines.map(l => l.en));
  const rest = others.filter(s => s.category !== cur.category).flatMap(s => s.lines.map(l => l.en));
  const out = [];
  cur.lines.forEach((l, i) => {
    const r = rng(hash(`${id}-${i + 1}`));
    const ans = l.en;
    const seen = new Set(cur.lines.map(x => norm(x.en)));
    const pick = pool => shuffle(pool, r).filter(t => { const n = norm(t); if (seen.has(n)) return false; seen.add(n); return true; });
    const picks = [...pick(same), ...pick(rest)].slice(0, 3);
    if (picks.length < 3) return;
    const options = shuffle([ans, ...picks], r);
    out.push({ k: i + 1, en: ans, zh: l.zh, options, answer: options.indexOf(ans) });
  });
  return out;
}
