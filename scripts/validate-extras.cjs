// data/extras.json 硬閘門：每課 1 筆；slot 是關鍵句所在句的子字串；變體＝原句替換 slot；tip 25～45 字。
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const scenes = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/scenes.json'), 'utf8'));
const extras = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/extras.json'), 'utf8'));
const errs = [];
const byId = new Map(extras.map(e => [e.id, e]));
if (byId.size !== extras.length) errs.push('duplicate id');
for (const x of scenes) {
  const e = byId.get(x.id); if (!e) { errs.push(`missing ${x.id}`); continue; }
  const line = x.lines.find(l => l.en.includes(x.key_phrase));
  if (!line) { errs.push(`no key line ${x.id}`); continue; }
  if (typeof e.slot !== 'string' || !e.slot || !line.en.includes(e.slot)) errs.push(`slot ${x.id}`);
  if (!Array.isArray(e.variants) || e.variants.length !== 2) { errs.push(`variants ${x.id}`); continue; }
  const seen = new Set([line.en]);
  for (const v of e.variants) {
    if (!v.en || !v.zh) { errs.push(`variant fields ${x.id}`); continue; }
    const i = line.en.indexOf(e.slot); const pre = line.en.slice(0, i), post = line.en.slice(i + e.slot.length);
    if (!(v.en.startsWith(pre) && v.en.endsWith(post) && v.en.length > pre.length + post.length)) errs.push(`variant shape ${x.id}: ${v.en}`);
    if (seen.has(v.en)) errs.push(`variant dup ${x.id}`); seen.add(v.en);
  }
  const t = (e.tip || '').trim(); const n = [...t].length;
  if (n < 20 || n > 60) errs.push(`tip len ${x.id}=${n}`);
  if (/[一-鿿]/.test(t) === false) errs.push(`tip not zh ${x.id}`);
}
if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
console.log('extras ok', extras.length);
