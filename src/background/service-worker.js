import { OFFSCREEN_DOCUMENT_PATH } from '../utils/constants.js';
import { getRandomQuote } from '../utils/quotes.js'; 
import { getNextPrayer, parsePrayerTime } from '../utils/time-utils.js';
import { TRANSLATIONS } from '../utils/translations.js'; // 🆕 استيراد الترجمة

let activeNotification = null;
let notificationTimeout = null;

const ALARM_NAMES = {
    NEXT_PRAYER: 'alarm_next_prayer',
    PRE_PRAYER: 'alarm_pre_prayer',
    IQAMA: 'alarm_iqama',
    SCHEDULER: 'alarm_scheduler'
};

const STORAGE_KEYS = {
    SETTINGS: 'app_settings',
    PRAYER_TIMES: 'prayer_times',
    USER_LOCATION: 'user_location'
};

// --- التهيئة ---
chrome.runtime.onInstalled.addListener(() => {
    scheduleNextPrayer();
    chrome.alarms.create(ALARM_NAMES.SCHEDULER, { periodInMinutes: 60 }); 
});

chrome.runtime.onStartup.addListener(() => {
    scheduleNextPrayer();
});

// --- استقبال الرسائل ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "GET_ACTIVE_ALERT") {
        sendResponse(activeNotification);
    }
    else if (request.action === "ALERT_CLOSED") {
        activeNotification = null;
        if (notificationTimeout) clearTimeout(notificationTimeout);
    }
    else if (request.action === 'PLAY_AUDIO') {
        playAudio(request.source, request.volume);
    } else if (request.action === 'STOP_AUDIO') {
        stopAudio();
    }
    else if (request.action === 'RESHEDULE_ALARMS') {
        scheduleNextPrayer();
    }
    return true; 
});

// --- دالة الجدولة الرئيسية ---
async function scheduleNextPrayer() {
    const times = await chrome.storage.local.get(STORAGE_KEYS.PRAYER_TIMES);
    const location = await chrome.storage.local.get(STORAGE_KEYS.USER_LOCATION);
    const settings = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    
    if (!times.prayer_times || !location.user_location) return;

    const timings = times.prayer_times;
    const timezone = location.user_location.timezone;
    const appSettings = settings.app_settings || {};
    const enableSunrise = appSettings.enableSunrise === true;

    const nextPrayerObj = getNextPrayer(timings, timezone, enableSunrise);
    
    if (!nextPrayerObj) return;

    const nextPrayerTime = nextPrayerObj.time.getTime();
    const now = Date.now();
    
    // جدولة فقط إذا كان الوقت في المستقبل
    if (nextPrayerTime > now) {
        chrome.alarms.create(ALARM_NAMES.NEXT_PRAYER, { when: nextPrayerTime });
        console.log(`⏰ الصلاة القادمة: ${nextPrayerObj.key} في ${nextPrayerObj.time.toLocaleTimeString()}`);

        // 🔥 تحديث القيمة الافتراضية إلى 15 دقيقة
        const preMinutes = Number(appSettings.preAdhanMinutes || 15);
        const preTime = nextPrayerTime - (preMinutes * 60 * 1000);

        if (preTime > now) {
            chrome.alarms.create(ALARM_NAMES.PRE_PRAYER, { when: preTime });
        }
    }
}

// --- تنفيذ المنبهات ---
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === ALARM_NAMES.SCHEDULER) {
        scheduleNextPrayer();
        return;
    }

    const settings = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    const timesData = await chrome.storage.local.get(STORAGE_KEYS.PRAYER_TIMES);
    const locationData = await chrome.storage.local.get(STORAGE_KEYS.USER_LOCATION);

    const appSettings = settings.app_settings || {};
    const shouldPlaySound = appSettings.adhanSound !== false;
    
    // 🔥 تحديث القيمة الافتراضية للإقامة إلى 25 دقيقة
    const iqamaMinutes = Number(appSettings.iqamaMinutes || 25);

    // نحتاج معرفة الصلاة القادمة لتمرير اسمها للترجمة
    const timings = timesData.prayer_times;
    const timezone = locationData.user_location?.timezone;
    const enableSunrise = appSettings.enableSunrise === true;
    const nextPrayerObj = timings ? getNextPrayer(timings, timezone, enableSunrise) : null;
    const prayerKey = nextPrayerObj ? nextPrayerObj.key : null;

    // 1. قبل الصلاة
    if (alarm.name === ALARM_NAMES.PRE_PRAYER) {
        // 🔥 تحديث القيمة الافتراضية إلى 15 دقيقة
        const preMinutes = Number(appSettings.preAdhanMinutes || 15);
        const targetAzanTime = Date.now() + (preMinutes * 60 * 1000);
        
        // نرسل المفاتيح (keys) بدلاً من النص الثابت، ونمرر اسم الصلاة
        showNotification('alertPreTitle', 'alertPreMsg', "PRE", { mode: 'COUNTDOWN', targetTime: targetAzanTime }, null, prayerKey);
    } 
    // 2. وقت الأذان (أو الشروق)
    else if (alarm.name === ALARM_NAMES.NEXT_PRAYER) {
        let isSunrise = false;
        
        // التحقق هل هو شروق؟
        if (timings) {
            const sunriseTime = parsePrayerTime(timings['Sunrise'], new Date());
            const now = new Date();
            if (Math.abs(now - sunriseTime) < 2 * 60 * 1000) {
                isSunrise = true;
            }
        }

        // تحديد المفاتيح بناءً على النوع
        const titleKey = isSunrise ? 'alertSunriseTitle' : 'alertAdhanTitle';
        const msgKey = isSunrise ? 'alertSunriseMsg' : 'alertAdhanMsg';

        showNotification(titleKey, msgKey, "ADHAN", { mode: 'COUNTUP', startTime: Date.now() }, null, isSunrise ? 'Sunrise' : prayerKey);
        
        // صوت الأذان (إلا في الشروق)
        if (shouldPlaySound && !isSunrise) playAudio('assets/adhan.mp3');

        // جدولة الإقامة (إلا في الشروق)
        if (!isSunrise) {
            const iqamaTime = Date.now() + (iqamaMinutes * 60 * 1000);
            chrome.alarms.create(ALARM_NAMES.IQAMA, { when: iqamaTime });
        }
        
        scheduleNextPrayer();
    }
    // 3. وقت الإقامة
    else if (alarm.name === ALARM_NAMES.IQAMA) {
        const quote = getRandomQuote();
        // نرسل مفتاح عنوان الإقامة
        showNotification('alertIqamaTitle', quote.text, "IQAMA", null, quote); // نرسل نص الاقتباس كما هو مؤقتاً، ستتم معالجته في showNotification
        if (shouldPlaySound) playAudio('assets/iqama.mp3');
    }
});

