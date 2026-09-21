import ports from '@/data/ports.json';
import agents from '@/data/agents.json';
import specs from '@/data/offer-specs.json';
import components from '@/data/price-components.json';
import { store } from '@/js/lib/store.js';

export const AGENTS = agents;
export const COMPONENTS = components;

/** Build the comparable offers for a lane + container type from agent price sheets. */
export function buildOffers(from, to, box) {
  const scale = box === '20' ? 0.58 : 1;
  const origin = ports.origins[from];
  const dest = ports.destinations[to];

  const list = specs.map((s, i) => {
    const c = {
      freight: Math.round((s.freight + origin.priceDelta) * scale),
      baf: Math.round(s.baf * scale),
      peak: Math.round(s.peak * scale),
      war: Math.round(s.war * scale),
      thc: Math.round(s.thc * scale),
      docs: s.docs,
      dthc: Math.round(s.dthc * scale),
    };
    if (dest.landFee) c.land = Math.round(dest.landFee * (box === '20' ? 0.62 : 1));
    const total = Object.values(c).reduce((a, b) => a + b, 0);
    const viaLand = Boolean(dest.landFee);
    return {
      id: `${from}-${to}-${box}-${i}`,
      agent: s.agent,
      carrier: s.carrier,
      service: viaLand ? (s.direct ? 'جدة ثم نقل بري' : `${s.service} ثم بري`) : s.service,
      direct: s.direct && !viaLand,
      days: s.days + dest.extraDays + origin.extraDays,
      freeDays: s.freeDays,
      components: c,
      total,
      sailIn: s.sailIn + (i % 2),
      updatedHoursAgo: s.updatedHoursAgo,
      weeklyChange: s.weeklyChange,
      box, from, to,
    };
  });

  const totals = list.map((o) => o.total);
  const days = list.map((o) => o.days);
  const free = list.map((o) => o.freeDays);
  const [minT, maxT] = [Math.min(...totals), Math.max(...totals)];
  const [minD, maxD] = [Math.min(...days), Math.max(...days)];
  const [minF, maxF] = [Math.min(...free), Math.max(...free)];

  list.forEach((o) => {
    o.score =
      0.55 * (1 - (o.total - minT) / (maxT - minT || 1)) +
      0.3 * (1 - (o.days - minD) / (maxD - minD || 1)) +
      0.15 * ((o.freeDays - minF) / (maxF - minF || 1)) +
      (agents[o.agent].verified ? 0.04 : 0);
    o.cheapest = o.total === minT;
    o.fastest = o.days === minD;
  });
  [...list].sort((a, b) => b.score - a.score)[0].best = true;
  return list;
}

export const averageTotal = (from, to, box) => {
  const l = buildOffers(from, to, box);
  return Math.round(l.reduce((s, o) => s + o.total, 0) / l.length);
};

/** Apply the user's filters and sort order from the store. */
export function filteredOffers() {
  const { from, to, box, sort, filters } = store.get();
  let l = buildOffers(from, to, box);
  if (filters.direct) l = l.filter((o) => o.direct);
  if (filters.longFree) l = l.filter((o) => o.freeDays >= 14);
  if (filters.verified) l = l.filter((o) => agents[o.agent].verified);
  if (filters.carrier !== 'all') l = l.filter((o) => o.carrier === filters.carrier);
  const by = { price: (a, b) => a.total - b.total, fast: (a, b) => a.days - b.days, value: (a, b) => b.score - a.score };
  return l.sort(by[sort] || by.value);
}
