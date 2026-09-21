import { c } from '@/js/lib/color.js';

/** Tiny trend line with soft area fill and an emphasized end point. */
export function sparkline(values, w = 84, h = 30, color = c('brand'), { area = true, stroke = 2 } = {}) {
  const min = Math.min(...values), max = Math.max(...values), p = 3;
  const x = (i) => p + (i * (w - 2 * p)) / (values.length - 1);
  const y = (v) => h - p - ((v - min) / (max - min || 1)) * (h - 2 * p);
  const line = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const last = values.length - 1;
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="direction:ltr" aria-hidden="true">
    ${area ? `<path d="${line} L${x(last)} ${h} L${x(0)} ${h}Z" fill="${color}" opacity=".12"/>` : ''}
    <path d="${line}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${x(last).toFixed(1)}" cy="${y(values[last]).toFixed(1)}" r="3" fill="${color}"/></svg>`;
}
