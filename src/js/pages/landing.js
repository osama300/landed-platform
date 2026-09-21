import '@/css/main.css';
import '@/css/landing.css';
import ports from '@/data/ports.json';
import map from '@/data/map.json';
import alerts from '@/data/alerts.json';
import marketing from '@/data/marketing.json';
import { $, $$, onAction } from '@/js/lib/dom.js';
import { ic } from '@/js/lib/icons.js';
import { store } from '@/js/lib/store.js';
import { toast } from '@/js/lib/toast.js';
import { closesAt, startCountdowns, tickCountdowns } from '@/js/lib/countdown.js';
import { FX, nf, money, moneyText, routeName, boxName, dayOffset, trendBadge } from '@/js/lib/format.js';
import { buildOffers, AGENTS, COMPONENTS } from '@/js/services/offers.js';
import { DEALS, dealSaving, dealPercent, dealsByClosing } from '@/js/services/deals.js';
import { SHIPMENTS, timeline, daysToArrival } from '@/js/services/shipments.js';
import { url } from '@/js/lib/url.js';

/* ------------------------------------------------------------------ dark route map */
const { lonMin, latMax, scale } = map.view;
const P = (lon, lat) => [(lon - lonMin) * scale, (latMax - lat) * scale];
const pts = (arr) => arr.map(([lo, la]) => P(lo, la).map((v) => v.toFixed(1)).join(',')).join(' ');
const lanePath = (from) => [...map.originLanes[from], ...map.seaLane].map(([lo, la]) => P(lo, la));

function pointAt(line, t) {
  const seg = line.slice(1).map((p, i) => Math.hypot(p[0] - line[i][0], p[1] - line[i][1]));
  const total = seg.reduce((a, b) => a + b, 0);
  let target = Math.max(0, Math.min(1, t)) * total, acc = 0;
  for (let i = 0; i < seg.length; i++) {
    if (acc + seg[i] >= target || i === seg.length - 1) {
      const f = (target - acc) / (seg[i] || 1);
      return { x: line[i][0] + (line[i + 1][0] - line[i][0]) * f, y: line[i][1] + (line[i + 1][1] - line[i][1]) * f, a: (Math.atan2(line[i + 1][1] - line[i][1], line[i + 1][0] - line[i][0]) * 180) / Math.PI, i };
    }
    acc += seg[i];
  }
  const l = line.at(-1);
  return { x: l[0], y: l[1], a: 0, i: line.length - 2 };
}

