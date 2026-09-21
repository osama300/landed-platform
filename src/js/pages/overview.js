import '@/js/app-shell.js';
import '@/css/app-data.css';
import { $, onAction } from '@/js/lib/dom.js';
import { ic } from '@/js/lib/icons.js';
import { c } from '@/js/lib/color.js';
import { store } from '@/js/lib/store.js';
import { onRefresh } from '@/js/lib/bus.js';
import { url } from '@/js/lib/url.js';
import { closesAt, tickCountdowns } from '@/js/lib/countdown.js';
import { FX, moneyText, trendBadge, routeName, boxName, containerNo, dayOffset, longDate } from '@/js/lib/format.js';
import { SHIPMENTS, STATUSES, daysToArrival, freeDaysLeft } from '@/js/services/shipments.js';
import { DEALS, dealSaving, dealsByClosing } from '@/js/services/deals.js';
import { WATCHLIST, watchSeries, pctChange } from '@/js/services/market.js';
import { buildOffers } from '@/js/services/offers.js';
import { sparkline } from '@/js/components/sparkline.js';
import { drawTrend } from '@/js/components/trend-chart.js';
import { routeMap } from '@/js/components/route-map.js';

const DEMURRAGE_SAR = 280;
const perDay = () => moneyText(DEMURRAGE_SAR / FX);
const go = (path) => { location.href = url(path); };
const openShip = (id) => { store.set({ trackId: id }); go(url('/app/tracking.html')); };

/* ---------- attention queue, sorted by urgency ---------- */

function queue() {
  const risk = SHIPMENTS.find((s) => s.status === 'atport' && freeDaysLeft(s) <= 1);
  const arriving = SHIPMENTS.find((s) => s.status === 'arriving');
  const deal = dealsByClosing(DEALS)[0];
  return [
    arriving && { u: 100, sev: 'crit', label: 'عاجل', icon: 'clock', tone: 'bad', title: `ابدأ التخليص لحاوية <span class="mono">${containerNo(arriving.id)}</span>`, body: 'تصل ميناء جدة بعد 46 ساعة. الهيئة توجّه لبدء الفسح قبل الوصول بـ 48 ساعة.', cta: 'ابدأ التخليص', run: () => openShip(arriving.id) },
    risk && { u: 90, sev: 'crit', label: 'عاجل', icon: 'anchor', tone: 'warn', title: 'بقي يوم مجاني واحد', body: `<span class="mono">${containerNo(risk.id)}</span> في ميناء جدة منذ ${risk.daysInPort} أيام. بعد ذلك ${perDay()} عن كل يوم.`, cta: 'افتح العدّاد', run: () => openShip(risk.id) },
    deal && { u: 60, sev: 'soon', label: `يقفل خلال ${deal.closesInHours} ساعة`, icon: 'zap', tone: 'accent', title: `صفقة ${routeName(deal.from, deal.to)} بخصم ${moneyText(dealSaving(deal))}`, body: `${deal.left} حاويات متبقية على ${deal.carrier}. من يصل أولاً يحجز.`, cta: 'عرض الصفقة', run: () => go(url('/app/deals.html')) },
    { u: 30, sev: 'info', label: 'للعلم', icon: 'trend', tone: 'info', title: 'ارتفع سعر الأفق اللوجستية 3.8%', body: 'على مسار شنجن إلى جدة، والموسم المرتفع يقترب.', cta: 'قارن الآن', run: () => go(url('/app/rates.html')) },
  ].filter(Boolean).sort((a, b) => b.u - a.u);
}
let items = [];

/* ---------- renderers ---------- */

function renderBand() {
  const w = WATCHLIST[0], s = watchSeries(w), d4 = pctChange(s, 4);
  const n = (st) => SHIPMENTS.filter((x) => x.status === st).length;
  const soon = SHIPMENTS.filter((x) => x.progress < 1 && daysToArrival(x) <= 7);
  const risk = SHIPMENTS.filter((x) => x.status === 'atport' && freeDaysLeft(x) <= 1);
  const crit = items.filter((i) => i.sev === 'crit').length;
  $('#hello-sub').textContent = longDate();
  $('#exc').innerHTML = crit ? `<i></i><span>${crit} عناصر تحتاج قراراً اليوم</span>` : '';
  const kpi = (label, value, sub, cls = '', dot = false) => `<div class="kp ${cls}"><small>${label}</small><b>${value}</b><em>${dot ? '<i class="xd"></i>' : ''}<span>${sub}</span></em></div>`;
  $('#kpis').innerHTML =
    kpi('حاويات نشطة', SHIPMENTS.length, `${n('transit') + n('origin')} في البحر، ${n('arriving')} تصل قريباً، ${n('atport')} في الميناء`) +
    kpi('تصل خلال 7 أيام', soon.length, soon.length ? `أقربها ${containerNo(soon[0].id)}` : 'لا شحنات قريبة') +
    kpi('أيام مجانية توشك على النفاد', risk.length, risk.length ? `<span class="mono">${containerNo(risk[0].id)}</span> بقي يوم واحد` : 'لا شحنات معرّضة', risk.length ? 'risk' : '', risk.length > 0) +
    kpi('تكلفة الأرضيات لكل يوم', perDay(), 'تبدأ غداً إن لم تُسحب الحاوية') +
    kpi('متوسط شنجن إلى جدة', moneyText(s.at(-1)), `${trendBadge(+d4.toFixed(1))} خلال 4 أسابيع`);
}

