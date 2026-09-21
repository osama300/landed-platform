import '@/css/main.css';
import ports from '@/data/ports.json';
import marketing from '@/data/marketing.json';
import { $, $$, onAction } from '@/js/lib/dom.js';
import { ic } from '@/js/lib/icons.js';
import { store } from '@/js/lib/store.js';
import { toast } from '@/js/lib/toast.js';
import { closesAt, startCountdowns } from '@/js/lib/countdown.js';
import { money, moneyText, nf, routeName, trendBadge } from '@/js/lib/format.js';
import { buildOffers, averageTotal } from '@/js/services/offers.js';
import { DEALS, dealSaving, dealPercent, dealsByClosing } from '@/js/services/deals.js';
import { AGENTS } from '@/js/services/offers.js';
import { offerRow } from '@/js/components/offer-row.js';
import { routeMap } from '@/js/components/route-map.js';
import { url } from '@/js/lib/url.js';

const options = (obj, sel) => Object.entries(obj).map(([k, v]) => `<option value="${k}"${k === sel ? ' selected' : ''}>${v.name}</option>`).join('');
const boxSeg = (st) => `<div class="seg" role="group" aria-label="نوع الحاوية"><button type="button" data-act="box" data-v="20" aria-pressed="${st.box === '20'}">20 قدم</button><button type="button" data-act="box" data-v="40" aria-pressed="${st.box === '40'}">40 قدم عالية</button></div>`;

function renderHero() {
  const st = store.get();
  $('#hero-search').innerHTML = `<label class="field"><span>من ميناء</span><select class="sel" id="h-from" data-bind="from">${options(ports.origins, st.from)}</select></label>
    <label class="field"><span>إلى ميناء</span><select class="sel" id="h-to" data-bind="to">${options(ports.destinations, st.to)}</select></label>
    <div class="field"><span>نوع الحاوية</span>${boxSeg(st)}</div>
    <button class="btn btn-primary" type="submit">${ic('search')}قارن الأسعار</button>`;
  $('#hero-offers').innerHTML = buildOffers('shenzhen', 'jeddah', '40').sort((a, b) => b.score - a.score).slice(0, 3).map((o) => offerRow(o, { mini: true })).join('');
}

function renderLanes() {
  const lanes = [['shenzhen', 'jeddah'], ['ningbo', 'jeddah'], ['shanghai', 'jeddah'], ['guangzhou', 'jeddah'], ['qingdao', 'jeddah'], ['shanghai', 'dammam']];
  $('#lanes').innerHTML = lanes.map(([f, t]) => {
    const list = buildOffers(f, t, '40'), min = Math.min(...list.map((o) => o.total)), days = list.map((o) => o.days);
    return `<button class="route-card" data-act="lane" data-f="${f}" data-t="${t}"><div class="flex items-center justify-between gap-2"><b class="text-[16px]">${routeName(f, t)}</b><span class="mono text-xs text-mute">${ports.origins[f].code} → ${ports.destinations[t].code}</span></div>
      <div class="flex items-end justify-between gap-3"><div><small class="text-xs text-mute">يبدأ من · 40 قدم</small><div>${money(min)}</div></div><div class="text-end text-[13px] text-ink-2">${Math.min(...days)}–${Math.max(...days)} يوماً<div class="text-xs text-mute">${list.length} عروض</div></div></div></button>`;
  }).join('');
}

