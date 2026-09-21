import { AGENTS, COMPONENTS } from '@/js/services/offers.js';
import { store } from '@/js/lib/store.js';
import { ic } from '@/js/lib/icons.js';
import { c } from '@/js/lib/color.js';
import { nf, money, moneyText, altMoney, dayOffset, agoText, trendBadge } from '@/js/lib/format.js';
import { sparkline } from '@/js/components/sparkline.js';
import { url } from '@/js/lib/url.js';

const stars = (r) => `<span class="num inline-flex items-center gap-0.5 text-warn">${ic('star', 'sm')}<b class="font-semibold text-ink">${r.toFixed(1)}</b></span>`;

const tagsHTML = (o) => [
  o.best && `<span class="pill accent">${ic('star', 'sm')}الأفضل قيمة</span>`,
  o.cheapest && '<span class="pill good">الأرخص</span>',
  o.fastest && '<span class="pill info">الأسرع</span>',
].filter(Boolean).join('');

/* ---------- derived data used by the rates page ---------- */

const hash = (s) => [...s].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);

/** Plausible 12-week price history ending at today's total (illustrative). */
export function offerHistory(o) {
  const wc = (o.weeklyChange || 0) / 100, h = hash(o.id);
  const pts = [o.total];
  for (let i = 1; i < 12; i++) {
    const noise = Math.sin(h * 0.001 + i * 1.7) * 0.01;
    pts.unshift(Math.round(pts[0] / (1 + wc * 0.35 + noise)));
  }
  return pts;
}

/** 1 (low) to 3 (high): how much to trust this price. */
export function confidence(o) {
  const a = AGENTS[o.agent];
  let s = 3;
  if (o.updatedHoursAgo > 24) s -= 1;
  if (!a.verified) s -= 1;
  if (a.shipments < 200) s -= 1;
  return Math.max(1, s);
}
const CONF_LABEL = { 3: 'موثوقية مرتفعة', 2: 'موثوقية متوسطة', 1: 'موثوقية منخفضة' };

/** Score breakdown matching the ranking formula in services/offers.js. */
export function explainRank(o, all) {
  const r = (f) => [Math.min(...all.map(f)), Math.max(...all.map(f))];
  const [minT, maxT] = r((x) => x.total), [minD, maxD] = r((x) => x.days), [minF, maxF] = r((x) => x.freeDays);
  const price = 0.55 * (1 - (o.total - minT) / (maxT - minT || 1));
  const time = 0.3 * (1 - (o.days - minD) / (maxD - minD || 1));
  const free = 0.15 * ((o.freeDays - minF) / (maxF - minF || 1));
  const ver = AGENTS[o.agent].verified ? 0.04 : 0;
  return { price, time, free, ver, total: price + time + free + ver };
}

function whyHTML(o, all) {
  const e = explainRank(o, all);
  const row = (label, v, max) => `<li><span>${label}</span><i style="--v:${Math.round((v / max) * 100)}%"></i><b>${Math.round(v * 100)} من ${Math.round(max * 100)}</b></li>`;
  return `<div class="why" role="dialog" aria-label="لماذا هذا الترتيب">
    <h5>لماذا هذا الترتيب؟</h5>
    <ul>${row('السعر الشامل', e.price, 0.55)}${row('مدة الرحلة', e.time, 0.3)}${row('الأيام المجانية', e.free, 0.15)}${row('وكيل موثّق', e.ver, 0.04)}</ul>
    <p>الدرجة الكلية ${Math.round(e.total * 100)} من 104. السعر أهم عامل، ثم المدة، ثم الأيام المجانية.</p></div>`;
}

/* ---------- legacy compact markup (landing hero and landing rates demo) ---------- */

export function offerDetail(o) {
  const parts = COMPONENTS.filter((k) => o.components[k.key] != null);
  const bar = `<div class="sbar" role="img" aria-label="توزيع مكوّنات السعر">${parts.map((k) => `<i style="flex:${o.components[k.key]};background:rgb(var(--c-${k.color}))" title="${k.label}"></i>`).join('')}</div>`;
  const rows = parts.map((k) => {
    const v = o.components[k.key];
    return `<li><span class="sw" style="background:rgb(var(--c-${k.color}))"></span><span>${k.label}</span><span class="num">${moneyText(v)}</span><span class="pc num">${Math.round((v / o.total) * 100)}%</span></li>`;
  }).join('');
  return `<div class="o-detail"><div>${bar}<ul class="bl">${rows}<li class="tt"><span></span><span>الإجمالي الشامل</span><span class="num">${moneyText(o.total)}</span><span></span></li></ul></div>
    <div class="terms"><h4>ماذا يشمل هذا السعر؟</h4><ul>
      <li>${ic('check', 'sm')}<span>كل الرسوم الظاهرة حتى تسليم الحاوية في الميناء${o.components.land ? ' ثم نقلها براً إلى الدمام' : ''}.</span></li>
      <li>${ic('cal', 'sm')}<span>ساري حتى ${dayOffset(o.updatedHoursAgo > 24 ? 1 : 3)} وآخر تحديث ${agoText(o.updatedHoursAgo)}.</span></li>
      <li>${ic('clock', 'sm')}<span>${o.freeDays} أيام تخزين مجانية، ثم 280 ر.س تقريباً لكل يوم.</span></li>
      <li class="no">${ic('info', 'sm')}<span>لا يشمل: الرسوم الجمركية وضريبة القيمة المضافة وأجور التخليص.</span></li></ul></div></div>`;
}

