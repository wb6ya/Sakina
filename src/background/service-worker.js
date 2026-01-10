import { OFFSCREEN_DOCUMENT_PATH } from '../utils/constants.js';
import { getRandomQuote } from '../utils/quotes.js'; 
import { getNextPrayer, parsePrayerTime } from '../utils/time-utils.js';
import { TRANSLATIONS } from '../utils/translations.js'; 

let activeNotification = null;
let notificationTimeout = null;

const ALARM_NAMES = {
    NEXT_PRAYER: 'alarm_next_prayer',
    PRE_PRAYER: 'alarm_pre_prayer',
    IQAMA: 'alarm_iqama',
    SCHEDULER: 'alarm_scheduler',
    ADHKAR: 'alarm_adhkar'
};

const STORAGE_KEYS = {
    SETTINGS: 'app_settings',
    PRAYER_TIMES: 'prayer_times',
    USER_LOCATION: 'user_location'
};

/* ==========================================
   1. المنطق الذكي لبدء التشغيل (Smart Startup)
   ========================================== */
chrome.runtime.onInstalled.addListener(() => {
    handleSmartScheduling();
    chrome.alarms.create(ALARM_NAMES.SCHEDULER, { periodInMinutes: 60 });
});

chrome.runtime.onStartup.addListener(() => {
    handleSmartScheduling();
});

// دالة ذكية تفحص الوضع الحالي فور فتح المتصفح
async function handleSmartScheduling() {
    // 1. تنظيف أي منبهات قديمة عالقة
    await chrome.alarms.clearAll();
    // 2. إعادة جدولة المنبه الدوري
    chrome.alarms.create(ALARM_NAMES.SCHEDULER, { periodInMinutes: 60 });
    // 3. جدولة الصلاة القادمة ومعالجة الوضع الحالي
    scheduleNextPrayer(true); // true تعني: نحن في وضع بدء تشغيل، افحص إذا كنا داخل وقت حرج
}

/* ==========================================
   2. استقبال الرسائل
   ========================================== */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "GET_ACTIVE_ALERT") {
        sendResponse(activeNotification);
    }
    else if (request.action === "ALERT_CLOSED") {
        activeNotification = null;
        if (notificationTimeout) clearTimeout(notificationTimeout);

        stopAudio();
    }
    else if (request.action === 'PLAY_AUDIO') {
        playAudio(request.source, request.volume);
    }
    else if (request.action === 'STOP_AUDIO') {
        stopAudio();
    }
    else if (request.action === 'RESHEDULE_ALARMS') {
        scheduleNextPrayer();
    }
    return true;
});

/* ==========================================
   3. منطق منع التداخل
   ========================================== */
function isInPrayerCriticalWindow(appSettings, nextPrayerObj) {
    if (!nextPrayerObj) return false;
    const now = Date.now();
    const adhanTime = nextPrayerObj.time.getTime();
    const preMinutes = Number(appSettings.preAdhanMinutes || 15);
    const iqamaMinutes = Number(appSettings.iqamaMinutes || 25);

    const windowStart = adhanTime - (preMinutes * 60 * 1000);
    const windowEnd = adhanTime + (iqamaMinutes * 60 * 1000);

    return now >= windowStart && now <= windowEnd;
}

/* ==========================================
   4. الجدولة والتحقق الذكي (Core Logic)
   ========================================== */
