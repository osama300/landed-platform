import '@/js/app-shell.js';
import ports from '@/data/ports.json';
import { $, onAction } from '@/js/lib/dom.js';
import { ic } from '@/js/lib/icons.js';
import { store } from '@/js/lib/store.js';
import { onRefresh } from '@/js/lib/bus.js';
import { toast } from '@/js/lib/toast.js';
import { openModal, closeModal } from '@/js/lib/modal.js';
import { moneyText, trendBadge, routeName, boxName } from '@/js/lib/format.js';
import { buildOffers, averageTotal, filteredOffers, AGENTS } from '@/js/services/offers.js';
import { offerRow } from '@/js/components/offer-row.js';
import { compareModal, quoteModal } from '@/js/components/offer-modals.js';
import { sparkline } from '@/js/components/sparkline.js';

const HISTORY = [0.88, 0.9, 0.89, 0.92, 0.94, 0.93, 0.95, 0.97, 0.96, 0.98, 0.99, 1];
const options = (obj, sel) => Object.entries(obj).map(([k, v]) => `<option value="${k}"${k === sel ? ' selected' : ''}>${v.name} · ${v.code}</option>`).join('');

function renderSearch(st) {
  $('#qbar').innerHTML = `
    <label class="field"><span>من ميناء</span><select class="sel" id="from" data-bind="from">${options(ports.origins, st.from)}</select></label>
    <label class="field"><span>إلى ميناء</span><select class="sel" id="to" data-bind="to">${options(ports.destinations, st.to)}</select></label>
    <div class="field"><span>نوع الحاوية</span><div class="seg" role="group" aria-label="نوع الحاوية"><button data-act="box" data-v="20" aria-pressed="${st.box === '20'}">20 قدم</button><button data-act="box" data-v="40" aria-pressed="${st.box === '40'}">40 قدم عالية</button></div></div>
    <label class="field"><span>جاهزية البضاعة</span><select class="sel" id="ready"><option>خلال أسبوع</option><option>خلال أسبوعين</option><option>خلال شهر</option></select></label>
    <button class="btn btn-primary" data-act="refresh">${ic('search')}حدّث الأسعار</button>`;
  $('#rt-title').textContent = routeName(st.from, st.to);
}

function renderMarket(st, all) {
  const avg = averageTotal(st.from, st.to, st.box);
  const series = HISTORY.map((m) => Math.round((avg * m) / 10) * 10);
  const dam = st.to === 'dammam';
  $('#market').innerHTML = `
    <div class="stat"><small>متوسط السعر الشامل لهذا المسار</small><div class="flex items-center justify-between gap-3"><b class="num">${moneyText(avg)}</b>${sparkline(series, 110, 34)}</div><em>${trendBadge(+((series[11] / series[7] - 1) * 100).toFixed(1))} خلال 4 أسابيع</em></div>
    <div class="stat"><small>مؤشر SCFI · خط الخليج</small><b class="num">${moneyText(1847)} <span class="cur">/ TEU</span></b><em>${trendBadge(2.4)} تحديث كل جمعة</em></div>
    <div class="stat"><small>${dam ? 'وضع المسار إلى الدمام' : 'ازدحام ميناء جدة'}</small><b>${dam ? 'عبر جدة + نقل بري' : '+9 أيام انتظار'}</b><em><span class="pill ${dam ? 'bad' : 'warn'}">${dam ? `قيود هرمز · +9 أيام و${moneyText(620)}` : 'ذروة الموسم'}</span></em></div>`;
  $('#rt-sub').textContent = `${boxName(st.box)} · ${all.length} عروض شاملة من ${new Set(all.map((o) => o.agent)).size} وكلاء`;
}

function renderAlertBar(st, all) {
  const target = Math.round((Math.min(...all.map((o) => o.total)) * 0.97) / 10) * 10;
  $('#alertbar').innerHTML = `<div class="flex flex-wrap items-center justify-between gap-3 rounded-card border border-dashed border-brand bg-brand-soft px-4 py-2.5">
    <span class="flex items-center gap-2.5 text-[13.5px] font-semibold text-brand-d">${ic('bell')}نبّهني عندما ينزل أقل سعر شامل عن ${moneyText(target)}</span>
    <button class="btn ${st.alertOn ? 'btn-line' : 'btn-primary'} btn-sm" data-act="alert-toggle">${st.alertOn ? `${ic('check', 'sm')}التنبيه مفعّل` : 'فعّل التنبيه'}</button></div>`;
}

