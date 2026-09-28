// 主題 → 背景圖 slug（bg/<slug>.webp）
export const CAT_BG = {
  '交通': 'jiaotong', '餐飲': 'canyin', '購物': 'gouwu', '住宿旅遊': 'zhusu',
  '工作': 'gongzuo', '學校': 'xuexiao', '醫療健康': 'yiliao', '金融郵政': 'jinrong',
  '社交人際': 'shejiao', '家庭生活': 'jiating', '休閒運動': 'xiuxian', '緊急與服務': 'jinji',
};
export const bgFor = cat => `bg/${CAT_BG[cat] || 'generic'}.webp`;

export function setPageBg(url) {
  let el = document.getElementById('pageBg');
  if (!el) { el = document.createElement('div'); el.id = 'pageBg'; document.body.prepend(el); }
  const img = new Image();
  img.onload = () => { el.style.backgroundImage = `url("${url}")`; el.classList.add('show'); };
  img.onerror = () => { el.classList.remove('show'); };
  img.src = url;
}
