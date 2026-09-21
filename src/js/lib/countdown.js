import { NOW } from './format.js';
import { $$ } from './dom.js';

export const closesAt = (hours) => NOW + hours * 3600e3;

const pad = (n) => String(n).padStart(2, '0');

export function tickCountdowns() {
  const now = Date.now();
  $$('[data-until]').forEach((el) => {
    let s = Math.max(0, Math.floor((+el.dataset.until - now) / 1000));
    const d = Math.floor(s / 86400); s -= d * 86400;
    const h = Math.floor(s / 3600); s -= h * 3600;
    const m = Math.floor(s / 60); s -= m * 60;
    el.textContent = `${d > 0 ? `${d}d ` : ''}${pad(h)}:${pad(m)}:${pad(s)}`;
  });
}

export function startCountdowns() {
  tickCountdowns();
  setInterval(tickCountdowns, 1000);
}
