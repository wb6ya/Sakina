/**
 * @file storage.js
 * @description وحدة مركزية للتعامل مع تخزين المتصفح المحلي.
 * الهدف: تغليف chrome.storage.local لتسهيل التعامل معه باستخدام Promises.
 */

// المفاتيح المستخدمة في التخزين لتقليل الأخطاء الإملائية (Magic Strings)
export const STORAGE_KEYS = {
    USER_LOCATION: 'user_location', // { lat, lng, method, cityName }
    PRAYER_TIMES: 'prayer_times',   // الكاش لبيانات اليوم
    SETTINGS: 'app_settings'        // { muteAdhan, preAdhanTime, etc... }
};

/**
 * حفظ البيانات في التخزين المحلي
 * @param {string} key - المفتاح (يفضل استخدامه من STORAGE_KEYS)
 * @param {any} value - القيمة المراد حفظها
 */
export const saveToStorage = async (key, value) => {
    try {
        await chrome.storage.local.set({ [key]: value });
        console.log(`[Storage] Saved: ${key}`, value);
    } catch (error) {
        console.error(`[Storage] Error saving ${key}:`, error);
        throw error;
    }
};

/**
 * جلب البيانات من التخزين المحلي
 * @param {string} key - المفتاح
 * @returns {Promise<any>} القيمة المخزنة
 */
export const getFromStorage = async (key) => {
    try {
        const result = await chrome.storage.local.get([key]);
        return result[key];
    } catch (error) {
        console.error(`[Storage] Error getting ${key}:`, error);
        throw error;
    }
};