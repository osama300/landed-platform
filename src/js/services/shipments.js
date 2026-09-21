import shipments from '@/data/shipments.json';
import events from '@/data/shipment-events.json';

export const SHIPMENTS = shipments;
export const STATUSES = events.statuses;

export const daysToArrival = (s) => Math.round((1 - Math.min(1, s.progress)) * s.totalDays);
export const freeDaysLeft = (s) => (s.status === 'atport' ? s.freeDays - s.daysInPort : s.freeDays);

/** Milestones with done/current flags and day offsets relative to today. */
export function timeline(s) {
  const toDammam = s.to === 'dammam';
  const items = events.milestones.map((m) => {
    const done = s.progress >= m.at;
    const offset = done ? -Math.max(0, (s.progress - m.at) * s.totalDays) : Math.max(1, (m.at - s.progress) * s.totalDays);
    return { label: toDammam && m.dammam ? m.dammam : m.label, done, offset };
  });
  const current = items.findIndex((e) => !e.done);
  return items.map((e, i) => ({ ...e, current: i === current }));
}
