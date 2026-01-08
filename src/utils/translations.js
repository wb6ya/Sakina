/**
 * @file translations.js
 * @description قاموس النصوص العربية والإنجليزية (محدث)
 */

export const TRANSLATIONS = {
    ar: {
        dir: "rtl",
        // نصوص عامة
        appTitle: "Prayer Focus",
        loading: "جاري التحميل...",
        save: "حفظ الإعدادات",
        reset: "تغيير الموقع",
        manualSearch: "بحث يدوي",
        autoLocate: "تحديد تلقائي (GPS)",
        
        // 🆕 نصوص جديدة (Placeholders & Modal Buttons)
        placeholderCity: "اكتب اسم المدينة (مثل: Riyadh)...",
        btnYes: "نعم",
        btnNo: "لا",
        btnOk: "حسناً",
        
        // نصوص الواجهة
        nextPrayer: "الصلاة القادمة",
        remainingTime: "الوقت المتبقي",
        elapsedTime: "الوقت المنقضي",
        
        // الإعدادات
        labelLanguage: "اللغة / Language",
        labelAdhan: "تشغيل صوت الأذان",
        labelSunrise: "تنبيه الشروق",
        labelFullscreen: "شاشة كاملة وقت الإقامة",
        labelPreTime: "تنبيه قبل الأذان (دقيقة)",
        labelIqamaTime: "وقت الانتظار للإقامة (دقيقة)",

        // 🆕 نصوص الأذكار الجديدة
        labelAdhkar: "تفعيل الأذكار التلقائية",
        labelAdhkarTime: "وقت التكرار (دقيقة)",

        // التنبيهات
        prayerFajr: "الفجر",
        prayerSunrise: "الشروق",
        prayerDhuhr: "الظهر",
        prayerJumuah: "الجمعة",
        prayerAsr: "العصر",
        prayerMaghrib: "المغرب",
        prayerIsha: "العشاء",
        
        alertPreTitle: "قرب وقت الصلاة",
        alertPreMsg: "اقترب موعد صلاة {prayer}، استعد...",
        alertAdhanTitle: "حان وقت الصلاة",
        alertAdhanMsg: "حي على الصلاة.. حي على الفلاح",
        alertSunriseTitle: "وقت الشروق",
        alertSunriseMsg: "انتهى وقت صلاة الفجر",
        alertIqamaTitle: "إقامة الصلاة",
        alertAdhkarTitle: "ذكر الله",
        
        btnStopAudio: "إيقاف الصوت",
        btnMuted: "تم الإسكات",
        btnClose: "إغلاق"
    },
    en: {
        dir: "ltr",
        // General
        appTitle: "Prayer Focus",
        loading: "Loading...",
        save: "Save Settings",
        reset: "Change Location",
        manualSearch: "Manual Search",
        autoLocate: "Auto Locate (GPS)",
        
        // 🆕 New Keys
        placeholderCity: "Enter city name (e.g. London)...",
        btnYes: "Yes",
        btnNo: "No",
        btnOk: "OK",
        
        // UI
        nextPrayer: "Next Prayer",
        remainingTime: "Time Remaining",
        elapsedTime: "Time Elapsed",
        
        // Settings
        labelLanguage: "Language / اللغة",
        labelAdhan: "Enable Adhan Sound",
        labelSunrise: "Sunrise Alert",
        labelFullscreen: "Fullscreen Iqama Mode",
        labelPreTime: "Pre-Adhan Alert (min)",
        labelIqamaTime: "Iqama Wait Time (min)",

        // 🆕 New Adhkar Keys
        labelAdhkar: "Enable Auto Adhkar",
        labelAdhkarTime: "Repeat Interval (min)",

        // Notifications
        prayerFajr: "Fajr",
        prayerSunrise: "Sunrise",
        prayerDhuhr: "Dhuhr",
        prayerJumuah: "Jumu'ah",
        prayerAsr: "Asr",
        prayerMaghrib: "Maghrib",
        prayerIsha: "Isha",
        
        alertPreTitle: "Prayer is Near",
        alertPreMsg: "{prayer} prayer is coming soon...",
        alertAdhanTitle: "It's Prayer Time",
        alertAdhanMsg: "Hayya 'ala-Salah... Come to prayer",
        alertSunriseTitle: "Sunrise Time",
        alertSunriseMsg: "Fajr time has ended",
        alertIqamaTitle: "Iqama (Prayer Start)",
        alertAdhkarTitle: "Remembrance (Dhikr)",
        
        btnStopAudio: "Stop Audio",
        btnMuted: "Muted",
        btnClose: "Close"
    }
};