async function scheduleNextPrayer(isStartupCheck = false) {
    try {
        await chrome.alarms.clearAll();
        chrome.alarms.create(ALARM_NAMES.SCHEDULER, { periodInMinutes: 60 });

        const times = await chrome.storage.local.get(STORAGE_KEYS.PRAYER_TIMES);
        const location = await chrome.storage.local.get(STORAGE_KEYS.USER_LOCATION);
        const settings = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);

        if (!times.prayer_times || !location.user_location) return;

        const timings = times.prayer_times;
        const timezone = location.user_location.timezone;
        const appSettings = settings.app_settings || {};
        const enableSunrise = appSettings.enableSunrise === true;
        const preMinutes = Number(appSettings.preAdhanMinutes || 15);
        const iqamaMinutes = Number(appSettings.iqamaMinutes || 25);
        const now = Date.now();
        const isFriday = new Date().getDay() === 5;

        // ---------------------------------------------------------
        // 1. البحث عن "الصلاة النشطة حالياً" (لإصلاح مشكلة الإقامة)
        // ---------------------------------------------------------
        let activePrayerIqama = null;
        for (const key of ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']) {
            const pTime = parsePrayerTime(timings[key], new Date()).getTime();
            const iqamaTime = pTime + (iqamaMinutes * 60 * 1000);
            
            // هل نحن في الفترة بين الأذان والإقامة لهذه الصلاة؟
            if (now >= pTime && now < iqamaTime) {
                // نعم! هذه الصلاة هي النشطة، نجدول إقامتها فوراً
                chrome.alarms.create(ALARM_NAMES.IQAMA, { when: iqamaTime });
                activePrayerIqama = { key, iqamaTime };
                console.log(`✅ تم اكتشاف فترة انتظار إقامة لـ ${key}، تمت الجدولة.`);
                break; 
            }
        }

        // ---------------------------------------------------------
        // 2. جدولة الصلاة القادمة (المستقبل)
        // ---------------------------------------------------------
        const nextPrayerObj = getNextPrayer(timings, timezone, enableSunrise);
        
        // إذا وجدنا صلاة قادمة
        if (nextPrayerObj) {
            const nextPrayerTime = nextPrayerObj.time.getTime();
            const preTime = nextPrayerTime - (preMinutes * 60 * 1000);

            // أ) جدولة الأذان القادم
            if (nextPrayerTime > now) {
                chrome.alarms.create(ALARM_NAMES.NEXT_PRAYER, { when: nextPrayerTime });
            }

            // ب) جدولة التنبيه المسبق
            if (preTime > now) {
                chrome.alarms.create(ALARM_NAMES.PRE_PRAYER, { when: preTime });
            }
            
            // ---------------------------------------------------------
            // 3. منطق بدء التشغيل (Notifications Logic) - من كودك
            // ---------------------------------------------------------
            if (isStartupCheck) {
                const prayerKey = (nextPrayerObj.key === 'Dhuhr' && isFriday) ? 'Jumuah' : nextPrayerObj.key;

                // حالة: هل فات الأذان منذ لحظات؟ (أقل من 5 دقائق)
                const timeSinceAdhan = now - nextPrayerTime; 
                if (timeSinceAdhan > 0 && timeSinceAdhan < 5 * 60 * 1000) {
                     triggerAdhanAlert(appSettings, timings, nextPrayerObj, isFriday);
                }

                // حالة: هل نحن في فترة "قبل الصلاة"؟
                else if (now >= preTime && now < nextPrayerTime) {
                    showNotification(
                        'alertPreTitle', 'alertPreMsg', "PRE", 
                        { mode: 'COUNTDOWN', targetTime: nextPrayerTime }, null, prayerKey
                    );
                }
            }
        }

        // 3. جدولة الأذكار
        manageAdhkarAlarm(appSettings);

    } catch (e) {
        console.error("Error scheduling alarms:", e);
    }
}

async function manageAdhkarAlarm(appSettings) {
    if (appSettings.adhkarEnabled === true) {
        const interval = parseInt(appSettings.adhkarInterval) || 30;
        const existingAlarm = await chrome.alarms.get(ALARM_NAMES.ADHKAR);
        if (!existingAlarm || existingAlarm.periodInMinutes !== interval) {
            chrome.alarms.create(ALARM_NAMES.ADHKAR, { periodInMinutes: interval });
        }
    } else {
        chrome.alarms.clear(ALARM_NAMES.ADHKAR);
    }
}

/* ==========================================
   5. تنفيذ المنبهات (تم التحديث: منطق فحص ذكي)
   ========================================== */
