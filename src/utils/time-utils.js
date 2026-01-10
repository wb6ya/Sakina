/**
 * @file time-utils.js
 * @description دوال مساعدة للتعامل مع الوقت وحسابات الصلاة (دعم عالمي للمناطق الزمنية)
 * @version 1.2 - Global Timezone Fix Added
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
 * دالة داخلية: تحويل وقت الهدف (مثل كندا) إلى وقت محلي (جهاز المستخدم)
 * هذا يحل مشكلة العداد 00:00 للدول البعيدة
 */
function convertTargetToLocal(targetDate, targetNow) {
    // 1. حساب الفرق الزمني بين وقت الصلاة هناك والوقت الحالي هناك
    const diff = targetDate.getTime() - targetNow.getTime();
    
    // 2. إضافة هذا الفرق للوقت المحلي الحالي
    // النتيجة: موعد الصلاة بتوقيت جهازك ليعمل العداد التنازلي بدقة
    return new Date(Date.now() + diff);
}

/**
 * الحصول على كائن Date يمثل "الآن" في المدينة المستهدفة
 * مع حماية ضد أخطاء المناطق الزمنية
 * @param {string} timezone - المنطقة الزمنية (مثلاً 'America/Toronto')
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
 * تحديد الصلاة القادمة (معدلة لدعم التوقيت العالمي)
 */
export const getNextPrayer = (timings, timezone, includeSunrise = false) => {
    try {
        // حماية: إذا لم تكن هناك مواقيت، لا تكمل
        if (!timings) return null;

        // 1. نحصل على الوقت الحالي "هناك" (في الدولة المختارة)
        const nowInTarget = getNowInZone(timezone);
        
        // القائمة الأساسية
        let prayerKeys = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
        
        // إضافة الشروق إذا تم تفعيله
        if (includeSunrise) {
            prayerKeys = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
        }

        // 2. البحث عن الصلاة القادمة حسب توقيتهم
        for (const key of prayerKeys) {
            const prayerTimeInTarget = parsePrayerTime(timings[key], nowInTarget);
            
            // المقارنة: هل وقت الصلاة هناك > الوقت الحالي هناك؟
            if (prayerTimeInTarget && prayerTimeInTarget > nowInTarget) {
                // 🔥 تحويل النتيجة لتوقيت جهازك
                return { 
                    key, 
                    time: convertTargetToLocal(prayerTimeInTarget, nowInTarget) 
                };
            }
        }

        // 3. إذا انتهت صلوات اليوم، نعود لفجر الغد
        const fajrTimeInTarget = parsePrayerTime(timings['Fajr'], nowInTarget);
        if (fajrTimeInTarget) {
            fajrTimeInTarget.setDate(fajrTimeInTarget.getDate() + 1); // إضافة يوم
            // 🔥 تحويل النتيجة لتوقيت جهازك
            return { 
                key: 'Fajr', 
                time: convertTargetToLocal(fajrTimeInTarget, nowInTarget) 
            };
        }

        return null;
    } catch (e) {
        console.error("Error getting next prayer:", e);
        return null;
    }
};

/**
 * التحقق مما إذا كنا حالياً في فترة "الإقامة"
 */
export const getCurrentIqamaPeriod = (timings, iqamaMinutes = 15, timezone) => {
    try {
        if (!timings) return null;

        const nowInTarget = getNowInZone(timezone);
        const prayers = ['Isha', 'Maghrib', 'Asr', 'Dhuhr', 'Fajr'];

        for (const p of prayers) {
            const pTimeTarget = parsePrayerTime(timings[p], nowInTarget);
            if (!pTimeTarget) continue;

            const diffMins = (nowInTarget - pTimeTarget) / 1000 / 60;

            // إذا مر الأذان ولم تنتهِ فترة الإقامة
            if (diffMins >= 0 && diffMins < iqamaMinutes) {
                // نحول الأوقات لتوقيت الجهاز المحلي لضمان دقة العدادات في الواجهة
                const localPrayerTime = convertTargetToLocal(pTimeTarget, nowInTarget);
                
                return {
                    prayer: p,
                    prayerTime: localPrayerTime,
                    iqamaTime: new Date(localPrayerTime.getTime() + iqamaMinutes * 60000)
                };
            }
        }
        return null;
    } catch (e) {
        console.error("Error checking iqama period:", e);
        return null;
    }
};