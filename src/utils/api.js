/**
 * @file api.js
 * @description مسؤول عن التواصل مع Aladhan API.
 * يفصل منطق الشبكة عن منطق الواجهة مع حماية من البطء والأخطاء.
 */

const API_BASE_URL = "https://api.aladhan.com/v1/timings";

/**
 * جلب مواقيت الصلاة ليوم محدد بناءً على الإحداثيات
 * @param {number} lat - خط العرض
 * @param {number} lng - خط الطول
 * @param {number} method - طريقة الحساب (الافتراضي 4: أم القرى)
 * @returns {Promise<Object|null>} كائن البيانات (التواقيت + المنطقة الزمنية) أو null في حال الفشل
 */
export const fetchPrayerTimes = async (lat, lng, method = 4) => {
    // إضافة تحكم في المهلة (Timeout) لعدم تعليق التطبيق
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // مهلة 10 ثوانٍ

    const url = `${API_BASE_URL}?latitude=${lat}&longitude=${lng}&method=${method}`;

    try {
        console.log(`[API] Fetching prayer times for: ${lat}, ${lng}`);
        
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId); // إلغاء المهلة عند النجاح

        if (!response.ok) {
            console.error(`[API] HTTP Error: ${response.status}`);
            return null;
        }

        const data = await response.json();
        
        if (data.code !== 200) {
            console.error(`[API] Logic Error: ${data.status}`);
            return null;
        }

        // ⚠️ تعديل هام: نرجع data.data كاملة لأننا نحتاج timings و meta.timezone
        // popup.js يعتمد على timezone لحساب الوقت المتبقي
        return data.data; 

    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            console.warn("[API] Request timed out (Server took too long).");
        } else {
            console.error("[API] Network Error:", error);
        }
        // إرجاع null بدلاً من رمي الخطأ لضمان استمرار عمل التطبيق (Fail-safe)
        return null;
    }
};