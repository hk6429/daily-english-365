#!/usr/bin/env node
// Apply the content fixes from scratch/review-{native,sla,professor,learning}.md to data/scenes.json.
// Reproducible: run on the committed original (git checkout data/scenes.json) — every edit is a "set", so re-running is idempotent.
// Also writes scratch/fix-log.md (every touched id + reason).
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const FILE = path.join(ROOT, 'data/scenes.json');
// Always start from the pre-review baseline (commit 7d27daa) so re-runs are reproducible.
const BASE = '7d27daa';
let raw;
try { raw = require('child_process').execSync(`git show ${BASE}:data/scenes.json`, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 }); }
catch { raw = fs.readFileSync(FILE, 'utf8'); console.warn('git baseline unavailable, editing current file'); }
const s = JSON.parse(raw);
const orig = JSON.parse(JSON.stringify(s));
const log = new Map();
const touch = (id, why) => { if (!log.has(id)) log.set(id, new Set()); log.get(id).add(why); };
const sc = id => { const x = s[id - 1]; if (!x || x.id !== id) throw new Error('bad id ' + id); return x; };

// ---------- helpers ----------
function lines(why, arr) { // arr: ["id-k", en|null, zh|null]
  for (const [key, en, zh] of arr) {
    const [id, k] = key.split('-').map(Number);
    const l = sc(id).lines[k - 1];
    if (!l) throw new Error('no line ' + key);
    if (en != null) l.en = en;
    if (zh != null) l.zh = zh;
    touch(id, why);
  }
}
function scene(id, why, ls, meta = {}) { // ls: [[en, zh], ...5] speakers forced A,B,A,B,A
  if (ls.length !== 5) throw new Error('scene ' + id + ' needs 5 lines');
  sc(id).lines = ls.map(([en, zh], i) => ({ speaker: i % 2 ? 'B' : 'A', en, zh }));
  Object.assign(sc(id), meta);
  touch(id, why);
}
function meta(id, why, obj) { Object.assign(sc(id), obj); touch(id, why); }
function voice(why, map) { // "id-k": male|female|child
  for (const [key, v] of Object.entries(map)) {
    const [id, k] = key.split('-').map(Number);
    sc(id).lines[k - 1].voice = v;
    touch(id, why);
  }
}

