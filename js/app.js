import { todayIndex, parseDay, taipeiDateKey, buildOrder, dayOfScene } from './day.js';
import { bgFor, setPageBg } from './cats.js';
import { loadDone, markDone, doneDate, isDoneToday, isDoneScene, streak, practicedDays, reviewDue } from './progress.js';
import { buildQuiz } from './quiz.js';
import { STAGES, plan, total, initial, advance, needsAudio, progress, loadMission, saveMission } from './mission.js';

const $ = (s, r = document) => r.querySelector(s);
const pad = n => String(n).padStart(3, '0');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const state = { scenes: [], order: [], day: 1, rate: 1, shadow: false, role: null, playing: false, played: new Set(), extras: {}, reviewQuiz: false, veiled: false };
const ROLE_LABEL = { null: '角色扮演', A: '我當 A', B: '我當 B' };
const player = new Audio(); // 單一元素重用：iOS 首次手勢解鎖後，後續換 src 才能自動連播
let playToken = 0;

async function main() {
  const [scenes, extras] = await Promise.all([
    fetch('data/scenes.json').then(r => r.json()),
    fetch('data/extras.json').then(r => r.ok ? r.json() : []).catch(() => []),
  ]);
  state.scenes = scenes; state.order = buildOrder(scenes);
  for (const e of extras) state.extras[e.id] = e;
  state.day = parseDay(location.search) ?? todayIndex();
  state.reviewQuiz = /[?&]quiz=1(?:&|$)/.test(location.search);
  render();
  if (state.reviewQuiz && buildQuiz(state.scenes, scene().id).length) openQuiz();
}

const scene = () => state.scenes.find(s => s.id === state.order[state.day - 1]);

