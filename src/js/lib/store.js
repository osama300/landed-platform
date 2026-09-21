const KEY = 'landed:v1';

const defaults = {
  currency: 'SAR',
  box: '40',
  from: 'shenzhen',
  to: 'jeddah',
  sort: 'value',
  filters: { direct: false, longFree: false, verified: false, carrier: 'all' },
  compare: [],
  alertOn: false,
  watch: 'w1',
  trackId: 'MSKU4821937',
  dealsInterested: [],
  rules: {},
};

function load() {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { ...defaults };
  }
}

const state = load();

export const store = {
  get: () => state,
  set(patch) {
    Object.assign(state, patch);
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage unavailable */ }
  },
  reset() {
    Object.assign(state, defaults);
    try { localStorage.removeItem(KEY); } catch { /* noop */ }
  },
};
