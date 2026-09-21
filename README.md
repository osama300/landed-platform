# لاندد (Landed) — نموذج المنصة

نموذج محاكاة لمنصة أسعار الشحن البحري وتتبع الحاويات من الصين إلى السعودية.
Vite + Tailwind CSS 3 + JavaScript (ES modules) + Handlebars partials. لا يحتاج خادماً خلفياً: البيانات ملفات JSON.

## التشغيل
```bash
npm install
npm run dev      # http://127.0.0.1:5173
npm run build    # الناتج في dist/
npm run preview
```

## الهيكل
```
index.html                 صفحة الهبوط
resource.html              صفحة مصادر البيانات
app/                       صفحات المنصة: index (نظرة عامة)، rates، deals، tracking، alerts
src/partials/              قوالب HTML مشتركة (head، القائمة الجانبية، الشريط العلوي، رأس الموقع، التذييل)
public/images              صور Pexels مجانية الترخيص (CREDITS.md)
src/css/tokens.css         ألوان التصميم كمتغيرات (فاتح افتراضياً، داكن بـ data-theme="dark")
src/css/main.css           Tailwind + مكوّنات عامة (.btn .pill .card .tbl ...)
src/css/shell.css          قائمة المنصة الجانبية، الشريط العلوي، لوحة الأوامر ⌘K، مسرح الخريطة، شريط الصفقات
src/css/landing.css        تنسيق صفحة الهبوط
src/css/app-data.css       تنسيق صفحتي الأسعار ونظرة عامة
src/data/*.json            البيانات: الموانئ، الوكلاء، مواصفات الأسعار، الصفقات، الشحنات، التنبيهات، الخريطة
src/js/lib/                أدوات عامة: store (localStorage)، format، icons، modal، toast، countdown
src/js/services/           منطق البيانات: بناء العروض وترتيبها، السوق، الشحنات، الصفقات
src/js/components/         مكوّنات واجهة: صف العرض، نافذتا المقارنة والطلب، الرسم البياني، الخريطة
src/js/pages/              وحدة JS لكل صفحة
src/js/app-shell.js        سلوك مشترك لصفحات المنصة (التنقل، العملة، الإشعارات)
```

## ملاحظات
- كل الأسعار والبيانات توضيحية.
- الحالة المشتركة بين الصفحات (العملة، المسار، الحاوية المختارة) تُحفظ في `localStorage` عبر `src/js/lib/store.js`.
- لتغيير الهوية البصرية عدّل `src/css/tokens.css` فقط.