function renderAttention() {
  $('#attention').innerHTML = `<div class="pnl-h"><h3>${ic('bell')}يحتاج انتباهك</h3><span class="text-[13px] text-mute">مرتّب حسب الأهمية</span></div>
    <ul class="aq">${items.map((a, i) => `<li><span class="ico tint-${a.tone}">${ic(a.icon)}</span>
      <div><b>${a.title}<span class="urg ${a.sev}">${a.label}</span></b><span class="d">${a.body}</span></div>
      <button class="btn ${a.sev === 'crit' ? 'btn-primary' : 'btn-line'} btn-sm" data-act="attention" data-i="${i}">${a.cta}</button></li>`).join('')}</ul>`;
}

function ring(left, total, active) {
  const R = 15, C = 2 * Math.PI * R, tone = !active ? 'line2' : left <= 1 ? 'bad' : left <= 3 ? 'warn' : 'good';
  return `<span class="ring"><svg width="38" height="38" viewBox="0 0 38 38" aria-hidden="true"><circle cx="19" cy="19" r="${R}" fill="none" stroke="${c('surface2')}" stroke-width="4"/><circle cx="19" cy="19" r="${R}" fill="none" stroke="${c(tone)}" stroke-width="4" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - left / total)).toFixed(1)}"/></svg><b>${left}</b></span>`;
}

