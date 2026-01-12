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
   1. المنطق الذكي لبدء التشغيل
   ========================================== */
chrome.runtime.onInstalled.addListener(() => {
    handleSmartScheduling();
    chrome.alarms.create(ALARM_NAMES.SCHEDULER, { periodInMinutes: 60 });
});

chrome.runtime.onStartup.addListener(() => {
    handleSmartScheduling();
});

async function handleSmartScheduling() {
    await chrome.alarms.clearAll();
    chrome.alarms.create(ALARM_NAMES.SCHEDULER, { periodInMinutes: 60 });
    scheduleNextPrayer(true);
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
   4. الجدولة والتحقق الذكي
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

        // اكتشاف فترة الإقامة الحالية
        for (const key of ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']) {
            const pTime = parsePrayerTime(timings[key], new Date()).getTime();
            const iqamaTime = pTime + (iqamaMinutes * 60 * 1000);
            if (now >= pTime && now < iqamaTime) {
                chrome.alarms.create(ALARM_NAMES.IQAMA, { when: iqamaTime });
                break; 
            }
        }

        const nextPrayerObj = getNextPrayer(timings, timezone, enableSunrise);
        
        if (nextPrayerObj) {
            const nextPrayerTime = nextPrayerObj.time.getTime();
            const preTime = nextPrayerTime - (preMinutes * 60 * 1000);

            if (nextPrayerTime > now) chrome.alarms.create(ALARM_NAMES.NEXT_PRAYER, { when: nextPrayerTime });
            if (preTime > now) chrome.alarms.create(ALARM_NAMES.PRE_PRAYER, { when: preTime });
            
            if (isStartupCheck) {
                const prayerKey = (nextPrayerObj.key === 'Dhuhr' && isFriday) ? 'Jumuah' : nextPrayerObj.key;
                const timeSinceAdhan = now - nextPrayerTime; 
                
                if (timeSinceAdhan > 0 && timeSinceAdhan < 5 * 60 * 1000) {
                      triggerAdhanAlert(appSettings, timings, nextPrayerObj, isFriday);
                } else if (now >= preTime && now < nextPrayerTime) {
                    showNotification('alertPreTitle', 'alertPreMsg', "PRE", { mode: 'COUNTDOWN', targetTime: nextPrayerTime }, null, prayerKey);
                }
            }
        }
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
   5. تنفيذ المنبهات
   ========================================== */
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === ALARM_NAMES.SCHEDULER) {
        scheduleNextPrayer();
        return;
    }

    const now = Date.now();
    const settingsData = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    const timesData = await chrome.storage.local.get(STORAGE_KEYS.PRAYER_TIMES);
    const locationData = await chrome.storage.local.get(STORAGE_KEYS.USER_LOCATION);

    const appSettings = settingsData.app_settings || {};
    const timings = timesData.prayer_times;
    const timezone = locationData.user_location?.timezone;
    const isFriday = new Date().getDay() === 5;

    const findActivePrayer = () => {
        if (!timings) return null;
        for (const key of ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']) {
            const time = parsePrayerTime(timings[key], new Date());
            const diff = Math.abs(now - time.getTime());
            if (diff < 2 * 60 * 1000) return { key, time };
        }
        return null;
    };

    const nextPrayerObj = timings ? getNextPrayer(timings, timezone, appSettings.enableSunrise) : null;

    if (alarm.name === ALARM_NAMES.NEXT_PRAYER) {
        let targetPrayer = findActivePrayer();
        if (!targetPrayer && nextPrayerObj) {
            const diff = Math.abs(nextPrayerObj.time.getTime() - now);
            if (diff < 60000) targetPrayer = nextPrayerObj;
        }
        if (targetPrayer) {
            triggerAdhanAlert(appSettings, timings, targetPrayer, isFriday);
        } else {
            scheduleNextPrayer(); 
        }
    }
    else if (alarm.name === ALARM_NAMES.PRE_PRAYER) {
        if (!nextPrayerObj) return;
        const preMinutes = Number(appSettings.preAdhanMinutes || 15);
        const idealAlertTime = nextPrayerObj.time.getTime() - (preMinutes * 60 * 1000);

        if (Math.abs(now - idealAlertTime) < 3 * 60 * 1000) {
            const prayerKey = (nextPrayerObj.key === 'Dhuhr' && isFriday) ? 'Jumuah' : nextPrayerObj.key;
            showNotification('alertPreTitle', 'alertPreMsg', "PRE", { mode: 'COUNTDOWN', targetTime: nextPrayerObj.time.getTime() }, null, prayerKey);
        } else {
            if (now < idealAlertTime) chrome.alarms.create(ALARM_NAMES.PRE_PRAYER, { when: idealAlertTime });
        }
    } 
    else if (alarm.name === ALARM_NAMES.IQAMA) {
        const delay = Math.abs(now - alarm.scheduledTime);
        if (delay < 3 * 60 * 1000) { 
            const quote = getRandomQuote();
            showNotification('alertIqamaTitle', quote.text, "IQAMA", null, quote);
            if (appSettings.adhanSound !== false) playAudio('IQAMA', 1.0);
        }
    }
    else if (alarm.name === ALARM_NAMES.ADHKAR) {
        if (isInPrayerCriticalWindow(appSettings, nextPrayerObj)) return;
        const quote = getRandomQuote();
        showNotification('alertAdhkarTitle', quote.text, "NORMAL", null, quote);
        if (appSettings.adhanSound !== false) playAudio('ADHKAR', 0.5);
    }
});


