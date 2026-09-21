import '@/css/main.css';
import '@/css/landing.css';
import '@/css/resource.css';
import data from '@/data/sources.json';
import { $, $$, onAction } from '@/js/lib/dom.js';
import { ic } from '@/js/lib/icons.js';

const { layers, phases, sources } = data;
let layer = 'all';

const links = (list) => list.length
  ? list.map((l) => `<a class="src-link" href="${l.url}" target="_blank" rel="noopener noreferrer">${l.label}${ic('out', 'sm')}</a>`).join('')
  : '<span class="text-xs text-mute">عبر اتفاقية</span>';

const row = (s) => `<li class="src-row">
  <span class="src-rank">${s.rank ?? '—'}</span>
  <div class="min-w-0"><b class="text-[14.5px]">${s.name}</b>${s.native ? ` <span class="text-[13px] text-mute" lang="zh">${s.native}</span>` : ''}<small class="block text-xs text-mute">${s.note}</small></div>
  <span><span class="pill ${layers[s.layer].tone}">${layers[s.layer].name}</span></span>
  <p class="text-[13.5px] leading-6 text-ink-2">${s.covers}</p>
  <div class="src-links">${links(s.links)}</div>
</li>`;

function renderFilters() {
  const used = Object.keys(layers).filter((k) => sources.some((s) => s.layer === k));
  $('#filters').innerHTML = [['all', 'الكل', sources.length], ...used.map((k) => [k, layers[k].name, sources.filter((s) => s.layer === k).length])]
    .map(([k, name, n]) => `<button type="button" class="chip" data-act="layer" data-v="${k}" aria-pressed="${k === layer}">${name}<span class="opacity-70">${n}</span></button>`).join('');
}

function renderGroups() {
  $('#groups').innerHTML = Object.entries(phases).map(([key, ph]) => {
    const list = sources.filter((s) => s.phase === key && (layer === 'all' || s.layer === layer));
    if (!list.length) return '';
    return `<section aria-labelledby="ph-${key}"><div class="mb-2.5 flex flex-wrap items-baseline gap-x-3"><h2 class="text-[17px] font-bold" id="ph-${key}">${ph.name}</h2><span class="text-[13px] text-mute">${ph.hint}</span></div>
      <div class="board"><div class="src-row head" aria-hidden="true"><span>#</span><span>المصدر</span><span>النوع</span><span>ماذا يغطي</span><span>الرابط</span></div><ul>${list.map(row).join('')}</ul></div></section>`;
  }).join('') || '<div class="empty">لا مصادر في هذا التصنيف.</div>';
}

function renderStatic() {
  $('#principle').textContent = data.principle;
  $('#meta').innerHTML = `<span class="inline-flex items-center gap-1.5">${ic('cal', 'sm')}آخر تحديث: ${data.updated}</span><span class="inline-flex items-center gap-1.5">${ic('doc', 'sm')}${sources.length} مصدراً بترتيب الأولوية</span>`;
  $('#flow').innerHTML = data.flow.map((f, i) => `${i ? `<span class="hidden place-items-center text-mute md:grid">${ic('arrow', 'lg')}</span>` : ''}
    <div class="card p-4"><div class="flex items-baseline justify-between gap-2"><b class="text-[15px]">${f.title}</b><small class="text-xs text-mute">${f.sub}</small></div>
      <ul class="mt-2.5 flex flex-col gap-1.5 text-[13.5px] text-ink-2">${f.items.map((t) => `<li class="flex gap-2">${ic('check', 'sm text-brand mt-1')}<span>${t}</span></li>`).join('')}</ul></div>`).join('');
  $('#notes').innerHTML = data.notes.map((n) => `<div class="flex gap-3.5"><span class="ico tint-brand h-10 w-10">${ic(n.icon)}</span><div><b class="block text-[15px]">${n.title}</b><p class="mt-1 text-[13.5px] leading-7 text-ink-2">${n.text}</p></div></div>`).join('');
}

onAction({
  layer: (el) => {
    layer = el.dataset.v;
    $$('#filters .chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.v === layer)));
    renderGroups();
  },
});

const header = $('#site-header');
const onScroll = () => header.classList.toggle('is-solid', window.scrollY > 40);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

renderStatic();
renderFilters();
renderGroups();
