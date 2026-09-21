const listeners = new Set();
/** Pages register their render function; the shell calls emit() after global state (e.g. currency) changes. */
export const onRefresh = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const emit = () => listeners.forEach((fn) => fn());
