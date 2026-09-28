// 把 scratch/roles.json 的 roles / key_phrase / key_phrase_zh 併入 data/scenes.json
const fs = require('fs');
const scenes = JSON.parse(fs.readFileSync('data/scenes.json', 'utf8'));
const roles = JSON.parse(fs.readFileSync('scratch/roles.json', 'utf8'));
let n = 0, miss = [];
for (const s of scenes) {
  const r = roles[String(s.id)]; if (!r) { miss.push(s.id); continue; }
  s.roles = r.roles; s.key_phrase = r.key_phrase; s.key_phrase_zh = r.key_phrase_zh;
  if (!s.lines.some(l => l.en.includes(r.key_phrase))) miss.push(s.id + ':kp');
  n++;
}
fs.writeFileSync('data/scenes.json', JSON.stringify(scenes, null, 1) + '\n');
console.log('merged', n, 'issues', miss.join(' ') || 'none');