function render() {
  const x = scene();
  const today = todayIndex();
  stopAll(); closeQuiz(); closeMission(); delete $('#quizBtn').dataset.shown; $('#quizBtn').classList.remove('pop');
  state.played = new Set();
  state.veiled = !isDoneScene(loadDone(), x.id) && !state.reviewQuiz;
  document.title = state.veiled ? `第 ${state.day} 天 — 英語日日聽` : `${x.title_zh} — 英語日日聽`;
  $('.title').classList.toggle('veiled', state.veiled); $('#veil').hidden = !state.veiled;
  $('#tip').hidden = true; $('#tip').textContent = '';
  state.role = null; $('#role').textContent = ROLE_LABEL[null]; $('#role').setAttribute('aria-pressed', 'false');
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
  img.alt = state.veiled ? '情境插畫' : `${x.title_zh}插畫`;
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
        <div class="zh"><button class="reveal" data-t="zh" aria-label="顯示第 ${k + 1} 句中譯">‥‥ 顯示中譯</button><span class="txt" role="button" title="點一下收回" hidden></span></div>
        <div class="fb" hidden></div></div>`;
    $('.play', li).onclick = () => { stopAll(); playLine(k + 1); };
    $('.reveal[data-t="en"]', li).onclick = () => revealLine(li, 'en');
    $('.reveal[data-t="zh"]', li).onclick = () => { revealLine(li, 'en'); revealLine(li, 'zh'); };
    $('.en .txt', li).onclick = () => { hideLine(li, 'zh'); hideLine(li, 'en'); };
    $('.zh .txt', li).onclick = () => hideLine(li, 'zh');
    ul.appendChild(li);
  });
  $('#keyPhrase').hidden = true; $('#keyPhrase').innerHTML = '';
  $('#prev').disabled = state.day <= 1; $('#next').disabled = state.day >= 365;
  renderMissionBtn();
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
function unveil() {
  if (!state.veiled) return;
  state.veiled = false; $('.title').classList.remove('veiled'); $('#veil').hidden = true;
  document.title = `${scene().title_zh} — 英語日日聽`; $('#heroImg').alt = `${scene().title_zh}插畫`;
}
function showKeyPhrase() {
  const x = scene(); const el = $('#keyPhrase');
  const ex = state.extras[x.id]; const li = x.lines.findIndex(l => l.en.includes(x.key_phrase));
  const base = li >= 0 ? x.lines[li] : null;
  el.hidden = false;
  if (!ex || !base || !base.en.includes(ex.slot)) { el.innerHTML = `<b>今日關鍵句</b> <span>${esc(x.key_phrase)}</span> <small>${esc(x.key_phrase_zh || '')}</small>`; return; }
  const forms = [{ en: base.en, zh: base.zh, k: li + 1 }, ...ex.variants.map((v, i) => ({ ...v, v: i + 1 }))];
  const mark = (en, chunk) => { const i = en.indexOf(chunk); return i < 0 ? esc(en) : `${esc(en.slice(0, i))}<mark>${esc(chunk)}</mark>${esc(en.slice(i + chunk.length))}`; };
  const chunkOf = f => { const pre = base.en.slice(0, base.en.indexOf(ex.slot)); const post = base.en.slice(base.en.indexOf(ex.slot) + ex.slot.length); return f.en.startsWith(pre) && f.en.endsWith(post) ? f.en.slice(pre.length, f.en.length - post.length) : ex.slot; };
  el.innerHTML = `<b>今日關鍵句</b> <span class="kp-en"></span> <small class="kp-zh"></small><div class="kp-swap"><em>換個說法</em></div>`;
  const swap = $('.kp-swap', el);
  const show = f => {
    $('.kp-en', el).innerHTML = mark(f.en, chunkOf(f)); $('.kp-zh', el).textContent = f.zh;
    swap.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.f === String(forms.indexOf(f))));
    stopAll();
    if (f.v) playVariant(x.id, f.v, f.en); else playLine(f.k, 1);
  };
  forms.forEach((f, i) => { const b = document.createElement('button'); b.dataset.f = i; b.textContent = chunkOf(f); b.onclick = () => show(f); swap.appendChild(b); });
  $('.kp-en', el).innerHTML = mark(base.en, ex.slot); $('.kp-zh', el).textContent = base.zh; swap.firstElementChild.nextElementSibling.classList.add('on');
}
function playVariant(id, v, text) {
  const token = ++playToken;
  player.onended = player.onerror = null;
  player.onerror = () => { if (token !== playToken) return; speakText(text); };
  player.src = `audio/${pad(id)}-v${v}.mp3`; player.playbackRate = 1;
  player.play().catch(() => { if (token === playToken) speakText(text); });
}
function speakText(text) {
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; speechSynthesis.cancel(); speechSynthesis.speak(u);
}

function renderDone() {
  const list = loadDone(); const x = scene();
  const btn = $('#doneBtn');
  const done = isDoneToday(list, x.id) || (state.day === todayIndex() - 1 && isDoneToday(list, x.id, taipeiDateKey(new Date(Date.now() - 86400000)))); // 補課記在昨天
  const heard = state.played.size >= 5;
  if (heard || done) unveil();
  const ex = state.extras[x.id];
  if ((heard || done) && ex && ex.tip) { $('#tip').hidden = false; $('#tip').innerHTML = `<b>小提醒</b>${esc(ex.tip)}`; }
  const qb = $('#quizBtn'); const avail = (heard || done) && buildQuiz(state.scenes, x.id).length > 0;
  qb.dataset.avail = avail ? '1' : '0'; if ($('#quiz').hidden && $('#mission').hidden) { qb.hidden = !avail; if (avail && !qb.dataset.shown) { qb.dataset.shown = '1'; qb.classList.add('pop'); } }
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
  $('#stampSay').classList.toggle('show', loadMission(x.id).done);
}

function renderReview() {
  const due = reviewDue(loadDone());
  const box = $('#review');
  if (!due.length) { box.hidden = true; return; }
  box.hidden = false;
  box.innerHTML = `<h3>今日複習</h3><p class="hint-inline">依 1／3／7／21 天間隔回來小測驗一次：全對就算複習完成，答錯才回到原課重聽。</p><div class="chips">${due.map(r => {
    const s = state.scenes.find(v => v.id === r.id); if (!s) return '';
    return `<a href="?d=${dayOfScene(state.order, r.id)}&quiz=1"><span>${r.gap} 天前</span>${esc(s.title_zh)}</a>`;
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
  document.querySelectorAll('.line.playing,.line.yours').forEach(e => { e.classList.remove('playing', 'yours'); const sp = $('.spk', e); if (sp) delete sp.dataset.turn; const m = $('.fb-mic', e); if (m) m.parentElement.hidden = true; });
  const b = $('#playAll'); b.textContent = '▶ 聽全部'; b.classList.remove('primary');
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
// 開口一段時間：不用麥克風（iPhone Safari 播過原音後麥克風全靜音），留白後揭曉英文讓學習者自己對照
async function captureAndShow(li, k, ms) {
  const fb = $('.fb', li); fb.hidden = false; fb.innerHTML = '<span class="fb-mic">● 請開口唸…</span>';
  await sleep(ms);
  if (!state.playing) return;
  fb.hidden = true; revealLine(li, 'en');
}
async function yourTurn(k, ms) {
  const li = $(`.line[data-k="${k}"]`); markPlaying(k); li.classList.add('yours');
  $('.spk', li).dataset.turn = `輪到你 · 提示：${scene().lines[k - 1].zh}`;
  await captureAndShow(li, k, ms);
  li.classList.remove('yours', 'playing'); delete $('.spk', li).dataset.turn;
}
async function shadowTurn(k, ms) {
  const li = $(`.line[data-k="${k}"]`); li.classList.add('yours');
  await captureAndShow(li, k, ms);
  li.classList.remove('yours');
}
async function playAll() {
  if (state.playing) return stopAll();
  state.playing = true; const b = $('#playAll'); b.textContent = '■ 停止'; b.classList.add('primary');
  const myToken = playToken + 1;
  let lastDur = 2500;
  for (let k = 1; k <= 5 && state.playing; k++) {
    const l = scene().lines[k - 1];
    if (state.role && l.speaker === state.role) {
      // 角色扮演：這句換你說。給中譯提示，留一段時間開口（估算：每字 0.65 秒＋1.5 秒）
      const ms = Math.max(3500, l.en.split(/\s+/).length * 650 + 1500);
      playToken++; // 與 playLine 一樣佔一個 token，讓後面的檢查一致
      await yourTurn(k, ms);
      if (playToken !== myToken + (k - 1) || !state.playing) return;
      state.played.add(k); renderDone();
      continue;
    }
    const t0 = Date.now();
    await playLine(k);
    if (playToken !== myToken + (k - 1)) return; // 中途被停止或換句
    if (!state.playing) return;
    lastDur = Date.now() - t0;
    if (state.shadow) { await shadowTurn(k, Math.round(lastDur * 1.5) + 800); if (!state.playing) return; }
    else if (k < 5) await sleep(1000);
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
  closeMission();
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
  let tier = quiz.score === n ? '全對！耳朵很靈。' : quiz.score >= 3 ? '不錯，把答錯的再聽一次就穩了。' : '先回去把五句多聽兩三遍，再來一次。';
  if (state.reviewQuiz) {
    if (quiz.score === n) { markDone(scene().id); renderDone(); renderReview(); tier = '全對，這課複習完成！'; }
    else tier = '有答錯，回到練習把這幾句再聽一次。';
  }
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
// ── 今日口說任務（四關跟讀；不用麥克風，學習者念完自己按「念完了」）──
const MISSION_LABEL = '今日口說任務（四關）';
const ms = { st: null, check: false, hint: 0 };
const missionOpen = () => !$('#mission').hidden;
const MSG = {
  1: '看著英文和中譯，跟著原音一起念。',
  2: '只看英文，聽完原音後自己念。',
  3: '字遮起來了，聽完原音後自己念。',
  4: '不看字、不放原音，把這句背出來。',
};
const FOOT = {
  1: '五句輪流念：原音播完才能按「念完了」，跟著原音同步念。',
  2: '五句輪流念：第一輪先播原音，之後看著英文自己念；念不順就按「再聽一次」。',
  3: '憑耳朵記憶念出來；按「念完了」會揭曉英文並播原音讓你對照。',
  4: '卡住可以按「提示」；按「念完了」會揭曉英文並播原音讓你對照。',
};
// 第 1 次提示給中譯，第 2 次再給開頭兩個字
const hintText = (l, h) => h >= 2 ? `${esc(l.zh)}<br>${esc(l.en.split(' ').slice(0, 2).join(' '))} …` : esc(l.zh);

function renderMissionBtn() {
  const b = $('#missionBtn'); if (missionOpen()) return;
  b.textContent = loadMission(scene().id).done ? '✓ 口說任務完成' : MISSION_LABEL;
}
function closeMission() {
  const box = $('#mission'); if (box.hidden) return;
  stopAll();
  box.hidden = true; box.innerHTML = '';
  $('#lines').hidden = false; $('.controls').hidden = false;
  $('#keyPhrase').hidden = !$('#keyPhrase').innerHTML;
  $('#shadowHint').hidden = !state.shadow; $('#roleHint').hidden = !state.role;
  $('#quizBtn').hidden = $('#quizBtn').dataset.avail !== '1';
  const b = $('#missionBtn'); b.setAttribute('aria-expanded', 'false'); renderMissionBtn();
}
function openMission() {
  closeQuiz(); stopAll();
  ms.st = loadMission(scene().id); ms.check = false; ms.hint = 0;
  if (!ms.st.done && progress(ms.st) === 0 && new URLSearchParams(location.search).get('mission') === 'lite') ms.st = initial(true); // 老師可用 ?mission=lite 讓全班做輕量版
  $('#lines').hidden = true; $('.controls').hidden = true; $('#shadowHint').hidden = true; $('#roleHint').hidden = true;
  $('#keyPhrase').hidden = true; $('#quizBtn').hidden = true; $('#mission').hidden = false;
  const b = $('#missionBtn'); b.setAttribute('aria-expanded', 'true'); b.textContent = '離開口說任務（進度會保留）';
  renderMission(true);
  $('#mission').scrollIntoView({ block: 'start', behavior: 'smooth' });
}
// 按鈕至少鎖 1.2 秒（防連點）；有播原音就等原音播完才解鎖，原音卡住最多等 6 秒
function lockUntil(btn, audio) {
  btn.disabled = true;
  const t0 = Date.now(); let open = false;
  const unlock = () => { if (open) return; open = true; setTimeout(() => { btn.disabled = false; }, Math.max(0, 1200 - (Date.now() - t0))); };
  if (audio) { audio.then(unlock); setTimeout(unlock, 6000); } else unlock();
}
// autoplay：這一次需要原音時自動播（開啟面板或按鈕的點擊當下觸發，iOS 才放行）
// 關三、關四按「念完了」先進入對照（揭曉英文＋播原音），自評念對了才計次
function renderMission(autoplay) {
  const box = $('#mission'); const st = ms.st; const x = scene();
  const S = STAGES[st.stage - 1]; const l = x.lines[st.k - 1];
  const roles = x.roles || {}; const who = roles[l.speaker] ? `${l.speaker} · ${roles[l.speaker]}` : l.speaker;
  const P = plan(st.lite), N = total(st.lite), pct = Math.round(progress(st) / N * 100);
  const stages = STAGES.filter(s => P.stages.includes(s.n)).map(s => `<li data-s="${s.n}" class="${st.done || s.n < st.stage ? 'ok' : s.n === st.stage ? 'on' : ''}">${st.done || s.n < st.stage ? '✓' : s.n}</li>`).join('');
  if (st.done) {
    box.innerHTML = `<ol class="m-stages">${stages}</ol><div class="m-seal" aria-hidden="true">說</div><p class="m-done">✓ 口說任務完成</p><p class="m-sub">${N} 次開口全數完成，也算完成這一課！</p>`;
    return;
  }
  const dots = '●'.repeat(st.k - 1) + '○'.repeat(5 - st.k + 1); // 這一輪念到第幾句
  const where = `第 ${st.n + 1} / ${P.reps} 輪　${dots}`;
  const mode = progress(st) === 0 ? `<button class="m-mode" type="button">${st.lite ? '改完整版（100 次，約 12 分鐘）' : '時間不多？改輕量版（30 次，約 4 分鐘）'}</button>` : '';
  const showEn = S.en || ms.check, showZh = S.zh || (ms.check && st.stage === 4);
  const hint = !ms.check && st.stage === 4 && ms.hint ? `<div class="m-hint">${hintText(l, ms.hint)}</div>` : '';
  const act = ms.check
    ? '<button class="m-again" type="button">↻ 沒念對，再一次</button><button class="m-ok" type="button">✓ 念對了</button>'
    : (S.audio === 'none' ? `<button class="m-tip" type="button"${ms.hint >= 2 ? ' disabled' : ''}>💡 提示</button>` : '<button class="m-hear" type="button">▶ 再聽一次</button>')
      + '<button class="m-manual" type="button">✓ 念完了</button>';
  box.innerHTML = `<ol class="m-stages">${stages}</ol>
    <p class="m-name">第${'一二三四'[st.stage - 1]}關：${esc(S.name)}</p>
    <div class="m-line${ms.check ? ' checking' : ''}"><span class="spk">${esc(who)}</span>
      ${showEn ? `<div class="m-en">${esc(l.en)}</div>` : '<div class="m-en masked">‧‧‧‧‧‧</div>'}
      ${showZh ? `<div class="m-zh">${esc(l.zh)}</div>` : ''}${hint}</div>
    <p class="m-where">${where}</p>
    <p class="m-count">總進度 ${progress(st)} / ${N}　第 ${st.k} 句</p>
    <div class="m-bar"><i style="width:${pct}%"></i></div>
    <p class="m-msg" aria-live="polite">${ms.check ? '對照一下：剛剛念的跟原音一樣嗎？' : MSG[st.stage]}</p>
    <div class="m-act">${act}</div>
    <p class="hint-inline">${ms.check ? '念對了才計一次；沒念對就再念一次，不扣進度。' : FOOT[st.stage]}</p>${mode}`;
  const next = () => {
    stopAll(); ms.check = false; ms.hint = 0; ms.st = advance(ms.st); saveMission(x.id, ms.st);
    if (ms.st.done) { markDone(x.id, doneDate(loadDone(), state.day === todayIndex() - 1)); renderDone(); renderReview(); } // 口說任務全過也算完成這一課
    renderMission(true); renderMissionBtn();
  };
  const md = $('.m-mode', box); if (md) md.onclick = () => { stopAll(); ms.st = initial(!st.lite); saveMission(x.id, ms.st); renderMission(true); };
  const hear = $('.m-hear', box); if (hear) hear.onclick = () => { stopAll(); playLine(st.k); };
  const tip = $('.m-tip', box); if (tip) tip.onclick = () => { ms.hint++; renderMission(false); };
  const again = $('.m-again', box); if (again) again.onclick = () => { stopAll(); ms.check = false; renderMission(false); };
  const ok = $('.m-ok', box);
  if (ok) { ok.onclick = next; lockUntil(ok, autoplay ? playLine(st.k) : null); return; }
  const man = $('.m-manual', box);
  man.onclick = () => { if (st.stage >= 3) { stopAll(); ms.check = true; renderMission(true); } else next(); };
  lockUntil(man, autoplay && needsAudio(st) ? playLine(st.k) : null);
}
$('#missionBtn').onclick = () => (missionOpen() ? closeMission() : openMission());

$('#quizBtn').onclick = () => ($('#quiz').hidden ? openQuiz() : closeQuiz());

function go(day) { history.pushState(null, '', `?d=${day}`); state.day = day; state.reviewQuiz = false; render(); window.scrollTo(0, 0); }

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
  $('#shadowHint').textContent = '跟讀模式：每句播完會留一段比原句長一點的空檔，請照著原音大聲唸一次，念完會揭曉英文讓你對照。';
};
$('#role').onclick = e => {
  state.role = state.role === null ? 'B' : state.role === 'B' ? 'A' : null;
  e.currentTarget.textContent = ROLE_LABEL[state.role]; e.currentTarget.setAttribute('aria-pressed', String(!!state.role));
  const r = scene().roles || {};
  $('#roleHint').hidden = !state.role;
  if (state.role) $('#roleHint').textContent = `角色扮演：你是 ${state.role}${r[state.role] ? '（' + r[state.role] + '）' : ''}。按「聽全部」，輪到你時會給中譯提示，請用英文說出來。`;
};
$('#veilShow').onclick = unveil;
$('#prev').onclick = () => go(state.day - 1);
$('#next').onclick = () => go(state.day + 1);
$('#doneBtn').onclick = () => { markDone(scene().id, doneDate(loadDone(), state.day === todayIndex() - 1)); renderDone(); renderReview(); };
window.addEventListener('popstate', () => { state.day = parseDay(location.search) ?? todayIndex(); state.reviewQuiz = /[?&]quiz=1(?:&|$)/.test(location.search); render(); });

main().catch(e => { $('#titleZh').textContent = '載入失敗，請重新整理'; console.error(e); });