function compactRow(o, { mini = false, nocmp = false } = {}) {
  const a = AGENTS[o.agent];
  const agent = `<div class="o-agent"><div class="av" style="background:${a.color}">${a.name.charAt(0)}</div><div class="min-w-0"><b>${a.name}${a.verified ? ic('shield', 'sm') : ''}</b><small>${stars(a.rating)}${mini ? '' : ` ${nf.format(a.shipments)} شحنة من ${a.city}`}</small></div></div>`;
  const svc = `<div class="o-svc"><div class="l1"><span class="carrier">${o.carrier}</span><span>${o.service}</span></div>${!mini ? `<div class="flex flex-wrap gap-1">${tagsHTML(o)}${a.verified ? '' : '<span class="pill warn">قيد التوثيق</span>'}</div>` : ''}</div>`;
  const timeline = `<div class="tl"><div class="d"><b>${dayOffset(o.sailIn)}</b><small>إبحار</small></div><div class="ln"><span>${o.days} يوماً</span></div><div class="d"><b>${dayOffset(o.sailIn + o.days)}</b><small>وصول متوقع</small></div></div>`;
  const terms = `<div class="o-terms"><div>${ic('clock', 'sm')}<span>${o.freeDays} أيام مجانية</span></div><div>${ic('cal', 'sm')}<span>يقفل الحجز بعد ${Math.max(1, o.sailIn - 2)} أيام</span></div></div>`;
  const price = `<div class="o-price"><div class="tot">${money(o.total)}</div><small>شامل الرسوم، ${altMoney(o.total)}</small>
    <div class="mt-0.5 flex flex-wrap items-center gap-2">${trendBadge(o.weeklyChange)}<span class="text-[11.5px] text-mute">${agoText(o.updatedHoursAgo)}</span></div></div>`;
  const cta = mini ? '' : `<div class="o-cta"><a class="btn btn-primary" href="${url('/app/rates.html')}">اطلب هذا السعر</a></div>`;
  const cls = mini ? 'o-grid mini' : 'o-grid nocmp';
  const body = mini ? `${agent}${timeline}${price}` : `${agent}${svc}${timeline}${terms}${price}${cta}`;
  return `<article class="offer${o.best && !mini ? ' is-best' : ''}"><div class="${cls}">${body}</div></article>`;
}

/* ---------- full row for the rates page ---------- */

function waterfallHTML(o) {
  const parts = COMPONENTS.filter((k) => o.components[k.key] != null);
  let cum = 0;
  const rows = parts.map((k) => {
    const v = o.components[k.key], left = (cum / o.total) * 100, width = (v / o.total) * 100;
    cum += v;
    return `<li><span>${k.label}</span><span class="wf-track" aria-hidden="true"><i style="inset-inline-start:${left.toFixed(1)}%;width:${Math.max(width, 1.5).toFixed(1)}%;background:rgb(var(--c-${k.color}))"></i></span><span class="num">${moneyText(v)}</span></li>`;
  }).join('');
  const bar = `<div class="wf-bar" role="img" aria-label="توزيع مكوّنات السعر">${parts.map((k) => `<i style="flex:${o.components[k.key]};background:rgb(var(--c-${k.color}))" title="${k.label}"></i>`).join('')}</div>`;
  return `${bar}<ul class="wf-rows">${rows}<li class="tt"><span>الإجمالي الشامل</span><span></span><span class="num">${moneyText(o.total)}</span></li></ul>`;
}

