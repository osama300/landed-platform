import '@/css/main.css';
import '@/css/shell.css';
import alerts from '@/data/alerts.json';
import { $, $$, onAction } from '@/js/lib/dom.js';
import { ic } from '@/js/lib/icons.js';
import { store } from '@/js/lib/store.js';
import { emit } from '@/js/lib/bus.js';
import { toast } from '@/js/lib/toast.js';
import { closeModal } from '@/js/lib/modal.js';
import { startCountdowns } from '@/js/lib/countdown.js';
import { openPalette } from '@/js/lib/palette.js';

/** Shared behaviour of every app page: nav state, currency switch, notifications, global actions. */
const page = document.body.dataset.page;
$$('[data-nav]').forEach((a) => { if (a.dataset.nav === page) a.setAttribute('aria-current', 'page'); });

const pop = $('#notif-pop');
if (pop) {
  pop.innerHTML = `<h4>آخر التنبيهات</h4><ul>${alerts.feed.slice(0, 4).map((a) => `<li><span class="ico pill ${a.tone} !h-8 !w-8 !justify-center !p-0">${ic(a.icon, 'sm')}</span><div><b>${a.title}</b>${a.body}<small>${a.when}</small></div></li>`).join('')}</ul>`;
}

function syncCurrency() {
  $$('[data-act="currency"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === store.get().currency)));
}
syncCurrency();

onAction({
  currency: (el) => { store.set({ currency: el.dataset.v }); syncCurrency(); emit(); },
  bell: () => { pop.hidden = !pop.hidden; },
  palette: openPalette,
  menu: () => { const side = $('#side'), scrim = $('.side-scrim'); const open = side.classList.toggle('open'); scrim.hidden = !open; },
  'close-modal': closeModal,
  upgrade: () => toast('في النسخة الفعلية تنتقل هنا إلى صفحة اختيار الباقة والدفع.'),
});
document.addEventListener('click', (e) => { if (pop && !pop.hidden && !e.target.closest('.popw')) pop.hidden = true; });
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); }
});
startCountdowns();
