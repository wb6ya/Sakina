/**
 * @file api.js
 * @description مسؤول عن التواصل مع Aladhan API.
 * يفصل منطق الشبكة عن منطق الواجهة.
 */

const API_BASE_URL = "https://api.aladhan.com/v1/timings";

/**
 * جلب مواقيت الصلاة ليوم محدد بناءً على الإحداثيات
 * @param {number} lat - خط العرض
 * @param {number} lng - خط الطول
 * @returns {Promise<Object>} كائن يحتوي على مواقيت الصلاة
 */
export const fetchPrayerTimes = async (lat, lng) => {
    // نستخدم "method=4" (توقيت مكة المكرمة) كافتراضي، ويمكن تغييره لاحقاً من الإعدادات
    const url = `${API_BASE_URL}?latitude=${lat}&longitude=${lng}&method=4`;

    try {
        console.log(`[API] Fetching prayer times for: ${lat}, ${lng}`);
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        
        // لماذا نتحقق من data.code؟
        // لأن API قد يرد بـ 200 OK لكن المحتوى به رسالة خطأ
        if (data.code !== 200) {
            throw new Error(data.status || "Unknown API Error");
        }

        console.log("[API] Success:", data.data.timings);
        return data.data.timings; // نرجع فقط التواقيت

    } catch (error) {
        console.error("[API] Failed to fetch timings:", error);
        // نعيد رمي الخطأ لكي تتعامل معه الواجهة (تظهر رسالة للمستخدم)
        throw error;
    }
};