function triggerAdhanAlert(appSettings, timings, prayerObj, isFriday) {
    let isSunrise = (prayerObj.key === 'Sunrise');
    const titleKey = isSunrise ? 'alertSunriseTitle' : 'alertAdhanTitle';
    const msgKey = isSunrise ? 'alertSunriseMsg' : 'alertAdhanMsg';
    const prayerKey = (prayerObj.key === 'Dhuhr' && isFriday) ? 'Jumuah' : prayerObj.key;
    const shouldPlaySound = appSettings.adhanSound !== false;

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
        const iqamaTime = prayerObj.time.getTime() + (iqamaMinutes * 60 * 1000);
        chrome.alarms.create(ALARM_NAMES.IQAMA, { when: iqamaTime });
    }
    setTimeout(() => scheduleNextPrayer(), 5000); 
}

/* ==========================================
   6. الإشعارات (تم التحديث: الحقن البرمجي)
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
    
    // استدعاء دالة الحقن الجديدة
    injectAlertToActiveTab(payload);

    if (notificationTimeout) clearTimeout(notificationTimeout);
    notificationTimeout = setTimeout(() => activeNotification = null, payload.isFullscreen ? 300000 : 90000);
}

// دالة الحقن الذكي (بديلة لـ sendToActiveTab)
async function injectAlertToActiveTab(payload) {
    try {
        const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        
        if (tabs.length === 0) return;
        const tabId = tabs[0].id;

        if (tabs[0].url.startsWith("chrome://") || tabs[0].url.startsWith("edge://") || tabs[0].url.startsWith("about:")) {
            return;
        }

        // 1. حقن CSS
        await chrome.scripting.insertCSS({
            target: { tabId: tabId },
            files: ["src/content/alert.css", "src/content/quran.css"]
        }).catch(() => {});

        // 2. إرسال الرسالة مع محاولة الحقن إذا لزم الأمر
        try {
            await chrome.tabs.sendMessage(tabId, payload);
        } catch (error) {
            // فشل الإرسال (الملف غير موجود)، نحقن JS الآن
            await chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ["src/content/alert.js"]
            });
            // إعادة المحاولة بعد الحقن
            setTimeout(() => {
                chrome.tabs.sendMessage(tabId, payload).catch(e => console.error("Retry failed", e));
            }, 100);
        }

    } catch (e) {
        console.error("Error injecting alert:", e);
    }
}

/* ==========================================
   7. نظام الصوت
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