chrome.alarms.onAlarm.addListener(async (alarm) => {
    // 1. المجدول الدوري لتحديث المواقيت
    if (alarm.name === ALARM_NAMES.SCHEDULER) {
        scheduleNextPrayer();
        return;
    }

    const now = Date.now();
    
    // جلب البيانات الضرورية
    const settingsData = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    const timesData = await chrome.storage.local.get(STORAGE_KEYS.PRAYER_TIMES);
    const locationData = await chrome.storage.local.get(STORAGE_KEYS.USER_LOCATION);

    const appSettings = settingsData.app_settings || {};
    const timings = timesData.prayer_times;
    const timezone = locationData.user_location?.timezone;
    const isFriday = new Date().getDay() === 5;

    // دالة مساعدة: العثور على الصلاة التي وقتها "الآن" (بتسامح 2 دقيقة)
    const findActivePrayer = () => {
        if (!timings) return null;
        for (const key of ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']) {
            const time = parsePrayerTime(timings[key], new Date());
            const diff = Math.abs(now - time.getTime());
            if (diff < 2 * 60 * 1000) { // سماحية دقيقتين
                return { key, time };
            }
        }
        return null;
    };

    const nextPrayerObj = timings ? getNextPrayer(timings, timezone, appSettings.enableSunrise) : null;

    // --- 🔊 1. منبه الأذان / الشروق ---
    if (alarm.name === ALARM_NAMES.NEXT_PRAYER) {
        // نحاول العثور على الصلاة الحالية أولاً
        let targetPrayer = findActivePrayer();
        
        // إذا لم نجدها، نستخدم nextPrayerObj كاحتياط إذا كان قريباً جداً
        if (!targetPrayer && nextPrayerObj) {
            const diff = Math.abs(nextPrayerObj.time.getTime() - now);
            if (diff < 60000) targetPrayer = nextPrayerObj;
        }

        if (targetPrayer) {
            triggerAdhanAlert(appSettings, timings, targetPrayer, isFriday);
        } else {
            console.log("⚠️ تنبيه أذان رن، ولكن لا توجد صلاة مطابقة للوقت الحالي. إعادة الجدولة.");
            scheduleNextPrayer(); 
        }
    }

    // --- ⏳ 2. منبه قبل الأذان ---
    else if (alarm.name === ALARM_NAMES.PRE_PRAYER) {
        if (!nextPrayerObj) return;

        const preMinutes = Number(appSettings.preAdhanMinutes || 15);
        // نحسب الوقت المثالي للتنبيه بناءً على الصلاة القادمة
        const idealAlertTime = nextPrayerObj.time.getTime() - (preMinutes * 60 * 1000);

        // نقطة تفتيش: هل الوقت الآن قريب من وقت التنبيه؟ (سماحية 3 دقائق)
        if (Math.abs(now - idealAlertTime) < 3 * 60 * 1000) {
            const prayerKey = (nextPrayerObj.key === 'Dhuhr' && isFriday) ? 'Jumuah' : nextPrayerObj.key;
            showNotification(
                'alertPreTitle', 'alertPreMsg', "PRE", 
                { mode: 'COUNTDOWN', targetTime: nextPrayerObj.time.getTime() }, null, prayerKey
            );
        } else {
            console.log("⚠️ تنبيه 'قبل الصلاة' تم تجاهله لعدم تطابق الوقت.");
            // إذا كنا ما زلنا قبل الوقت، أعد الجدولة للتصحيح
            if (now < idealAlertTime) {
                chrome.alarms.create(ALARM_NAMES.PRE_PRAYER, { when: idealAlertTime });
            }
        }
    } 

    // --- 🕋 3. منبه الإقامة ---
    else if (alarm.name === ALARM_NAMES.IQAMA) {
        const delay = Math.abs(now - alarm.scheduledTime);
        // سماحية 3 دقائق للإقامة
        if (delay < 3 * 60 * 1000) { 
            const quote = getRandomQuote();
            const shouldPlaySound = appSettings.adhanSound !== false;
            showNotification('alertIqamaTitle', quote.text, "IQAMA", null, quote);
            if (shouldPlaySound) playAudio('IQAMA', 1.0);
        }
    }

    // --- 📿 4. الأذكار ---
    else if (alarm.name === ALARM_NAMES.ADHKAR) {
        if (isInPrayerCriticalWindow(appSettings, nextPrayerObj)) return;
        const quote = getRandomQuote();
        const shouldPlaySound = appSettings.adhanSound !== false;
        showNotification('alertAdhkarTitle', quote.text, "NORMAL", null, quote);
        if (shouldPlaySound) playAudio('ADHKAR', 0.5);
    }
});


// دالة مساعدة لتشغيل تنبيه الأذان وجدولة الإقامة
function triggerAdhanAlert(appSettings, timings, prayerObj, isFriday) {
    let isSunrise = (prayerObj.key === 'Sunrise');
    
    const titleKey = isSunrise ? 'alertSunriseTitle' : 'alertAdhanTitle';
    const msgKey = isSunrise ? 'alertSunriseMsg' : 'alertAdhanMsg';
    const prayerKey = (prayerObj.key === 'Dhuhr' && isFriday) ? 'Jumuah' : prayerObj.key;
    const shouldPlaySound = appSettings.adhanSound !== false;

    // عرض التوست
    showNotification(titleKey, msgKey, "ADHAN", { mode: 'COUNTUP', startTime: Date.now() }, null, isSunrise ? 'Sunrise' : prayerKey);
    
    // تشغيل الصوت
    if (shouldPlaySound) {
        if (isSunrise) {
            if (appSettings.enableSunrise) playAudio('SUNRISE', 0.7);
        } else {
            playAudio('ADHAN', 1.0);
        }
    }

    // جدولة الإقامة بعد الأذان
    if (!isSunrise) {
        const iqamaMinutes = Number(appSettings.iqamaMinutes || 25);
        // نستخدم وقت الصلاة الأصلي لحساب الإقامة بدقة، وليس الوقت الحالي
        const iqamaTime = prayerObj.time.getTime() + (iqamaMinutes * 60 * 1000);
        chrome.alarms.create(ALARM_NAMES.IQAMA, { when: iqamaTime });
    }
    
    // جدولة الصلاة القادمة بعد قليل
    setTimeout(() => scheduleNextPrayer(), 5000); 
}