// --- دالة مساعدة لجلب الترجمة واللغة ---
async function getTranslation() {
    const settings = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    const lang = settings.app_settings?.language || 'ar';
    return { t: TRANSLATIONS[lang], lang };
}

// --- دالة العرض (المحدثة للترجمة) ---
async function showNotification(titleKey, msgKey, type = 'NORMAL', timerData = null, quoteData = null, prayerNameKey = null) {
    const settings = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    const appSettings = settings.app_settings || {};
    const isFullscreen = (type === 'IQAMA' && appSettings.fullscreenIqama === true);

    // جلب الترجمة
    const { t, lang } = await getTranslation();

    // 1. ترجمة العنوان والرسالة
    let title = t[titleKey] || titleKey; // إذا لم يجد المفتاح يستخدم النص كما هو (للحماية)
    let message = t[msgKey] || msgKey;

    // 2. استبدال اسم الصلاة في الرسالة (مثلاً: "اقترب موعد صلاة {prayer}")
    if (prayerNameKey && message && message.includes('{prayer}')) {
        const translatedPrayerName = t[`prayer${prayerNameKey}`] || prayerNameKey;
        message = message.replace('{prayer}', translatedPrayerName);
    }
    
    // في حالة الإقامة، الرسالة هي الاقتباس، لذا لا نترجمها كـ Key بل نعالج الاقتباس نفسه
    if (type === 'IQAMA' && quoteData) {
        message = lang === 'en' && quoteData.text_en ? quoteData.text_en : quoteData.text;
    }

    // 3. معالجة الاقتباس (عربي/إنجليزي)
    let finalQuote = null;
    if (quoteData) {
        finalQuote = {
            type: quoteData.type,
            text: lang === 'en' && quoteData.text_en ? quoteData.text_en : quoteData.text,
            source: lang === 'en' && quoteData.source_en ? quoteData.source_en : quoteData.source
        };
    }

    // 4. تجهيز نصوص الأزرار
    const btnLabels = {
        stopAudio: t.btnStopAudio,
        muted: t.btnMuted,
        close: t.btnClose
    };

    const payload = {
        action: "SHOW_PRAYER_ALERT",
        title, 
        message, 
        type, 
        timerData, 
        quoteData: finalQuote, 
        isFullscreen,
        btnLabels // نرسل نصوص الأزرار للواجهة
    };

    activeNotification = payload;
    sendToActiveTab(payload);

    if (notificationTimeout) clearTimeout(notificationTimeout);
    notificationTimeout = setTimeout(() => {
        activeNotification = null;
    }, isFullscreen ? 300000 : 90000);
}

async function sendToActiveTab(payload) {
    try {
        const tabs = await chrome.tabs.query({ active: true });
        const targetTab = tabs.find(t => t.url && !t.url.startsWith('chrome://') && !t.url.startsWith('edge://'));

        if (targetTab) {
            chrome.tabs.sendMessage(targetTab.id, payload).catch(err => {});
        }
    } catch (e) { console.error(e); }
}

// --- الصوت ---
async function playAudio(source, volume = 1.0) {
    if (await hasOffscreenDocument()) {
        chrome.runtime.sendMessage({ action: 'PLAY_AUDIO', source, volume });
    } else {
        await chrome.offscreen.createDocument({
            url: OFFSCREEN_DOCUMENT_PATH,
            reasons: ['AUDIO_PLAYBACK'],
            justification: 'Prayer notification'
        });
        setTimeout(() => {
            chrome.runtime.sendMessage({ action: 'PLAY_AUDIO', source, volume });
        }, 500);
    }
}

async function stopAudio() {
    if (await hasOffscreenDocument()) {
        chrome.runtime.sendMessage({ action: 'STOP_AUDIO' });
    }
}

async function hasOffscreenDocument() {
    const contexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
    return contexts.length > 0;
}

self.showNotification = showNotification;
self.playAudio = playAudio;
self.stopAudio = stopAudio;