function darkMap({ lanes = Object.keys(map.originLanes), shipId = null, viewBox = '0 0 1000 480', fs = 13, grat = true } = {}) {
  let g = '';
  if (grat) {
    for (let lon = 30; lon <= 130; lon += 10) g += `<line x1="${(lon - lonMin) * scale}" x2="${(lon - lonMin) * scale}" y1="0" y2="480" stroke="rgb(var(--c-aqua) / .07)"/>`;
    for (let lat = 0; lat <= 45; lat += 10) g += `<line x1="0" x2="1000" y1="${(latMax - lat) * scale}" y2="${(latMax - lat) * scale}" stroke="rgb(var(--c-aqua) / .07)"/>`;
  }
  const land = map.land.map((a) => `<polygon points="${pts(a)}" fill="rgb(var(--c-aqua) / .06)" stroke="rgb(var(--c-aqua) / .24)" stroke-width="1" stroke-linejoin="round"/>`).join('');
  const saudi = `<polygon points="${pts(map.saudi)}" fill="rgb(var(--c-aqua) / .16)" stroke="rgb(var(--c-aqua) / .45)" stroke-width="1"/>`;
  const laneSvg = lanes.map((f) => {
    const line = lanePath(f).map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ');
    return `<polyline class="lane-base" points="${line}"/><polyline class="lane" points="${line}"/>`;
  }).join('');
  const jd = P(39.15, 21.5), dm = P(50.1, 26.45), ri = P(map.riyadh.lon, map.riyadh.lat), hz = P(map.hormuz.lon, map.hormuz.lat);
  const halo = 'stroke="rgb(var(--c-nav))" stroke-width="4" paint-order="stroke"';
  const label = (t, x, y, size = fs, w = 600, fill = 'rgb(255 255 255 / .86)') => `<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}" font-weight="${w}" fill="${fill}" ${halo}>${t}</text>`;
  const origins = lanes.map((f) => {
    const o = ports.origins[f], [x, y] = P(o.lon, o.lat);
    return `<circle cx="${x}" cy="${y}" r="4.5" fill="rgb(var(--c-aqua))"/>${label(o.short, x, y - 10)}`;
  }).join('');
  const dests = `<circle cx="${jd[0]}" cy="${jd[1]}" r="12" fill="rgb(var(--c-aqua) / .25)"><animate attributeName="r" values="7;15;7" dur="2.8s" repeatCount="indefinite"/></circle><circle cx="${jd[0]}" cy="${jd[1]}" r="5.5" fill="#fff"/>${label('جدة', jd[0] - 4, jd[1] + 22, fs + 1, 700, '#fff')}
    <circle cx="${dm[0]}" cy="${dm[1]}" r="5" fill="#fff"/>${label('الدمام', dm[0], dm[1] - 11, fs, 700, '#fff')}`;
  const bridge = `<path d="M${jd[0]} ${jd[1]} Q${ri[0]} ${ri[1] + 18} ${dm[0]} ${dm[1]}" fill="none" stroke="rgb(var(--c-crane))" stroke-width="2.2" stroke-dasharray="6 6" opacity=".9"/>`;
  const hormuz = `<circle cx="${hz[0]}" cy="${hz[1]}" r="5" fill="rgb(var(--c-bad))"/>${label('هرمز', hz[0] + 4, hz[1] + 20, fs - 1, 600, 'rgb(var(--c-bad))')}`;
  const wp = map.waypoints.map((w) => { const [x, y] = P(w.lon, w.lat); return `<circle cx="${x}" cy="${y}" r="3" fill="rgb(var(--c-aqua) / .8)"/>${label(w.name, x, y - 9, fs - 2, 500, 'rgb(255 255 255 / .6)')}`; }).join('');
  let ship = '';
  if (shipId) {
    const s = SHIPMENTS.find((x) => x.id === shipId);
    const c = pointAt(lanePath(s.from), s.progress);
    ship = `<g transform="translate(${c.x.toFixed(1)} ${c.y.toFixed(1)})"><circle r="15" fill="rgb(var(--c-crane) / .3)"><animate attributeName="r" values="10;19;10" dur="2.4s" repeatCount="indefinite"/></circle><circle r="8.5" fill="rgb(var(--c-crane))" stroke="rgb(var(--c-nav))" stroke-width="2.5"/><path d="M-3.4 1.6 0 -4.8 3.4 1.6Z" fill="rgb(var(--c-nav))" transform="rotate(${(c.a + 90).toFixed(0)})"/></g>`;
  }
  return `<svg class="lp-map" viewBox="${viewBox}" role="img" aria-label="خريطة تخطيطية لمسارات الشحن من الصين إلى جدة والدمام">${g}${land}${saudi}${laneSvg}${bridge}${origins}${wp}${dests}${hormuz}${ship}</svg>`;
}

/* ------------------------------------------------------------------ shared bits */
const options = (obj, sel) => Object.entries(obj).map(([k, v]) => `<option value="${k}"${k === sel ? ' selected' : ''}>${v.name}</option>`).join('');
const boxSeg = (st) => `<div class="seg" role="group" aria-label="نوع الحاوية"><button type="button" data-act="box" data-v="20" aria-pressed="${st.box === '20'}">20 قدم</button><button type="button" data-act="box" data-v="40" aria-pressed="${st.box === '40'}">40 قدم عالية</button></div>`;
const byScore = (a, b) => b.score - a.score;
const ico = (tone, name) => `<span class="lp-ico lp-ico--${tone}">${ic(name, 'sm')}</span>`;