/* ==========================================
   6. الإشعارات والترجمة
   ========================================== */
async function showNotification(titleKey, msgKey, type, timerData, quoteData, prayerKey) {
    const settingsData = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    const appSettings = settingsData.app_settings || {};
    const lang = appSettings.language || 'ar';
    const t = TRANSLATIONS[lang];

    let title = t[titleKey] || titleKey;
    let message = t[msgKey] || msgKey;

    if (prayerKey && message.includes('{prayer}')) {
        const translatedPrayer = t[`prayer${prayerKey}`] || prayerKey;
        message = message.replace('{prayer}', translatedPrayer);
    }
    
    if (quoteData) {
        message = (lang === 'en' && quoteData.text_en) ? quoteData.text_en : quoteData.text;
    }

    const payload = {
        action: "SHOW_PRAYER_ALERT",
        title, message, type, timerData,
        quoteData: quoteData ? {
            text: lang === 'en' ? quoteData.text_en : quoteData.text,
            source: lang === 'en' ? quoteData.source_en : quoteData.source
        } : null,
        isFullscreen: (type === 'IQAMA' && appSettings.fullscreenIqama === true),
        btnLabels: { stopAudio: t.btnStopAudio, muted: t.btnMuted, close: t.btnClose }
    };

    activeNotification = payload;
    sendToActiveTab(payload);

    if (notificationTimeout) clearTimeout(notificationTimeout);
    // زيادة وقت العرض للشاشة الكاملة
    notificationTimeout = setTimeout(() => activeNotification = null, payload.isFullscreen ? 300000 : 90000);
}

/* ==========================================
   دالة الإرسال (Tab Communication)
   ========================================== */
async function sendToActiveTab(payload) {
    try {
        const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        
        if (tabs.length > 0) {
            const tab = tabs[0];
            // التحقق الأمني: عدم الإرسال لصفحات النظام
            if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('edge://') && !tab.url.startsWith('about:')) {
                chrome.tabs.sendMessage(tab.id, payload).catch(() => {
                    // تجاهل الخطأ في حالة عدم تحميل المحتوى بعد
                });
            }
        }
    } catch (e) {
        console.error("Error sending to active tab:", e);
    }
}

/* ==========================================
   7. نظام الصوت (Audio Handler)
   ========================================== */
async function playAudio(type, volume = 1.0) {
    let finalSource = '';
    let storageKey = null;

    if (type === 'ADHAN') {
        finalSource = chrome.runtime.getURL('assets/adhan.mp3');
        storageKey = 'custom_adhan_sound';
    } else if (type === 'IQAMA') {
        finalSource = chrome.runtime.getURL('assets/iqama.mp3');
        storageKey = 'custom_iqama_sound';
    } else if (type === 'ADHKAR' || type === 'SUNRISE') {
        finalSource = chrome.runtime.getURL('assets/adhkar.mp3');
        storageKey = null;
    } else {
        finalSource = type;
    }

    // التحقق من الصوت المخصص
    if (storageKey) {
        const data = await chrome.storage.local.get(storageKey);
        if (data[storageKey]) finalSource = data[storageKey];
    }

    if (!(await hasOffscreenDocument())) {
        await chrome.offscreen.createDocument({
            url: OFFSCREEN_DOCUMENT_PATH,
            reasons: ['AUDIO_PLAYBACK'],
            justification: 'Prayer audio'
        });
        await new Promise(r => setTimeout(r, 200));
    }

    if (finalSource.startsWith('data:')) {
        const CHUNK_SIZE = 200 * 1024;
        for (let i = 0; i < finalSource.length; i += CHUNK_SIZE) {
            chrome.runtime.sendMessage({
                action: 'AUDIO_CHUNK',
                data: finalSource.slice(i, i + CHUNK_SIZE),
                isLast: (i + CHUNK_SIZE) >= finalSource.length,
                volume: volume
            });
            // تأخير بسيط لمنع تجميد المتصفح
            await new Promise(r => setTimeout(r, 5));
        }
    } else {
        chrome.runtime.sendMessage({ action: 'PLAY_AUDIO', source: finalSource, volume: volume });
    }
}