function detailHTML(o, alertOn) {
  return `<div class="wf"><div>${waterfallHTML(o)}</div>
    <div class="wf-side"><h4>ماذا يشمل هذا السعر؟</h4><ul>
      <li>${ic('check', 'sm')}<span>كل الرسوم الظاهرة حتى تسليم الحاوية في الميناء${o.components.land ? ' ثم نقلها براً إلى الدمام' : ''}.</span></li>
      <li>${ic('cal', 'sm')}<span>ساري حتى ${dayOffset(o.updatedHoursAgo > 24 ? 1 : 3)} وآخر تحديث ${agoText(o.updatedHoursAgo)}.</span></li>
      <li>${ic('clock', 'sm')}<span>${o.freeDays} أيام تخزين مجانية، ثم 280 ر.س تقريباً لكل يوم.</span></li>
      <li class="no">${ic('info', 'sm')}<span>لا يشمل: الرسوم الجمركية وضريبة القيمة المضافة وأجور التخليص.</span></li></ul>
      <div class="wf-actions"><button class="btn btn-line btn-sm" data-act="copy-quote" data-id="${o.id}">${ic('doc', 'sm')}نسخ ملخص العرض</button>
      <button class="btn btn-line btn-sm" data-act="offer-alert" data-id="${o.id}" aria-pressed="${alertOn}">${ic('bell', 'sm')}${alertOn ? 'التنبيه مفعّل' : `نبّهني عند ${moneyText(Math.round(o.total * 0.97))}`}</button></div></div></div>`;
}

/**
 * One comparable offer. `mini` / `nocmp` render the compact landing markup;
 * the default is the full rates-page row. `all` (the lane's offers) powers the rank explanation.
 */
export function offerRow(o, { mini = false, nocmp = false, all = [] } = {}) {
  if (mini || nocmp) return compactRow(o, { mini, nocmp });
  const st = store.get(), a = AGENTS[o.agent];
  const open = st.openOffer === o.id, whyOpen = st.whyOffer === o.id;
  const alertOn = (st.offerAlerts || []).includes(o.id);
  const stale = o.updatedHoursAgo > 24, conf = confidence(o);
  const flash = o.prevTotal != null && o.prevTotal !== o.total ? (o.total > o.prevTotal ? ' flash-up' : ' flash-dn') : '';
  const tags = tagsHTML(o) + (a.verified ? '' : '<span class="pill warn">قيد التوثيق</span>');
  return `<article class="ofr${o.best ? ' is-best' : ''}${open ? ' is-open' : ''}${flash}" data-oid="${o.id}">
    <div class="ofr-main">
      <label class="ofr-chk"><input class="check" type="checkbox" data-act="compare" data-id="${o.id}" ${st.compare.includes(o.id) ? 'checked' : ''} aria-label="أضف إلى المقارنة"></label>
      <div class="ofr-agent"><div class="av" style="background:${a.color}">${a.name.charAt(0)}</div>
        <div class="min-w-0"><b>${a.name}${a.verified ? ic('shield', 'sm') : ''}</b><small>${stars(a.rating)} <span>${nf.format(a.shipments)} شحنة</span></small></div></div>
      <div class="ofr-svc"><div class="l1"><span class="carrier">${o.carrier}</span><span>${o.service}</span></div>
        <div class="ofr-tags">${tags}<button class="why-btn" data-act="why" data-id="${o.id}" aria-expanded="${whyOpen}" aria-label="لماذا هذا الترتيب">${ic('info', 'sm')}</button></div></div>
      <div class="ofr-tl"><div class="d"><b>${dayOffset(o.sailIn)}</b><small>إبحار</small></div><div class="ln"><span>${o.days} يوماً</span></div><div class="d"><b>${dayOffset(o.sailIn + o.days)}</b><small>وصول متوقع</small></div></div>
      <div class="ofr-terms"><div>${ic('clock', 'sm')}<span>${o.freeDays} أيام مجانية</span></div><div>${ic('cal', 'sm')}<span>يقفل الحجز بعد ${Math.max(1, o.sailIn - 2)} أيام</span></div></div>
      <div class="ofr-price"><div class="tot">${money(o.total)}</div><small>شامل الرسوم، ${altMoney(o.total)}</small>
        <div class="row2">${trendBadge(o.weeklyChange)}${sparkline(offerHistory(o), 64, 22, c(o.weeklyChange > 0 ? 'bad' : 'good'), { area: false, stroke: 1.8 })}</div>
        <div class="ofr-fresh${stale ? ' stale' : ''}"><i></i><span>${stale ? 'سعر قديم، ' : 'محدّث '}${agoText(o.updatedHoursAgo)}</span><span class="conf c${conf}" title="${CONF_LABEL[conf]}"><s></s><s></s><s></s></span></div>
        <button class="linkbtn" data-act="offer-open" data-id="${o.id}" aria-expanded="${open}">تفاصيل السعر ${ic('chev', 'sm')}</button></div>
      <div class="ofr-cta"><button class="btn btn-primary" data-act="quote" data-id="${o.id}">اطلب هذا السعر</button>
        <button class="bell-btn" data-act="offer-alert" data-id="${o.id}" aria-pressed="${alertOn}">${ic('bell', 'sm')}${alertOn ? 'التنبيه مفعّل' : 'نبّهني عند الانخفاض'}</button></div>
    </div>
    ${whyOpen ? whyHTML(o, all) : ''}
    ${open ? detailHTML(o, alertOn) : ''}</article>`;
}
