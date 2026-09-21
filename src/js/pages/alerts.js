import '@/js/app-shell.js';
import alerts from '@/data/alerts.json';
import { $, onAction } from '@/js/lib/dom.js';
import { ic } from '@/js/lib/icons.js';
import { store } from '@/js/lib/store.js';
import { toast } from '@/js/lib/toast.js';

const isOn = (r) => store.get().rules[r.id] ?? r.enabled;

function render() {
  const on = alerts.rules.filter(isOn).length;
  $('#rules').innerHTML = `<div class="card-h"><h3>${ic('bell')}قواعدي</h3><span class="pill brand">${on} مفعّلة</span></div>
    ${alerts.rules.map((r) => `<div class="rule"><span class="ico tint-${r.tint} h-10 w-10">${ic(r.icon)}</span>
      <div><b>${r.title}</b><small>${r.desc}</small><div class="mt-1.5 flex gap-1.5">${r.channels.map((ch) => `<span class="pill">${ch}</span>`).join('')}</div></div>
      <button class="tgl" role="switch" aria-checked="${isOn(r)}" data-act="rule" data-id="${r.id}" aria-label="تفعيل ${r.title}"></button></div>`).join('')}`;
  $('#feed').innerHTML = `<div class="card-h"><h3>${ic('clock')}آخر ما أُرسل</h3></div>
    <ul class="pop !static !w-auto !rounded-none !border-0 !shadow-none">${alerts.feed.map((a) => `<li><span class="ico pill ${a.tone} !h-8 !w-8 !justify-center !p-0">${ic(a.icon, 'sm')}</span><div><b>${a.title}</b>${a.body}<small>${a.when}</small></div></li>`).join('')}</ul>`;
}

onAction({
  rule: (el) => {
    const r = alerts.rules.find((x) => x.id === el.dataset.id);
    store.set({ rules: { ...store.get().rules, [r.id]: !isOn(r) } });
    render();
  },
  'add-rule': () => toast('نموذج إنشاء التنبيه يظهر هنا في النسخة الفعلية.'),
});
render();