async function stopAudio() {
    if (await hasOffscreenDocument()) chrome.runtime.sendMessage({ action: 'STOP_AUDIO' });
}

async function hasOffscreenDocument() {
    const contexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
    return contexts.length > 0;
}
/* =================================================================
   🛑 DEBUG & TESTING TOOLS
   (هذا الكود لغرض الاختبار فقط - احذفه أو عطله قبل النشر النهائي)
   ================================================================= */
self.SakinaTest = {
    // 1. اختبار سيناريو "قبل الصلاة" (التوست + العداد التنازلي)
    runScenario_PrePrayer: async () => {
        console.log("🧪 Testing: Pre-Prayer Scenario");
        // نرسل وقت وهمي للأذان بعد 15 دقيقة من الآن
        const fakeTargetTime = Date.now() + (15 * 60 * 1000); 
        await showNotification(
            'alertPreTitle', 
            'alertPreMsg', 
            "PRE", 
            { mode: 'COUNTDOWN', targetTime: fakeTargetTime }, 
            null, 
            'Asr' // تجربة على صلاة العصر
        );
        console.log("✅ Pre-Prayer Notification Sent.");
    },

    // 2. اختبار سيناريو "وقت الأذان" (التوست + الصوت + العداد التصاعدي)
    runScenario_Adhan: async (prayerName = 'Maghrib') => {
        console.log(`🧪 Testing: Adhan Scenario for ${prayerName}`);
        
        // محاكاة إعدادات وهمية لتشغيل الصوت
        const fakeSettings = { app_settings: { adhanSound: true, enableSunrise: true } };
        
        // استدعاء دالة التنبيه مباشرة (نحتاج تمرير كائنات وهمية)
        // نقوم بمحاكاة كائن الصلاة
        const mockPrayerObj = { key: prayerName, time: new Date() }; 
        const mockTimings = { [prayerName]: "18:00" }; // وقت وهمي

        // تشغيل التنبيه
        await triggerAdhanAlert(
            fakeSettings.app_settings, 
            mockTimings, 
            mockPrayerObj, 
            false // ليس يوم جمعة
        );
        console.log("✅ Adhan Alert Triggered (Audio + Toast).");
    },

    // 3. اختبار سيناريو "الإقامة" (شاشة كاملة أو توست)
    runScenario_Iqama: async () => {
        console.log("🧪 Testing: Iqama Scenario");
        const quote = getRandomQuote();
        // محاكاة الاستدعاء كما لو جاء من المنبه
        await showNotification('alertIqamaTitle', quote.text, "IQAMA", null, quote);
        await playAudio('IQAMA', 1.0);
        console.log("✅ Iqama Alert Triggered.");
    },

    // 4. اختبار سيناريو "الشروق" (بدون إقامة)
    runScenario_Sunrise: async () => {
        console.log("🧪 Testing: Sunrise Scenario");
        await SakinaTest.runScenario_Adhan('Sunrise');
    },

    // 5. فحص ماذا ترى الإضافة الآن (التشخيص)
    diagnose: async () => {
        console.log("🔍 Running Diagnosis...");
        const storage = await chrome.storage.local.get(null);
        console.log("📂 Storage Data:", storage);
        
        const alarms = await chrome.alarms.getAll();
        console.log("⏰ Active Alarms:", alarms.map(a => `${a.name} (at ${new Date(a.scheduledTime).toLocaleTimeString()})`));

        if (!storage.prayer_times) {
            console.warn("⚠️ No prayer times found in storage!");
        } else {
            const next = getNextPrayer(storage.prayer_times.prayer_times, storage.user_location?.timezone, true);
            console.log("🕋 Next Prayer Calculated:", next);
        }
    },

    // 6. حذف كل شيء (تصفير)
    resetAll: async () => {
        await chrome.alarms.clearAll();
        await chrome.storage.local.clear();
        console.log("🗑️ All Data & Alarms Cleared.");
        chrome.runtime.reload(); // إعادة تشغيل الإضافة
    }
};