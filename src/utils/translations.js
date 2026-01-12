/**
 * @file translations.js
 * @description قاموس النصوص العربية والإنجليزية (شامل الرسائل والتنبيهات)
 */

export const TRANSLATIONS = {
    ar: {
        dir: "rtl",
        // شاشة البداية
        welcomeTitle: "مرحباً بك في سكينة",
        welcomeDesc: "لضبط مواقيت الصلاة بدقة",
        placeholderCity: "اكتب اسم المدينة (مثال: Riyadh)...",
        manualSearch: "بحث يدوي",
        autoLocate: "تحديد تلقائي (GPS)",
        or: "أو بحث يدوي",
        langSwitchBtn: "English", 
        loadingText: "جاري تحميل البيانات...",

        // الواجهة الرئيسية
        nextPrayer: "الصلاة القادمة",
        btnQuran: "📖 المصحف الشريف",
        
        // الإعدادات - العناوين
        settingsTitle: "الإعدادات",
        secGeneral: "عام",
        secAlerts: "التنبيهات",
        secAudio: "تخصيص الأصوات",
        secAdhkar: "الأذكار",
        secTiming: "التوقيت",
        
        // الإعدادات - النصوص
        lblLanguage: "اللغة",
        lblSunriseAlert: "تنبيه الشروق",
        lblAdhanSound: "تشغيل صوت الأذان",
        lblPreTime: "تنبيه قبل (د)",
        lblIqamaTime: "انتظار الإقامة (د)",
        lblFullscreen: "شاشة كاملة وقت الإقامة",
        lblAudioAdhan: "الأذان",
        lblAudioIqama: "الإقامة",
        lblAdhkarEnable: "تفعيل الأذكار التلقائية",
        lblAdhkarTime: "وقت التكرار (دقيقة)",
        
        // الأزرار والحالات
        statusDefault: "الافتراضي",
        statusCustom: "مخصص",
        save: "حفظ الإعدادات",
        reset: "تغيير الموقع",
        btnUpload: "جاري الرفع...",
        
        // المودال والأزرار العامة
        btnYes: "نعم",
        btnNo: "لا",
        btnOk: "موافق",
        
        // === الرسائل والتنبيهات (جديد) ===
        lblSuccess: "تم",
        lblError: "خطأ",
        lblWarning: "تنبيه",
        lblConfirm: "تأكيد",
        
        msgSaved: "تم حفظ الإعدادات بنجاح",
        msgSaveError: "فشل حفظ الإعدادات",
        msgResetConfirm: "هل أنت متأكد؟ سيتم مسح الموقع والبيانات.",
        msgResetDone: "تمت إعادة الضبط بنجاح",
        
        msgCityNotFound: "لم يتم العثور على المدينة",
        msgSearchError: "تعذر البحث، تأكد من الاتصال",
        msgAutoLocateSuccess: "تم تحديد الموقع: ",
        msgAutoLocateError: "فشل تحديد الموقع التلقائي",
        msgConfirmCity: "هل تود اعتماد: ",
        
        msgFileTooBig: "حجم الملف كبير جداً (الحد الأقصى 2MB)",
        msgFileSaved: "تم حفظ الملف الصوتي بنجاح",
        msgQuotaError: "المساحة ممتلئة، يرجى حذف ملفات أخرى",
        msgFileError: "فشل حفظ الملف",
        msgDefaultRestored: "تمت استعادة الصوت الافتراضي",
        msgRestoreError: "فشل الاستعادة",
        
        msgQuranSystem: "لا يمكن فتح المصحف في صفحات النظام.<br>يرجى فتح موقع عادي.",

        // الصلوات
        prayerFajr: "الفجر",
        prayerSunrise: "الشروق",
        prayerDhuhr: "الظهر",
        prayerJumuah: "الجمعة",
        prayerAsr: "العصر",
        prayerMaghrib: "المغرب",
        prayerIsha: "العشاء",

        // حالات الصلاة
        stateAdhan: "يُرفع الآن أذان",
        stateIqama: "تُقام الآن صلاة",
        stateWaiting: "متبقي على الإقامة",

         // تنبيهات الأذان
        alertPreTitle: "اقترب الموعد",
        alertPreMsg: "دقائق معدودة تفصلنا عن أذان {prayer}، استعد للقاء الله.",
        alertAdhanTitle: "الله أكبر",
        alertAdhanMsg: "حان الآن موعد أذان {prayer} حسب توقيت مدينتك.",
        alertSunriseTitle: "إشراق الشمس",
        alertSunriseMsg: "أصبحنا وأصبح الملك لله.. (انتهى وقت صلاة الفجر).",
        alertIqamaTitle: "إقامة الصلاة",
        alertIqamaMsg: "استووا واعتدلوا.. حان وقت إقامة صلاة {prayer}.",
        alertAdhkarTitle: "وقفة مع الذكر",

        // أزرار التحكم
        btnStopAudio: "إيقاف الصوت",
        btnMuted: "تم الإسكات",
        btnClose: "إغلاق"
    },
    en: {
        dir: "ltr",
        // Onboarding
        welcomeTitle: "Welcome to Sakina",
        welcomeDesc: "For accurate prayer times",
        placeholderCity: "Enter city name (e.g. London)...",
        manualSearch: "Search",
        autoLocate: "Auto Locate (GPS)",
        or: "OR Manual Search",
        langSwitchBtn: "عربي",
        loadingText: "Loading data...",

        // Main UI
        nextPrayer: "Next Prayer",
        btnQuran: "📖 Read Quran",
        
        // Settings - Titles
        settingsTitle: "Settings",
        secGeneral: "General",
        secAlerts: "Alerts",
        secAudio: "Audio Customization",
        secAdhkar: "Adhkar",
        secTiming: "Timing",
        
        // Settings - Labels
        lblLanguage: "Language",
        lblSunriseAlert: "Sunrise Alert",
        lblAdhanSound: "Enable Adhan Sound",
        lblPreTime: "Pre-Adhan Alert (min)",
        lblIqamaTime: "Iqama Wait Time (min)",
        lblFullscreen: "Fullscreen Iqama Mode",
        lblAudioAdhan: "Adhan",
        lblAudioIqama: "Iqama",
        lblAdhkarEnable: "Enable Auto Adhkar",
        lblAdhkarTime: "Repeat Interval (min)",
        
        // Buttons & Status
        statusDefault: "Default",
        statusCustom: "Custom",
        save: "Save Settings",
        reset: "Change Location",
        btnUpload: "Uploading...",
        
        // Modals & General Buttons
        btnYes: "Yes",
        btnNo: "No",
        btnOk: "OK",

        // === Messages & Toasts (New) ===
        lblSuccess: "Success",
        lblError: "Error",
        lblWarning: "Warning",
        lblConfirm: "Confirm",
        
        msgSaved: "Settings saved successfully",
        msgSaveError: "Failed to save settings",
        msgResetConfirm: "Are you sure? This will clear location data.",
        msgResetDone: "Reset completed successfully",
        
        msgCityNotFound: "City not found",
        msgSearchError: "Search failed, check connection",
        msgAutoLocateSuccess: "Location set: ",
        msgAutoLocateError: "Auto location failed",
        msgConfirmCity: "Select this location: ",
        
        msgFileTooBig: "File too large (Max 2MB)",
        msgFileSaved: "Audio file saved successfully",
        msgQuotaError: "Storage full, please delete other files",
        msgFileError: "Failed to save file",
        msgDefaultRestored: "Default sound restored",
        msgRestoreError: "Restore failed",
        
        msgQuranSystem: "Cannot open Quran on system pages.<br>Please open a normal website.",
        
        // Prayers
        prayerFajr: "Fajr",
        prayerSunrise: "Sunrise",
        prayerDhuhr: "Dhuhr",
        prayerJumuah: "Jumu'ah",
        prayerAsr: "Asr",
        prayerMaghrib: "Maghrib",
        prayerIsha: "Isha",

        // States
        stateAdhan: "Now Adhan for",
        stateIqama: "Now Iqama for",
        stateWaiting: "Time until Iqama",

        // Notifications
        alertPreTitle: "Approaching Prayer",
        alertPreMsg: "A few minutes left until {prayer}. Prepare yourself.",
        alertAdhanTitle: "It is Prayer Time",
        alertAdhanMsg: "It is now time for {prayer} Adhan in your city.",
        alertSunriseTitle: "Sunrise",
        alertSunriseMsg: "The time for Fajr prayer has ended.",
        alertIqamaTitle: "Iqama Time",
        alertIqamaMsg: "Stand up for prayer. It is time for {prayer} Iqama.",
        alertAdhkarTitle: "Remembrance (Dhikr)",

        // Buttons
        btnStopAudio: "Stop Audio",
        btnMuted: "Muted",
        btnClose: "Close"
    }
};