// ============ 1. Line-level rewrites (native A, SLA A, professor A) ============
lines('逐句修正（母語老師／SLA／教授審查 A 表）', [
  ['5-3', 'Where should I wait for car seven?', '七號車廂要在哪裡等？'],
  ['7-5', "That's fine. Go ahead and walk through.", '可以，請直接走過去。'],
  ['8-4', 'Great. Can I board now?', '好的，我現在可以登機了嗎？'],
  ['8-5', 'Not yet. Group two boards in about five minutes.', '還不行，第二組大約五分鐘後登機。'],
  ['12-1', 'Ninety-five, fill it up, please.', '九五無鉛，加滿，麻煩了。'],
  ['12-3', 'By card, please.', '刷卡，麻煩了。'],
  ['16-1', 'Hi, are you my ride?', '嗨，你是我叫的車嗎？'],
  ['16-3', "It's Kevin. Thanks for picking me up.", '我是Kevin，謝謝你來接我。'],
  ['18-2', null, '可以看一下您的行李條嗎？'],
  ['24-1', null, '今天下午可以跟你借機車嗎？'],
  ['28-2', "Yes, I'm afraid it's because of the weather.", '對，恐怕是因為天氣的關係。'],
  ['34-5', "Great choice. I'll put that in for you.", '很好的選擇，我幫您送單。'],
  ['37-1', null, '可以幫我們結帳嗎？'],
  ['39-1', 'Is the tip included?', '小費有含在裡面嗎？'],
  ['40-3', "That's fine. I'll wait over there.", '沒關係，我在那邊等。'],
  ['41-2', null, '真的很抱歉。'],
  ['42-1', 'Can I get a number three combo?', '我要一份三號套餐。'],
  ['42-2', 'Would you like to make that a large?', '要升級成大份的嗎？'],
  ['43-4', 'Would you like to add boba?', '要加珍珠嗎？'],
  ['43-5', 'Yes, please, add some boba.', '好，麻煩加珍珠。'],
  ['44-4', "Sure, I'll make them spicy.", '沒問題，我幫你弄辣一點。'],
  ['53-5', null, '好，登記姓林。'],
  ['55-3', null, '登記姓王，兩位。'],
  ['59-5', 'Thanks, I appreciate it.', '謝謝，麻煩你了。'],
  ['62-2', "Sure. I'll hold the rest for you out here.", '可以，其他的我先幫你保管在外面。'],
  ['64-3', 'Yes, here it is. I bought it last week.', '有，在這裡，我上禮拜買的。'],
  ['67-5', 'Great, your total comes to two hundred twenty.', '好的，總共兩百二十元。'],
  ['68-3', 'It keeps saying "Unexpected item in bagging area."', '一直顯示「裝袋區有未預期的商品」。'],
  ['72-4', "It's six hundred a month.", '每個月六百元。'],
  ['72-5', "That sounds reasonable. I'll go with that one.", '聽起來很合理，我就辦這個。'],
  ['73-1', 'Can you recommend something light to read?', '可以推薦一些輕鬆好讀的書嗎？'],
  ['77-2', "It's in aisle five, next to the soap.", '在五號走道，肥皂旁邊。'],
  ['78-3', "The tag's kind of hard to read.", '標籤有點看不清楚。'],
  ['78-4', 'The system says fifty-five dollars.', '系統顯示是五十五元。'],
  ['87-2', 'Sure. Do you need a company tax ID on it?', '好的，需要打統編嗎？'],
  ['87-3', 'No, a regular receipt is fine.', '不用，一般發票就好。'],
  ['91-1', null, '你好，我有訂房，姓陳。'],
  ['96-1', 'Is it okay if I turn off the light?', '我可以關燈了嗎？'],
  ['98-1', "Here's my passport and arrival card.", '這是我的護照和入境卡。'],
  ['98-3', "Sightseeing. I'll be here for a week.", '觀光，我會待一個星期。'],
  ['102-2', 'Not at all. Which seat is yours?', '不介意啊，你的座位是哪一個？'],
  ['104-1', "I'd like to change some US dollars.", '我想換一些美金。'],
  ['105-2', null, '當然，給你。'],
  ['110-3', 'Do you take cards?', '可以刷卡嗎？'],
  ['115-5', null, '好，我等你們送來。'],
  ['117-2', "It's open from seven in the morning to ten at night.", '開放時間是早上七點到晚上十點。'],
  ['119-4', "Here's your claim tag. Don't lose it.", '這是您的領取牌，別弄丟了。'],
  ['119-5', "Thanks. I'll be back around five.", '謝謝，我大概五點回來拿。'],
  ['122-2', "Nice to meet you. I'm Lisa, the new designer.", '很高興認識你，我是Lisa，新來的設計師。'],
  ['125-5', "Thanks. I'll come straight in when I get there.", '謝謝，我一到就直接進公司。'],
  ['127-4', "Okay, let's make Friday the new deadline.", '好，那新的截止日就訂星期五。'],
  ['129-2', 'Yeah, back-to-back meetings.', '對啊，會議一場接一場。'],
  ['136-4', 'Yes, overtime is paid in the same paycheck.', '對，加班費會跟薪水一起發。'],
  ['137-2', null, '真可惜，你最後一天是哪天？'],
  ['137-3', "I'm thinking the end of the month.", '我想做到這個月底。'],
  ['139-2', null, '還不錯，我都能專心工作。'],
  ['143-2', "I'll have the chicken bento, please.", '我要雞肉便當，謝謝。'],
  ['145-2', null, '很好，你哪幾天不在？'],
  ['147-5', 'Thanks. Please, go ahead.', '謝謝，請繼續。'],
  ['153-1', null, '可以跟你借昨天的筆記嗎？'],
  ['157-1', 'I was absent last week, so I missed the test.', '我上週請假，所以錯過了考試。'],
  ['163-2', 'Nice to meet you. Thanks for having me.', '很高興認識你，謝謝你們接待我。'],
  ['165-1', 'Thanks for studying with me.', '謝謝你陪我讀書。'],
  ['169-2', 'Sure. Where are you going?', '好啊，要去哪裡？'],
  ['178-3', 'Which subjects do you offer tutoring in?', '你們有哪些科目的輔導？'],
  ['179-4', 'I take short breaks while I study.', '我讀書時會穿插短暫休息。'],
  ['180-4', 'Thanks for supporting me the whole time.', '謝謝你一直以來的支持。'],
  ['182-5', 'Great. Please put me down for that.', '太好了，幫我登記那個時段。'],
  ['183-1', null, '我來領處方藥，姓陳。'],
  ['197-5', 'About twenty minutes. There are a few people ahead of you.', '大概二十分鐘，前面還有幾位。'],
  ['200-4', 'Maybe later. I just need a little space right now.', '也許晚點吧，我現在只想一個人靜一靜。'],
  ['201-4', "Will this show if it's broken?", '這個看得出來有沒有骨折嗎？'],
  ['207-1', null, '我決定這次真的要戒菸了。'],
  ['211-1', "I'd like to open a savings account.", '我想開一個活期存款帳戶。'],
  ['213-3', "It's on this piece of paper.", '寫在這張紙上。'],
  ['215-1', 'I need to report my credit card lost.', '我需要掛失我的信用卡。'],
  ['215-2', null, '別擔心，我馬上幫您處理。'],
  ['225-3', null, '我沒有多用流量啊。'],
  ['226-4', 'Tap "Link a card" right here.', '點這裡的「綁定卡片」。'],
  ['229-4', 'Yes, transfers within the same bank are free.', '對，同一家銀行轉帳免費。'],
  ['233-3', 'Three hundred thousand.', '三十萬。'],
  ['234-2', 'Insert your card and enter your PIN.', '請插入卡片並輸入密碼。'],
  ['236-4', "I'll need to see proof of income.", '我需要看一下您的收入證明。'],
  ['241-5', null, '不客氣，改天見囉！'],
  ['243-1', null, '這週雨也下太多了吧！'],
  ['245-5', 'Anytime, have a good weekend.', '隨時歡迎，週末愉快。'],
  ['247-3', 'I thought your new place could use something green.', '我想你的新家可以添點綠意。'],
  ['249-3', "Phew. I thought you'd been waiting forever.", '呼，我還以為你等了超久。'],
  ['249-4', "Nope. Don't worry about it.", '沒有啦，別放在心上。'],
  ['257-4', null, '啊，不會吧，好失望喔。'],
  ['269-1', null, '歡迎回來！飛機坐得還好嗎？'],
  ['270-1', "Are you new here? I don't think I've seen you before.", '你是新來的嗎？我之前好像沒看過你。'],
  ['273-1', 'Can you do the dishes for me tonight?', '你今晚可以幫我洗碗嗎？'],
  ['280-3', 'Thanks. The lights on the router are blinking red.', '謝謝，路由器的燈一直閃紅燈。'],
  ['285-2', null, '我記得這禮拜輪到我。'],
  ['288-1', null, '請問是三號的包裹嗎？'],
  ['290-2', null, '看得很清楚，每個人都看到了。'],
  ['291-3', "Do you think it's dangerous?", '你覺得會很危險嗎？'],
  ['292-3', 'The four of us, plus Grandma.', '我們四個，再加阿嬤。'],
  ['294-4', "That's a good idea. It'll save money.", '這是個好主意，能省不少錢。'],
  ['297-4', "It'll send an alert to our phones.", '它會傳警示到我們手機上。'],
  ['299-5', "Of course. It's going to be a great party.", '當然可以，一定會是很棒的派對。'],
  ['300-1', null, '今天早上我們來煎鬆餅好嗎？'],
  ['302-1', 'How long have you been waiting in line?', '你排多久了？'],
  ['302-2', "About an hour. It's pretty slow, honestly.", '大概一小時了，老實說滿慢的。'],
  ['303-5', "Great. It's under Lin.", '太好了，登記姓林。'],
  ['307-3', 'What are we playing to?', '打到幾分？'],
  ['311-3', 'How long does a game usually take?', '一局通常要多久？'],
  ['311-4', 'About thirty minutes a game.', '一局大概三十分鐘。'],
  ['341-3', 'Would you like a manicure and a pedicure?', '要做手部和腳部保養嗎？'],
  ['348-5', 'Great, thanks. That was easy.', '太好了，謝謝，好簡單。'],
  ['350-3', 'I have something important in there that I need.', '裡面有我需要的重要東西。'],
  ['350-4', "They'll have the master code to open it.", '他們有萬用密碼可以打開。'],
  ['352-4', 'We should also bring the plants inside.', '外面的盆栽也該搬進來。'],
  ['353-4', null, '應該有，那是大型藥局，品項很齊全。'],
  ['355-2', 'No problem. Let me call an interpreter.', '沒關係，我幫你找一位口譯員。'],
  ['355-4', 'The interpreter will be here in a few minutes.', '口譯員幾分鐘後就會到。'],
  ['359-3', "It's a blue Giant mountain bike. It's brand new.", '是藍色的捷安特登山車，全新的。'],
  ['362-2', null, '真是辛苦你了，是什麼聲音？'],
  ['363-1', "Hi, there's no water in my apartment.", '你好，我家沒有水。'],
  ['363-2', "I'm sorry. What's your address?", '不好意思，請問您的地址是？'],
  ['363-3', "It's twelve Maple Street, apartment three-B.", '楓葉街 12 號，3B 室。'],
  ['363-4', "There's some repair work nearby. It should be back on around six.", '附近在施工維修，大約六點會恢復供水。'],
]);

