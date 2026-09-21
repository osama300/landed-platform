import '@/js/app-shell.js';
import { $, onAction } from '@/js/lib/dom.js';
import { ic } from '@/js/lib/icons.js';
import { store } from '@/js/lib/store.js';
import { onRefresh } from '@/js/lib/bus.js';
import { toast } from '@/js/lib/toast.js';
import { closesAt, tickCountdowns } from '@/js/lib/countdown.js';
import { money, moneyText, routeName, boxName, dayOffset } from '@/js/lib/format.js';
import { AGENTS } from '@/js/services/offers.js';
import { DEALS, dealSaving, dealPercent, dealsByClosing } from '@/js/services/deals.js';

let dest = 'all';

function renderBand() {
  const total = DEALS.reduce((a, d) => a + dealSaving(d), 0), soon = dealsByClosing()[0];
  $('#dband').innerHTML = `<div class="flex flex-wrap items-end justify-between gap-6"><div><h1>مساحات فارغة بخصم قبل الإبحار</h1><p>شركات حجزت مساحة ولم تملأها. من يصل أولاً يحجز.</p></div>
    <div class="flex flex-wrap gap-8"><div class="fig"><b class="num">${DEALS.length}</b><small>صفقات مفتوحة</small></div><div class="fig"><b class="num">${moneyText(total)}</b><small>إجمالي التوفير المتاح</small></div><div class="fig"><b class="cd !text-[26px] !text-crane" data-until="${closesAt(soon.closesInHours)}"></b><small>أقرب إغلاق: ${routeName(soon.from, soon.to)}</small></div></div></div>`;
}

function render() {
  renderBand();
  const interested = store.get().dealsInterested;
  const list = dealsByClosing(DEALS.filter((d) => dest === 'all' || d.to === dest));
  $('#dtool').innerHTML = `<div class="flex flex-wrap gap-2">${[['all', 'كل الوجهات'], ['jeddah', 'جدة'], ['dammam', 'الدمام']].map(([k, l]) => `<button class="chip" data-act="dest" data-v="${k}" aria-pressed="${dest === k}">${l}</button>`).join('')}</div>
    <span class="text-[13.5px] text-mute"><b class="num text-ink">${list.length}</b> صفقات، الأقرب إغلاقاً أولاً</span>`;
  $('#board').innerHTML = `<div class="brow head"><span>المسار</span><span>الخط · السفينة</span><span>الإبحار</span><span>يقفل الحجز بعد</span><span>المتبقي</span><span>السعر</span><span></span></div>
    ${list.map((d) => {
      const on = interested.includes(d.id), urgent = d.closesInHours <= 24;
      return `<div class="brow"><div><b class="text-[14.5px]">${routeName(d.from, d.to)}</b><small class="mt-1 flex items-center gap-1.5"><span class="pill">${boxName(d.box)}</span>${AGENTS[d.agent].name}</small></div>
      <div><span class="carrier">${d.carrier}</span><small class="mt-1">${d.vessel}</small></div>
      <div class="num text-[13.5px] font-semibold">${dayOffset(d.sailIn)}</div>
      <div><span class="cd ${urgent ? '!text-bad' : ''}" data-until="${closesAt(d.closesInHours)}"></span>${urgent ? '<small class="font-semibold text-bad">يقفل قريباً</small>' : ''}</div>
      <div><div class="mb-1 text-[13px]"><b class="num">${d.left}</b> من ${d.of} حاوية</div><div class="left"><i style="width:${Math.min(100, Math.round((d.left / d.of) * 300))}%"></i></div></div>
      <div><div class="flex items-baseline gap-2 whitespace-nowrap">${money(d.dealPrice)}</div><div><span class="was">${moneyText(d.marketPrice)}</span> <span class="save">وفر ${dealPercent(d)}% أي ${moneyText(dealSaving(d))}</span></div></div>
      <button class="btn ${on ? 'btn-line' : 'btn-primary'} btn-sm" data-act="interest" data-id="${d.id}">${on ? `${ic('check', 'sm')}تم الإرسال` : `${ic('msg', 'sm')}مهتم`}</button></div>`;
    }).join('') || '<div class="empty">لا توجد صفقات لهذه الوجهة حالياً.</div>'}`;
  tickCountdowns();
}

onAction({
  dest: (el) => { dest = el.dataset.v; render(); },
  interest: (el) => {
    const cur = store.get().dealsInterested;
    if (!cur.includes(el.dataset.id)) store.set({ dealsInterested: [...cur, el.dataset.id] });
    render();
    toast('تم تحويل اهتمامك إلى فريق لاندد عبر واتساب.');
  },
});
onRefresh(render);
render();
