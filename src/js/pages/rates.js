import '@/js/app-shell.js';
import '@/css/app-data.css';
import ports from '@/data/ports.json';
import { $, onAction } from '@/js/lib/dom.js';
import { ic } from '@/js/lib/icons.js';
import { c } from '@/js/lib/color.js';
import { store } from '@/js/lib/store.js';
import { onRefresh } from '@/js/lib/bus.js';
import { toast } from '@/js/lib/toast.js';
import { openModal, closeModal } from '@/js/lib/modal.js';
import { money, moneyText, altMoney, trendBadge, routeName, boxName } from '@/js/lib/format.js';
import { buildOffers, AGENTS } from '@/js/services/offers.js';
import { offerRow } from '@/js/components/offer-row.js';
import { compareModal, quoteModal, offerSummaryText } from '@/js/components/offer-modals.js';
import { sparkline } from '@/js/components/sparkline.js';

const HISTORY = [0.88, 0.9, 0.89, 0.92, 0.94, 0.93, 0.95, 0.97, 0.96, 0.98, 0.99, 1];
const options = (obj, sel) => Object.entries(obj).map(([k, v]) => `<option value="${k}"${k === sel ? ' selected' : ''}>${v.name}، ${v.code}</option>`).join('');
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;

let skeleton = false, filtersOpen = false, updatedLabel = 'قبل ساعة';
let drift = {}, flash = {};
store.set({ openOffer: null, whyOffer: null });

/* ---------- data ---------- */

function laneOffers() {
  const st = store.get();
  const all = buildOffers(st.from, st.to, st.box);
  all.forEach((o) => {
    const d = drift[o.id];
    if (d) { o.components.freight += d; o.total += d; }
    if (flash[o.id] != null) o.prevTotal = flash[o.id];
  });
  const min = Math.min(...all.map((o) => o.total));
  all.forEach((o) => { o.cheapest = o.total === min; });
  return all;
}

function visibleOffers(all) {
  const { sort, filters: f } = store.get();
  let l = all.slice();
  if (f.direct) l = l.filter((o) => o.direct);
  if (f.longFree) l = l.filter((o) => o.freeDays >= 14);
  if (f.verified) l = l.filter((o) => AGENTS[o.agent].verified);
  if (f.carrier !== 'all') l = l.filter((o) => o.carrier === f.carrier);
  const by = { price: (a, b) => a.total - b.total, fast: (a, b) => a.days - b.days, value: (a, b) => b.score - a.score };
  return l.sort(by[sort] || by.value);
}

const activeFilterCount = () => { const f = store.get().filters; return [f.direct, f.longFree, f.verified, f.carrier !== 'all'].filter(Boolean).length; };

/* ---------- renderers ---------- */

function renderBand(st, all) {
  $('#rt-title').textContent = routeName(st.from, st.to);
  $('#rt-sub').textContent = `${boxName(st.box)}، ${all.length} عروض شاملة من ${new Set(all.map((o) => o.agent)).size} وكلاء`;
  $('#rt-updated').innerHTML = `<span class="dot live"></span>آخر تحديث للأسعار: ${updatedLabel}`;
  $('#qbar').innerHTML = `
    <label class="field"><span>من ميناء</span><select class="sel" id="from" data-bind="from">${options(ports.origins, st.from)}</select></label>
    <label class="field"><span>إلى ميناء</span><select class="sel" id="to" data-bind="to">${options(ports.destinations, st.to)}</select></label>
    <div class="field"><span>نوع الحاوية</span><div class="seg" role="group" aria-label="نوع الحاوية"><button data-act="box" data-v="20" aria-pressed="${st.box === '20'}">20 قدم</button><button data-act="box" data-v="40" aria-pressed="${st.box === '40'}">40 قدم عالية</button></div></div>
    <label class="field"><span>جاهزية البضاعة</span><select class="sel" id="ready"><option>خلال أسبوع</option><option>خلال أسبوعين</option><option>خلال شهر</option></select></label>
    <button class="btn btn-primary" data-act="refresh">${ic('search')}حدّث الأسعار</button>`;
  const avg = Math.round(mean(all.map((o) => o.total)));
  const series = HISTORY.map((m) => Math.round((avg * m) / 10) * 10);
  const dam = st.to === 'dammam';
  $('#market').innerHTML = `
    <div class="tstat"><small>متوسط السعر الشامل لهذا المسار</small><div class="big"><b>${moneyText(avg)}</b>${sparkline(series, 120, 38, c('aqua'), { area: true })}</div><em>${trendBadge(+((series[11] / series[7] - 1) * 100).toFixed(1))}<span>خلال 4 أسابيع</span></em></div>
    <div class="tstat"><small>مؤشر SCFI لخط الخليج</small><b>${moneyText(1847)} <span class="cur">لكل TEU</span></b><em>${trendBadge(2.4)}<span>يُحدَّث كل جمعة</span></em></div>
    <div class="tstat"><small>${dam ? 'وضع المسار إلى الدمام' : 'ازدحام ميناء جدة'}</small><b>${dam ? 'عبر جدة ثم بري' : '+9 أيام انتظار'}</b><em><span class="flag ${dam ? 'bad' : ''}">${dam ? `قيود هرمز تضيف 9 أيام و${moneyText(620)}` : 'ذروة الموسم'}</span></em></div>`;
}