function renderFilters(st, all) {
  const f = st.filters, carriers = [...new Set(all.map((o) => o.carrier))];
  const count = (fn) => all.filter(fn).length;
  const check = (key, label, n) => `<label class="fopt"><input class="check" type="checkbox" data-act="filter" data-k="${key}" ${f[key] ? 'checked' : ''}>${label}<span class="n num">${n}</span></label>`;
  $('#filters').innerHTML = `
    <div class="fgroup"><h4>الخط الملاحي</h4>
      <label class="fopt"><input class="check" type="radio" name="car" data-act="carrier" data-v="all" ${f.carrier === 'all' ? 'checked' : ''}>كل الخطوط<span class="n num">${all.length}</span></label>
      ${carriers.map((c) => `<label class="fopt"><input class="check" type="radio" name="car" data-act="carrier" data-v="${c}" ${f.carrier === c ? 'checked' : ''}><span class="mono text-[12.5px]">${c}</span><span class="n num">${count((o) => o.carrier === c)}</span></label>`).join('')}</div>
    <div class="fgroup"><h4>الرحلة</h4>${check('direct', 'مباشر فقط', count((o) => o.direct))}${check('longFree', '14 يوماً مجانياً أو أكثر', count((o) => o.freeDays >= 14))}</div>
    <div class="fgroup"><h4>الوكيل</h4>${check('verified', `${ic('shield', 'sm')} موثّق فقط`, count((o) => AGENTS[o.agent].verified))}</div>
    <div class="px-4 py-3"><button class="btn btn-ghost btn-sm btn-block" data-act="clear-filters">إزالة الفلاتر</button></div>`;
}

function renderResults(st) {
  const list = filteredOffers();
  $('#toolbar').innerHTML = `<span class="text-[13.5px] text-mute"><b class="num text-ink">${list.length}</b> عرضاً مطابقاً</span>
    <div class="flex items-center gap-2"><span class="text-[13px] text-mute">ترتيب حسب</span><div class="seg" role="group" aria-label="الترتيب">
      ${[['value', 'الأفضل قيمة'], ['price', 'الأرخص'], ['fast', 'الأسرع']].map(([k, l]) => `<button data-act="sort" data-v="${k}" aria-pressed="${st.sort === k}">${l}</button>`).join('')}</div></div>`;
  $('#results').innerHTML = list.length
    ? list.map((o) => offerRow(o)).join('')
    : `<div class="card empty"><b class="text-ink">لا توجد عروض بهذه الفلاتر</b><p class="mb-3.5 mt-1.5">جرّب إزالة بعض الفلاتر لرؤية المزيد.</p><button class="btn btn-line btn-sm" data-act="clear-filters">إزالة الفلاتر</button></div>`;
  const n = st.compare.length;
  $('#cmpbar').innerHTML = n ? `<div class="cmpbar"><div><span><b class="num">${n}</b> عروض للمقارنة</span>
    <button class="btn btn-accent btn-sm" data-act="compare-open" ${n < 2 ? 'disabled' : ''}>${ic('scale', 'sm')}${n < 2 ? 'اختر عرضاً آخر' : 'قارن جنباً إلى جنب'}</button>
    <button class="btn btn-ghost btn-sm" data-act="compare-clear">مسح</button></div></div>` : '';
}

function render() {
  const st = store.get(), all = buildOffers(st.from, st.to, st.box);
  renderSearch(st); renderMarket(st, all); renderAlertBar(st, all); renderFilters(st, all); renderResults(st);
}

const setFilters = (patch) => store.set({ filters: { ...store.get().filters, ...patch } });
const resetCompare = () => store.set({ compare: [], openOffer: null });

onAction({
  box: (el) => { store.set({ box: el.dataset.v }); resetCompare(); render(); },
  sort: (el) => { store.set({ sort: el.dataset.v }); render(); },
  filter: (el) => { setFilters({ [el.dataset.k]: el.checked }); render(); },
  carrier: (el) => { setFilters({ carrier: el.dataset.v }); render(); },
  'clear-filters': () => { setFilters({ direct: false, longFree: false, verified: false, carrier: 'all' }); render(); },
  'offer-open': (el) => { store.set({ openOffer: store.get().openOffer === el.dataset.id ? null : el.dataset.id }); render(); },
  compare: (el) => {
    const cur = store.get().compare, id = el.dataset.id;
    if (el.checked && cur.length >= 3) { el.checked = false; toast('يمكنك مقارنة 3 عروض كحد أقصى'); return; }
    store.set({ compare: el.checked ? [...cur, id] : cur.filter((x) => x !== id) });
    render();
  },
  'compare-open': () => { if (store.get().compare.length >= 2) openModal(compareModal(), { wide: true }); },
  'compare-clear': () => { store.set({ compare: [] }); render(); },
  quote: (el) => openModal(quoteModal(el.dataset.id)),
  qty: (el) => { const q = $('#qtyv'); q.textContent = Math.max(1, Math.min(20, +q.textContent + +el.dataset.d)); },
  'send-quote': () => { closeModal(); toast('تم إرسال طلبك. سيتواصل معك فريق لاندد عبر واتساب خلال 15 دقيقة.'); },
  'alert-toggle': () => { const on = !store.get().alertOn; store.set({ alertOn: on }); render(); toast(on ? 'تم تفعيل تنبيه السعر على هذا المسار.' : 'تم إيقاف تنبيه السعر.'); },
  refresh: () => { toast('تم تحديث الأسعار.'); render(); },
});
document.addEventListener('change', (e) => {
  const key = e.target.dataset?.bind;
  if (!key) return;
  store.set({ [key]: e.target.value }); resetCompare(); render();
});
onRefresh(render);
render();
