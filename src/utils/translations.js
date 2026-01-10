/**
 * @file translations.js
 * @description قاموس النصوص العربية والإنجليزية (محدث ومحسن)
 */

export const TRANSLATIONS = {
    ar: {
        dir: "rtl",
        // === نصوص عامة ===
        appTitle: "سكينة | Sakina",
        loading: "جاري التحميل...",
        save: "حفظ الإعدادات",
        reset: "تغيير الموقع",
        manualSearch: "بحث يدوي",
        autoLocate: "تحديد تلقائي (GPS)",
        
        // === النوافذ والمدخلات ===
        placeholderCity: "اكتب اسم المدينة (مثال: Riyadh)...",
        btnYes: "نعم",
        btnNo: "لا",
        btnOk: "حسناً",
        
        // === نصوص الواجهة الرئيسية ===
        nextPrayer: "الصلاة القادمة",
        remainingTime: "الوقت المتبقي",
        elapsedTime: "الوقت المنقضي",
        
        // === الإعدادات ===
        labelLanguage: "اللغة / Language",
        labelAdhan: "تشغيل صوت الأذان",
        labelSunrise: "تفعيل تنبيه الشروق",
        labelFullscreen: "شاشة كاملة وقت الإقامة",
        labelPreTime: "تنبيه قبل الأذان (بالدقائق)",
        labelIqamaTime: "وقت الانتظار للإقامة (بالدقائق)",

        // إعدادات الأذكار
        labelAdhkar: "تفعيل الأذكار التلقائية",
        labelAdhkarTime: "تكرار الذكر كل (دقيقة)",

        // === أسماء الصلوات ===
        prayerFajr: "الفجر",
        prayerSunrise: "الشروق",
        prayerDhuhr: "الظهر",
        prayerJumuah: "الجمعة",
        prayerAsr: "العصر",
        prayerMaghrib: "المغرب",
        prayerIsha: "العشاء",
        
        // === رسائل التنبيهات (محسنة) ===
        
        // قبل الأذان
        alertPreTitle: "اقترب الموعد",
        alertPreMsg: "دقائق معدودة تفصلنا عن أذان {prayer}، استعد للقاء الله.",

        // وقت الأذان
        alertAdhanTitle: "الله أكبر",
        alertAdhanMsg: "حان الآن موعد أذان {prayer} حسب توقيت مدينتك.",

        // وقت الشروق
        alertSunriseTitle: "إشراق الشمس",
        alertSunriseMsg: "أصبحنا وأصبح الملك لله.. (انتهى وقت صلاة الفجر).",

        // وقت الإقامة
        alertIqamaTitle: "إقامة الصلاة",
        alertIqamaMsg: "استووا واعتدلوا.. حان وقت إقامة صلاة {prayer}.",

        // الأذكار
        alertAdhkarTitle: "وقفة مع الذكر",

        // === أزرار التنبيه ===
        stateAdhan: "يُرفع الآن أذان",
        stateIqama: "تُقام الآن صلاة",
        stateWaiting: "متبقي على الإقامة",
        
        // === أزرار التحكم في التنبيه ===
        btnStopAudio: "إيقاف الصوت",
        btnMuted: "تم الإسكات",
        btnClose: "إغلاق"
    },
    
    en: {
        dir: "ltr",
        // === General ===
        appTitle: "Sakina | Prayer Focus",
        loading: "Loading...",
        save: "Save Settings",
        reset: "Change Location",
        manualSearch: "Manual Search",
        autoLocate: "Auto Locate (GPS)",
        
        // === Modals & Inputs ===
        placeholderCity: "Enter city name (e.g. London)...",
        btnYes: "Yes",
        btnNo: "No",
        btnOk: "OK",
        
        // === UI Labels ===
        nextPrayer: "Next Prayer",
        remainingTime: "Time Remaining",
        elapsedTime: "Time Elapsed",
        
        // === Settings ===
        labelLanguage: "Language / اللغة",
        labelAdhan: "Enable Adhan Sound",
        labelSunrise: "Sunrise Alert",
        labelFullscreen: "Fullscreen Iqama Mode",
        labelPreTime: "Pre-Adhan Alert (min)",
        labelIqamaTime: "Iqama Wait Time (min)",

        // Adhkar Settings
        labelAdhkar: "Enable Auto Adhkar",
        labelAdhkarTime: "Repeat Interval (min)",

        // === Prayer Names ===
        prayerFajr: "Fajr",
        prayerSunrise: "Sunrise",
        prayerDhuhr: "Dhuhr",
        prayerJumuah: "Jumu'ah",
        prayerAsr: "Asr",
        prayerMaghrib: "Maghrib",
        prayerIsha: "Isha",
        
        // === Notifications (Improved) ===
        
        // Pre-Adhan
        alertPreTitle: "Approaching Prayer",
        alertPreMsg: "A few minutes left until {prayer}. Prepare yourself.",

        // Adhan Time
        alertAdhanTitle: "It is Prayer Time",
        alertAdhanMsg: "It is now time for {prayer} Adhan in your city.",

        // Sunrise
        alertSunriseTitle: "Sunrise",
        alertSunriseMsg: "The time for Fajr prayer has ended.",

        // Iqama
        alertIqamaTitle: "Iqama Time",
        alertIqamaMsg: "Stand up for prayer. It is time for {prayer} Iqama.",

        // Adhkar
        alertAdhkarTitle: "Remembrance (Dhikr)",

        // === Notification Buttons ===
        stateAdhan: "Now Adhan for",
        stateIqama: "Now Iqama for",
        stateWaiting: "Time until Iqama",
        
        // === Notification Buttons ===
        btnStopAudio: "Stop Audio",
        btnMuted: "Muted",
        btnClose: "Close"
    }
};