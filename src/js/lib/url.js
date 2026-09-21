/** Prefixes an absolute in-site path ('/app/rates.html') with the deploy base (Vite `base`), e.g. for GitHub Pages sub-paths. */
export const url = (path) => import.meta.env.BASE_URL + path.replace(/^\//, '');