function renderReco(st, all) {
  const best = all.find((o) => o.best) || all[0];
  if (!best) { $('#reco').innerHTML = ''; return; }
  const a = AGENTS[best.agent], avg = mean(all.map((o) => o.total)), saving = Math.round(avg - best.total);
  const cheapest = all.find((o) => o.cheapest);
  const fasterThan = all.length > 1 ? Math.round((all.filter((o) => o.days > best.days).length / (all.length - 1)) * 100) : 0;
  const target = Math.round((cheapest.total * 0.97) / 10) * 10;
  const reasons = [
    saving > 0 ? `أقل من متوسط المسار بـ ${moneyText(saving)}` : 'قريب من متوسط المسار مع شروط أفضل',
    `${a.verified ? 'وكيل موثّق' : 'وكيل قيد التوثيق'} بتقييم ${a.rating.toFixed(1)} من ${a.shipments.toLocaleString('en-US')} شحنة`,
    `${best.freeDays} أيام مجانية في الميناء${best.direct ? ' ورحلة مباشرة' : ''}، وأسرع من ${fasterThan}% من العروض`,
  ];
  if (!best.cheapest) reasons.push(`الأرخص هو ${AGENTS[cheapest.agent].name} بفارق ${moneyText(best.total - cheapest.total)}، لكنه أبطأ أو أقل مرونة`);
  $('#reco').innerHTML = `
    <div><span class="reco-tag">${ic('star', 'sm')}الأفضل قيمة لهذا المسار</span>
      <div class="reco-agent"><div class="av" style="background:${a.color}">${a.name.charAt(0)}</div><div><b>${a.name}</b><small><span class="carrier">${best.carrier}</span> ${best.service}</small></div></div></div>
    <div class="reco-price"><div>${money(best.total)}</div><small>شامل جميع الرسوم، ${altMoney(best.total)}</small>${saving > 0 ? `<span class="save">وفّر ${moneyText(saving)} عن المتوسط</span>` : ''}</div>
    <ul>${reasons.map((r) => `<li>${ic('check', 'sm')}<span>${r}</span></li>`).join('')}</ul>
    <div class="reco-act"><button class="btn btn-primary" data-act="quote" data-id="${best.id}">اطلب هذا السعر</button>
      <button class="btn btn-line btn-sm" data-act="offer-open" data-id="${best.id}" data-scroll="1">عرض تفاصيل السعر</button>
      <button class="reco-alert" data-act="alert-toggle" aria-pressed="${st.alertOn}">${ic('bell', 'sm')}${st.alertOn ? 'تنبيه السعر مفعّل' : `نبّهني إذا نزل أقل سعر عن ${moneyText(target)}`}</button></div>`;
}

function renderSticky(st, all, list) {
  const n = activeFilterCount();
  $('#sticky').innerHTML = `<div class="flex flex-wrap items-baseline gap-x-3 gap-y-1"><b class="route">${routeName(st.from, st.to)}</b><span class="rt-count"><b class="num text-ink">${list.length}</b> من ${all.length} عروض</span></div>
    <div class="flex flex-wrap items-center gap-2"><button class="btn btn-line btn-sm rt-fbtn" data-act="filters-open">${ic('filter', 'sm')}الفلاتر${n ? ` (${n})` : ''}</button>
      <div class="seg" role="group" aria-label="الترتيب">${[['value', 'الأفضل قيمة'], ['price', 'الأرخص'], ['fast', 'الأسرع']].map(([k, l]) => `<button data-act="sort" data-v="${k}" aria-pressed="${st.sort === k}">${l}</button>`).join('')}</div></div>`;
}

