// Playwright WebKit iPhone 13 煙霧測試。用法：BASE=http://localhost:3000 node test/smoke.mjs
import { webkit, devices } from 'playwright';
const BASE = process.env.BASE || 'http://localhost:3000';
const browser = await webkit.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'] });
// 口說任務不得動用麥克風：計數語音辨識與 getUserMedia 的使用
await ctx.addInitScript(() => {
  window.__mic = 0;
  window.webkitSpeechRecognition = class { constructor() { window.__mic++; } start() {} stop() {} abort() {} };
  if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = () => { window.__mic++; return Promise.reject(new Error('blocked')); };
});
const page = await ctx.newPage();
const fails = [];
const check = (name, ok) => { console.log((ok ? 'ok  ' : 'FAIL') + ' ' + name); if (!ok) fails.push(name); };
const t = async sel => (await page.locator(sel).textContent()).trim();

await page.goto(BASE + '/?d=999');
await page.waitForSelector('.line');
check('?d=999 falls back to today and renders', (await page.locator('.line').count()) === 5);
check('title rendered', (await t('#titleZh')).length > 0);
check('onboarding shown first visit', await page.locator('#onboard').isVisible());
await page.click('#onboardOk');
check('onboarding dismissed', !(await page.locator('#onboard').isVisible()));
check('5 play buttons', (await page.locator('.line .play').count()) === 5);
check('english hidden by default (reveal buttons)', (await page.locator('.line .en .reveal').count()) === 5);
check('role label has A ·', (await page.locator('.line .spk').first().textContent()).includes('·'));
check('done disabled before listening', await page.locator('#doneBtn').isDisabled());
await page.click('.line[data-k="2"] .zh .reveal');
check('zh reveal also reveals en on that line', (await page.locator('.line[data-k="2"] .en .reveal').count()) === 0 && (await page.locator('.line[data-k="2"] .zh .reveal').count()) === 0);
await page.click('#showEn');
check('show english reveals all', (await page.locator('.line .en .reveal').count()) === 0);
check('zh still hidden on other lines', (await page.locator('.line .zh .reveal').count()) === 4);
check('key phrase highlighted', (await page.locator('.line mark').count()) >= 1 && await page.locator('#keyPhrase').isVisible());
await page.click('#showZh');
check('show zh reveals all', (await page.locator('.line .zh .reveal').count()) === 0);
await page.click('#rate');
check('rate toggles to 0.75', (await t('#rate')).includes('0.75'));
await page.click('#playAll');
await page.waitForTimeout(300);
check('playAll shows stop', (await t('#playAll')).includes('停止'));
await page.click('#playAll');
await page.waitForTimeout(300);
check('second click stops', (await t('#playAll')).includes('聽全部'));
// 模擬聽完 5 句：逐句點播並等待結束（0.75x，每句 <6s）
await page.click('#rate');
for (let k = 1; k <= 5; k++) { await page.click(`.line[data-k="${k}"] .play`); await page.waitForFunction(k => !document.querySelector(`.line[data-k="${k}"]`).classList.contains('playing'), k, { timeout: 15000 }); }
check('done enabled after 5 lines', !(await page.locator('#doneBtn').isDisabled()));
await page.click('#doneBtn');
check('done button marks', (await t('#doneBtn')).includes('已完成'));
check('stats show 1 day / streak 1', (await t('#stats')).includes('已練 1 天') && (await t('#stats')).includes('連續 1 天'));
check('stamp shown', await page.locator('#stamp.show').count() === 1);
await page.goto(BASE + '/?d=42');
await page.waitForSelector('.line');
check('?d=42 label', (await t('#dayLabel')).includes('第 42 天'));
check('page bg set', (await page.locator('#pageBg').count()) === 1);
// ── 跟讀／角色扮演也不得動用麥克風：開口後揭曉英文自己對照 ──
await page.goto(BASE + '/?d=45'); await page.waitForSelector('.line');
await page.click('#shadow'); await page.click('#playAll');
await page.waitForFunction(() => document.querySelector('.line[data-k="1"] .en').dataset.open === '1', null, { timeout: 20000 });
await page.click('#playAll');
await page.click('#shadow'); await page.click('#role'); await page.click('#playAll');
await page.waitForFunction(() => document.querySelector('.line.yours'), null, { timeout: 20000 });
check('role turn shows speak prompt', (await page.locator('.line.yours .fb-mic').count()) === 1);
await page.click('#playAll');
check('shadow/role never touch the microphone', (await page.evaluate(() => window.__mic)) === 0);
// ── 今日口說任務（自己查核，不用麥克風）──
await page.goto(BASE + '/?d=42'); await page.waitForSelector('.line');
await page.click('#missionBtn');
check('mission panel replaces lines', await page.locator('#mission').isVisible() && !(await page.locator('#lines').isVisible()));
check('mission starts at stage 1', (await page.locator('.m-stages li.on').getAttribute('data-s')) === '1');
await page.click('.m-manual'); await page.click('.m-manual');
check('two self-checks counted', (await t('.m-count')).includes('總進度 2 /'));
check('dots show 2 of 5', (await t('.m-where')).includes('●●○○○'));
await page.click('#next'); await page.waitForSelector('.line');
check('leaving closes the panel', !(await page.locator('#mission').isVisible()));
await page.click('#prev'); await page.waitForSelector('.line');
await page.click('#missionBtn');
check('progress restored after leaving', (await t('.m-count')).includes('總進度 2 /'));
await page.click('#missionBtn');
// 預存到最後一次（關四第 5 輪第 5 句），按一次就完成
await page.evaluate(async () => {
  const { buildOrder, taipeiDateKey } = await import('/js/day.js');
  const sc = await (await fetch('/data/scenes.json')).json();
  const id = buildOrder(sc)[41];
  localStorage.setItem('de365.mission', JSON.stringify({ [taipeiDateKey()]: { [id]: { stage: 4, k: 5, n: 4, done: false } } }));
});
await page.reload(); await page.waitForSelector('.line');
await page.click('#missionBtn');
check('stage 4 hides text and replay', (await page.locator('#mission .m-en.masked').count()) === 1 && (await page.locator('#mission .m-hear').count()) === 0);
await page.click('.m-tip');
check('stage 4 hint shows chinese', (await page.locator('#mission .m-hint').count()) === 1);
await page.click('.m-manual');
check('stage 4 self-check reveals english', (await page.locator('#mission .m-en.masked').count()) === 0 && (await page.locator('.m-ok').count()) === 1);
await page.click('.m-again');
check('retry masks again without counting', (await page.locator('#mission .m-en.masked').count()) === 1 && (await t('.m-count')).includes('總進度 99 /'));
await page.click('.m-manual'); await page.click('.m-ok', { timeout: 8000 });
await page.waitForSelector('.m-done', { timeout: 5000 });
check('mission complete badge', (await t('.m-done')).includes('口說任務完成') && (await page.locator('.m-seal').count()) === 1);
await page.click('#missionBtn');
check('mission button shows done', (await t('#missionBtn')).includes('✓'));
check('mission completion also completes the lesson', (await t('#doneBtn')).includes('已完成') && (await page.locator('#stampSay.show').count()) === 1);
check('mission never touches the microphone', (await page.evaluate(() => window.__mic)) === 0);
// 已聽完 5 句時，任務中測驗鈕不得冒出
await page.goto(BASE + '/?d=43'); await page.waitForSelector('.line');
for (let k = 1; k <= 5; k++) { await page.click(`.line[data-k="${k}"] .play`); await page.waitForFunction(k => !document.querySelector(`.line[data-k="${k}"]`).classList.contains('playing'), k, { timeout: 15000 }); }
check('quiz button available after 5 lines', await page.locator('#quizBtn').isVisible());
await page.click('#missionBtn'); await page.waitForTimeout(4000); await page.click('.m-manual');
check('quiz button stays hidden during mission', !(await page.locator('#quizBtn').isVisible()));
await page.click('#missionBtn');
// 輕量版：還沒開始時可切換，總數變 30
await page.goto(BASE + '/?d=46'); await page.waitForSelector('.line');
await page.click('#missionBtn'); await page.click('.m-mode');
check('lite mode has 30 reps and skips stage 2', (await t('.m-count')).includes('/ 30') && (await page.locator('.m-stages li').count()) === 3);
await page.click('#missionBtn');
await page.goto(BASE + '/?d=47&mission=lite'); await page.waitForSelector('.line');
await page.click('#missionBtn');
check('?mission=lite starts lite', (await t('.m-count')).includes('/ 30'));
await page.click('#missionBtn');
// 原音卡住（不回應）時，仍可按「念完了」前進
await page.route('**/audio/**', () => {});
await page.goto(BASE + '/?d=44'); await page.waitForSelector('.line');
await page.click('#missionBtn'); await page.click('.m-manual', { timeout: 8000 });
check('self-check works even if audio hangs', (await t('.m-count')).includes('總進度 1 /'));
await page.click('#missionBtn');
await page.unroute('**/audio/**');
await page.goto(BASE + '/archive.html');
await page.waitForSelector('.grid a');
check('archive lists 365', (await page.locator('.grid a').count()) === 365);
check('archive has thumbnails', (await page.locator('.grid a .thumb img').count()) === 365);
check('archive marks done scenes (lesson + mission)', (await page.locator('.grid a.is-done').count()) === 2);
check('archive banners have bg', (await page.locator('.banner[style*="bg/"]').count()) >= 12);
await browser.close();
if (fails.length) { console.error('FAILED:', fails); process.exit(1); }
console.log('smoke ok');
