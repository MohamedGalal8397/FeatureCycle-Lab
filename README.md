# WorkLog — Project Structure

## الملفات

```
worklog/
├── index.html              ← الـ HTML الوحيد (هيكل الـ UI بس، zero logic)
├── css/
│   └── styles.css          ← كل الـ CSS (ألوان، layout، components)
└── js/
    ├── utils.js            ← أدوات مشتركة (uid, dates, escHtml, showToast)
    ├── state.js            ← الـ state + localStorage + activeEntry/Tab helpers
    ├── renderer.js         ← كل دوال render الـ UI
    ├── actions.js          ← CRUD منطق (entries, tabs, bugs, MRs)
    ├── modals.js           ← كل الـ dialogs والـ overlays
    ├── viewer.js           ← View Mode overlay
    └── export.js           ← Save/Export JSON و HTML
```

## لو عايز تعدل حاجة

| المهمة | الملف |
|---|---|
| تغيير ألوان أو fonts أو sizes | `css/styles.css` |
| تعديل شكل الـ sidebar أو الـ tabs | `js/renderer.js` |
| إضافة field جديد في الـ tab | `js/renderer.js` → `_buildEditTabHTML()` |
| تغيير سلوك الـ Save button | `js/export.js` → `saveForProject()` |
| إضافة نوع export جديد | `js/export.js` |
| تعديل الـ bug create form | `js/modals.js` + `index.html` |
| إضافة action جديد على entries | `js/actions.js` |
| تغيير شكل الـ View Mode | `js/viewer.js` |
| تعديل structure الـ state | `js/state.js` |

## Load Order (مهم)
utils → state → renderer → actions → modals → viewer → export