import '@/js/app-shell.js';
import alerts from '@/data/alerts.json';
import { $, onAction } from '@/js/lib/dom.js';
import { ic } from '@/js/lib/icons.js';
import { store } from '@/js/lib/store.js';
import { onRefresh } from '@/js/lib/bus.js';
import { toast } from '@/js/lib/toast.js';
import { closesAt } from '@/js/lib/countdown.js';
import { tickCountdowns } from '@/js/lib/countdown.js';
import { moneyText, trendBadge, routeName, boxName, containerNo, dayOffset, longDate } from '@/js/lib/format.js';
import { SHIPMENTS, STATUSES, daysToArrival, freeDaysLeft } from '@/js/services/shipments.js';
import { DEALS, dealSaving, dealsByClosing } from '@/js/services/deals.js';
import { WATCHLIST, watchSeries, pctChange } from '@/js/services/market.js';
import { sparkline } from '@/js/components/sparkline.js';
import { drawTrend } from '@/js/components/trend-chart.js';
import { c } from '@/js/lib/color.js';
import { url } from '@/js/lib/url.js';

const attention = [
  { icon: 'clock', tone: 'bad', title: 'ابدأ التخليص الآن', body: `الحاوية <span class="mono">MSKU 482193 7</span> تصل ميناء جدة بعد 46 ساعة. الهيئة توجّه لبدء الفسح قبل الوصول بـ 48 ساعة.`, cta: 'ابدأ التخليص', track: 'MSKU4821937' },
  { icon: 'anchor', tone: 'warn', title: 'بقي يوم مجاني واحد', body: `<span class="mono">CMAU 730551 8</span> في ميناء جدة منذ 6 أيام. بعد ذلك 280 ر.س لكل يوم.`, cta: 'افتح العدّاد', track: 'CMAU7305518' },
  { icon: 'zap', tone: 'accent', title: 'صفقة على مسارك', body: 'شنجن ← جدة 40 قدم بخصم كبير. يقفل الحجز بعد يومين.', cta: 'عرض الصفقة', href: url('/app/deals.html') },
  { icon: 'trend', tone: 'info', title: 'ارتفع السعر 3.8%', body: 'الأفق اللوجستية على شنجن ← جدة. الموسم المرتفع يقترب.', cta: 'قارن الآن', href: url('/app/rates.html') },
];

function renderStats() {
  const w = WATCHLIST[0], s = watchSeries(w), now = s.at(-1), d4 = pctChange(s, 4);
  const stat = (label, value, sub, dot) => `<div class="stat"><small>${label}</small><b class="num">${value}</b><em class="flex items-center gap-1.5">${dot ? `<span class="xdot"></span><span class="text-bad">${dot}</span>` : sub}</em></div>`;
  $('#stats').innerHTML =
    stat('حاويات نشطة', SHIPMENTS.length, 'من 3 وكلاء') +
    stat('تصل خلال 7 أيام', SHIPMENTS.filter((x) => daysToArrival(x) <= 7).length, 'MSKU 482193 7 أقربها', '') +
    stat('أيام مجانية معرّضة للانتهاء', '1', '', 'CMAU 730551 8 · بقي يوم') +
    stat('متوسط شنجن ← جدة', moneyText(now), `${trendBadge(+d4.toFixed(1))} خلال 4 أسابيع`) +
    stat('وفّرته الصفقات هذا الربع', moneyText(1240), 'من صفقتين');
  $('#hello-sub').innerHTML = `${longDate()} · <span class="font-semibold text-bad">2 من العناصر تحتاج انتباهك اليوم</span>`;
}

