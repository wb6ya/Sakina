/**
 * @file storage.js
 * @description وحدة مركزية للتعامل مع تخزين المتصفح المحلي (Chrome Storage API).
 * الهدف: تغليف العمليات لتسهيل التعامل معها ومنع توقف التطبيق عند الأخطاء.
 */

// المفاتيح المستخدمة في التخزين لتقليل الأخطاء الإملائية (Magic Strings)
export const STORAGE_KEYS = {
    USER_LOCATION: 'user_location', // { lat, lng, name, timezone }
    PRAYER_TIMES: 'prayer_times',   // الكاش لبيانات اليوم
    SETTINGS: 'app_settings',       // { language, adhanSound, ... }
    
    // مفاتيح الأصوات المخصصة (للتوافق مع service-worker.js)
    CUSTOM_ADHAN: 'custom_adhan_sound',
    CUSTOM_IQAMA: 'custom_iqama_sound'
    // ملاحظة: الأذكار والشروق لا يحتاجون مفاتيح لأننا وحدناهم على الملف الافتراضي
};

/**
 * حفظ البيانات في التخزين المحلي
 * @param {string} key - المفتاح (يفضل استخدامه من STORAGE_KEYS)
 * @param {any} value - القيمة المراد حفظها
 * @returns {Promise<boolean>} تعيد true إذا نجح الحفظ، و false إذا فشل
 */
export const saveToStorage = async (key, value) => {
    try {
        await chrome.storage.local.set({ [key]: value });
        // console.log(`[Storage] Saved: ${key}`); // تم التعطيل لتقليل الضجيج في الكونسول
        return true;
    } catch (error) {
        console.error(`[Storage] Failed to save ${key}:`, error);
        // لا نقوم بعمل throw error هنا لكي لا يتوقف البرنامج، بل نعيد false
        return false;
    }
};

/**
 * جلب البيانات من التخزين المحلي
 * @param {string} key - المفتاح
 * @returns {Promise<any>} القيمة المخزنة أو null في حال الخطأ/عدم الوجود
 */
export const getFromStorage = async (key) => {
    try {
        const result = await chrome.storage.local.get([key]);
        return result[key];
    } catch (error) {
        console.error(`[Storage] Failed to get ${key}:`, error);
        // نعيد null بدلاً من إيقاف البرنامج
        return null;
    }
};

/**
 * دالة مساعدة لحذف مفاتيح معينة (لإعادة الضبط)
 * @param {Array<string>} keys - قائمة المفاتيح
 */
export const removeFromStorage = async (keys) => {
    try {
        await chrome.storage.local.remove(keys);
        return true;
    } catch (error) {
        console.error(`[Storage] Failed to remove keys:`, error);
        return false;
    }
};