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

// --- دالة الجدولة ---
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
    
    if (nextPrayerTime > now) {
        chrome.alarms.create(ALARM_NAMES.NEXT_PRAYER, { when: nextPrayerTime });
        console.log(`⏰ Next Prayer: ${nextPrayerObj.key} at ${nextPrayerObj.time.toLocaleTimeString()}`);

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
    const iqamaMinutes = Number(appSettings.iqamaMinutes || 25);

    const timings = timesData.prayer_times;
    const timezone = locationData.user_location?.timezone;
    const enableSunrise = appSettings.enableSunrise === true;
    const nextPrayerObj = timings ? getNextPrayer(timings, timezone, enableSunrise) : null;
    const prayerKey = nextPrayerObj ? nextPrayerObj.key : null;

    if (alarm.name === ALARM_NAMES.PRE_PRAYER) {
        const preMinutes = Number(appSettings.preAdhanMinutes || 15);
        const targetAzanTime = Date.now() + (preMinutes * 60 * 1000);
        showNotification('alertPreTitle', 'alertPreMsg', "PRE", { mode: 'COUNTDOWN', targetTime: targetAzanTime }, null, prayerKey);
    } 
    else if (alarm.name === ALARM_NAMES.NEXT_PRAYER) {
        let isSunrise = false;
        if (timings) {
            const sunriseTime = parsePrayerTime(timings['Sunrise'], new Date());
            const now = new Date();
            if (Math.abs(now - sunriseTime) < 2 * 60 * 1000) isSunrise = true;
        }

        const titleKey = isSunrise ? 'alertSunriseTitle' : 'alertAdhanTitle';
        const msgKey = isSunrise ? 'alertSunriseMsg' : 'alertAdhanMsg';

        showNotification(titleKey, msgKey, "ADHAN", { mode: 'COUNTUP', startTime: Date.now() }, null, isSunrise ? 'Sunrise' : prayerKey);
        
        // تشغيل صوت الأذان (إلا في الشروق)
        if (shouldPlaySound && !isSunrise) playAudio('ADHAN');

        if (!isSunrise) {
            const iqamaTime = Date.now() + (iqamaMinutes * 60 * 1000);
            chrome.alarms.create(ALARM_NAMES.IQAMA, { when: iqamaTime });
        }
        
        scheduleNextPrayer();
    }
    else if (alarm.name === ALARM_NAMES.IQAMA) {
        const quote = getRandomQuote();
        showNotification('alertIqamaTitle', quote.text, "IQAMA", null, quote);
        
        // تشغيل صوت الإقامة
        if (shouldPlaySound) playAudio('IQAMA');
    }
});

// --- الدوال المساعدة ---
async function getTranslation() {
    const settings = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    const lang = settings.app_settings?.language || 'ar';
    return { t: TRANSLATIONS[lang], lang };
}

async function showNotification(titleKey, msgKey, type = 'NORMAL', timerData = null, quoteData = null, prayerNameKey = null) {
    const settings = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    const appSettings = settings.app_settings || {};
    const isFullscreen = (type === 'IQAMA' && appSettings.fullscreenIqama === true);

    const { t, lang } = await getTranslation();
    let title = t[titleKey] || titleKey;
    let message = t[msgKey] || msgKey;

    if (prayerNameKey && message && message.includes('{prayer}')) {
        const translatedPrayerName = t[`prayer${prayerNameKey}`] || prayerNameKey;
        message = message.replace('{prayer}', translatedPrayerName);
    }
    
    if (type === 'IQAMA' && quoteData) {
        message = lang === 'en' && quoteData.text_en ? quoteData.text_en : quoteData.text;
    }

    let finalQuote = null;
    if (quoteData) {
        finalQuote = {
            type: quoteData.type,
            text: lang === 'en' && quoteData.text_en ? quoteData.text_en : quoteData.text,
            source: lang === 'en' && quoteData.source_en ? quoteData.source_en : quoteData.source
        };
    }

    const btnLabels = { stopAudio: t.btnStopAudio, muted: t.btnMuted, close: t.btnClose };

    const payload = {
        action: "SHOW_PRAYER_ALERT",
        title, message, type, timerData, quoteData: finalQuote, isFullscreen, btnLabels
    };

    activeNotification = payload;
    sendToActiveTab(payload);

    if (notificationTimeout) clearTimeout(notificationTimeout);
    notificationTimeout = setTimeout(() => { activeNotification = null; }, isFullscreen ? 300000 : 90000);
}

async function sendToActiveTab(payload) {
    try {
        const tabs = await chrome.tabs.query({ active: true });
        const targetTab = tabs.find(t => t.url && !t.url.startsWith('chrome://') && !t.url.startsWith('edge://'));
        if (targetTab) chrome.tabs.sendMessage(targetTab.id, payload).catch(err => {});
    } catch (e) { console.error(e); }
}

// --- 🔥 دالة الصوت المصححة (الحل الجذري) ---
async function playAudio(type, volume = 1.0) {
    let finalSource = '';
    let storageKey = null;

    if (type === 'ADHAN') {
        // 🔥 استخدام getURL للحصول على الرابط الكامل الصحيح
        finalSource = chrome.runtime.getURL('assets/adhan.mp3'); 
        storageKey = 'custom_adhan_sound';
    } else if (type === 'IQAMA') {
        // 🔥 استخدام getURL للحصول على الرابط الكامل الصحيح
        finalSource = chrome.runtime.getURL('assets/iqama.mp3'); 
        storageKey = 'custom_iqama_sound';
    } else {
        // إذا كان رابطاً مباشراً، نتأكد أنه كامل أو نتركه كما هو
        finalSource = type;
    }

    // التحقق من وجود ملف مخصص
    if (storageKey) {
        try {
            const bytes = await chrome.storage.local.getBytesInUse(storageKey);
            if (bytes > 0) {
                const data = await chrome.storage.local.get(storageKey);
                if (data[storageKey]) {
                    finalSource = data[storageKey]; // استبدال بالملف المخصص (Base64)
                    console.log(`🔊 Playing CUSTOM sound for ${type}`);
                }
            } else {
                console.log(`🔊 Playing DEFAULT sound for ${type}: ${finalSource}`);
            }
        } catch (e) {
            console.warn("Error checking custom sound:", e);
        }
    }

    // التأكد من وجود Offscreen
    if (!(await hasOffscreenDocument())) {
        await chrome.offscreen.createDocument({
            url: OFFSCREEN_DOCUMENT_PATH,
            reasons: ['AUDIO_PLAYBACK'],
            justification: 'Prayer notification'
        });
        await new Promise(r => setTimeout(r, 200));
    }

    // الإرسال
    if (finalSource.startsWith('data:')) {
        // ملف مخصص (Base64) - نقطعه
        const CHUNK_SIZE = 200 * 1024;
        const totalLength = finalSource.length;
        for (let i = 0; i < totalLength; i += CHUNK_SIZE) {
            const chunk = finalSource.slice(i, i + CHUNK_SIZE);
            const isLast = (i + CHUNK_SIZE) >= totalLength;
            chrome.runtime.sendMessage({ action: 'AUDIO_CHUNK', data: chunk, isLast: isLast, volume: volume });
            await new Promise(r => setTimeout(r, 5));
        }
    } else {
        // ملف افتراضي (رابط)
        chrome.runtime.sendMessage({ action: 'PLAY_AUDIO', source: finalSource, volume: volume });
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