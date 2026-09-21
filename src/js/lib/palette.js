import ports from '@/data/ports.json';
import { SHIPMENTS, STATUSES } from '@/js/services/shipments.js';
import { store } from '@/js/lib/store.js';
import { closeModal } from '@/js/lib/modal.js';
import { containerNo, routeName } from '@/js/lib/format.js';
import { ic } from '@/js/lib/icons.js';
import { url } from '@/js/lib/url.js';

const PAGES = [
  ['نظرة عامة', url('/app/'), 'home'], ['مقارنة الأسعار', url('/app/rates.html'), 'tag'], ['صفقات المساحات', url('/app/deals.html'), 'zap'],
  ['تتبع الحاويات', url('/app/tracking.html'), 'pin'], ['التنبيهات', url('/app/alerts.html'), 'bell'],
];

function catalog() {
  const pages = PAGES.map(([label, href, icon]) => ({ group: 'الصفحات', label, sub: '', icon, run: () => { location.href = href; } }));
  const ships = SHIPMENTS.map((s) => ({ group: 'الحاويات', label: containerNo(s.id), sub: `${routeName(s.from, s.to)}، ${STATUSES[s.status].label}`, icon: 'box', mono: true, key: s.id, run: () => { store.set({ trackId: s.id }); location.href = url('/app/tracking.html'); } }));
  const lanes = Object.keys(ports.origins).flatMap((f) => Object.keys(ports.destinations).map((t) => ({ group: 'مسارات الأسعار', label: routeName(f, t), sub: `${ports.origins[f].code} إلى ${ports.destinations[t].code}`, icon: 'ship', run: () => { store.set({ from: f, to: t }); location.href = url('/app/rates.html'); } })));
  return [...pages, ...ships, ...lanes];
}

export function openPalette() {
  closeModal();
  const all = catalog();
  let shown = all, sel = 0;
  const overlay = document.createElement('div');
  overlay.className = 'ovl'; overlay.id = 'ovl';
  overlay.innerHTML = `<div class="cmdk" role="dialog" aria-modal="true" aria-label="بحث سريع"><input id="cmdk-q" type="text" placeholder="ابحث عن حاوية أو مسار أو صفحة" autocomplete="off"><ul id="cmdk-list"></ul><div class="foot"><span>↑↓ للتنقل</span><span>Enter للفتح</span><span>Esc للإغلاق</span></div></div>`;
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  const input = overlay.querySelector('#cmdk-q'), list = overlay.querySelector('#cmdk-list');
  const draw = () => {
    let last = '';
    list.innerHTML = shown.slice(0, 14).map((it, i) => {
      const head = it.group !== last ? `<li class="grp">${it.group}</li>` : ''; last = it.group;
      return `${head}<li><button type="button" data-i="${i}" aria-selected="${i === sel}">${ic(it.icon)}<span><b class="${it.mono ? 'mono' : ''}">${it.label}</b>${it.sub ? `<small>${it.sub}</small>` : ''}</span></button></li>`;
    }).join('') || '<li class="grp">لا نتائج مطابقة</li>';
  };
  input.addEventListener('input', () => {
    const q = input.value.replace(/\s/g, '').toLowerCase();
    shown = all.filter((it) => (it.label + it.sub + (it.key || '')).replace(/\s/g, '').toLowerCase().includes(q)); sel = 0; draw();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { sel = Math.min(sel + 1, Math.min(shown.length, 14) - 1); draw(); e.preventDefault(); }
    if (e.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); draw(); e.preventDefault(); }
    if (e.key === 'Enter' && shown[sel]) shown[sel].run();
  });
  list.addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (b) shown[+b.dataset.i].run(); });
  draw(); input.focus();
}
