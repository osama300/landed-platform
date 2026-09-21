import '@/js/app-shell.js';
import ports from '@/data/ports.json';
import { $, onAction } from '@/js/lib/dom.js';
import { ic } from '@/js/lib/icons.js';
import { store } from '@/js/lib/store.js';
import { onRefresh } from '@/js/lib/bus.js';
import { toast } from '@/js/lib/toast.js';
import { routeName, boxName, containerNo, dayOffset } from '@/js/lib/format.js';
import { SHIPMENTS, STATUSES, daysToArrival, freeDaysLeft, timeline } from '@/js/services/shipments.js';
import { routeMap } from '@/js/components/route-map.js';

let query = (new URLSearchParams(location.search).get('q') || '').trim();
let filter = 'all';
const eta = (s) => (s.progress >= 1 ? 'وصلت' : daysToArrival(s) <= 1 ? 'غداً' : dayOffset(daysToArrival(s)));

function visible() {
  const q = query.replace(/\s/g, '').toLowerCase();
  return SHIPMENTS.filter((s) => (filter === 'all' || s.status === filter || (filter === 'transit' && s.status === 'origin')) && (!q || s.id.toLowerCase().includes(q)));
}

function renderStats() {
  const n = (st) => SHIPMENTS.filter((s) => s.status === st).length;
  const stat = (label, value, dot) => `<div class="stat"><small>${label}</small><b class="num">${value}</b><em class="flex items-center gap-1.5">${dot ? `<span class="xdot"></span><span class="text-bad">${dot}</span>` : '&nbsp;'}</em></div>`;
  $('#tstats').innerHTML = stat('كل الحاويات', SHIPMENTS.length) + stat('في البحر', n('transit') + n('origin')) + stat('تصل قريباً', n('arriving'), 'تصل خلال 46 ساعة') + stat('في الميناء', n('atport'), 'بقي يوم مجاني واحد');
}

function renderList(list) {
  const chips = [['all', 'الكل'], ['transit', 'في البحر'], ['arriving', 'تصل قريباً'], ['atport', 'في الميناء']];
  $('#tlist').innerHTML = `<div class="flex flex-col gap-3 border-b border-line p-3">
      <label class="relative block">${ic('search', 'pointer-events-none absolute start-3 top-3 text-mute')}<input id="tq" class="input ps-9" type="search" placeholder="رقم الحاوية…" value="${query}" aria-label="بحث برقم الحاوية"></label>
      <div class="flex flex-wrap gap-1.5">${chips.map(([k, l]) => `<button class="chip" data-act="tfilter" data-v="${k}" aria-pressed="${filter === k}">${l}</button>`).join('')}</div></div>
    <div class="clist" id="clist">${list.length ? list.map((x) => { const t = STATUSES[x.status]; return `<button class="ci" data-act="pick" data-id="${x.id}" ${x.id === store.get().trackId ? 'aria-current="true"' : ''}><div class="t1"><b class="mono">${containerNo(x.id)}</b><span class="pill ${t.tone}">${t.label}</span></div><div class="t2"><span>${routeName(x.from, x.to)}</span><span class="num">${eta(x)}</span></div><div class="prog ${x.status === 'atport' ? 'late' : ''}"><i style="width:${Math.round(Math.min(1, x.progress) * 100)}%"></i></div></button>`; }).join('') : '<div class="empty">لا توجد حاويات مطابقة.</div>'}</div>`;
}

function renderMain(s) {
  const st = STATUSES[s.status], dam = s.to === 'dammam', inport = s.status === 'atport', free = freeDaysLeft(s), days = daysToArrival(s);
  const events = timeline(s);
  $('#tmap').innerHTML = routeMap(s.id);
  $('#tdetail').innerHTML = `<div class="det"><div>
      <div class="mb-4 flex flex-wrap items-start justify-between gap-2.5"><div><b class="mono text-[18px]">${containerNo(s.id)}</b><div class="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-mute"><span class="carrier">${s.carrier}</span><bdi>${s.vessel}</bdi><span class="pill">${boxName(s.box)}</span></div></div><span class="pill ${st.tone}">${st.label}</span></div>
      <ul class="evs">${events.map((e) => `<li class="${e.done ? 'done' : e.current ? 'now' : 'todo'}"><span class="k">${e.done ? ic('check', 'sm').replace('class="ic sm"', 'class="ic sm" style="width:12px;height:12px;stroke-width:3"') : ''}</span><div><b>${e.label}</b><small>${e.done ? dayOffset(e.offset) : `متوقع ${dayOffset(e.offset)}`}</small></div></li>`).join('')}</ul></div>
    <div><small class="text-xs text-mute">الوصول المتوقع</small><div class="text-2xl font-bold leading-snug">${eta(s)}</div>
      <div class="text-[13px] text-mute">${s.progress >= 1 ? `في ${ports.destinations[s.to].name}` : `إلى ${ports.destinations[s.to].name} · بعد ${days} يوماً`}</div>
      <div class="freebox"><div class="flex items-baseline justify-between"><b>الأيام المجانية</b><span class="num font-bold ${free <= 1 && inport ? 'text-bad' : ''}">${free} ${inport ? 'متبقية' : 'أيام'}</span></div>
        <div class="meter"><i style="width:${inport ? (s.daysInPort / s.freeDays) * 100 : 0}%;background:rgb(var(--c-${free <= 1 ? 'bad' : 'warn'}))"></i></div>
        <p class="mt-2 text-xs text-mute">${inport ? 'بعد الأيام المجانية: 280 ر.س لكل يوم. ابدأ التخليص اليوم.' : 'تبدأ الأيام المجانية عند تفريغ الحاوية في الميناء.'}</p></div>
      ${s.status === 'arriving' ? `<div class="hint mt-3.5">${ic('clock')}<span>تصل خلال 46 ساعة. ابدأ إجراءات الفسح الآن لتجنب الأرضيات.</span></div>` : ''}
      ${dam ? `<div class="hint mt-3.5 !bg-warn-soft !text-warn">${ic('truck')}<span>الوجهة الدمام: تصل عبر جدة ثم نقل بري نحو 1,400 كم بسبب قيود مضيق هرمز.</span></div>` : ''}
      <button class="btn btn-line btn-block mt-3.5" data-act="notify">${ic('bell', 'sm')}أبلغني عند أي تحديث</button></div></div>`;
}

function render() {
  renderStats();
  const list = visible();
  if (list.length && !list.some((s) => s.id === store.get().trackId)) store.set({ trackId: list[0].id });
  renderList(list);
  renderMain(SHIPMENTS.find((s) => s.id === store.get().trackId) ?? SHIPMENTS[0]);
}

onAction({
  pick: (el) => { store.set({ trackId: el.dataset.id }); render(); },
  tfilter: (el) => { filter = el.dataset.v; render(); },
  notify: () => toast('سنراسلك عند أي تحديث على هذه الحاوية.'),
});
document.addEventListener('click', (e) => {
  const marker = e.target.closest('[data-pick]');
  if (marker) { store.set({ trackId: marker.getAttribute('data-pick') }); render(); }
});
document.addEventListener('input', (e) => {
  if (e.target.id !== 'tq') return;
  query = e.target.value; render();
  const input = $('#tq'); input.focus(); input.setSelectionRange(input.value.length, input.value.length);
});
onRefresh(render);
render();