// ============ 6. TTS-friendly numbers ============
lines('TTS 數字改寫成口語唸法', [
  ['91-4', "You're in room five-twelve. Breakfast starts at seven.", '您的房間是五一二號房，早餐七點開始。'],
  ['92-1', "I'd like to check out. Room five-twelve.", '我要退房，五一二號房。'],
  ['93-3', "It's room three-eighteen.", '是三一八號房。'],
  ['95-4', 'Got it. Room two-twenty, six-thirty.', '好的，二二〇號房，六點半。'],
  ['97-2', 'Great. The lockbox code is four-four-seven-one.', '太好了，鑰匙盒的密碼是四四七一。'],
  ['132-5', "It's oh-nine-one-two, three-four-five, six-seven-eight.", '是 0912-345-678。'],
  ['237-3', "It's oh-nine-one-two, three-four-five, six-seven-eight.", '是 0912-345-678。'],
  ['331-1', "Nine-one-one, what's your emergency?", '九一一，請問有什麼緊急狀況？'],
  ['309-5', "It's Chen. C-H-E-N.", '姓陳，C-H-E-N。'],
  ['8-3', "You're in seat fourteen-C, group two.", '您是十四C座位，第二組登機。'],
  ['17-4', 'Yes, route twenty runs every ten minutes.', '是的，二十號公車每十分鐘一班。'],
  ['101-2', 'Yes, it moved from B-twelve to B-twenty.', '對，從 B12 改到 B20 了。'],
  ['337-3', "It's twelve Elm Street, near the corner store.", '榆樹街 12 號，靠近轉角商店那邊。'],
  ['339-3', "It's under Chen, ticket number forty-five.", '姓陳，取件單號是 45 號。'],
]);

// ============ 7. 298 Celsius, 331 Main Street ============
lines('華氏改攝氏', [['298-4', "Okay, let's set it to twenty-six degrees.", '好啊，那就設二十六度吧。']]);
lines('「緬因街」誤譯改為主街', [['331-2', null, '主街這邊發生車禍了。']]);
meta(331, '「緬因街」誤譯改為主街', { scene_zh: '在美國旅遊時目擊小車禍，打 911 請求緊急協助（台灣報案打 110、救護火警打 119）。' });

// ============ 5. Dangling-question endings → natural close ============
lines('第 5 句懸空問句改為收尾', [
  ['183-4', 'Here you go. One tablet twice a day, after meals.', '這是您的藥，一天兩次，一次一顆，飯後吃。'],
  ['183-5', 'Got it. After breakfast and dinner, then.', '了解，那就早餐和晚餐後吃。'],
  ['189-5', "Okay. I guess I'll sit out next week's game.", '好吧，看來我下週的比賽只能坐板凳了。'],
  ['191-5', "Done. I'll try the pool this weekend.", '簽好了，我這週末先來游泳。'],
  ['203-4', 'This cold medicine should help. Take it three times a day.', '這款感冒藥應該有幫助，一天吃三次。'],
  ['203-5', "Got it. I'll take one after lunch.", '了解，我午餐後先吃一次。'],
  ['207-5', "Great. I'll pick up the patches today.", '好，我今天就去拿貼片。'],
  ['209-4', "Let's try adding a small breakfast, like eggs and fruit.", '我們先試著加一份簡單的早餐，像是蛋和水果。'],
  ['209-5', "Okay, I'll start with that tomorrow morning.", '好，我明天早上就開始。'],
  ['211-5', "Sure. It'll just take me a minute.", '好，我一下就填好。'],
  ['216-4', "We'll open a dispute. It usually takes about two weeks.", '我們會幫您申請帳款爭議，通常需要兩週左右。'],
  ['216-5', "Okay. I'll keep an eye on my account.", '好，我會留意我的帳戶。'],
  ['276-4', "The pipe is loose. It'll take about ten minutes.", '是管子鬆了，大概十分鐘就能修好。'],
  ['276-5', "Great. I'll make some tea while you work.", '太好了，你修的時候我來泡個茶。'],
  ['281-4', "It's a mild stomach infection. She'll need some medicine.", '是輕微的腸胃感染，她需要吃點藥。'],
  ['281-5', "Okay, I'll make sure she takes it every day.", '好，我會確保她每天吃藥。'],
  ['312-5', "Cool, I'll try it at your place this weekend.", '酷，這週末我去你家玩玩看。'],
  ['319-4', "Here's your device. Start on the second floor.", '這是您的導覽機，建議從二樓開始。'],
  ['319-5', "Great, I'll head upstairs now.", '好，那我現在上樓。'],
  ['337-4', "We're aware. Power should be back in about two hours.", '我們已經知道了，大約兩小時後會恢復供電。'],
  ['337-5', "Okay, I'll keep my fridge closed until then.", '好，那我在這之前先不開冰箱。'],
]);