function tags(o) {
  return [o.best && '<span class="pill accent">الأفضل قيمة</span>', o.cheapest && '<span class="pill good">الأرخص</span>', o.fastest && '<span class="pill info">الأسرع</span>'].filter(Boolean).join(' ');
}

function lpOffer(o, { full = false } = {}) {
  const a = AGENTS[o.agent];
  const agent = `<div class="lp-row__agent"><span class="lp-av" style="background:${a.color}">${a.name.charAt(0)}</span><div><b>${a.name}${a.verified ? ic('shield', 'sm') : ''}</b><small>${tags(o) || `تقييم ${a.rating.toFixed(1)} من ${nf.format(a.shipments)} شحنة`}</small></div></div>`;
  const price = `<div class="lp-row__price">${money(o.total)}<div>${trendBadge(o.weeklyChange)}</div></div>`;
  if (!full) {
    return `<div class="lp-row">${agent}<div class="lp-row__route"><b>${o.carrier}</b>${o.days} يوماً</div><div class="lp-row__free">${o.freeDays} أيام مجانية</div>${price}</div>`;
  }
  const tl = `<div class="lp-tl"><div><b>${dayOffset(o.sailIn)}</b><small>إبحار</small></div><i><span>${o.days} يوماً</span></i><div><b>${dayOffset(o.sailIn + o.days)}</b><small>وصول متوقع</small></div></div>`;
  return `<div class="lp-row lp-row--full">${agent}<div class="lp-row__route"><b>${o.carrier}</b>${o.service}</div>${tl}<div class="lp-row__free">${o.freeDays} أيام مجانية</div>${price}<a class="btn btn-primary btn-sm" href="${url('/app/rates.html')}">اطلب هذا السعر</a></div>`;
}

/* ------------------------------------------------------------------ hero */
function renderHero() {
  const st = store.get();
  $('#hero-search').innerHTML = `<label class="field"><span>من ميناء</span><select class="sel" id="h-from" data-bind="from">${options(ports.origins, st.from)}</select></label>
    <label class="field"><span>إلى ميناء</span><select class="sel" id="h-to" data-bind="to">${options(ports.destinations, st.to)}</select></label>
    <div class="field"><span>نوع الحاوية</span>${boxSeg(st)}</div>
    <button class="btn btn-primary btn-lg" type="submit">${ic('search')}قارن الأسعار</button>`;
}

function renderHeroStatic() {
  $('#hero-map').innerHTML = darkMap();
  const all = buildOffers('shenzhen', 'jeddah', '40'), top = [...all].sort(byScore).slice(0, 4), min = Math.min(...all.map((o) => o.total));
  const cheapest = all.find((o) => o.total === min);
  const arriving = SHIPMENTS.filter((s) => daysToArrival(s) <= 7).length;
  const kpi = (l, v, em, bad) => `<div class="lp-kpi"><small>${l}</small><b>${v}</b><em${bad ? ' class="bad"' : ''}>${em}</em></div>`;
  $('#hero-frame').innerHTML = `<div class="lp-frame__bar"><i></i><i></i><i></i><b>برج التحكم</b><span>مؤسسة الرواد للاستيراد</span></div>
    <div class="lp-kpis">${kpi('حاويات نشطة', SHIPMENTS.length, `${arriving} تصل خلال 7 أيام`)}${kpi('تصل خلال 7 أيام', arriving, 'أقربها بعد 46 ساعة')}${kpi('أيام مجانية معرّضة للانتهاء', 1, 'بقي يوم مجاني واحد', true)}${kpi('أقل سعر شامل الآن', moneyText(min), `${trendBadge(cheapest.weeklyChange)}`)}</div>
    <div class="lp-frame__body"><section><h4>أسعار ${routeName('shenzhen', 'jeddah')} لحاوية 40 قدم</h4>${top.map((o) => lpOffer(o)).join('')}</section>
    <aside><h4>يحتاج انتباهك</h4>${alerts.feed.slice(0, 4).map((a) => `<div class="lp-alert">${ico(a.tone === 'accent' ? 'crane' : a.tone, a.icon)}<div><b>${a.title}</b>${a.body}<small> ${a.when}</small></div></div>`).join('')}</aside></div>`;
  const d = DEALS[0];
  $('#chip-a').innerHTML = `${ico('crane', 'zap')}<div><b>صفقة على مسارك</b><span class="t">وفر ${moneyText(dealSaving(d))} ويقفل الحجز بعد يومين</span></div>`;
  $('#chip-b').innerHTML = `${ico('good', 'adn')}<div><b>انخفض السعر 2.1%</b><span class="t">بحر الخليج للشحن على ${routeName('shenzhen', 'jeddah')}</span></div>`;
}