function renderShips() {
  const rows = SHIPMENTS.map((s) => {
    const st = STATUSES[s.status], d = daysToArrival(s), fl = freeDaysLeft(s);
    return `<tr class="click" data-act="open-shipment" data-id="${s.id}"><td><b class="mono">${containerNo(s.id)}</b><div class="text-xs text-mute">${boxName(s.box)}</div></td><td>${routeName(s.from, s.to)}</td><td>${s.carrier}<div class="text-xs text-mute">${s.vessel}</div></td><td><span class="pill ${st.tone}">${st.label}</span></td><td><div class="prog ${s.status === 'atport' ? 'late' : ''}"><i style="width:${Math.round(Math.min(1, s.progress) * 100)}%"></i></div></td><td class="num">${s.progress >= 1 ? 'وصلت' : d <= 1 ? 'غداً' : dayOffset(d)}</td><td>${s.status === 'atport' ? `<span class="pill ${fl <= 1 ? 'bad' : 'warn'}">${fl} يوم</span>` : `<span class="num text-mute">${fl} أيام</span>`}</td></tr>`;
  }).join('');
  $('#ships').innerHTML = `<div class="card-h"><h3>${ic('ship')}شحناتي النشطة</h3><a class="btn btn-ghost btn-sm" href="${url('/app/tracking.html')}">عرض الخريطة ${ic('arrow', 'sm')}</a></div>
    <div class="overflow-x-auto"><table class="tbl"><thead><tr><th>الحاوية</th><th>المسار</th><th>الخط والسفينة</th><th>الحالة</th><th>التقدم</th><th>الوصول</th><th>الأيام المجانية</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function renderTrend() {
  const st = store.get(), w = WATCHLIST.find((x) => x.id === st.watch) ?? WATCHLIST[0];
  const s = watchSeries(w), now = s.at(-1);
  $('#trend').innerHTML = `<div class="card-h"><h3>${ic('trend')}اتجاه السعر الشامل · 12 أسبوعاً</h3><div class="seg" role="group" aria-label="المسار">${WATCHLIST.map((x) => `<button data-act="watch" data-id="${x.id}" aria-pressed="${x.id === w.id}">${routeName(x.from, x.to)}</button>`).join('')}</div></div>
    <div class="flex flex-wrap items-end gap-8 px-4 pt-4"><div><small class="text-xs text-mute">المتوسط الآن · ${boxName(w.box)}</small><div class="num text-[28px] font-bold leading-snug">${moneyText(now)}</div></div><div>${trendBadge(+pctChange(s, 11).toFixed(1))}<div class="text-xs text-mute">منذ 12 أسبوعاً</div></div></div>
    <div class="chartbox min-h-[270px]" id="trendbox"></div>
    <div class="hint mx-4 mb-4">${ic('info')}<span>الأسعار ترتفع منذ 3 أسابيع، وموسم الذروة يبدأ خلال 10 أيام تقريباً. الحجز المبكر قد يوفر عليك.</span></div>`;
  drawTrend($('#trendbox'), s, w.paid);
}

function renderSide() {
  $('#attention').innerHTML = `<div class="card-h"><h3>${ic('bell')}يحتاج انتباهك</h3><span class="pill bad">${attention.length} تنبيهات</span></div>
    <ul class="att">${attention.map((a, i) => `<li><span class="ico pill ${a.tone} !h-9 !w-9 !justify-center !p-0">${ic(a.icon)}</span><div><b>${a.title}</b><span>${a.body}</span></div><button class="btn btn-line btn-sm" data-act="attention" data-i="${i}">${a.cta}</button></li>`).join('')}</ul>`;
  $('#mini-deals').innerHTML = `<div class="card-h"><h3>${ic('zap')}صفقات على مساراتي</h3><a class="btn btn-ghost btn-sm" href="${url('/app/deals.html')}">الكل</a></div>
    ${dealsByClosing(DEALS).slice(0, 3).map((d) => `<div class="flex flex-col gap-1 border-t border-line px-4 py-2.5 first:border-0"><div class="flex justify-between gap-2 text-[13.5px] font-semibold"><span>${routeName(d.from, d.to)} · ${d.box} قدم</span><span class="num">${moneyText(d.dealPrice)}</span></div><div class="flex justify-between text-xs text-mute"><span>${d.carrier} · وفر ${moneyText(dealSaving(d))}</span><span class="cd !text-[13px]" data-until="${closesAt(d.closesInHours)}"></span></div></div>`).join('')}`;
  $('#watch').innerHTML = `<div class="card-h"><h3>${ic('eye')}المسارات التي أتابعها</h3><a class="btn btn-line btn-sm" href="${url('/app/rates.html')}">${ic('plus', 'sm')}مسار</a></div>
    <ul class="wl">${WATCHLIST.map((x) => { const s = watchSeries(x), d = pctChange(s, 4); return `<li data-act="watch" data-id="${x.id}" ${x.id === (store.get().watch) ? 'style="background:rgb(var(--c-brandSoft))"' : ''}><div><b class="text-[13.5px]">${routeName(x.from, x.to)}</b><small class="block text-xs text-mute">${boxName(x.box)} · متوسط ${moneyText(s.at(-1))}</small></div>${sparkline(s, 76, 28, d > 0 ? c('bad') : c('good'))}${trendBadge(+d.toFixed(1))}</li>`; }).join('')}</ul>`;
}

function render() { renderStats(); renderShips(); renderTrend(); renderSide(); tickCountdowns(); }

onAction({
  'open-shipment': (el) => { store.set({ trackId: el.dataset.id }); location.href = url('/app/tracking.html'); },
  watch: (el) => { store.set({ watch: el.dataset.id }); renderTrend(); renderSide(); },
  attention: (el) => {
    const a = attention[+el.dataset.i];
    if (a.track) { store.set({ trackId: a.track }); location.href = url('/app/tracking.html'); } else location.href = a.href;
  },
});
let resizeTimer;
window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(renderTrend, 150); });
onRefresh(render);
render();