// ============ 8. Formulaic endings (thank-you / Perfect) → varied closers ============
lines('第 5 句公式化客套改為有資訊的收尾', [
  ['2-5', "Okay, I'll tap my card now.", '好，那我現在刷卡。'],
  ['3-5', "Okay, let's follow the red signs.", '好，我們跟著紅色指標走。'],
  ['4-5', "Here's the money. I'll need a receipt, too.", '錢給你，我也需要收據。'],
  ['5-5', "Okay, I'll walk to the front then.", '好，那我往前面走。'],
  ['10-5', "Great, I'll walk there then.", '太好了，那我用走的過去。'],
  ['15-5', "Great. I'll bring it back with a full tank.", '好，我會加滿油再還車。'],
  ['28-5', "Okay, I'll grab a coffee while I wait.", '好，那我等的時候去買杯咖啡。'],
  ['32-5', "It's under Chen. See you Saturday.", '登記姓陳，星期六見。'],
  ['33-5', 'Nice, we can see the whole street.', '不錯，可以看到整條街。'],
  ['35-5', "Great, I'll order that then.", '太好了，那我就點這個。'],
  ['36-5', "That's okay. I'll wait for the new one.", '沒關係，我等新的那碗。'],
  ['40-5', "Great, I'll keep an ear out.", '好，我會注意聽。'],
  ['41-5', "Great. I'll order from you again.", '太好了，下次還會跟你們訂。'],
  ['42-5', "Will do. I'll have my card ready.", '好的，我先把卡準備好。'],
  ['52-5', 'Great, she can sit right here.', '太好了，她可以坐這裡。'],
  ['64-5', 'Great, that works for me.', '好，這樣可以。'],
  ['65-5', "Great, I'll swap it for the navy one.", '太好了，那我換海軍藍的。'],
  ['69-5', "Great, I'll grab one of those too.", '太好了，我也順便拿一條。'],
  ['75-5', 'Great, that was really fast.', '太好了，真的好快。'],
  ['77-5', "Got it. I'll go that way.", '了解，我往那邊走。'],
  ['84-5', 'Great, my nephews will love these.', '太好了，我姪子們一定會喜歡。'],
  ['85-5', "Great, I'll wait here.", '好，我在這裡等。'],
  ['87-5', 'Sure thing. Have a nice day.', '好，祝你今天順利。'],
  ['88-5', "Good to know. I'll come back Sunday.", '了解，那我星期天再來。'],
  ['91-5', "Great. I'll take my bags up now.", '太好了，我先把行李拿上去。'],
  ['92-5', "Great. I'll leave my key card here.", '好，房卡我放這裡。'],
  ['94-5', "Great. We'll be in the room.", '太好了，我們會在房間等。'],
  ['95-5', "Great. I really can't miss my train.", '太好了，我絕對不能錯過火車。'],
  ['96-5', "Good to know. I'll buy one tomorrow.", '了解，我明天去買一個。'],
  ['97-5', 'Found it. The place looks great.', '找到了，房子看起來很棒。'],
  ['99-5', "Great, I'll be on my way.", '太好了，那我先走了。'],
  ['106-5', "Here's my card. We'll start upstairs.", '這是我的卡，我們從樓上開始逛。'],
  ['112-5', "Great, I'll send it tonight.", '好，我今晚就寄過去。'],
  ['114-5', 'Awesome. That gives me time for lunch.', '太棒了，這樣我還有時間吃午餐。'],
  ['117-5', "Great, I'll swim after dinner.", '太好了，我晚餐後去游泳。'],
  ['123-5', "Great. It's the one in column C.", '太好了，就是C欄那個。'],
  ['127-5', "Great. I'll send it Friday morning.", '好，我星期五早上交給你。'],
  ['129-5', "Cool, let's meet at noon.", '好，中午見。'],
  ['131-5', "It's working. You're a lifesaver.", '可以印了，你真是救星。'],
  ['136-5', "Great, that's good to know.", '太好了，這樣我就清楚了。'],
  ['141-5', "All done. It's back on your desk.", '用完了，放回你桌上囉。'],
  ['142-5', 'It works now. That did the trick.', '現在可以連了，這招有效。'],
  ['146-4', "Great, I'll process this by Friday.", '很好，我週五前會處理完。'],
  ['146-5', "Great. I'll email you the digital copies too.", '好，我也會把電子檔寄給你。'],
  ['148-5', 'Great, blue ones would be nice.', '太好了，藍色的就好。'],
  ['149-5', "Will do. I'll send it tonight.", '好，我今晚就寄。'],
  ['155-5', "Got it. I'll return them on time.", '了解，我會準時還。'],
  ['164-5', "Great, I'll head over now.", '太好了，我現在過去。'],
  ['165-5', "Great, let's start with chapter three.", '好，我們從第三章開始。'],
  ['175-5', "Got it. I'll upload it tonight.", '了解，我今晚就上傳。'],
  ['177-5', "Okay, I'll pack my water bottle tonight.", '好，我今晚就把水壺裝好。'],
  ['178-5', 'Great, I really need help with math.', '太好了，我正需要數學輔導。'],
  ['212-5', "Okay, I'll wait right here.", '好，我在這裡等。'],
  ['217-5', "Here you go. I'll keep the receipt.", '給你，收據我留著。'],
  ['218-5', "Okay, here's the cash.", '好，這是現金。'],
  ['219-5', "Great, I'll stay home this afternoon.", '太好了，我下午會待在家。'],
  ['222-5', "It's still the same. Nothing's changed.", '還是一樣，沒有變。'],
  ['225-5', 'Ah, that explains it. I called my aunt in Japan.', '啊，難怪，我有打給在日本的阿姨。'],
  ['227-5', "Okay, I'll head over there now.", '好，那我現在過去。'],
  ['229-5', 'Good to know. That saves me money.', '了解，這樣可以省錢。'],
  ['231-5', "Great, that's before my trip.", '太好了，在我出國前就能拿到。'],
  ['232-5', "Done. Now I won't miss a payment.", '好了，這樣就不會忘記繳了。'],
  ['234-5', 'Got it. The balance is showing now.', '好了，餘額出來了。'],
  ['235-5', "Great, I'm almost out of checks.", '太好了，我的支票快用完了。'],
  ['238-5', 'Great. That was easier than I thought.', '太好了，比我想的簡單。'],
  ['249-5', "Great, let's go inside and order.", '太好了，我們進去點餐吧。'],
  ['261-5', "Good to know. I'll come to you first, then!", '了解，那我有問題就先找妳！'],
  ['278-5', 'Great. Good night, then.', '太好了，那晚安囉。'],
  ['282-4', "Okay, I'll keep an eye on the clock.", '好的，我會注意時間的。'],
  ['289-5', "You're the best. I'll bring you some soup.", '你最好了，我等等端碗湯給你。'],
  ['291-5', 'Great, no more flickering lights.', '太好了，燈不會再閃了。'],
  ['301-5', "Great, we'll take those two.", '太好了，我們要這兩個。'],
  ['304-5', "Sounds good. We'll take it slow.", '好，我們慢慢走。'],
  ['306-5', "Got it. I'll start in lane one.", '了解，我先從第一水道開始。'],
  ['313-5', "Nice, that one's going on my Instagram.", '讚，這張要放上我的IG。'],
  ['339-5', 'Great, it looks brand new.', '太好了，看起來跟新的一樣。'],
  ['342-5', "Great, I'll come by Thursday afternoon.", '好，我週四下午來拿。'],
  ['344-5', "Great, I'll look around while I wait.", '好，我等的時候逛一下。'],
  ['349-5', "Got it. I'll sign in now.", '了解，我現在簽。'],
  ['350-5', "Okay, I'll wait in my room.", '好，我在房間等。'],
  ['361-5', "Great. I'll be waiting by the car.", '太好了，我在車子旁邊等。'],
  ['363-5', "Okay, I'll buy some bottled water for now.", '好，那我先去買些瓶裝水。'],
]);

