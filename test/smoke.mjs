// Playwright WebKit iPhone 13 煙霧測試。用法：BASE=http://localhost:3000 node test/smoke.mjs
import { webkit, devices } from 'playwright';
const BASE = process.env.BASE || 'http://localhost:3000';
const browser = await webkit.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'] });
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
await page.goto(BASE + '/archive.html');
await page.waitForSelector('.grid a');
check('archive lists 365', (await page.locator('.grid a').count()) === 365);
check('archive has thumbnails', (await page.locator('.grid a .thumb img').count()) === 365);
check('archive marks done scene', (await page.locator('.grid a.is-done').count()) === 1);
check('archive banners have bg', (await page.locator('.banner[style*="bg/"]').count()) >= 12);
await browser.close();
if (fails.length) { console.error('FAILED:', fails); process.exit(1); }
console.log('smoke ok');
