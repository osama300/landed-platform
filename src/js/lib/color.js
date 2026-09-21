/** Design tokens are RGB channel variables (see src/css/tokens.css); this wraps them for inline SVG. */
export const c = (name, alpha) => (alpha == null ? `rgb(var(--c-${name}))` : `rgb(var(--c-${name}) / ${alpha})`);