// ============ 2. Role-confused scenes: full rewrites ============
const ROLE = '角色錯置／安全資訊，整段重寫';
scene(13, ROLE, [
  ['My car just broke down on the highway.', '我的車在高速公路上拋錨了。'],
  ['Are you safely pulled over on the shoulder?', '你有安全停到路肩上嗎？'],
  ["Yes, I'm on the shoulder near exit twelve.", '有，我停在十二號出口附近的路肩。'],
  ['Good. A tow truck will be there in twenty minutes.', '很好，拖吊車二十分鐘後會到。'],
  ["Okay, I'll wait behind the guardrail with my hazards on.", '好，我會打開警示燈，到護欄外面等。'],
]);
scene(38, ROLE, [
  ['Should we just split it evenly?', '我們要不要平均分攤就好？'],
  ['Actually, I only had a salad. Can we pay separately?', '其實我只點了沙拉，可以分開付嗎？'],
  ["Sure, that's fair.", '當然，這樣比較公平。'],
  ["Thanks. I'll get the drinks, though.", '謝謝，不過飲料我請。'],
  ["Deal. Let's ask for separate checks.", '就這麼說定，我們請店員分開結帳吧。'],
]);
scene(57, ROLE, [
  ['Should we just split one pizza?', '我們要不要合點一份披薩就好？'],
  ["Sounds good, I'm not that hungry.", '好啊，我沒有很餓。'],
  ["Let's ask for an extra plate.", '我們跟店員多要一個盤子吧。'],
  ['Good idea. Excuse me, could we get an extra plate?', '好主意。不好意思，可以多給我們一個盤子嗎？'],
  ["Great, let's dig in.", '太好了，我們開動吧。'],
], { title_zh: '兩人合點一份' });
scene(82, ROLE + '（keep the change 意思相反）', [
  ["Here's five hundred. Could I get some small bills back?", '這是五百元，可以找我小鈔嗎？'],
  ["Sure. It's three-eighty, so your change is one-twenty.", '好的，總共三百八，找您一百二十元。'],
  ['Could I get a receipt too?', '可以給我發票嗎？'],
  ['Of course, here you go.', '當然可以，這是你的發票。'],
  ['Great, I needed coins for the bus.', '太好了，我正需要零錢搭公車。'],
]);
scene(108, ROLE, [
  ['Excuse me, could you take a photo of us?', '不好意思，可以幫我們拍張照嗎？'],
  ['Sure! Do I just tap the screen?', '好啊！點螢幕就可以嗎？'],
  ['Yes, just tap the big button. Thanks!', '對，按那個大按鈕就好，謝謝！'],
  ['Say cheese! Got a great shot.', '笑一個！拍到很棒的照片了。'],
  ["Wow, it looks amazing. You're a great photographer.", '哇，拍得超好，你很會拍耶！'],
]);
scene(126, ROLE, [
  ['Sorry, your video keeps freezing.', '不好意思，你的畫面一直卡住。'],
  ['Let me turn off my camera.', '我把鏡頭關掉試試看。'],
  ['Much better. I can hear you clearly now.', '好多了，現在聽得很清楚。'],
  ['Good, sorry about that.', '太好了，剛剛不好意思。'],
  ["No problem, let's continue the meeting.", '沒關係，我們繼續開會吧。'],
]);
scene(187, ROLE, [
  ['Does it hurt when I press here?', '我按這裡會痛嗎？'],
  ["Yes, right around my belly button. It's a dull ache.", '會，就在肚臍周圍，是悶悶的痛。'],
  ['Has this happened often after eating spicy food?', '吃辣的食物之後常常會這樣嗎？'],
  ['Yes, especially after dinner most nights.', '對，特別是每天晚餐後。'],
  ["Let's avoid spicy food and see if it improves.", '我們先避開辣的食物，看看會不會改善。'],
]);
scene(242, ROLE + '（三人只有兩聲，改為兩人對話）', [
  ["Hi, you must be Sam. I'm Tom, Lily's coworker.", '嗨，妳一定是Sam吧，我是Tom，Lily的同事。'],
  ['Hey Tom, great to finally meet you.', '嗨Tom，終於見到你了。'],
  ['Lily talks about you all the time.', 'Lily常常提到妳。'],
  ['Oh no. What has she been saying?', '糟糕，她都說了些什麼？'],
  ['Only good things, I promise!', '只有好話啦，我保證！'],
], { title_en: "Meeting a Friend's Best Friend", title_zh: '認識朋友的好友', scene_zh: '在派對上，Lily的同事Tom主動認識Lily的好友Sam。' });
scene(317, ROLE + '（學生問教練「這是我第一次嗎」）', [
  ['Is this your first time on a board?', '這是你第一次站上衝浪板嗎？'],
  ["Yes, I've never surfed before.", '對，我從來沒衝過浪。'],
  ["Okay, let's start with balance practice on the sand.", '好，我們先在沙灘上練平衡。'],
  ['How do I stand up correctly?', '我要怎麼正確地站起來？'],
  ['Push up with your arms first, then jump to your feet.', '先用手臂撐起來，再跳起來站好。'],
], { scene_zh: '教練在海邊替初學者上第一堂衝浪課。' });
scene(356, ROLE, [
  ['The elevator seems to be stuck.', '電梯好像卡住了。'],
  ['Is anyone trapped inside?', '有人被困在裡面嗎？'],
  ["No, it's empty. It's stuck between floors.", '沒有，裡面沒人，卡在兩層樓中間。'],
  ["Okay, I'll call the maintenance team right away.", '好，我馬上叫維修人員來。'],
  ["Thanks. I'll tell everyone to use the stairs.", '謝謝，我會請大家先走樓梯。'],
]);
scene(357, ROLE, [
  ['I smell gas in my kitchen.', '我在廚房聞到瓦斯味。'],
  ["Don't touch any switches. Open the windows and go outside.", '不要碰任何開關，打開窗戶，然後到外面去。'],
  ["Okay, I'm outside now. What should I do next?", '好，我已經到外面了，接下來呢？'],
  ['Stay outside. A technician is on the way.', '待在外面，技師正在趕過去。'],
  ["Got it. I'll wait out here until they arrive.", '了解，我會在外面等到他們來。'],
]);
scene(365, ROLE + '（打電話的人說 Found it）', [
  ['I think I left my umbrella at your restaurant last night.', '我昨晚好像把雨傘忘在你們餐廳了。'],
  ['What color was it, and where did you sit?', '什麼顏色的？你坐在哪個位置？'],
  ["It's black, and I sat near the window.", '黑色的，我坐在窗邊。'],
  ["Let me check… Yes, there's a black one here.", '我看一下……有，這裡有一把黑色的。'],
  ["That's it! Thank you so much for checking.", '就是那把！真的很謝謝你幫我找。'],
]);

