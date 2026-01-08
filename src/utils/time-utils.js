/**
 * @file time-utils.js
 * @description دوال مساعدة للتعامل مع الوقت وحسابات الصلاة (تدعم المناطق الزمنية)
 */

export const PRAYER_NAMES = {
    Fajr: "الفجر",
    Sunrise: "الشروق", // 👈 تمت الإضافة
    Dhuhr: "الظهر",
    Asr: "العصر",
    Maghrib: "المغرب",
    Isha: "العشاء"
};

/**
 * الحصول على كائن Date يمثل "الآن" في المدينة المستهدفة
 * @param {string} timezone - المنطقة الزمنية (مثلاً 'Asia/Riyadh')
 */
export const getNowInZone = (timezone) => {
    if (!timezone) return new Date(); // افتراضي للجهاز
    
    // نحصل على الوقت الحالي في المنطقة المحددة كنص
    const strTime = new Date().toLocaleString('en-US', { timeZone: timezone });
    return new Date(strTime);
};

/**
 * تحويل نص وقت الصلاة إلى كائن Date بناءً على تاريخ "الآن" في تلك المنطقة
 */
export const parsePrayerTime = (timeStr, nowDate) => {
    const cleanTime = timeStr.split(' ')[0];
    const [hours, minutes] = cleanTime.split(':').map(Number);
    
    const date = new Date(nowDate); // نسخ التاريخ الحالي للمدينة
    date.setHours(hours, minutes, 0, 0);
    return date;
};

/**
 * تحديد الصلاة القادمة
 */
export const getNextPrayer = (timings, timezone, includeSunrise = false) => {
    const now = getNowInZone(timezone);
    // القائمة الأساسية
    let prayerKeys = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    
    // إذا فعل المستخدم الشروق، نضيفه في مكانه الصحيح (بعد الفجر)
    if (includeSunrise) {
        prayerKeys = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    }

    for (const key of prayerKeys) {
        const time = parsePrayerTime(timings[key], now);
        if (time > now) {
            return { key, time };
        }
    }

    const fajrTime = parsePrayerTime(timings['Fajr'], now);
    fajrTime.setDate(fajrTime.getDate() + 1);
    return { key: 'Fajr', time: fajrTime };
};

/**
 * التحقق من فترة الإقامة
 */
export const getCurrentIqamaPeriod = (timings, iqamaMinutes = 15, timezone) => {
    const now = getNowInZone(timezone);
    const prayers = ['Isha', 'Maghrib', 'Asr', 'Dhuhr', 'Fajr']; // الشروق ليس هنا

    for (const p of prayers) {
        const pTime = parsePrayerTime(timings[p], now);
        const diffMins = (now - pTime) / 1000 / 60;

        if (diffMins >= 0 && diffMins < iqamaMinutes) {
            return {
                prayer: p,
                prayerTime: pTime,
                iqamaTime: new Date(pTime.getTime() + iqamaMinutes * 60000)
            };
        }
    }
    return null;
};