/* ------------------------------------------------------------------ journey */
const STAGES = [
  ['عرض السعر', 'أسعار متفرقة في محادثات واتساب تتغير كل بضعة أيام، فتقارن أرقاماً قديمة.', 'سعر شامل من كل وكيل مع تاريخ آخر تحديث، مرتب في شاشة واحدة.'],
  ['الحجز', 'رسوم الموسم والوقود والحرب تظهر بعد أن تحجز.', 'كل الرسوم داخل السعر قبل الحجز، ويظهر تفصيلها بضغطة.'],
  ['الإبحار', 'مساحات تُباع بخصم من 200 إلى 500$ للحاوية قبل الإبحار بأيام دون أن تعلم بها.', 'صفقات المساحات الفارغة تصلك على مسارك، ومن يصل أولاً يحجز.'],
  ['الوصول', 'ازدحام جدة قد يضيف 7 إلى 14 يوماً في الذروة، وموعد الوصول يعتمد على استراتيجية الخط.', 'وصول متوقع على الخريطة مع تنبيه الممرات المقيّدة مثل هرمز.'],
  ['التخليص', 'الأيام المجانية (عادة 7 في جدة) تنقضي قبل أن يبدأ التخليص، ثم يبدأ عدّاد الأرضيات.', 'تنبيه «ابدأ التخليص» قبل الوصول بـ 48 ساعة، وعدّاد أرضيات بالريال.'],
];
function renderJourney() {
  $('#journey-list').innerHTML = STAGES.map(([t, leak, fix], i) => `<li class="lp-stage"><span class="lp-stage__n">${i + 1}</span><h3>${t}</h3>
    <p class="lp-leak">${ic('x', 'sm')}<span>${leak}</span></p><p class="lp-fix">${ic('check', 'sm')}<span>${fix}</span></p></li>`).join('');
}