// ============ 3. Near-duplicates → brand-new gap-filling scenes ============
const NEW = [];
function fresh(id, why, m, ls) {
  const cat = sc(id).category;
  scene(id, why, ls, { ...m, category: m.category || cat });
  NEW.push(id);
}
fresh(58, '與 81 重複（手機付款）→ 新情境：婉拒夾菜', {
  title_en: 'Politely Turning Down Seconds', title_zh: '婉拒主人夾菜',
  scene_zh: '到朋友家吃飯，主人一直熱情夾菜，客人禮貌婉拒。',
  image_prompt_en: 'a chibi host at a home dinner table offering a piece of steamed fish with chopsticks while a chibi guest smiles and raises one hand politely to decline, dishes of Taiwanese home cooking on the table',
}, [
  ["Have some more fish. There's plenty left!", '再吃點魚嘛，還有很多！'],
  ["Thanks, but I'm really full. It was delicious.", '謝謝，不過我真的很飽了，真的很好吃。'],
  ['Are you sure? Just one more bite?', '真的嗎？再吃一口就好？'],
  ["I'd better not, but I'd love the recipe.", '我還是不要了，不過我很想要食譜。'],
  ["Deal. I'll write it down for you.", '沒問題，我寫給你。'],
]);
fresh(100, '與 18 重複（行李遺失）→ 新情境：機場廣播獨白', {
  title_en: 'Final Boarding Call', title_zh: '機場最後登機廣播',
  scene_zh: '機場廣播最後登機通知（A 是廣播），旅客聽到後趕往登機門。',
  image_prompt_en: 'a chibi traveler with a rolling suitcase looking up at a ceiling speaker in a bright airport terminal, a chibi gate agent speaking into a microphone at a boarding gate counter, departure boards without readable text',
}, [
  ['Attention, please. This is the final call for flight one-nine-eight.', '各位旅客請注意，這是一九八號班機的最後登機廣播。'],
  ["Wait, that's our flight! We need to hurry.", '等等，那是我們的班機！要快點了。'],
  ['Passengers to Tokyo, please go to Gate B-seven now.', '前往東京的旅客，請立即前往 B7 登機門。'],
  ["Gate B-seven? That's right around the corner.", 'B7 登機門？就在轉角而已。'],
  ['The gate will close in ten minutes. Thank you.', '登機門將在十分鐘後關閉，謝謝。'],
]);
fresh(120, '與 7 重複（安檢）→ 新情境：澄清語言（拼姓名、確認日期）', {
  title_en: 'Spelling Your Name for a Booking', title_zh: '訂房時拼出姓名',
  scene_zh: '旅客打電話訂房，櫃檯請對方拼出姓氏，並複誦日期確認。',
  image_prompt_en: 'a chibi hotel receptionist at a front desk holding a phone and writing letters on a notepad, and a chibi traveler at home talking on a smartphone, split scene connected by a dotted phone line',
}, [
  ['Can I have your last name, please?', '請問您的姓氏是？'],
  ["It's Hsu. H-S-U.", '我姓許，H-S-U。'],
  ['Sorry, was that S as in Sam?', '不好意思，是 Sam 的 S 嗎？'],
  ['Yes. H, S as in Sam, U.', '對，H，Sam 的 S，U。'],
  ['Got it. Two nights, from the fifteenth to the seventeenth.', '好的，兩晚，十五號住到十七號。'],
]);
fresh(172, '與 157 重複（補考）→ 新情境：學校廣播（校曆：運動會預演）', {
  title_en: 'Morning PA Announcement', title_zh: '學務處早上廣播',
  scene_zh: '早上學務處廣播運動會預演通知（A 是廣播），學生在教室裡邊聽邊反應。',
  image_prompt_en: 'a chibi student at a classroom desk looking up at a wall speaker and a chibi teacher speaking into a microphone in the school office, colorful sports day flags on the classroom wall, no readable text',
}, [
  ['Good morning, everyone. This is the student affairs office.', '各位同學早安，這裡是學務處。'],
  ["Shh, listen. It might be about sports day.", '噓，聽一下，可能是運動會的事。'],
  ['Sports day rehearsal will be this Friday afternoon.', '運動會預演在這週五下午。'],
  ['Friday? Great, that means no math class!', '星期五？太好了，那就不用上數學課了！'],
  ['Please wear your PE uniform and bring water.', '請穿體育服，並記得帶水。'],
]);
fresh(186, '與 35 重複（過敏）且分類不符 → 新情境：運動會到健康中心', {
  title_en: 'At the School Nurse on Sports Day', title_zh: '運動會跌倒到健康中心',
  scene_zh: '運動會跑大隊接力時跌倒，學生到健康中心請護理師處理擦傷。',
  image_prompt_en: 'a chibi school nurse cleaning a scraped knee of a chibi student in a PE uniform sitting on a bed in a school health room, first-aid kit on the table, sports day flags visible through the window',
}, [
  ["What happened? You're bleeding a little.", '怎麼了？你有點流血。'],
  ['I fell during the relay race.', '我跑大隊接力的時候跌倒了。'],
  ['Let me clean it first. It might sting.', '我先幫你清洗傷口，可能會有點刺痛。'],
  ['Ouch! Can I still run in the final?', '好痛！那我還能跑決賽嗎？'],
  ["Yes, it's just a scrape. I'll add a bandage.", '可以，只是擦傷，我幫你貼個 OK 繃。'],
]);
fresh(214, '與 104 重複（換匯）→ 新情境：澄清語言（請再說一次、fifteen vs fifty）', {
  title_en: 'Fifteen or Fifty?', title_zh: '電話中確認數字',
  scene_zh: '銀行打電話通知匯款手續費，顧客在吵雜的路上聽不清楚，請對方再說一次並確認數字。',
  image_prompt_en: 'a chibi bank clerk at a desk talking on a phone, and a chibi customer on a busy street holding a smartphone to one ear and covering the other ear, scooters passing behind',
}, [
  ['Hi, this is your bank calling about your transfer.', '您好，這裡是銀行，關於您的匯款。'],
  ["Sorry, could you say that again? It's noisy here.", '不好意思，可以再說一次嗎？這邊有點吵。'],
  ['The transfer fee is fifteen dollars.', '這筆匯款的手續費是十五元。'],
  ['Fifteen or fifty? One-five or five-zero?', '是十五還是五十？一五還是五零？'],
  ["One-five, fifteen. We'll take it from your account.", '一五，十五元，會直接從您的帳戶扣。'],
]);
fresh(262, '與 134 重複（邀同事吃麵）且分類不符 → 新情境：過年拜年發紅包', {
  title_en: 'Red Envelopes at Lunar New Year', title_zh: '過年拜年領紅包',
  scene_zh: '過年到舅舅家拜年，舅舅發紅包，大家準備圍爐。',
  image_prompt_en: 'a chibi uncle in a red sweater handing a red envelope to a chibi niece in a living room decorated with red spring couplets and paper lanterns, a hot pot on the table, no readable text',
}, [
  ['Happy Lunar New Year! This red envelope is for you.', '新年快樂！這個紅包給你。'],
  ['Thank you, Uncle! Wishing you good health this year.', '謝謝舅舅！祝您今年身體健康。'],
  ["You've grown so tall since last year!", '你比去年長高好多喔！'],
  ['I know! Do you need help with the hot pot?', '對啊！火鍋需要我幫忙嗎？'],
  ['Sure, bring the dumplings from the kitchen.', '好啊，去廚房把水餃端出來。'],
]);
fresh(267, '與 10 重複（問路）→ 新情境：中秋烤肉（向外國鄰居介紹）', {
  title_en: 'Mid-Autumn Barbecue', title_zh: '中秋節烤肉賞月',
  scene_zh: '中秋節晚上在騎樓烤肉，向外國鄰居介紹台灣的過節方式。',
  image_prompt_en: 'two chibi neighbors grilling corn and skewers on a small charcoal grill outside a Taiwanese apartment arcade at night, a big full moon in the sky, mooncakes and pomelos on a folding table',
}, [
  ['Happy Mid-Autumn Festival! Want some grilled corn?', '中秋節快樂！要不要來根烤玉米？'],
  ['Yes, please! Why is everyone barbecuing tonight?', '好啊！為什麼今晚大家都在烤肉？'],
  ["It's a Taiwanese tradition now. We also eat mooncakes.", '這是台灣現在的傳統，我們也會吃月餅。'],
  ['And look, the moon is so round and bright!', '你看，月亮好圓好亮！'],
  ["That's the best part. Here, try some pomelo too.", '這就是最棒的地方，來，也吃點柚子吧。'],
]);
fresh(305, '與 9 重複（租腳踏車）→ 新情境：端午看划龍舟', {
  title_en: 'Watching the Dragon Boat Races', title_zh: '端午節看划龍舟',
  scene_zh: '端午節和朋友在河岸看龍舟比賽。',
  image_prompt_en: 'two chibi friends cheering on a riverbank while colorful dragon boats with drummers and paddlers race on the river, one friend holding a bag of rice dumplings wrapped in bamboo leaves',
}, [
  ['Look, the dragon boats are starting!', '你看，龍舟要開始了！'],
  ['Wow! Why is someone beating a drum?', '哇！為什麼有人在打鼓？'],
  ['The drummer keeps the paddlers in rhythm.', '鼓手負責讓划手保持節奏。'],
  ['The red team is so fast!', '紅隊好快！'],
  ["Let's grab some rice dumplings after the race.", '比賽完我們去吃粽子吧。'],
]);
fresh(320, '與 73 重複（書店推薦）→ 新情境：澄清語言（請放慢、What does ... mean?）', {
  title_en: 'Asking the Dance Teacher to Slow Down', title_zh: '請舞蹈老師放慢示範',
  scene_zh: '第一次上街舞課跟不上動作，請老師放慢示範並問單字意思。',
  image_prompt_en: 'a chibi dance teacher demonstrating a turn in a mirrored dance studio while a chibi beginner raises a hand with a confused smile, water bottles along the wall',
}, [
  ['Step left, turn, clap, and spin!', '左踏、轉身、拍手，再旋轉！'],
  ['Sorry, could you show that more slowly?', '不好意思，可以再慢一點示範嗎？'],
  ['Sure. First, step left. Then turn.', '當然，先往左踏，再轉身。'],
  ['What does "spin" mean exactly?', '「spin」到底是什麼意思？'],
  ['It means turn all the way around, like this.', '就是像這樣整個轉一圈。'],
]);
fresh(325, '與 43 重複（手搖飲）→ 新情境：學習者當主人帶外國朋友爬象山', {
  title_en: 'Showing a Visitor Around Elephant Mountain', title_zh: '帶外國朋友爬象山',
  scene_zh: '帶來台灣玩的外國朋友爬象山，順便介紹台北夜景。',
  image_prompt_en: 'a chibi local guide pointing at the Taipei skyline with one very tall skyscraper from a mountain trail with stone steps, a chibi foreign visitor with a camera beside them, warm sunset sky',
}, [
  ['This is Elephant Mountain. The view is worth it.', '這是象山，上面的景色很值得。'],
  ['How long does it take to get to the top?', '爬到山頂要多久？'],
  ['About twenty minutes, but the stairs are steep.', '大概二十分鐘，不過樓梯很陡。'],
  ['No problem. Is that Taipei one-oh-one over there?', '沒問題，那邊那個是台北101嗎？'],
  ['Yes! It looks amazing at sunset.', '對！夕陽的時候超美。'],
]);