function renderFilters(st, all) {
  const f = st.filters, carriers = [...new Set(all.map((o) => o.carrier))];
  const count = (fn) => all.filter(fn).length;
  const check = (key, label, n) => `<label class="fopt"><input class="check" type="checkbox" data-act="filter" data-k="${key}" ${f[key] ? 'checked' : ''}>${label}<span class="n num">${n}</span></label>`;
  const el = $('#filters');
  el.classList.toggle('open', filtersOpen);
  $('#scrim').hidden = !filtersOpen;
  el.innerHTML = `<div class="sheet-h"><span>الفلاتر</span><button class="iconbtn" data-act="filters-close" aria-label="إغلاق">${ic('x')}</button></div>
    <div class="fgroup"><h4>الخط الملاحي</h4>
      <label class="fopt"><input class="check" type="radio" name="car" data-act="carrier" data-v="all" ${f.carrier === 'all' ? 'checked' : ''}>كل الخطوط<span class="n num">${all.length}</span></label>
      ${carriers.map((k) => `<label class="fopt"><input class="check" type="radio" name="car" data-act="carrier" data-v="${k}" ${f.carrier === k ? 'checked' : ''}><span class="mono text-[12.5px]">${k}</span><span class="n num">${count((o) => o.carrier === k)}</span></label>`).join('')}</div>
    <div class="fgroup"><h4>الرحلة</h4>${check('direct', 'مباشر فقط', count((o) => o.direct))}${check('longFree', '14 يوماً مجانياً أو أكثر', count((o) => o.freeDays >= 14))}</div>
    <div class="fgroup"><h4>الوكيل</h4>${check('verified', 'موثّق فقط', count((o) => AGENTS[o.agent].verified))}</div>
    <div class="fgroup"><button class="btn btn-ghost btn-sm btn-block" data-act="clear-filters">إزالة الفلاتر</button></div>`;
}

const skeletonHTML = () => Array.from({ length: 5 }, () => '<div class="sk-row"><div class="sk" style="height:38px;width:38px;border-radius:10px"></div><div style="display:grid;gap:8px"><div class="sk" style="height:12px;width:46%"></div><div class="sk" style="height:10px;width:68%"></div></div><div class="sk" style="height:26px"></div></div>').join('');

function renderResults(st, all, list) {
  $('#results').innerHTML = skeleton ? skeletonHTML()
    : list.length ? list.map((o) => offerRow(o, { all })).join('')
    : `<div class="rt-empty"><b>لا توجد عروض بهذه الفلاتر</b>الفلاتر المفعّلة تستبعد كل عروض هذا المسار.<div class="acts"><button class="btn btn-primary btn-sm" data-act="clear-filters">إزالة الفلاتر</button><button class="btn btn-line btn-sm" data-act="focus-search">جرّب مساراً آخر</button></div></div>`;
  const cmp = st.compare.map((id) => all.find((o) => o.id === id)).filter(Boolean), n = cmp.length;
  $('#cmpbar').innerHTML = n ? `<div class="cmpbar-2"><div><span><b class="num">${n}</b> عروض للمقارنة</span>
    <span class="chips">${cmp.map((o) => `<button class="chip-x" data-act="compare-remove" data-id="${o.id}" aria-label="إزالة ${AGENTS[o.agent].name}">${o.carrier}${ic('x', 'sm')}</button>`).join('')}</span>
    <button class="btn btn-accent btn-sm" data-act="compare-open" ${n < 2 ? 'disabled' : ''}>${ic('scale', 'sm')}${n < 2 ? 'اختر عرضاً آخر' : 'قارن جنباً إلى جنب'}</button>
    <button class="btn btn-ghost btn-sm" data-act="compare-clear">مسح</button></div></div>` : '';
}

function render() {
  const st = store.get(), all = laneOffers(), list = visibleOffers(all);
  renderBand(st, all); renderReco(st, all); renderSticky(st, all, list); renderFilters(st, all); renderResults(st, all, list);
  flash = {};
}

function laneChanged() {
  store.set({ compare: [], openOffer: null, whyOffer: null });
  skeleton = true; render();
  setTimeout(() => { skeleton = false; render(); }, 350);
}

const setFilters = (patch) => store.set({ filters: { ...store.get().filters, ...patch } });

/* ---------- actions ---------- */

