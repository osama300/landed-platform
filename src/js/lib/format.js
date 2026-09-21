import { store } from './store.js';
import ports from '@/data/ports.json';

export const FX = 3.75; // SAR per USD (peg)
export const NOW = Date.now();
const DAY = 864e5;

export const nf = new Intl.NumberFormat('en-US');
const dShort = new Intl.DateTimeFormat('ar-u-ca-gregory-nu-latn', { day: 'numeric', month: 'short' });
const dLong = new Intl.DateTimeFormat('ar-u-ca-gregory-nu-latn', { weekday: 'long', day: 'numeric', month: 'long' });

export const dayOffset = (n) => dShort.format(new Date(NOW + n * DAY));
export const longDate = (d = new Date(NOW)) => dLong.format(d);

export const toCurrency = (usd) => (store.get().currency === 'SAR' ? Math.round(usd * FX) : Math.round(usd));
export const currencyLabel = () => (store.get().currency === 'SAR' ? 'ر.س' : '$');

/** Big price: number + small currency (for price columns). */
export function money(usd) {
  const value = nf.format(toCurrency(usd));
  return store.get().currency === 'SAR'
    ? `<bdi><span class="amt">${value}</span> <span class="cur">ر.س</span></bdi>`
    : `<bdi dir="ltr"><span class="cur">$</span><span class="amt">${value}</span></bdi>`;
}

/** Inline price text. */
export function moneyText(usd) {
  const value = nf.format(toCurrency(usd));
  return store.get().currency === 'SAR' ? `<bdi>${value} ر.س</bdi>` : `<bdi dir="ltr">$${value}</bdi>`;
}

/** The other currency, for a "≈" hint. */
export function altMoney(usd) {
  return store.get().currency === 'SAR'
    ? `<bdi dir="ltr">≈ $${nf.format(usd)}</bdi>`
    : `<bdi>≈ ${nf.format(Math.round(usd * FX))} ر.س</bdi>`;
}

export const agoText = (hours) => (hours < 1 ? 'الآن' : hours < 24 ? `قبل ${hours} ساعة` : 'قبل يوم');
export const boxName = (box) => (box === '20' ? '20 قدم' : '40 قدم عالية');
export const routeName = (from, to) => `${ports.origins[from].short} ← ${ports.destinations[to].short}`;
export const containerNo = (id) => `${id.slice(0, 4)} ${id.slice(4, 10)} ${id.slice(10)}`;

export function trendBadge(pct) {
  if (!pct) return '<span class="trend fl">ثابت</span>';
  const up = pct > 0;
  return `<span class="trend ${up ? 'up' : 'dn'}">${up ? '▲' : '▼'} ${Math.abs(pct).toFixed(1)}%</span>`;
}