// ============ 4. Miscategorized ============
for (const id of [191, 192, 193]) meta(id, '分類錯置：醫療健康 → 休閒運動', { category: '休閒運動' });
meta(261, '分類錯置：社交人際 → 工作', { category: '工作' });
meta(348, '分類錯置：緊急與服務 → 交通', { category: '交通' });

// ============ Titles / scene_zh fixes (SLA A-4, professor B5) ============
meta(37, '標題在地化', { title_zh: '餐廳結帳' });
meta(216, '標題在地化', { title_zh: '信用卡帳款爭議' });
meta(349, '標題文法（缺冠詞）', { title_en: 'Asking a Security Guard' });
meta(39, '情境標明在美國（小費文化）', { scene_zh: '在美國的餐廳結帳時，決定給服務生多少小費。' });

// ============ 46: bar → cafe (audience incl. junior-high) ============
scene(46, '酒吧調酒改為咖啡廳特調（受眾含國中生）', [
  ['What do you recommend today?', '今天有什麼推薦的嗎？'],
  ['Our passion fruit soda is really popular.', '我們的百香果氣泡飲很受歡迎。'],
  ["I'll try that, please.", '那我試試看那個。'],
  ['Coming right up. Anything to snack on?', '馬上來，要點些小點心嗎？'],
  ['Just the drink for now, thanks.', '先來一杯就好，謝謝。'],
], { title_en: 'Ordering at a Cafe Counter', title_zh: '咖啡廳點特調', scene_zh: '在咖啡廳吧台向店員點一杯特調飲品。' });

