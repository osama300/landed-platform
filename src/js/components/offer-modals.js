import { AGENTS, COMPONENTS, buildOffers } from '@/js/services/offers.js';
import { store } from '@/js/lib/store.js';
import { ic } from '@/js/lib/icons.js';
import { nf, toCurrency, currencyLabel, moneyText, dayOffset, routeName, boxName } from '@/js/lib/format.js';

/** Plain-text quote summary for clipboard / sharing. */
export function offerSummaryText(o) {
  const a = AGENTS[o.agent];
  return [
    `عرض شحن عبر لاندد`,
    `المسار: ${routeName(o.from, o.to)} (${boxName(o.box)})`,
    `الوكيل: ${a.name}`,
    `الخط الملاحي: ${o.carrier} - ${o.service}`,
    `الإبحار: ${dayOffset(o.sailIn)}، الوصول المتوقع: ${dayOffset(o.sailIn + o.days)} (${o.days} يوماً)`,
    `الأيام المجانية: ${o.freeDays}`,
    `السعر الشامل: ${nf.format(toCurrency(o.total))} ${currencyLabel()}`,
    `لا يشمل الجمارك وضريبة القيمة المضافة والتخليص.`,
  ].join('\n');
}

function selected() {
  const { from, to, box, compare } = store.get();
  const all = buildOffers(from, to, box);
  return compare.map((id) => all.find((o) => o.id === id)).filter(Boolean);
}

export function compareModal() {
  const { from, to } = store.get();
  const sel = selected();
  const cheapest = Math.min(...sel.map((o) => o.total));
  const best = (f, mode) => (mode === 'max' ? Math.max(...sel.map(f)) : Math.min(...sel.map(f)));
  const row = (label, f, fmt, mode) => {
    const b = mode ? best(f, mode) : null;
    return `<tr><th>${label}</th>${sel.map((o) => `<td class="num${b !== null && f(o) === b ? ' best' : ''}">${fmt(o)}</td>`).join('')}</tr>`;
  };
  const keys = COMPONENTS.filter((k) => sel.some((o) => o.components[k.key] != null));
  const head = sel.map((o) => `<th><div class="flex items-center gap-2"><span class="av" style="background:${AGENTS[o.agent].color};width:32px;height:32px;font-size:14px">${AGENTS[o.agent].name.charAt(0)}</span><span>${AGENTS[o.agent].name}<div class="carrier mt-0.5 inline-block">${o.carrier}</div></span></div></th>`).join('');
  return `<div class="mh"><h3>مقارنة العروض على ${routeName(from, to)}</h3><button class="iconbtn" data-act="close-modal" aria-label="إغلاق">${ic('x')}</button></div>
  <div class="overflow-x-auto"><table class="cmpt"><thead><tr><th class="corner"></th>${head}</tr></thead><tbody>
    ${row('السعر الشامل', (o) => o.total, (o) => `<b class="text-[16px]">${moneyText(o.total)}</b><span class="diff">${o.total === cheapest ? 'الأرخص' : `أعلى بـ ${moneyText(o.total - cheapest)}`}</span>`, 'min')}
    ${row('مدة الرحلة', (o) => o.days, (o) => `${o.days} يوماً`, 'min')}
    ${row('الأيام المجانية', (o) => o.freeDays, (o) => `${o.freeDays} أيام`, 'max')}
    ${row('موعد الإبحار', (o) => o.sailIn, (o) => dayOffset(o.sailIn), 'min')}
    ${row('الوصول المتوقع', (o) => o.sailIn + o.days, (o) => dayOffset(o.sailIn + o.days), 'min')}
    ${row('تقييم الوكيل', (o) => AGENTS[o.agent].rating, (o) => `${AGENTS[o.agent].rating.toFixed(1)} من ${nf.format(AGENTS[o.agent].shipments)} شحنة`, 'max')}
    <tr class="sec-r"><th colspan="${sel.length + 1}">تفاصيل السعر</th></tr>
    ${keys.map((k) => row(k.label, (o) => o.components[k.key] ?? 0, (o) => (o.components[k.key] != null ? moneyText(o.components[k.key]) : 'غير مطبّق'), 'min')).join('')}
    <tr><th></th>${sel.map((o) => `<td><div class="flex flex-col gap-1.5"><button class="btn btn-primary btn-sm btn-block" data-act="quote" data-id="${o.id}">اطلب هذا السعر</button><button class="btn btn-ghost btn-sm btn-block" data-act="copy-quote" data-id="${o.id}">${ic('doc', 'sm')}نسخ الملخص</button></div></td>`).join('')}</tr></tbody></table></div>`;
}

export function quoteModal(id) {
  const { from, to, box } = store.get();
  const o = buildOffers(from, to, box).find((x) => x.id === id) ?? buildOffers('shenzhen', 'jeddah', '40')[0];
  const a = AGENTS[o.agent];
  return `<div class="mh"><h3>اطلب هذا السعر</h3><button class="iconbtn" data-act="close-modal" aria-label="إغلاق">${ic('x')}</button></div>
  <div class="mb"><div class="sumbox">
    <div><small>الوكيل</small><b>${a.name}</b></div><div><small>الخط الملاحي</small><b>${o.carrier}، ${o.service}</b></div>
    <div><small>المسار</small><b>${routeName(o.from, o.to)}، ${boxName(o.box)}</b></div><div><small>الإبحار المتوقع</small><b>${dayOffset(o.sailIn)}</b></div>
    <div class="col-span-2 flex items-baseline justify-between border-t border-line pt-2.5"><span>السعر الشامل للحاوية</span><b class="text-xl">${moneyText(o.total)}</b></div></div>
    <div><div class="mb-2 font-semibold">عدد الحاويات</div><div class="qty"><button data-act="qty" data-d="-1" aria-label="أقل">−</button><span id="qtyv" class="num">1</span><button data-act="qty" data-d="1" aria-label="أكثر">+</button></div></div>
    <div class="hint">${ic('msg')}<span>سيتواصل معك فريق لاندد عبر واتساب لتأكيد التوفر وإتمام الحجز مع الوكيل. لا يوجد دفع داخل المنصة في هذه المرحلة.</span></div></div>
  <div class="mf"><button class="btn btn-line" data-act="copy-quote" data-id="${o.id}">${ic('doc', 'sm')}نسخ الملخص</button><button class="btn btn-line" data-act="close-modal">إلغاء</button><button class="btn btn-primary" data-act="send-quote">${ic('msg')}أرسل الطلب عبر واتساب</button></div>`;
}