function renderVs() {
  const li = (icon, tone, t) => `<li class="flex gap-3 border-t border-line py-3 leading-7 text-ink-2 first:border-0"><span class="${tone} mt-1">${ic(icon, 'sm')}</span><span>${t}</span></li>`;
  const oldList = ['أسعار متفرقة في محادثات واتساب، وتتغير كل بضعة أيام.', 'رسوم الموسم والوقود والحرب تظهر بعد الحجز.', 'مساحات مخفضة تُباع قبل أن تعلم بها.', 'الأيام المجانية تنقضي قبل أن يبدأ التخليص.'];
  const newList = ['سعر شامل واحد لكل وكيل، مرتب ومقارَن، مع تاريخ التحديث.', 'تنبيه عند تغيّر السعر أو ظهور صفقة على مسارك.', 'مساحات فارغة بخصم قبل الإبحار بأيام.', 'تنبيه «ابدأ التخليص» قبل الوصول بـ 48 ساعة وعدّاد للأرضيات.'];
  $('#vs').innerHTML = `<div class="rounded-card border border-line bg-surface-2 p-6"><h3 class="mb-3 flex items-center gap-2.5 text-[17px] font-bold">${ic('x')}اليوم</h3><ul>${oldList.map((t) => li('x', 'text-bad', t)).join('')}</ul></div>
    <div class="rounded-card border border-brand bg-surface p-6 shadow-pop"><h3 class="mb-3 flex items-center gap-2.5 text-[17px] font-bold">${ic('check')}مع لاندد</h3><ul>${newList.map((t) => li('check', 'text-good', t)).join('')}</ul></div>`;
}

function renderRatesDemo() {
  const st = store.get();
  const list = buildOffers(st.from, st.to, st.box).sort((a, b) => b.score - a.score).slice(0, 4);
  $('#rates-demo').innerHTML = `<div class="mb-4 flex flex-wrap items-end gap-3">
      <label class="field min-w-[200px] flex-1"><span>ميناء الشحن</span><select class="sel" id="r-from" data-bind="from">${options(ports.origins, st.from)}</select></label>
      <label class="field min-w-[200px] flex-1"><span>ميناء الوصول</span><select class="sel" id="r-to" data-bind="to">${options(ports.destinations, st.to)}</select></label>
      <div class="field"><span>نوع الحاوية</span>${boxSeg(st)}</div></div>
    <div class="flex flex-col gap-2.5">${list.map((o) => offerRow(o, { nocmp: true })).join('')}</div>
    <p class="mt-3.5 text-[13px] text-mute">بيانات توضيحية للعرض. في المنصة تظهر أسعار الوكلاء الشركاء الفعلية.</p>`;
}

function renderDeals() {
  const list = dealsByClosing(DEALS).slice(0, 4);
  $('#deals-board').innerHTML = `<div class="brow compact head"><span>المسار</span><span>الخط</span><span>يقفل الحجز بعد</span><span>السعر</span><span></span></div>
    ${list.map((d) => `<div class="brow compact"><div><b>${routeName(d.from, d.to)}</b><small>${AGENTS[d.agent].name} · ${d.box} قدم</small></div><div><span class="carrier">${d.carrier}</span></div>
      <div><span class="cd" data-until="${closesAt(d.closesInHours)}"></span></div>
      <div>${money(d.dealPrice)}<div><span class="was">${moneyText(d.marketPrice)}</span> <span class="save">وفر ${dealPercent(d)}%</span></div></div>
      <button class="btn btn-accent btn-sm" data-act="interest">مهتم</button></div>`).join('')}`;
}

let days = 9;
function renderDem() {
  const free = Math.max(0, 7 - days), over = Math.max(0, days - 7);
  $('#dem').innerHTML = `<div class="flex items-center justify-between gap-2.5"><h3 class="text-[16px] font-bold">حاوية وصلت ميناء جدة</h3><span class="pill">مثال توضيحي</span></div>
    <p class="mt-1 text-sm text-mute">حرّك الشريط لترى تكلفة كل يوم بعد انتهاء الأيام المجانية.</p>
    <label class="mt-5 block font-semibold" for="days">أيام الحاوية في الميناء: <span id="dm-d" class="num">${days}</span></label>
    <input id="days" class="h-7 w-full accent-[rgb(var(--c-brand))]" type="range" min="1" max="21" value="${days}">
    <div class="meter" aria-hidden="true"><i id="dm-a" style="width:${(Math.min(days, 7) / 21) * 100}%;background:rgb(var(--c-good))"></i><i id="dm-b" style="width:${(over / 21) * 100}%;background:rgb(var(--c-bad))"></i></div>
    <div class="kp"><div><small class="text-xs text-mute">أيام مجانية متبقية</small><b id="dm-f" class="num" style="color:rgb(var(--c-${free > 0 ? 'good' : 'bad'}))">${free}</b></div><div><small class="text-xs text-mute">تكلفة الأرضيات حتى الآن</small><b id="dm-c" class="num">${nf.format(over * 280)} ر.س</b></div></div>
    <p class="mt-3.5 text-xs text-mute">أرقام افتراضية للتوضيح. تُحسب في المنصة حسب الميناء والخط الملاحي الفعلي.</p>`;
  $('#days').addEventListener('input', (e) => {
    days = +e.target.value;
    const f = Math.max(0, 7 - days), o = Math.max(0, days - 7);
    $('#dm-d').textContent = days; $('#dm-a').style.width = `${(Math.min(days, 7) / 21) * 100}%`; $('#dm-b').style.width = `${(o / 21) * 100}%`;
    $('#dm-f').textContent = f; $('#dm-f').style.color = `rgb(var(--c-${f > 0 ? 'good' : 'bad'}))`; $('#dm-c').textContent = `${nf.format(o * 280)} ر.س`;
  });
}

