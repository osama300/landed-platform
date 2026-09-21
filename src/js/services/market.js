import watchlist from '@/data/watchlist.json';
import { averageTotal } from './offers.js';

export const WATCHLIST = watchlist;

/** 12-week average all-in price series (USD) for a watched lane. */
export function watchSeries(w) {
  const now = averageTotal(w.from, w.to, w.box);
  return w.history.map((m) => Math.round((now * m) / 10) * 10);
}

export const pctChange = (series, weeksBack) => (series.at(-1) / series.at(-1 - weeksBack) - 1) * 100;