// ============ 9. Voice / gender overrides (default A=male, B=female) ============
voice('聲線與角色性別不符 → 加 voice 覆寫', {
  // 264: B is "the famous boyfriend"
  '264-2': 'male', '264-4': 'male',
  // 275 / 282: A is mom
  '275-1': 'female', '275-3': 'female', '275-5': 'female',
  '282-1': 'female', '282-3': 'female', '282-5': 'female',
  // 271 / 283: B is the child
  '271-2': 'child', '271-4': 'child',
  '283-2': 'child', '283-4': 'child',
  // 292: child sets the table (B)
  '292-2': 'child', '292-4': 'child',
  // 295: A is the child, B is dad
  '295-1': 'child', '295-3': 'child', '295-5': 'child',
  '295-2': 'male', '295-4': 'male',
  // 299: A is mom, B is the child
  '299-1': 'female', '299-3': 'female', '299-5': 'female',
  '299-2': 'child', '299-4': 'child',
  // 262 (new): B is the niece → default female OK; 186 (new) neutral
});

// ============ 10. Illustration mismatches → new prompt + [REGEN] ============
const REGEN = {
  303: 'a chibi young adult at home talking on a smartphone to book a karaoke room, and a chibi KTV clerk answering the phone at a front desk, a private karaoke room with microphones and a big screen visible through a doorway',
  365: 'a chibi diner at home by a rainy window calling on a smartphone, and a chibi restaurant staff member on the phone holding up a black umbrella taken from a lost-and-found box',
  331: 'a chibi adult pedestrian calling on a phone at a real city intersection in the United States, two full-size cars with a minor fender-bender and a dented bumper, traffic lights and a street sign without readable text',
  280: 'a chibi adult at home on the phone pointing at a Wi-Fi router with blinking red lights, and a chibi customer service agent wearing a headset typing at a computer',
  125: 'a chibi office worker in a car stuck in a long traffic jam talking on a hands-free phone, and a chibi manager at an office desk answering the call',
  82: 'a chibi customer handing a Taiwanese five-hundred NT dollar bill to a chibi convenience store cashier, who gives back a one-hundred NT dollar bill and coins as change, snacks on the counter',
  46: 'a chibi customer sitting on a stool at a bright cafe counter while a chibi barista prepares a passion fruit soda with ice and mint in a tall glass, pastries in a display case, coffee machine behind, no alcohol',
  317: 'a chibi surf instructor in a full wetsuit showing a chibi adult beginner in a long-sleeve rash guard and board shorts how to push up on a surfboard lying on the sand, gentle waves behind, adult proportions',
};
for (const [id, p] of Object.entries(REGEN)) meta(+id, '插圖與（修正後）對話不符 → 重寫 image_prompt_en ＋ [REGEN]', { image_prompt_en: p + ' [REGEN]' });

// ---------- write ----------
fs.writeFileSync(FILE, JSON.stringify(s, null, 1));

// ---------- stats + checks ----------
const endThank = a => a.filter(x => /thank/i.test(x.lines[4].en)).length;
const perfect = a => a.reduce((n, x) => n + x.lines.filter(l => /perfect/i.test(l.en)).length, 0);
const origThankIds = orig.filter(x => /thank/i.test(x.lines[4].en)).map(x => x.id);
const rewrittenThank = origThankIds.filter(id => s[id - 1].lines[4].en !== orig[id - 1].lines[4].en).length;
const stats = {
  scenesTouched: log.size,
  newScenes: NEW.length,
  endThankBefore: endThank(orig), endThankAfter: endThank(s), thankEndingsRewritten: rewrittenThank,
  perfectBefore: perfect(orig), perfectAfter: perfect(s),
  regen: Object.keys(REGEN).map(Number),
  voice: [...new Set(s.flatMap(x => x.lines.some(l => l.voice) ? [x.id] : []))],
};
console.log(JSON.stringify(stats));

// ---------- fix log ----------
const out = ['---', 'date: 2026-09-29', 'type: fix-log', 'tags: [daily-english-365, 內容修正]', '---', '',
  '# 內容修正紀錄（scripts/apply-review-fixes.cjs）', '',
  `- 修改情境數：${stats.scenesTouched}`,
  `- 新替換情境：${NEW.length}（${NEW.join(', ')}）`,
  `- 第 5 句含 thank：${stats.endThankBefore} → ${stats.endThankAfter}（原 ${origThankIds.length} 則中改寫 ${rewrittenThank} 則）`,
  `- "Perfect" 出現次數：${stats.perfectBefore} → ${stats.perfectAfter}`,
  `- 標記 [REGEN]：${stats.regen.join(', ')}`,
  `- voice 覆寫：${stats.voice.join(', ')}`,
  '', '> 音檔：凡是 en 有變動或加了 voice 的句子都要重新產生（gen-audio.py 已讀 `voice` 並以文字 hash 判斷是否重產）。插圖：只有 8 則標了 [REGEN]；11 則新情境（見上）的 image_prompt_en 是全新的，也要重畫。',
  '', '| id | 分類 | 標題 | 修正原因 |', '|---|---|---|---|'];
for (const id of [...log.keys()].sort((a, b) => a - b)) {
  const x = s[id - 1];
  out.push(`| ${id} | ${x.category} | ${x.title_en} | ${[...log.get(id)].join('；')} |`);
}
fs.writeFileSync(path.join(ROOT, 'scratch/fix-log.md'), out.join('\n') + '\n');
