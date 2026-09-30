// 聽音選句：每句出 4 選 1，播音檔（不顯示字）→ 選正確英文句。
// 干擾項規則（四方審查後）：與正解同句型（問句／敘述）、字數差 ≤2，來源優先序：
// 本課其他句 → 同主題且同開頭詞 → 同主題 → 其他主題；不足時逐步放寬字數限制。
// 題序打亂；round 變動時題序與選項重洗（「再玩一次」不會一模一樣）。純函式，瀏覽器與 Node 共用。

const hash = s => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const rng = seed => () => { seed = (seed + 0x6d2b79f5) >>> 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const shuffle = (a, r) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const norm = s => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
const words = s => norm(s).split(' ').filter(Boolean);
export const isQuestion = s => /\?\s*$/.test(s);
const head = s => words(s)[0] || '';

export function buildQuiz(scenes, id, round = 0) {
  const cur = scenes.find(s => s.id === id);
  if (!cur) return [];
  const line = (s, l) => ({ en: l.en, zh: l.zh, sid: s.id, cat: s.category });
  const mine = cur.lines.map(l => line(cur, l));
  const others = scenes.filter(s => s.id !== id).flatMap(s => s.lines.map(l => line(s, l)));
  const sameCat = others.filter(o => o.cat === cur.category);
  const otherCat = others.filter(o => o.cat !== cur.category);

  const qs = cur.lines.map((l, i) => {
    const r = rng(hash(`${id}-${i + 1}-${round}`));
    const ans = mine[i];
    const type = isQuestion(ans.en), len = words(ans.en).length, h0 = head(ans.en);
    const seen = new Set([norm(ans.en)]);
    const fits = (o, tol) => isQuestion(o.en) === type && Math.abs(words(o.en).length - len) <= tol;
    const take = (pool, tol) => shuffle(pool, r).filter(o => { if (!fits(o, tol)) return false; const n = norm(o.en); if (seen.has(n)) return false; seen.add(n); return true; });
    const picks = [];
    const fill = (pool, tol) => { for (const o of take(pool, tol)) { if (picks.length >= 3) break; picks.push(o); } };
    const sameHead = sameCat.filter(o => head(o.en) === h0), sameRest = sameCat.filter(o => head(o.en) !== h0);
    for (const tol of [2, 4, 99]) {
      fill(mine.filter(o => o !== ans), tol); fill(sameHead, tol); fill(sameRest, tol); fill(otherCat, tol);
      if (picks.length >= 3) break;
    }
    if (picks.length < 3) return null; // 同句型的句子不夠（理論上不會發生）
    const options = shuffle([ans, ...picks], r).map(o => ({ en: o.en, zh: o.zh }));
    return { k: i + 1, en: ans.en, zh: ans.zh, options, answer: options.findIndex(o => o.en === ans.en) };
  }).filter(Boolean);
  return shuffle(qs, rng(hash(`${id}-order-${round}`)));
}