/* ------------------------------------------------------------------ bento */
let days = 9;
function demBody() {
  const free = Math.max(0, 7 - days), over = Math.max(0, days - 7);
  return `<div class="lp-dem__meter" aria-hidden="true"><i id="dm-a" style="width:${(Math.min(days, 7) / 21) * 100}%;background:rgb(var(--c-good))"></i><i id="dm-b" style="width:${(over / 21) * 100}%;background:rgb(var(--c-bad))"></i></div>
    <div class="lp-dem__vals"><div><small>أيام مجانية متبقية</small><b id="dm-f">${free}</b></div><div><small>تكلفة الأرضيات</small><b id="dm-c">${nf.format(over * 280)} ر.س</b></div></div>`;
}
function renderBento() {
  const sorted = buildOffers('shenzhen', 'jeddah', '40').sort(byScore), best = sorted[0];
  const rows = sorted.slice(0, 4).map((o) => lpOffer(o)).join('');
  const parts = COMPONENTS.filter((c) => best.components[c.key] != null);
  const breakdown = `<div class="lp-bd"><h4>هكذا يتكوّن السعر الشامل لأفضل عرض</h4><div class="lp-bd__bar" role="img" aria-label="توزيع مكوّنات السعر">${parts.map((c) => `<i style="flex:${best.components[c.key]};background:rgb(var(--c-${c.color}))"></i>`).join('')}</div>
    <ul class="lp-bd__list">${parts.map((c) => `<li><span class="lp-bd__sw" style="background:rgb(var(--c-${c.color}))"></span><span>${c.label}</span><b>${moneyText(best.components[c.key])}</b></li>`).join('')}<li class="lp-bd__tot"><span></span><span>الإجمالي</span><b>${moneyText(best.total)}</b></li></ul></div>`;
  const deals = dealsByClosing(DEALS).slice(0, 3).map((d) => `<div class="lp-deal"><div><b>${routeName(d.from, d.to)}</b><small>${d.carrier}، وفر ${dealPercent(d)}%</small></div><span class="cd" data-until="${closesAt(d.closesInHours)}"></span><div>${money(d.dealPrice)}</div></div>`).join('');
  const feed = alerts.feed.slice(0, 3).map((a) => `<div class="lp-alert">${ico(a.tone === 'accent' ? 'crane' : a.tone, a.icon)}<div><b>${a.title}</b>${a.body}</div></div>`).join('');
  $('#bento').innerHTML = `
    <article class="lp-cell lp-cell--paper b-rates"><h3>قارن الأسعار الشاملة لمسارك</h3><p>كل وكيل يعرض سعراً واحداً يشمل الوقود والموسم ومخاطر الحرب والمناولة، ومعه الأيام المجانية واتجاه السعر هذا الأسبوع.</p><div>${rows}</div>${breakdown}</article>
    <article class="lp-cell lp-cell--dark b-deals"><h3>صفقات المساحات الفارغة</h3><p>شركة حجزت 100 حاوية وامتلأ 70، فتبيع الباقي بخصم قبل الإبحار.</p><div>${deals}</div></article>
    <article class="lp-cell lp-cell--dark b-track"><h3>كل حاوياتك على خريطة واحدة</h3><p>الموقع والوصول المتوقع، والممرات المقيّدة بلون مختلف.</p><div class="lp-cell__map">${darkMap({ lanes: ['ningbo', 'shenzhen'], shipId: 'CSNU6249115', viewBox: '0 90 720 330', fs: 27, grat: false })}</div></article>
    <article class="lp-cell lp-cell--amber b-dem"><h3>عدّاد الأرضيات</h3><p>حرّك الشريط لترى ما تكلّفه أيام الانتظار بعد الأيام المجانية.</p><label class="sr" for="days">أيام الحاوية في الميناء</label><input class="lp-dem__rng" id="days" type="range" min="1" max="21" value="${days}"><div id="dm">${demBody()}</div></article>
    <article class="lp-cell lp-cell--paper b-alert"><h3>تنبيهات تحمي مالك</h3><div>${feed}</div></article>
    <article class="lp-cell b-wa"><h3>من السعر إلى الحجز عبر واتساب</h3><div class="lp-chat"><div class="lp-bubble lp-bubble--me">أرغب بسعر شنجن ← جدة، 40 قدم، بحر الخليج للشحن<small>الآن</small></div><div class="lp-bubble lp-bubble--them">أهلاً محمد، السعر متاح والإبحار بعد 3 أيام. أؤكد لك الحجز؟<small>فريق لاندد</small></div></div></article>`;
  tickCountdowns();
}
function updateDem() {
  const free = Math.max(0, 7 - days), over = Math.max(0, days - 7);
  $('#dm-a').style.width = `${(Math.min(days, 7) / 21) * 100}%`;
  $('#dm-b').style.width = `${(over / 21) * 100}%`;
  $('#dm-f').textContent = free;
  $('#dm-c').textContent = `${nf.format(over * 280)} ر.س`;
}

