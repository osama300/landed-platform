import map from '@/data/map.json';
import ports from '@/data/ports.json';
import { SHIPMENTS } from '@/js/services/shipments.js';
import { c } from '@/js/lib/color.js';

const { lonMin, latMax, scale } = map.view;
const project = (lon, lat) => [(lon - lonMin) * scale, (latMax - lat) * scale];
const polygon = (pts) => pts.map(([lon, lat]) => project(lon, lat).map((v) => v.toFixed(1)).join(',')).join(' ');
const lanePoints = (from) => [...map.originLanes[from], ...map.seaLane].map(([lon, lat]) => project(lon, lat));

function pointAt(pts, t) {
  const segs = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  const total = segs.reduce((a, b) => a + b, 0);
  let target = Math.max(0, Math.min(1, t)) * total, acc = 0;
  for (let i = 0; i < segs.length; i++) {
    if (acc + segs[i] >= target || i === segs.length - 1) {
      const f = (target - acc) / (segs[i] || 1);
      return {
        x: pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f,
        y: pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f,
        angle: (Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0]) * 180) / Math.PI,
        index: i,
      };
    }
    acc += segs[i];
  }
  return { x: pts.at(-1)[0], y: pts.at(-1)[1], angle: 0, index: pts.length - 2 };
}

function graticule() {
  let g = '';
  for (let lon = 30; lon <= 130; lon += 10) g += `<line x1="${(lon - lonMin) * scale}" x2="${(lon - lonMin) * scale}" y1="0" y2="480" stroke="${c('grat')}"/>`;
  for (let lat = 0; lat <= 45; lat += 10) g += `<line x1="0" x2="1000" y1="${(latMax - lat) * scale}" y2="${(latMax - lat) * scale}" stroke="${c('grat')}"/>`;
  return g;
}

const halo = `stroke="${c('sea')}" stroke-width="4" paint-order="stroke"`;
const label = (text, lon, lat, extra) => {
  const [x, y] = project(lon, lat);
  return `<text x="${x}" y="${y}" text-anchor="middle" ${extra}>${text}</text>`;
};

/** Schematic route map for the selected shipment; other shipments appear as clickable markers. */
export function routeMap(selectedId, { showAll = true } = {}) {
  const s = SHIPMENTS.find((x) => x.id === selectedId) ?? SHIPMENTS[0];
  const pts = lanePoints(s.from);
  const cur = pointAt(pts, s.progress);
  const done = [...pts.slice(0, cur.index + 1), [cur.x, cur.y]].map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ');
  const full = pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ');
  const jd = project(39.15, 21.5), dm = project(50.1, 26.45), ri = project(map.riyadh.lon, map.riyadh.lat), hz = project(map.hormuz.lon, map.hormuz.lat);
  const origin = ports.origins[s.from];
  const cities = [
    { n: origin.short, lon: origin.lon, lat: origin.lat, big: true },
    ...map.waypoints.map((w) => ({ n: w.name, lon: w.lon, lat: w.lat })),
    { n: 'جدة', lon: 39.15, lat: 21.5, big: true },
    { n: 'الدمام', lon: 50.1, lat: 26.45, big: true, up: 12 },
  ].map((p) => {
    const [x, y] = project(p.lon, p.lat);
    return `<circle cx="${x}" cy="${y}" r="${p.big ? 5.5 : 3.5}" fill="${p.big ? c('brand') : c('surface')}" stroke="${c('brand')}" stroke-width="2"/>
      <text x="${x}" y="${y - (p.up || 11)}" text-anchor="middle" font-size="${p.big ? 13 : 11.5}" font-weight="${p.big ? 700 : 500}" fill="${c('ink')}" ${halo}>${p.n}</text>`;
  }).join('');
  const others = showAll ? SHIPMENTS.filter((x) => x.id !== s.id).map((x) => {
    const p = pointAt(lanePoints(x.from), x.progress);
    return `<circle cx="${p.x}" cy="${p.y}" r="5" fill="${c('s2')}" stroke="${c('surface')}" stroke-width="2" data-pick="${x.id}" style="cursor:pointer"><title>${x.id}</title></circle>`;
  }).join('') : '';
  const landbridge = s.to === 'dammam' || showAll
    ? `<path d="M${jd[0]} ${jd[1]} Q${ri[0]} ${ri[1] + 18} ${dm[0]} ${dm[1]}" fill="none" stroke="${c('warn')}" stroke-width="2.4" stroke-dasharray="6 6"/>
       <text x="${ri[0] + 2}" y="${ri[1] + 40}" text-anchor="middle" font-size="11.5" font-weight="600" fill="${c('warn')}" stroke="${c('land')}" stroke-width="4" paint-order="stroke">نقل بري 1,400 كم</text>` : '';
  const seaText = (t, lon, lat, size = 12.5) => label(t, lon, lat, `font-size="${size}" fill="${c('mute')}" opacity=".8" font-style="italic"`);
  return `<svg viewBox="0 0 1000 480" style="direction:ltr" role="img" aria-label="خريطة تخطيطية لمسار الشحنة">
    <rect width="1000" height="480" fill="${c('sea')}"/>${graticule()}
    ${map.land.map((a) => `<polygon points="${polygon(a)}" fill="${c('land')}" stroke="${c('landLine')}" stroke-width="1.2" stroke-linejoin="round"/>`).join('')}
    <polygon points="${polygon(map.saudi)}" fill="${c('sa')}" stroke="${c('landLine')}"/>
    ${label('الصين', 100, 35, `font-size="15" font-weight="600" fill="${c('mute')}" opacity=".7"`)}
    ${label('الهند', 77, 22, `font-size="14" font-weight="600" fill="${c('mute')}" opacity=".7"`)}
    ${label('السعودية', 44.6, 24.8, `font-size="13" font-weight="700" fill="${c('brand')}"`)}
    ${seaText('بحر العرب', 63, 14)}${seaText('خليج البنغال', 87, 11)}${seaText('بحر الصين الجنوبي', 114, 13)}
    <polyline points="${full}" fill="none" stroke="${c('brand')}" stroke-opacity=".28" stroke-width="3" stroke-linejoin="round"/>
    <polyline points="${done}" fill="none" stroke="${c('brand')}" stroke-width="3.4" stroke-linejoin="round" stroke-linecap="round"/>
    ${landbridge}
    <circle cx="${hz[0]}" cy="${hz[1]}" r="6" fill="${c('bad')}" stroke="${c('surface')}" stroke-width="2"/>
    <text x="${hz[0]}" y="${hz[1] - 12}" text-anchor="middle" font-size="11.5" font-weight="700" fill="${c('bad')}" ${halo}>هرمز · حركة مقيّدة</text>
    ${cities}${others}
    <g transform="translate(${cur.x.toFixed(1)} ${cur.y.toFixed(1)})"><circle r="13" fill="${c('crane')}" opacity=".3"><animate attributeName="r" values="9;17;9" dur="2.4s" repeatCount="indefinite"/></circle>
      <circle r="8" fill="${c('crane')}" stroke="${c('nav')}" stroke-width="2.5"/><path d="M-3.4 1.6 0 -4.8 3.4 1.6Z" fill="${c('nav')}" transform="rotate(${(cur.angle + 90).toFixed(0)})"/></g></svg>`;
}