function renderShips() {
  const rows = SHIPMENTS.map((s) => {
    const st = STATUSES[s.status], d = daysToArrival(s), left = freeDaysLeft(s), atport = s.status === 'atport';
    const over = Math.max(0, s.daysInPort - s.freeDays);
    const dem = atport ? (over ? `<b class="text-bad">${moneyText((over * DEMURRAGE_SAR) / FX)}</b>` : `<span class="text-mute">لم تبدأ</span><span class="eta-days">${perDay()} لكل يوم بعد ${left} يوم</span>`) : '<span class="text-mute">بعد التفريغ</span>';
    return `<tr class="click" data-act="open-shipment" data-id="${s.id}"><td><b class="mono">${containerNo(s.id)}</b><span class="eta-days">${boxName(s.box)}</span></td><td>${routeName(s.from, s.to)}<span class="eta-days">${s.carrier}، ${s.vessel}</span></td><td><span class="pill ${st.tone}">${st.label}</span><div class="prog ${atport ? 'late' : ''}"><i style="width:${Math.round(Math.min(1, s.progress) * 100)}%"></i></div></td>
      <td class="num">${s.progress >= 1 ? 'وصلت' : d <= 1 ? 'غداً' : dayOffset(d)}<span class="eta-days">${s.progress >= 1 ? '' : `بعد ${d} يوماً`}</span></td>
      <td>${ring(left, s.freeDays, atport)}</td><td>${dem}</td></tr>`;
  }).join('');
  $('#ships').innerHTML = `<div class="pnl-h"><h3>${ic('ship')}شحناتي النشطة</h3><a class="btn btn-ghost btn-sm" href="${url('/app/tracking.html')}">عرض الخريطة</a></div>
    <div class="overflow-x-auto"><table class="tbl"><thead><tr><th>الحاوية</th><th>المسار</th><th>الحالة والتقدم</th><th>الوصول</th><th>أيام مجانية</th><th>الأرضيات</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function trendData() {
  const w = WATCHLIST.find((x) => x.id === store.get().watch) ?? WATCHLIST[0];
  const offers = buildOffers(w.from, w.to, w.box), totals = offers.map((o) => o.total);
  const scale = (v) => w.history.map((m) => Math.round((v * m) / 10) * 10);
  return { w, series: watchSeries(w), band: { min: scale(Math.min(...totals)), max: scale(Math.max(...totals)) } };
}

function renderTrend() {
  const { w, series, band } = trendData(), now = series.at(-1);
  $('#trend').innerHTML = `<div class="pnl-h"><h3>${ic('trend')}اتجاه السعر الشامل خلال 12 أسبوعاً</h3><div class="seg" role="group" aria-label="المسار">${WATCHLIST.map((x) => `<button data-act="watch" data-id="${x.id}" aria-pressed="${x.id === w.id}">${routeName(x.from, x.to)}</button>`).join('')}</div></div>
    <div class="flex flex-wrap items-end gap-x-8 gap-y-2 px-5 pb-1"><div><small class="text-xs text-mute">متوسط الوكلاء الآن، ${boxName(w.box)}</small><div class="fd num text-[30px] font-semibold leading-tight">${moneyText(now)}</div></div><div>${trendBadge(+pctChange(series, 11).toFixed(1))}<div class="text-xs text-mute">منذ 12 أسبوعاً</div></div></div>
    <div class="chart-legend" style="margin-top:8px"><span style="color:rgb(var(--c-brand))"><i></i>متوسط الوكلاء</span><span><i class="band"></i>بين أقل سعر وأعلى سعر</span><span style="color:rgb(var(--c-warn))"><i class="dash"></i>آخر شحنة دفعتها</span></div>
    <div class="chartbox" id="trendbox"></div>
    <div class="hint" style="margin:0 20px 18px">${ic('info')}<span>الأسعار ترتفع منذ 3 أسابيع، وموسم الذروة يبدأ خلال 10 أيام تقريباً. الحجز المبكر قد يوفر عليك.</span></div>`;
  drawTrend($('#trendbox'), series, w.paid, band);
}

function renderSide() {
  const st = store.get(), sel = SHIPMENTS.find((s) => s.id === st.trackId) ?? SHIPMENTS[0];
  $('#mapcard').innerHTML = `<div class="pnl-h" style="color:#fff"><h3><span style="color:rgb(var(--c-aqua))">${ic('pin')}</span>حاوياتك على الخريطة</h3></div>
    <div class="map-scroll">${routeMap(sel.id)}</div>
    <div class="foot"><span><b class="mono">${containerNo(sel.id)}</b> <span style="color:rgb(var(--c-navMute))">${routeName(sel.from, sel.to)}</span></span><a href="${url('/app/tracking.html')}">فتح التتبع</a></div>`;
  $('#mini-deals').innerHTML = `<div class="plain-h"><h3>${ic('zap')}صفقات على مساراتي</h3><a class="btn btn-ghost btn-sm" href="${url('/app/deals.html')}">الكل</a></div>
    <ul class="dl2">${dealsByClosing(DEALS).slice(0, 3).map((d) => `<li><div class="r1"><span>${routeName(d.from, d.to)}، ${d.box} قدم</span><span class="num">${moneyText(d.dealPrice)}</span></div><div class="r2"><span>${d.carrier}، وفّر ${moneyText(dealSaving(d))}</span><span class="cd" data-until="${closesAt(d.closesInHours)}"></span></div></li>`).join('')}</ul>`;
  $('#watch').innerHTML = `<div class="plain-h"><h3>${ic('eye')}المسارات التي أتابعها</h3><a class="btn btn-ghost btn-sm" href="${url('/app/rates.html')}">${ic('plus', 'sm')}مسار</a></div>
    <ul class="wl2">${WATCHLIST.map((x) => { const s = watchSeries(x), d = pctChange(s, 4); return `<li data-act="watch" data-id="${x.id}" ${x.id === st.watch ? 'aria-current="true"' : ''}><div><b>${routeName(x.from, x.to)}</b><small>${boxName(x.box)}، متوسط ${moneyText(s.at(-1))}</small></div>${sparkline(s, 76, 28, d > 0 ? c('bad') : c('good'))}${trendBadge(+d.toFixed(1))}</li>`; }).join('')}</ul>`;
}

function render() {
  items = queue();
  renderBand(); renderAttention(); renderShips(); renderTrend(); renderSide(); tickCountdowns();
}

onAction({
  'open-shipment': (el) => openShip(el.dataset.id),
  watch: (el) => { store.set({ watch: el.dataset.id }); renderTrend(); renderSide(); tickCountdowns(); },
  attention: (el) => items[+el.dataset.i]?.run(),
});
let resizeTimer;
window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(renderTrend, 150); });
onRefresh(render);
render();
