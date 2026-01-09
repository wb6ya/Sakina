/**
 * @file time-utils.js
 * @description دوال مساعدة للتعامل مع الوقت وحسابات الصلاة (تدعم المناطق الزمنية)
 * @version 1.1 - Robust Error Handling Added
 */

export const PRAYER_NAMES = {
    Fajr: "الفجر",
    Sunrise: "الشروق",
    Dhuhr: "الظهر",
    Asr: "العصر",
    Maghrib: "المغرب",
    Isha: "العشاء"
};

/**
 * الحصول على كائن Date يمثل "الآن" في المدينة المستهدفة
 * مع حماية ضد أخطاء المناطق الزمنية
 * @param {string} timezone - المنطقة الزمنية (مثلاً 'Asia/Riyadh')
 */
export const getNowInZone = (timezone) => {
    try {
        if (!timezone) return new Date(); // افتراضي للجهاز
        
        // محاولة تحويل الوقت للمنطقة المحددة
        const strTime = new Date().toLocaleString('en-US', { timeZone: timezone });
        return new Date(strTime);
    } catch (e) {
        console.warn(`Timezone Error (${timezone}), falling back to local time:`, e);
        return new Date(); // في حال الخطأ، استخدم وقت الجهاز ولا توقف البرنامج
    }
};

/**
 * تحويل نص وقت الصلاة إلى كائن Date بناءً على تاريخ "الآن" في تلك المنطقة
 */
export const parsePrayerTime = (timeStr, nowDate) => {
    try {
        if (!timeStr || typeof timeStr !== 'string') return null;

        const cleanTime = timeStr.split(' ')[0]; // إزالة (EST) وما شابه
        const [hours, minutes] = cleanTime.split(':').map(Number);
        
        const date = new Date(nowDate); // نسخ التاريخ الحالي للمدينة
        
        // التحقق من صحة التاريخ قبل إرجاعه
        if (isNaN(date.getTime())) return new Date(); 

        date.setHours(hours, minutes, 0, 0);
        return date;
    } catch (e) {
        console.error("Error parsing prayer time:", e);
        return null;
    }
};

/**
 * تحديد الصلاة القادمة
 */
export const getNextPrayer = (timings, timezone, includeSunrise = false) => {
    try {
        // حماية: إذا لم تكن هناك مواقيت، لا تكمل
        if (!timings) return null;

        const now = getNowInZone(timezone);
        
        // القائمة الأساسية
        let prayerKeys = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
        
        // إضافة الشروق إذا تم تفعيله
        if (includeSunrise) {
            prayerKeys = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
        }

        for (const key of prayerKeys) {
            const time = parsePrayerTime(timings[key], now);
            if (time && time > now) {
                return { key, time };
            }
        }

        // إذا انتهت صلوات اليوم، نعود لفجر الغد
        const fajrTime = parsePrayerTime(timings['Fajr'], now);
        if (fajrTime) {
            fajrTime.setDate(fajrTime.getDate() + 1);
            return { key: 'Fajr', time: fajrTime };
        }

        return null; // حالة نادرة جداً
    } catch (e) {
        console.error("Error getting next prayer:", e);
        return null;
    }
};

/**
 * التحقق مما إذا كنا حالياً في فترة "الإقامة" (بعد الأذان وقبل الصلاة)
 */
export const getCurrentIqamaPeriod = (timings, iqamaMinutes = 15, timezone) => {
    try {
        if (!timings) return null;

        const now = getNowInZone(timezone);
        // الشروق لا توجد له إقامة، لذا نستبعده من هنا
        const prayers = ['Isha', 'Maghrib', 'Asr', 'Dhuhr', 'Fajr'];

        for (const p of prayers) {
            const pTime = parsePrayerTime(timings[p], now);
            if (!pTime) continue;

            const diffMins = (now - pTime) / 1000 / 60;

            // إذا مر الأذان ولم تنتهِ فترة الإقامة
            if (diffMins >= 0 && diffMins < iqamaMinutes) {
                return {
                    prayer: p,
                    prayerTime: pTime,
                    iqamaTime: new Date(pTime.getTime() + iqamaMinutes * 60000)
                };
            }
        }
        return null;
    } catch (e) {
        console.error("Error checking iqama period:", e);
        return null;
    }
};