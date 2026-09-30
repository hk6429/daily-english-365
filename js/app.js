import { todayIndex, parseDay, taipeiDateKey, buildOrder, dayOfScene } from './day.js';
import { bgFor, setPageBg } from './cats.js';
import { loadDone, markDone, isDoneToday, isDoneScene, streak, practicedDays, reviewDue } from './progress.js';

const $ = (s, r = document) => r.querySelector(s);
const pad = n => String(n).padStart(3, '0');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const state = { scenes: [], order: [], day: 1, rate: 1, shadow: false, playing: false, played: new Set() };
const player = new Audio(); // 單一元素重用：iOS 首次手勢解鎖後，後續換 src 才能自動連播
let playToken = 0;

async function main() {
  state.scenes = await (await fetch('data/scenes.json')).json();
  state.order = buildOrder(state.scenes);
  state.day = parseDay(location.search) ?? todayIndex();
  render();
}

const scene = () => state.scenes.find(s => s.id === state.order[state.day - 1]);

function render() {
  const x = scene();
  const today = todayIndex();
  stopAll();
  state.played = new Set();
  document.title = `${x.title_zh} — 英語日日聽`;
  $('#dayLabel').textContent = state.day === today ? `今天 · 第 ${state.day} 天` : `第 ${state.day} 天`;
  $('#cat').textContent = x.category;
  setPageBg(bgFor(x.category));
  $('#titleZh').textContent = x.title_zh;
  $('#titleEn').textContent = x.title_en;
  $('#scene').textContent = x.scene_zh;
  const roles = x.roles || {};
  $('#roles').textContent = roles.A && roles.B ? `A＝${roles.A}（男聲）　B＝${roles.B}（女聲）` : 'A＝男聲　B＝女聲';

  const hero = $('#hero'); hero.classList.remove('missing');
  const img = $('#heroImg');
  img.alt = `${x.title_zh}插畫`;
  img.onerror = () => { hero.classList.add('missing'); img.style.display = 'none'; };
  img.style.display = ''; img.src = `img/${pad(x.id)}.webp`;

  const ul = $('#lines'); ul.innerHTML = '';
  x.lines.forEach((l, k) => {
    const li = document.createElement('li');
    li.className = 'line'; li.dataset.k = k + 1;
    const who = roles[l.speaker] ? `${l.speaker} · ${roles[l.speaker]}` : l.speaker;
    li.innerHTML = `<button class="play" aria-label="播放第 ${k + 1} 句">▶</button>
      <div class="body"><span class="spk">${esc(who)}</span>
        <div class="en"><button class="reveal" data-t="en" aria-label="顯示第 ${k + 1} 句英文">‥‥ 顯示英文</button><span class="txt" role="button" title="點一下收回" hidden></span></div>
        <div class="zh"><button class="reveal" data-t="zh" aria-label="顯示第 ${k + 1} 句中譯">‥‥ 顯示中譯</button><span class="txt" role="button" title="點一下收回" hidden></span></div></div>`;
    $('.play', li).onclick = () => { stopAll(); playLine(k + 1); };
    $('.reveal[data-t="en"]', li).onclick = () => revealLine(li, 'en');
    $('.reveal[data-t="zh"]', li).onclick = () => { revealLine(li, 'en'); revealLine(li, 'zh'); };
    $('.en .txt', li).onclick = () => { hideLine(li, 'zh'); hideLine(li, 'en'); };
    $('.zh .txt', li).onclick = () => hideLine(li, 'zh');
    ul.appendChild(li);
  });
  $('#keyPhrase').hidden = true;
  $('#prev').disabled = state.day <= 1; $('#next').disabled = state.day >= 365;
  renderDone();
  renderReview();
  renderOnboarding();
}

function revealLine(li, t) {
  const box = $(`.${t}`, li); if (!box || box.dataset.open) return;
  const l = scene().lines[Number(li.dataset.k) - 1];
  box.dataset.open = '1';
  const txt = $('.txt', box);
  if (t === 'en') {
    const kp = scene().key_phrase;
    const e = esc(l.en);
    txt.innerHTML = kp && l.en.includes(kp) ? e.replace(esc(kp), `<mark>${esc(kp)}</mark>`) : e;
    if (kp && l.en.includes(kp)) showKeyPhrase();
  } else txt.textContent = l.zh;
  $('.reveal', box).hidden = true; txt.hidden = false;
}
function hideLine(li, t) {
  const box = $(`.${t}`, li); if (!box || !box.dataset.open) return;
  delete box.dataset.open;
  $('.reveal', box).hidden = false; $('.txt', box).hidden = true;
}
// 看英文／看中譯：全開 ↔ 全收
function revealAll(t) {
  const lis = [...document.querySelectorAll('.line')];
  const allOpen = lis.every(li => $(`.${t}`, li).dataset.open);
  if (allOpen) lis.forEach(li => { hideLine(li, 'zh'); if (t === 'en') hideLine(li, 'en'); });
  else lis.forEach(li => { if (t === 'zh') revealLine(li, 'en'); revealLine(li, t); });
}
function showKeyPhrase() {
  const x = scene(); const el = $('#keyPhrase');
  el.hidden = false; el.innerHTML = `<b>今日關鍵句</b> <span>${esc(x.key_phrase)}</span> <small>${esc(x.key_phrase_zh || '')}</small>`;
}