function renderMap() {
  $('#map-card').innerHTML = `<div class="mapc"><div class="map-scroll">${routeMap('MSKU4821937')}</div>
    <div class="mapleg"><span><i></i>مسار الشحنة</span><span><i class="d"></i>نقل بري للدمام</span><span class="text-bad"><span class="dot"></span>ممر مقيّد</span></div></div>
    <div class="flex flex-wrap items-center justify-between gap-3.5 px-5 py-3.5"><span><b class="mono">MSKU 482193 7</b> <span class="text-mute">· MSC Aurora · شنجن ← جدة</span></span><span class="pill warn">${ic('clock', 'sm')}تصل بعد 46 ساعة</span></div>`;
}

function renderPlans() {
  $('#plans').innerHTML = marketing.plans.map((p) => `<div class="card plan ${p.hot ? 'hot' : ''}">${p.hot ? '<span class="pill accent absolute -top-3 start-6">الأكثر اختياراً</span>' : ''}
    <h3 class="text-[17px] font-bold">${p.name}</h3>
    <div class="flex flex-wrap items-baseline gap-2"><b class="num text-[40px] leading-none">${nf.format(p.price)}</b><span class="text-sm text-mute">ر.س ${p.usd ? `<bdi dir="ltr">(≈ $${p.usd})</bdi>` : ''}</span></div>
    <ul>${p.features.map((f) => `<li>${ic('check', 'sm')}${f}</li>`).join('')}</ul>
    <a class="btn ${p.hot ? 'btn-primary' : 'btn-line'} btn-block" href="${url('/app/')}">${p.cta}</a></div>`).join('');
}

function renderFaq() {
  $('#faq-list').innerHTML = marketing.faq.map((f, i) => `<details${i === 0 ? ' open' : ''}><summary>${f.q}${ic('chev')}</summary><p>${f.a}</p></details>`).join('');
}

const rerenderDemo = () => { renderRatesDemo(); renderHero(); };

onAction({
  box: (el) => { store.set({ box: el.dataset.v }); rerenderDemo(); },
  lane: (el) => { store.set({ from: el.dataset.f, to: el.dataset.t, box: '40' }); location.href = url('/app/rates.html'); },
  interest: () => toast('تم تحويل اهتمامك إلى فريق لاندد عبر واتساب.'),
  partner: () => toast('شكراً لاهتمامك. سيتواصل معك فريق لاندد.'),
});
document.addEventListener('change', (e) => {
  const key = e.target.dataset?.bind;
  if (key) { store.set({ [key]: e.target.value }); rerenderDemo(); }
});
$('#hero-search').addEventListener('submit', (e) => { e.preventDefault(); location.href = url('/app/rates.html'); });
$$('.navlinks a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); document.querySelector(a.getAttribute('href'))?.scrollIntoView({ behavior: 'smooth' }); }));

renderHero(); renderLanes(); renderVs(); renderRatesDemo(); renderDeals(); renderDem(); renderMap(); renderPlans(); renderFaq();
startCountdowns();
