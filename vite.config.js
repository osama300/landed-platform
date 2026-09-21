import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import handlebars from 'vite-plugin-handlebars';

const root = import.meta.dirname;
/** Deploy sub-path (e.g. '/landed-platform/' on GitHub Pages); '/' for local dev. */
const base = process.env.BASE_PATH || '/';

const pages = {
  '/index.html': { title: 'لاندد | أسعار الشحن البحري وتتبع الحاويات من الصين إلى السعودية', page: 'landing' },
  '/resource.html': { title: 'مصادر البيانات | لاندد', page: 'resource' },
  '/app/index.html': { title: 'نظرة عامة | لاندد', page: 'overview' },
  '/app/rates.html': { title: 'مقارنة الأسعار | لاندد', page: 'rates' },
  '/app/deals.html': { title: 'صفقات المساحات | لاندد', page: 'deals' },
  '/app/tracking.html': { title: 'تتبع الحاويات | لاندد', page: 'tracking' },
  '/app/alerts.html': { title: 'التنبيهات | لاندد', page: 'alerts' },
};

export default defineConfig({
  base,
  plugins: [
    handlebars({
      partialDirectory: resolve(root, 'src/partials'),
      context: (pagePath) => ({ ...(pages[pagePath] || {}), pages, base }),
    }),
  ],
  resolve: { alias: { '@': resolve(root, 'src') } },
  build: {
    rollupOptions: {
      input: {
        landing: resolve(root, 'index.html'),
        resource: resolve(root, 'resource.html'),
        overview: resolve(root, 'app/index.html'),
        rates: resolve(root, 'app/rates.html'),
        deals: resolve(root, 'app/deals.html'),
        tracking: resolve(root, 'app/tracking.html'),
        alerts: resolve(root, 'app/alerts.html'),
      },
    },
  },
});
