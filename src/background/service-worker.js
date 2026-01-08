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
   1. التهيئة (Initialization)
   ========================================== */
chrome.runtime.onInstalled.addListener(() => {
    scheduleNextPrayer();
    chrome.alarms.create(ALARM_NAMES.SCHEDULER, { periodInMinutes: 60 });
});

chrome.runtime.onStartup.addListener(() => {
    scheduleNextPrayer();
});

/* ==========================================
   2. استقبال الرسائل (Message Listener)
   ========================================== */
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
   3. منطق منع التداخل (Critical Window)
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
   4. جدولة الصلوات والأذكار
   ========================================== */
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

    // جدولة الأذان والتنبيه المسبق
    if (nextPrayerTime > now) {
        chrome.alarms.create(ALARM_NAMES.NEXT_PRAYER, { when: nextPrayerTime });

        const preMinutes = Number(appSettings.preAdhanMinutes || 15);
        const preTime = nextPrayerTime - (preMinutes * 60 * 1000);
        if (preTime > now) {
            chrome.alarms.create(ALARM_NAMES.PRE_PRAYER, { when: preTime });
        }
    }

    // جدولة الأذكار الدورية
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
   5. تنفيذ المنبهات (Alarms Listener)
   ========================================== */
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === ALARM_NAMES.SCHEDULER) {
        scheduleNextPrayer();
        return;
    }

    const settingsData = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    const timesData = await chrome.storage.local.get(STORAGE_KEYS.PRAYER_TIMES);
    const locationData = await chrome.storage.local.get(STORAGE_KEYS.USER_LOCATION);

    const appSettings = settingsData.app_settings || {};
    const timings = timesData.prayer_times;
    const timezone = locationData.user_location?.timezone;
    const isFriday = new Date().getDay() === 5;

    const nextPrayerObj = timings ? getNextPrayer(timings, timezone, appSettings.enableSunrise) : null;
    const shouldPlaySound = appSettings.adhanSound !== false;

    // --- منبه الأذكار ---
    if (alarm.name === ALARM_NAMES.ADHKAR) {
        if (isInPrayerCriticalWindow(appSettings, nextPrayerObj)) return;

        const quote = getRandomQuote();
        showNotification('alertAdhkarTitle', quote.text, "NORMAL", null, quote);
        if (shouldPlaySound) playAudio('ADHKAR', 0.5);
        return;
    }

    // --- منبه قبل الأذان ---
    if (alarm.name === ALARM_NAMES.PRE_PRAYER) {
        const preMinutes = Number(appSettings.preAdhanMinutes || 15);
        const targetAzanTime = Date.now() + (preMinutes * 60 * 1000);
        const prayerKey = (nextPrayerObj?.key === 'Dhuhr' && isFriday) ? 'Jumuah' : nextPrayerObj?.key;

        showNotification('alertPreTitle', 'alertPreMsg', "PRE", { mode: 'COUNTDOWN', targetTime: targetAzanTime }, null, prayerKey);
    } 

    // --- منبه الأذان / الشروق ---
    else if (alarm.name === ALARM_NAMES.NEXT_PRAYER) {
        let isSunrise = false;
        if (timings) {
            const sunriseTime = parsePrayerTime(timings['Sunrise'], new Date());
            if (Math.abs(Date.now() - sunriseTime) < 120000) isSunrise = true;
        }

        const titleKey = isSunrise ? 'alertSunriseTitle' : 'alertAdhanTitle';
        const msgKey = isSunrise ? 'alertSunriseMsg' : 'alertAdhanMsg';
        const prayerKey = (nextPrayerObj?.key === 'Dhuhr' && isFriday) ? 'Jumuah' : nextPrayerObj?.key;

        showNotification(titleKey, msgKey, "ADHAN", { mode: 'COUNTUP', startTime: Date.now() }, null, isSunrise ? 'Sunrise' : prayerKey);
        
        if (shouldPlaySound) {
            if (isSunrise) {
                if (appSettings.enableSunrise) playAudio('SUNRISE', 0.7);
            } else {
                playAudio('ADHAN', 1.0);
            }
        }

        if (!isSunrise) {
            const iqamaMinutes = Number(appSettings.iqamaMinutes || 25);
            chrome.alarms.create(ALARM_NAMES.IQAMA, { when: Date.now() + (iqamaMinutes * 60 * 1000) });
        }
        scheduleNextPrayer();
    }

    // --- منبه الإقامة ---
    else if (alarm.name === ALARM_NAMES.IQAMA) {
        const quote = getRandomQuote();
        showNotification('alertIqamaTitle', quote.text, "IQAMA", null, quote);
        if (shouldPlaySound) playAudio('IQAMA', 1.0);
    }
});

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
    notificationTimeout = setTimeout(() => activeNotification = null, payload.isFullscreen ? 300000 : 90000);
}

async function sendToActiveTab(payload) {
    try {
        const tabs = await chrome.tabs.query({ active: true });
        const targetTab = tabs.find(t => t.url && !t.url.startsWith('chrome://') && !t.url.startsWith('edge://'));
        if (targetTab) chrome.tabs.sendMessage(targetTab.id, payload).catch(() => {});
    } catch (e) { console.error(e); }
}

/* ==========================================
   7. نظام الصوت (Advanced Audio System)
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
    } else if (type === 'ADHKAR') {
        finalSource = chrome.runtime.getURL('assets/adhkar.mp3');
        storageKey = 'custom_adhkar_sound';
    } else if (type === 'SUNRISE') {
        finalSource = chrome.runtime.getURL('assets/sunrise.mp3');
        storageKey = 'custom_sunrise_sound';
    } else {
        finalSource = type;
    }

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

self.showNotification = showNotification;
self.playAudio = playAudio;
self.stopAudio = stopAudio;