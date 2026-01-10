/**
 * @file utils/prayer-logic.js
 * @description المنطق الحسابي لتحديد حالة الصلاة (أذان، إقامة، انتظار)
 */

import { parsePrayerTime } from './time-utils.js';

// الثوابت الزمنية (بالدقائق)
export const DURATION_ADHAN = 3;         // مدة حالة الأذان
export const DURATION_IQAMA_DISPLAY = 6; // مدة عرض شاشة الإقامة

/**
 * دالة ذكية لتحديد حالة الصلاة الحالية بدقة
 * @param {Object} timings - كائن مواقيت الصلاة من API
 * @param {number} iqamaOffsetMin - وقت الانتظار للإقامة (من الإعدادات)
 * @returns {Object} الحالة الحالية { mode, prayerKey, iqamaTime, ... }
 */
export function getPrayerState(timings, iqamaOffsetMin) {
    const now = Date.now();
    const prayerKeys = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    const isFriday = new Date().getDay() === 5;
    
    let activeState = { mode: 'NORMAL' };

    // 1. تحويل الأوقات النصية إلى كائنات Date (Timestamps)
    const prayers = prayerKeys.map(key => {
        const time = parsePrayerTime(timings[key], new Date());
        let finalKey = key;
        if (key === 'Dhuhr' && isFriday) finalKey = 'Jumuah';
        return { 
            key: finalKey, 
            time: time.getTime(), 
            isSunrise: key === 'Sunrise' 
        };
    });

    // 2. فحص النطاق الزمني الحالي
    for (let p of prayers) {
        const adhanStart = p.time;
        
        // استثناء الشروق (ليس له إقامة)
        if (p.isSunrise) continue;

        const iqamaTime = adhanStart + (iqamaOffsetMin * 60 * 1000);
        const iqamaEnd = iqamaTime + (DURATION_IQAMA_DISPLAY * 60 * 1000);

        // الحالة أ: فترة الانتظار (من بداية الأذان وحتى لحظة الإقامة)
        if (now >= adhanStart && now < iqamaTime) {
            return { mode: 'WAITING_IQAMA', prayerKey: p.key, iqamaTime: iqamaTime };
        }

        // الحالة ب: وقت الإقامة (من لحظة الإقامة ولمدة 6 دقائق)
        if (now >= iqamaTime && now < iqamaEnd) {
            return { mode: 'IQAMA_ACTIVE', prayerKey: p.key };
        }
    }

    // إذا لم ينطبق أي شرط، نعود للوضع الطبيعي
    return activeState;
}