onAction({
  box: (el) => { store.set({ box: el.dataset.v }); laneChanged(); },
  sort: (el) => { store.set({ sort: el.dataset.v }); render(); },
  filter: (el) => { setFilters({ [el.dataset.k]: el.checked }); render(); },
  carrier: (el) => { setFilters({ carrier: el.dataset.v }); render(); },
  'clear-filters': () => { setFilters({ direct: false, longFree: false, verified: false, carrier: 'all' }); render(); },
  'filters-open': () => { filtersOpen = true; render(); },
  'filters-close': () => { filtersOpen = false; render(); },
  'focus-search': () => { window.scrollTo({ top: 0, behavior: 'smooth' }); $('#to')?.focus(); },
  'offer-open': (el) => {
    const id = el.dataset.id;
    store.set({ openOffer: store.get().openOffer === id ? null : id });
    render();
    if (el.dataset.scroll) document.querySelector(`[data-oid="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  },
  why: (el) => { store.set({ whyOffer: store.get().whyOffer === el.dataset.id ? null : el.dataset.id }); render(); },
  compare: (el) => {
    const cur = store.get().compare, id = el.dataset.id;
    if (el.checked && cur.length >= 3) { el.checked = false; toast('يمكنك مقارنة 3 عروض كحد أقصى'); return; }
    store.set({ compare: el.checked ? [...cur, id] : cur.filter((x) => x !== id) });
    render();
  },
  'compare-remove': (el) => { store.set({ compare: store.get().compare.filter((x) => x !== el.dataset.id) }); render(); },
  'compare-open': () => { if (store.get().compare.length >= 2) openModal(compareModal(), { wide: true }); },
  'compare-clear': () => { store.set({ compare: [] }); render(); },
  quote: (el) => openModal(quoteModal(el.dataset.id)),
  qty: (el) => { const q = $('#qtyv'); q.textContent = Math.max(1, Math.min(20, +q.textContent + +el.dataset.d)); },
  'send-quote': () => { closeModal(); toast('تم إرسال طلبك. سيتواصل معك فريق لاندد عبر واتساب خلال 15 دقيقة.'); },
  'copy-quote': async (el) => {
    const o = laneOffers().find((x) => x.id === el.dataset.id);
    try { await navigator.clipboard.writeText(offerSummaryText(o)); toast('تم نسخ ملخص العرض.'); } catch { toast('تعذّر النسخ، انسخ الملخص يدوياً.'); }
  },
  'offer-alert': (el) => {
    const cur = store.get().offerAlerts || [], id = el.dataset.id, on = !cur.includes(id);
    store.set({ offerAlerts: on ? [...cur, id] : cur.filter((x) => x !== id) });
    render();
    const o = laneOffers().find((x) => x.id === id);
    toast(on ? `سنراسلك إذا نزل سعر ${AGENTS[o.agent].name} عن ${Math.round(o.total * 0.97).toLocaleString('en-US')} دولار.` : 'تم إيقاف التنبيه على هذا العرض.');
  },
  'alert-toggle': () => { const on = !store.get().alertOn; store.set({ alertOn: on }); render(); toast(on ? 'تم تفعيل تنبيه السعر على هذا المسار.' : 'تم إيقاف تنبيه السعر.'); },
  refresh: () => {
    laneOffers().forEach((o) => {
      const delta = Math.round(((Math.random() - 0.5) * 0.03 * o.total) / 10) * 10;
      if (delta) { flash[o.id] = o.total; drift[o.id] = (drift[o.id] || 0) + delta; }
    });
    updatedLabel = 'الآن';
    render();
    toast('تم تحديث الأسعار.');
  },
});

document.addEventListener('change', (e) => {
  const key = e.target.dataset?.bind;
  if (!key) return;
  store.set({ [key]: e.target.value });
  drift = {};
  laneChanged();
});
document.addEventListener('click', (e) => {
  if (store.get().whyOffer && !e.target.closest('.why, .why-btn')) { store.set({ whyOffer: null }); render(); }
  if (e.target.id === 'scrim') { filtersOpen = false; render(); }
});
document.addEventListener('keydown', (e) => {
  const typing = /INPUT|SELECT|TEXTAREA/.test(e.target.tagName);
  if (e.key === '/' && !typing) { e.preventDefault(); $('#from')?.focus(); }
  if (e.key === 'Escape') {
    if (filtersOpen) { filtersOpen = false; render(); }
    if (store.get().whyOffer) { store.set({ whyOffer: null }); render(); }
  }
});

onRefresh(render);
render();
