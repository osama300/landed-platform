export const $ = (selector, scope = document) => scope.querySelector(selector);
export const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

/** Delegated click handling: routes any [data-act] click to handlers[act](el, event). */
export function onAction(handlers, scope = document) {
  scope.addEventListener('click', (event) => {
    const el = event.target.closest('[data-act]');
    if (!el) return;
    const handler = handlers[el.dataset.act];
    if (!handler) return;
    if (el.tagName === 'A') event.preventDefault();
    handler(el, event);
  });
}

export const mount = (selector, html) => {
  const el = $(selector);
  if (el) el.innerHTML = html;
  return el;
};