function renderDone() {
  const list = loadDone(); const x = scene();
  const btn = $('#doneBtn');
  const done = isDoneToday(list, x.id);
  const heard = state.played.size >= 5;
  btn.classList.toggle('is-done', done);
  btn.disabled = !done && !heard;
  btn.textContent = done ? '✓ 已完成' : heard ? '完成這一課' : '聽完 5 句後可完成';
  const s = streak(list);
  $('#stats').innerHTML = `已練 <b>${practicedDays(list)}</b> 天 · 連續 <b>${s}</b> 天`;
  const y = $('#missed');
  const yesterdayDone = list.some(v => v.d === taipeiDateKey(new Date(Date.now() - 86400000)));
  y.hidden = !(s === 0 && list.length > 0 && !yesterdayDone && state.day === todayIndex());
  if (!y.hidden) y.innerHTML = `昨天沒練到？<a href="?d=${Math.max(1, todayIndex() - 1)}">補一課</a>，連續天數會接回來。`;
  if (done) $('#stamp').classList.add('show'); else $('#stamp').classList.remove('show');
}

function renderReview() {
  const due = reviewDue(loadDone());
  const box = $('#review');
  if (!due.length) { box.hidden = true; return; }
  box.hidden = false;
  box.innerHTML = `<h3>今日複習</h3><p class="hint-inline">依 1／3／7／21 天間隔回來聽一次，記得更牢。</p><div class="chips">${due.map(r => {
    const s = state.scenes.find(v => v.id === r.id); if (!s) return '';
    return `<a href="?d=${dayOfScene(state.order, r.id)}"><span>${r.gap} 天前</span>${esc(s.title_zh)}</a>`;
  }).join('')}</div>`;
}

function renderOnboarding() {
  let seen = false; try { seen = localStorage.getItem('de365.onboarded') === '1'; } catch {}
  const el = $('#onboard'); el.hidden = seen;
  $('#onboardOk').onclick = () => { try { localStorage.setItem('de365.onboarded', '1'); } catch {} el.hidden = true; };
}

// ---------- 音訊 ----------
function lineVoice(k) { return scene().lines[k - 1]; }
function speakFallback(k) {
  return new Promise(res => {
    if (!('speechSynthesis' in window)) return res();
    const u = new SpeechSynthesisUtterance(lineVoice(k).en);
    u.lang = 'en-US'; u.rate = state.rate; u.onend = res; u.onerror = res;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  });
}
function markPlaying(k) {
  document.querySelectorAll('.line.playing').forEach(e => e.classList.remove('playing'));
  const li = $(`.line[data-k="${k}"]`); li && li.classList.add('playing');
}
function playLine(k) {
  const token = ++playToken;
  markPlaying(k);
  return new Promise(res => {
    const finish = () => {
      player.onended = player.onerror = null;
      if (token !== playToken) return res(); // 已被 stopAll 取代
      state.played.add(k); document.querySelectorAll('.line.playing').forEach(e => e.classList.remove('playing'));
      renderDone(); res();
    };
    player.onended = finish;
    player.onerror = () => { if (token !== playToken) return res(); speakFallback(k).then(finish); };
    player.src = `audio/${pad(scene().id)}-${k}.mp3`;
    player.playbackRate = state.rate;
    player.play().catch(() => { if (token !== playToken) return res(); speakFallback(k).then(finish); });
  });
}
function stopAll() {
  playToken++;
  state.playing = false;
  player.onended = player.onerror = null;
  try { player.pause(); } catch {}
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  document.querySelectorAll('.line.playing').forEach(e => e.classList.remove('playing'));
  const b = $('#playAll'); b.textContent = '▶ 聽全部'; b.classList.remove('primary');
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function playAll() {
  if (state.playing) return stopAll();
  state.playing = true; const b = $('#playAll'); b.textContent = '■ 停止'; b.classList.add('primary');
  const myToken = playToken + 1;
  for (let k = 1; k <= 5 && state.playing; k++) {
    const t0 = Date.now();
    await playLine(k);
    if (playToken !== myToken + (k - 1)) return; // 中途被停止或換句
    if (!state.playing) return;
    const dur = Date.now() - t0;
    if (k < 5) await sleep(state.shadow ? dur + 600 : 1000);
    if (!state.playing) return;
  }
  if (state.playing) stopAll();
}

function go(day) { history.pushState(null, '', `?d=${day}`); state.day = day; render(); window.scrollTo(0, 0); }

$('#playAll').onclick = playAll;
$('#showEn').onclick = () => revealAll('en');
$('#showZh').onclick = () => revealAll('zh');
$('#rate').onclick = e => {
  state.rate = state.rate === 1 ? 0.75 : 1; player.playbackRate = state.rate;
  e.currentTarget.textContent = state.rate === 1 ? '1× 正常' : '0.75× 慢速';
  e.currentTarget.setAttribute('aria-pressed', String(state.rate !== 1));
};
$('#shadow').onclick = e => {
  state.shadow = !state.shadow;
  e.currentTarget.setAttribute('aria-pressed', String(state.shadow));
  $('#shadowHint').hidden = !state.shadow;
};
$('#prev').onclick = () => go(state.day - 1);
$('#next').onclick = () => go(state.day + 1);
$('#doneBtn').onclick = () => { markDone(scene().id); renderDone(); renderReview(); };
window.addEventListener('popstate', () => { state.day = parseDay(location.search) ?? todayIndex(); render(); });

main().catch(e => { $('#titleZh').textContent = '載入失敗，請重新整理'; console.error(e); });