/* ------------------------------------------------------------------ tour */
let tab = 'rates', tourShip = 'MSKU4821937';
function renderPanel() {
  const st = store.get(), el = $('#panel');
  $$('.lp-tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.v === tab)));
  el.setAttribute('aria-labelledby', `tab-${tab}`);
  if (tab === 'rates') {
    const list = buildOffers(st.from, st.to, st.box).sort(byScore).slice(0, 4);
    el.innerHTML = `<div class="lp-picker"><label class="field"><span>ميناء الشحن</span><select class="sel" id="r-from" data-bind="from">${options(ports.origins, st.from)}</select></label>
      <label class="field"><span>ميناء الوصول</span><select class="sel" id="r-to" data-bind="to">${options(ports.destinations, st.to)}</select></label>
      <div class="field"><span>نوع الحاوية</span>${boxSeg(st)}</div></div>
      <div>${list.map((o) => lpOffer(o, { full: true })).join('')}</div>
      <div class="lp-panel__foot"><span>بيانات توضيحية للعرض. في المنصة تظهر أسعار الوكلاء الفعلية.</span><a class="btn btn-line btn-sm" href="${url('/app/rates.html')}">افتح كل العروض مع الفلاتر</a></div>`;
  } else if (tab === 'deals') {
    el.innerHTML = `<div class="lp-board">${dealsByClosing(DEALS).map((d) => `<div class="lp-board__row"><div><b>${routeName(d.from, d.to)}</b><small>${boxName(d.box)}، ${AGENTS[d.agent].name}</small></div>
      <div><span class="carrier">${d.carrier}</span><small>${d.vessel}</small></div><div><span class="cd" data-until="${closesAt(d.closesInHours)}"></span><small>يقفل الحجز</small></div>
      <div><span class="num">متبقي <b>${d.left}</b> من ${d.of}</span><div class="lp-left"><i style="width:${Math.min(100, Math.round((d.left / d.of) * 300))}%"></i></div></div>
      <div>${money(d.dealPrice)}<div><span class="was">${moneyText(d.marketPrice)}</span> <span class="save">وفر ${dealPercent(d)}%</span></div></div>
      <button class="btn btn-primary btn-sm" data-act="interest">مهتم بالصفقة</button></div>`).join('')}</div>
      <div class="lp-panel__foot"><span>زر «مهتم بالصفقة» يحوّلك إلى فريق لاندد عبر واتساب. لا حجز آلي في المرحلة الأولى.</span><a class="btn btn-line btn-sm" href="${url('/app/deals.html')}">كل الصفقات</a></div>`;
  } else {
    const s = SHIPMENTS.find((x) => x.id === tourShip), ev = timeline(s);
    el.innerHTML = `<div class="lp-track"><div class="lp-track__map">${darkMap({ lanes: [s.from], shipId: s.id, fs: 13 })}</div>
      <div class="lp-track__side"><div class="flex flex-wrap gap-1.5">${SHIPMENTS.slice(0, 3).map((x) => `<button class="chip" data-act="track-pick" data-id="${x.id}" aria-pressed="${x.id === tourShip}"><span class="mono">${x.id.slice(0, 4)} ${x.id.slice(4, 8)}</span></button>`).join('')}</div>
      <h4 class="mt-4">${routeName(s.from, s.to)}، ${s.carrier} ${s.vessel}</h4>
      <ul class="lp-ev">${ev.map((e) => `<li class="${e.done ? 'done' : e.current ? 'now' : ''}"><span class="k">${e.done ? ic('check', 'sm').replace('class="ic sm"', 'class="ic sm" style="width:12px;height:12px;stroke-width:3"') : ''}</span><div>${e.label}<small>${e.done ? dayOffset(e.offset) : `متوقع ${dayOffset(e.offset)}`}</small></div></li>`).join('')}</ul></div></div>`;
  }
  tickCountdowns();
}

/* ------------------------------------------------------------------ lanes, sources, ledger, pricing, faq */
function renderLanes() {
  const j = buildOffers('shenzhen', 'jeddah', '40'), d = buildOffers('shenzhen', 'dammam', '40');
  const minmax = (l) => `${Math.min(...l.map((o) => o.days))} إلى ${Math.max(...l.map((o) => o.days))} يوماً`;
  const min = (l) => Math.min(...l.map((o) => o.total));
  $('#lanes').innerHTML = `<article class="lp-lane" style="background-image:url('/images/jeddah-corniche-red-sea.jpg')"><div class="lp-lane__in"><h3>جدة</h3><p>ميناء الوصول المباشر لمعظم الخطوط من الصين، مع ازدحام يضيف انتظاراً في الذروة.</p>
      <div class="lp-lane__facts"><div><small>أقل سعر شامل لحاوية 40 قدم</small><b>${money(min(j))}</b></div><div><small>مدة الرحلة</small><b>${minmax(j)}</b></div><div><small>انتظار إضافي في الذروة</small><b>7 إلى 14 يوماً</b></div></div>
      <button class="lp-btn lp-btn--ghost" data-act="lane" data-t="jeddah">قارن أسعار جدة</button></div></article>
    <article class="lp-lane" style="background-image:url('/images/container-truck-inland-road.jpg')"><div class="lp-lane__in"><h3>الدمام</h3><p>تصل حاويتك غالباً إلى جدة ثم تنتقل براً نحو 1,400 كم بسبب قيود مضيق هرمز.</p>
      <div class="lp-lane__facts"><div><small>أقل سعر شامل لحاوية 40 قدم</small><b>${money(min(d))}</b></div><div><small>مدة الرحلة</small><b>${minmax(d)}</b></div><div><small>رسوم النقل البري</small><b>${moneyText(ports.destinations.dammam.landFee)}</b></div></div>
      <button class="lp-btn lp-btn--ghost" data-act="lane" data-t="dammam">قارن أسعار الدمام</button></div></article>`;
}

const SOURCES = [
  ['خطوط DCSA', 'MSC وMaersk وCMA CGM وHapag-Lloyd وONE وEvergreen وغيرها. تتبع الحاويات لنحو 75% من التجارة العالمية.', 'now', 'المرحلة الأولى'],
  ['COSCO وOOCL', 'تتبع عبر مزود صيني (Freightower) ريثما يتوفر ربط مباشر عبر علاقات الحجز.', 'now', 'المرحلة الأولى'],
  ['Shipxy', 'مواقع السفن ومسارها الفعلي عبر شبكة AIS.', 'now', 'المرحلة الأولى'],
  ['الوكلاء الشركاء', 'الأسعار الشاملة والمساحات الفارغة، تُحدَّث كل 3 أيام تقريباً مع تاريخ التحديث.', 'now', 'المرحلة الأولى'],
  ['مؤشر SCFI', 'اتجاه السوق الأسبوعي لخط الخليج. يحتاج ترخيصاً تجارياً مكتوباً.', 'talk', 'الترخيص قيد التفاوض'],
  ['فسح (ZATCA)', 'حالة الشحنة بعد الوصول، وأساس تنبيه «ابدأ التخليص».', '', 'لاحقاً'],
  ['Maersk Offers API', 'أسعار فورية قابلة للحجز مع جدول الإبحار.', '', 'المرحلة الثانية'],
];
function renderSources() {
  $('#src-table').innerHTML = `<div class="lp-src__row lp-src__row--head" role="row"><span>المصدر</span><span>ما يغطيه</span><span>الحالة</span></div>` +
    SOURCES.map(([n, c, t, s]) => `<div class="lp-src__row" role="row"><b>${n}</b><span>${c}</span><span class="lp-tag${t ? ` lp-tag--${t}` : ''}">${s}</span></div>`).join('');
}

function renderLedger() {
  const all = buildOffers('shenzhen', 'jeddah', '40'), max = Math.max(...all.map((o) => o.total)), deal = DEALS[0].dealPrice;
  const gap = max - deal, demUsd = (3 * 280) / FX;
  const row = (l, s, v) => `<div class="lp-ledger__row"><div>${l}${s ? `<small>${s}</small>` : ''}</div><i></i><span class="v">${v}</span></div>`;
  $('#ledger').innerHTML = `<div class="lp-ledger"><span class="lp-stamp">مثال توضيحي</span><h3>كشف التوفير</h3><p class="lp-ledger__meta">حاوية ${boxName('40')}، ${routeName('shenzhen', 'jeddah')}</p>
    ${row('أغلى عرض في المقارنة', '', moneyText(max))}${row('صفقة مساحة فارغة على المسار نفسه', '', moneyText(deal))}${row('الفرق في سعر الحاوية', '', moneyText(gap))}${row('أرضيات تجنّبتها', '3 أيام بـ 280 ر.س لكل يوم', moneyText(demUsd))}
    <div class="lp-ledger__sum"><span>التوفير الإجمالي</span><span class="v">${moneyText(gap + demUsd)}</span></div></div>`;
}

function renderPlans() {
  $('#founding').innerHTML = `<div><b>عرض التأسيس</b> <small>(مثال توضيحي)</small><br><small>مقاعد بسعر تأسيس للمستوردين الأوائل</small></div><div class="lp-found__bar" role="progressbar" aria-valuenow="18" aria-valuemin="0" aria-valuemax="50" aria-label="المقاعد المحجوزة"><i style="width:36%"></i></div><b>18 من 50 مقعداً محجوزاً</b>`;
  $('#plans').innerHTML = marketing.plans.map((p) => `<article class="lp-plan${p.hot ? ' lp-plan--hot' : ''}">${p.hot ? '<span class="pill accent lp-plan__flag">الأكثر اختياراً</span>' : ''}<h3>${p.name}</h3>
    <div class="lp-plan__price"><b>${nf.format(p.price)}</b><span>ر.س${p.usd ? ` <bdi dir="ltr">(≈ $${p.usd})</bdi>` : ''}</span></div>
    <ul>${p.features.map((f) => `<li>${ic('check', 'sm')}<span>${f}</span></li>`).join('')}</ul>
    <a class="btn ${p.hot ? 'btn-accent' : 'btn-line'} btn-block" href="${url('/app/')}">${p.cta}</a></article>`).join('');
}

function renderFaq() {
  $('#faq-list').innerHTML = marketing.faq.map((f, i) => `<details${i === 0 ? ' open' : ''}><summary>${f.q}${ic('chev')}</summary><p>${f.a}</p></details>`).join('');
}

/* ------------------------------------------------------------------ events */
const rerender = () => { renderHero(); if (tab === 'rates') renderPanel(); };

onAction({
  tab: (el) => { tab = el.dataset.v; renderPanel(); },
  box: (el) => { store.set({ box: el.dataset.v }); rerender(); },
  'track-pick': (el) => { tourShip = el.dataset.id; renderPanel(); },
  lane: (el) => { store.set({ from: 'shenzhen', to: el.dataset.t, box: '40' }); location.href = url('/app/rates.html'); },
  interest: () => toast('تم تحويل اهتمامك إلى فريق لاندد عبر واتساب.'),
  partner: () => toast('شكراً لاهتمامك. سيتواصل معك فريق لاندد.'),
});
document.addEventListener('change', (e) => {
  const key = e.target.dataset?.bind;
  if (key && key !== 'days') { store.set({ [key]: e.target.value }); rerender(); }
});
document.addEventListener('input', (e) => {
  if (e.target.id === 'days') { days = +e.target.value; updateDem(); }
});
$('#hero-search').addEventListener('submit', (e) => { e.preventDefault(); location.href = url('/app/rates.html'); });

const header = $('#site-header');
const onScroll = () => header.classList.toggle('is-solid', window.scrollY > 40);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

renderHero(); renderHeroStatic(); renderJourney(); renderBento(); renderPanel(); renderLanes(); renderSources(); renderLedger(); renderPlans(); renderFaq();
startCountdowns();
