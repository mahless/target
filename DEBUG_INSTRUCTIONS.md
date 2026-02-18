# خطوات تشخيص الشاشة البيضاء

## الخطوة 1: فتح أدوات المطور (Developer Tools)
1. افتح التطبيق في المتصفح (المنفذ 3000)
2. اضغط `F12` أو `Cmd+Option+I` (Mac) لفتح Developer Tools
3. اذهب إلى تبويب **Console**

## الخطوة 2: البحث عن الأخطاء
ابحث عن أي رسائل خطأ باللون الأحمر في الـ Console. 

الأخطاء الشائعة:
- ❌ `Cannot read property of undefined`
- ❌ `X is not defined`
- ❌ `Failed to fetch`
- ❌ `TypeError`

## الخطوة 3: أخبرني بالخطأ
انسخ النص الكامل لأول خطأ تراه (باللون الأحمر) وأرسله لي.

## حل سريع مؤقت
إذا لم تستطع فتح Console، جرب:
```bash
cd /Users/mohamedmahlis/Desktop/فتحي/target-government-services1
npm run dev
```
ثم افتح: http://localhost:5173/admin/inventory

وأخبرني ماذا ترى.
