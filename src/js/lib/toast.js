import { ic } from './icons.js';

export function toast(message) {
  let host = document.querySelector('.toasts');
  if (!host) {
    host = document.createElement('div');
    host.className = 'toasts';
    host.setAttribute('role', 'status');
    document.body.appendChild(host);
  }
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `${ic('check')}<span>${message}</span>`;
  host.appendChild(el);
  setTimeout(() => el.remove(), 3600);
}
