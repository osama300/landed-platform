import { c } from '@/js/lib/color.js';
import { nf, toCurrency, moneyText, dayOffset } from '@/js/lib/format.js';

const H = 270, PL = 58, PR = 18, PT = 22, PB = 30;

function niceStep(range) {
  return [50, 100, 200, 250, 500, 1000, 2000, 2500, 5000].find((s) => range / s <= 5) ?? 5000;
}

function scaleFor(values, w) {
  const min = Math.min(...values), max = Math.max(...values), step = niceStep(max - min);
  const lo = Math.floor((min - step * 0.3) / step) * step;
  const hi = Math.ceil((max + step * 0.3) / step) * step;
  return {
    step, lo, hi,
    x: (i) => PL + (i * (w - PL - PR)) / (values.length - 1),
    y: (v) => PT + ((hi - v) / (hi - lo)) * (H - PT - PB),
  };
}

function svgMarkup(w, series, paid, band) {
  const vals = series.map(toCurrency), paidV = toCurrency(paid);
  const bMin = band ? band.min.map(toCurrency) : [], bMax = band ? band.max.map(toCurrency) : [];
  const sc = scaleFor([...vals, paidV, ...bMin, ...bMax], w);
  let grid = '';
  for (let t = sc.lo; t <= sc.hi; t += sc.step) {
    grid += `<line x1="${PL}" x2="${w - PR}" y1="${sc.y(t)}" y2="${sc.y(t)}" stroke="${c('line')}"/><text x="${PL - 10}" y="${sc.y(t) + 4}" text-anchor="end" font-size="12" fill="${c('mute')}">${nf.format(t)}</text>`;
  }
  const xl = vals.map((_, i) => (i % 3 === 0 || i === vals.length - 1)
    ? `<text x="${sc.x(i)}" y="${H - 8}" text-anchor="middle" font-size="12" fill="${c('mute')}">${dayOffset(-(vals.length - 1 - i) * 7)}</text>` : '').join('');
  const d = vals.map((v, i) => `${i ? 'L' : 'M'}${sc.x(i).toFixed(1)} ${sc.y(v).toFixed(1)}`).join(' ');
  const last = vals.length - 1;
  const bandPath = band ? `<path d="${bMax.map((v, i) => `${i ? 'L' : 'M'}${sc.x(i).toFixed(1)} ${sc.y(v).toFixed(1)}`).join(' ')} ${bMin.map((v, i) => `L${sc.x(bMin.length - 1 - i).toFixed(1)} ${sc.y(bMin[bMin.length - 1 - i]).toFixed(1)}`).join(' ')}Z" fill="${c('aqua', 0.22)}"/>` : '';
  return `<svg id="tsvg" width="${w}" height="${H}" viewBox="0 0 ${w} ${H}" style="direction:ltr;display:block" role="img" aria-label="تطور متوسط السعر الشامل خلال 12 أسبوعاً">
    <defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c('brand')}" stop-opacity=".25"/><stop offset="1" stop-color="${c('brand')}" stop-opacity="0"/></linearGradient></defs>
    ${grid}${xl}${bandPath}
    <line x1="${PL}" x2="${w - PR}" y1="${sc.y(paidV)}" y2="${sc.y(paidV)}" stroke="${c('warn')}" stroke-width="1.5" stroke-dasharray="5 5"/>
    <text x="${PL + 6}" y="${sc.y(paidV) - 7}" font-size="12" font-weight="600" fill="${c('warn')}">آخر شحنة دفعتها: ${nf.format(paidV)}</text>
    <path d="${d} L${sc.x(last)} ${H - PB} L${sc.x(0)} ${H - PB}Z" fill="url(#tg)"/>
    <path d="${d}" fill="none" stroke="${c('brand')}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>
    <line id="tx" x1="0" x2="0" y1="${PT}" y2="${H - PB}" stroke="${c('ink2')}" stroke-dasharray="3 4" opacity="0"/>
    <circle id="tc" r="5" cx="0" cy="0" fill="${c('surface')}" stroke="${c('brand')}" stroke-width="2.5" opacity="0"/>
    <circle cx="${sc.x(last)}" cy="${sc.y(vals[last])}" r="9" fill="${c('brand')}" opacity=".18"/><circle cx="${sc.x(last)}" cy="${sc.y(vals[last])}" r="4.5" fill="${c('brand')}"/>
    <rect id="tov" x="${PL}" y="${PT}" width="${w - PL - PR}" height="${H - PT - PB}" fill="transparent"/></svg>
    <div class="chart-tip" id="ttip" hidden></div>`;
}

/** Render the trend chart into `box` at its real pixel width and wire the hover tooltip. */
export function drawTrend(box, series, paid, band) {
  const w = Math.max(300, box.clientWidth - 24);
  box.innerHTML = svgMarkup(w, series, paid, band);
  const svg = box.querySelector('#tsvg'), overlay = box.querySelector('#tov');
  const tip = box.querySelector('#ttip'), vline = box.querySelector('#tx'), dot = box.querySelector('#tc');
  const vals = series.map(toCurrency);
  const sc = scaleFor([...vals, toCurrency(paid), ...(band ? band.min.map(toCurrency) : []), ...(band ? band.max.map(toCurrency) : [])], w);
  overlay.addEventListener('pointermove', (e) => {
    const r = svg.getBoundingClientRect();
    const px = (e.clientX - r.left) * (w / r.width);
    const i = Math.max(0, Math.min(vals.length - 1, Math.round((px - PL) / ((w - PL - PR) / (vals.length - 1)))));
    const cx = sc.x(i), cy = sc.y(vals[i]);
    vline.setAttribute('x1', cx); vline.setAttribute('x2', cx); vline.setAttribute('opacity', 1);
    dot.setAttribute('cx', cx); dot.setAttribute('cy', cy); dot.setAttribute('opacity', 1);
    tip.hidden = false;
    tip.style.left = `${cx + 16}px`; tip.style.top = `${cy + 8}px`;
    tip.innerHTML = `<b>${moneyText(series[i])}</b>${band ? `<br><span style="opacity:.75">من ${moneyText(band.min[i])} إلى ${moneyText(band.max[i])}</span>` : ''}<br><span style="opacity:.75">${dayOffset(-(vals.length - 1 - i) * 7)}</span>`;
  });
  overlay.addEventListener('pointerleave', () => {
    tip.hidden = true; vline.setAttribute('opacity', 0); dot.setAttribute('opacity', 0);
  });
}
