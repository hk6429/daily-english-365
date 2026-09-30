import { todayIndex, parseDay, taipeiDateKey, buildOrder, dayOfScene } from './day.js';
import { bgFor, setPageBg } from './cats.js';
import { loadDone, markDone, isDoneToday, isDoneScene, streak, practicedDays, reviewDue } from './progress.js';
import { buildQuiz } from './quiz.js';

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
  stopAll(); closeQuiz(); delete $('#quizBtn').dataset.shown; $('#quizBtn').classList.remove('pop');
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
  $('#keyPhrase').hidden = true; $('#keyPhrase').innerHTML = '';
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
  const qb = $('#quizBtn'); const avail = (heard || done) && buildQuiz(state.scenes, x.id).length > 0;
  qb.dataset.avail = avail ? '1' : '0'; if ($('#quiz').hidden) { qb.hidden = !avail; if (avail && !qb.dataset.shown) { qb.dataset.shown = '1'; qb.classList.add('pop'); } }
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
function speakFallback(k, rate = state.rate) {
  return new Promise(res => {
    if (!('speechSynthesis' in window)) return res();
    const u = new SpeechSynthesisUtterance(lineVoice(k).en);
    u.lang = 'en-US'; u.rate = rate; u.onend = res; u.onerror = res;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  });
}
function markPlaying(k) {
  document.querySelectorAll('.line.playing').forEach(e => e.classList.remove('playing'));
  const li = $(`.line[data-k="${k}"]`); li && li.classList.add('playing');
}
function playLine(k, rate = state.rate) {
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
    player.onerror = () => { if (token !== playToken) return res(); speakFallback(k, rate).then(finish); };
    player.src = `audio/${pad(scene().id)}-${k}.mp3`;
    player.playbackRate = rate;
    player.play().catch(() => { if (token !== playToken) return res(); speakFallback(k, rate).then(finish); });
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

// ── 聽音選句小測驗 ──
const QUIZ_KEY = 'de365.quiz';
const quizBest = () => { try { const o = JSON.parse(localStorage.getItem(QUIZ_KEY) || '{}'); return o && typeof o === 'object' ? o : {}; } catch { return {}; } };
const saveQuizBest = (n, total) => { try { const k = taipeiDateKey(); const o = { [k]: Math.min(total, Math.max(quizBest()[k] || 0, n)) }; localStorage.setItem(QUIZ_KEY, JSON.stringify(o)); } catch {} };
const quiz = { qs: [], i: 0, score: 0, wrong: [], round: 0 };
const QUIZ_LABEL = '聽完了？來個小測驗';

function closeQuiz() {
  stopAll();
  const box = $('#quiz'); const wasOpen = !box.hidden;
  box.hidden = true; box.innerHTML = '';
  $('#lines').hidden = false; $('.controls').hidden = false;
  $('#keyPhrase').hidden = !$('#keyPhrase').innerHTML;
  const b = $('#quizBtn'); b.setAttribute('aria-expanded', 'false'); b.textContent = QUIZ_LABEL; b.hidden = b.dataset.avail !== '1';
  if (wasOpen) b.focus();
}
function openQuiz() {
  quiz.qs = buildQuiz(state.scenes, scene().id, quiz.round++); quiz.i = 0; quiz.score = 0; quiz.wrong = [];
  stopAll();
  $('#lines').hidden = true; $('.controls').hidden = true; $('#shadowHint').hidden = true; $('#keyPhrase').hidden = true; $('#quiz').hidden = false;
  const b = $('#quizBtn'); b.hidden = false; b.setAttribute('aria-expanded', 'true'); b.textContent = '離開測驗（本次不計分）';
  showQuestion();
  $('#quiz').scrollIntoView({ block: 'start', behavior: 'smooth' });
}
function showQuestion() {
  const box = $('#quiz'); const q = quiz.qs[quiz.i]; box.innerHTML = '';
  const h = document.createElement('div'); h.className = 'q-head';
  h.textContent = `第 ${quiz.i + 1} / ${quiz.qs.length} 題　答對 ${quiz.score}`;
  const play = document.createElement('button'); play.className = 'q-play'; play.textContent = '▶ 再聽一次';
  play.onclick = () => { stopAll(); playLine(q.k, 1); };
  const ask = document.createElement('p'); ask.className = 'q-ask'; ask.textContent = '聽到的是哪一句？';
  const opts = document.createElement('div'); opts.className = 'q-opts'; opts.classList.add('cooldown');
  setTimeout(() => opts.classList.remove('cooldown'), 400); // 防連點誤答
  const fb = document.createElement('div'); fb.className = 'q-fb'; fb.setAttribute('aria-live', 'polite');
  q.options.forEach((o, n) => {
    const b = document.createElement('button'); b.textContent = o.en;
    b.onclick = () => {
      if (opts.classList.contains('cooldown')) return;
      opts.querySelectorAll('button').forEach(x => x.disabled = true);
      const ok = n === q.answer; if (ok) quiz.score++; else quiz.wrong.push(q);
      const right = opts.children[q.answer];
      right.classList.add('right'); right.textContent = `✓ ${q.en}`;
      if (!ok) { b.classList.add('wrong'); b.textContent = `✗ ${o.en}`; }
      fb.innerHTML = '';
      const r = document.createElement('p'); r.className = 'q-res'; r.textContent = ok ? '答對了！' : '答錯了，慢速再聽一次：';
      const z = document.createElement('p'); z.className = 'q-zh'; z.textContent = ok ? q.zh : `正確是「${q.zh}」，你選的是「${o.zh}」`;
      const nx = document.createElement('button'); nx.className = 'q-next';
      nx.textContent = quiz.i + 1 < quiz.qs.length ? '下一題' : '看成績';
      nx.onclick = () => { stopAll(); quiz.i++; quiz.i < quiz.qs.length ? showQuestion() : showResult(); };
      fb.append(r, z, nx); nx.focus({ preventScroll: true });
      stopAll(); playLine(q.k, ok ? 1 : 0.75);
    };
    opts.appendChild(b);
  });
  box.append(h, play, ask, opts, fb);
  play.focus({ preventScroll: true });
  stopAll(); playLine(q.k, 1); // 測驗固定 1× 正常語速
}
function showResult() {
  const n = quiz.qs.length; saveQuizBest(quiz.score, n);
  const box = $('#quiz'); box.innerHTML = '';
  const best = quizBest()[taipeiDateKey()] || quiz.score;
  const h = document.createElement('p'); h.className = 'q-score'; h.textContent = `答對 ${quiz.score} / ${n}`;
  const tier = quiz.score === n ? '全對！耳朵很靈。' : quiz.score >= 3 ? '不錯，把答錯的再聽一次就穩了。' : '先回去把五句多聽兩三遍，再來一次。';
  const s = document.createElement('p'); s.className = 'q-sub'; s.textContent = `${tier}　今日最佳 ${best} / ${n}`;
  box.append(h, s);
  if (quiz.wrong.length) {
    const w = document.createElement('div'); w.className = 'q-wrong';
    w.innerHTML = '<b>答錯的句子</b>';
    quiz.wrong.forEach(q => {
      const row = document.createElement('div'); row.className = 'q-wrong-row';
      const p = document.createElement('button'); p.className = 'play'; p.textContent = '▶'; p.setAttribute('aria-label', `播放：${q.en}`);
      p.onclick = () => { stopAll(); playLine(q.k, 0.75); };
      const t = document.createElement('div'); t.innerHTML = `<div class="q-wrong-en">${esc(q.en)}</div><div class="q-zh">${esc(q.zh)}</div>`;
      row.append(p, t); w.appendChild(row);
    });
    box.appendChild(w);
  }
  const again = document.createElement('button'); again.className = 'q-again'; again.textContent = '再玩一次'; again.onclick = openQuiz;
  const back = document.createElement('button'); back.className = 'q-next'; back.textContent = '回到練習'; back.onclick = closeQuiz;
  box.append(again, back); back.focus({ preventScroll: true });
  $('#quizBtn').hidden = true; // 成績頁只留「回到練習」
}
$('#quizBtn').onclick = () => ($('#quiz').hidden ? openQuiz() : closeQuiz());

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
