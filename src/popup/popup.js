/**
 * @file popup.js
 * @description الواجهة الأمامية (النسخة النهائية + التاريخ + الجمعة + الأذكار)
 */

import { TRANSLATIONS } from '../utils/translations.js';
import { getNextPrayer, getCurrentIqamaPeriod, getNowInZone } from '../utils/time-utils.js';
import { getFromStorage, saveToStorage, STORAGE_KEYS } from '../utils/storage.js';

/* ---------------------------------------------------
   العناصر
--------------------------------------------------- */
const getEl = (id) => document.getElementById(id);

const views = {
    loading: getEl('loading-view'),
    onboarding: getEl('onboarding-view'),
    main: getEl('main-view'),
    settings: getEl('settings-view')
};

/* المودال */
const modalOverlay = getEl('custom-modal');
const modalTitle = getEl('modal-title');
const modalMessage = getEl('modal-message');
const modalIcon = getEl('modal-icon');
const modalConfirmBtns = getEl('modal-actions-confirm');
const modalAlertBtns = getEl('modal-actions-alert');
const btnModalYes = getEl('btn-modal-yes');
const btnModalNo = getEl('btn-modal-no');
const btnModalOk = getEl('btn-modal-ok');

/* البحث */
const cityInput = getEl('city-input');
const countryInput = getEl('country-input');
const suggestionsList = getEl('suggestions-list');
const btnManualSearch = getEl('btn-manual-search');
const btnAutoLocate = getEl('btn-auto-locate');

/* الشاشة الرئيسية */
const currentDateEl = getEl('current-date');
const locationNameEl = getEl('location-name');
const countdownEl = getEl('countdown');
const dateDisplayEl = getEl('date-display');
const nextPrayerNameEl = getEl('next-prayer-name');
const prayersListEl = getEl('prayers-list');
const btnSettings = getEl('btn-settings');

/* الإعدادات */
const langSelect = getEl('language-select');
const btnCloseSettings = getEl('btn-close-settings');
const btnSaveSettings = getEl('btn-save-settings');
const btnResetLocation = getEl('btn-reset-location');

const inputPreTime = getEl('input-pre-time');
const inputIqamaTime = getEl('input-iqama-time');

const toggleAdhan = getEl('toggle-adhan-sound');
const toggleSunrise = getEl('toggle-sunrise');
const toggleFullscreen = getEl('toggle-fullscreen-iqama');

/* 🆕 الأذكار */
const toggleAdhkar = getEl('toggle-adhkar');
const inputAdhkarTime = getEl('input-adhkar-time');

let countdownInterval = null;

/* ---------------------------------------------------
   المودال
--------------------------------------------------- */
function showToast(title, message, icon = 'ℹ️') {
    return new Promise(resolve => {
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        modalIcon.textContent = icon;
        modalConfirmBtns.classList.add('hidden');
        modalAlertBtns.classList.remove('hidden');
        modalOverlay.classList.remove('hidden');
        requestAnimationFrame(() => modalOverlay.classList.add('show'));
        btnModalOk.onclick = () => {
            modalOverlay.classList.remove('show');
            setTimeout(() => modalOverlay.classList.add('hidden'), 200);
            resolve();
        };
    });
}

function showConfirm(title, message, icon = '🤔') {
    return new Promise(resolve => {
        modalTitle.textContent = title;
        modalMessage.innerHTML = message;
        modalIcon.textContent = icon;
        modalAlertBtns.classList.add('hidden');
        modalConfirmBtns.classList.remove('hidden');
        modalOverlay.classList.remove('hidden');
        requestAnimationFrame(() => modalOverlay.classList.add('show'));

        const close = (result) => {
            modalOverlay.classList.remove('show');
            setTimeout(() => modalOverlay.classList.add('hidden'), 200);
            resolve(result);
        };
        btnModalYes.onclick = () => close(true);
        btnModalNo.onclick = () => close(false);
    });
}

/* ---------------------------------------------------
   اللغة
--------------------------------------------------- */
function applyLanguage(lang) {
    if (!TRANSLATIONS[lang]) lang = 'ar';
    const t = TRANSLATIONS[lang];

    document.body.dir = t.dir;
    document.body.lang = lang;

    if (cityInput) cityInput.placeholder = t.placeholderCity;

    if (btnModalYes) btnModalYes.textContent = t.btnYes;
    if (btnModalNo) btnModalNo.textContent = t.btnNo;
    if (btnModalOk) btnModalOk.textContent = t.btnOk;

    const updateLabel = (id, text) => {
        const el = getEl(id);
        if (!el) return;
        const group = el.closest('.setting-group') || el.parentElement;
        const label = group?.querySelector('label:not(.switch)');
        if (label) label.textContent = text;
    };

    updateLabel('toggle-adhan-sound', t.labelAdhan);
    updateLabel('toggle-sunrise', t.labelSunrise);
    updateLabel('toggle-fullscreen-iqama', t.labelFullscreen);
    updateLabel('input-pre-time', t.labelPreTime);
    updateLabel('input-iqama-time', t.labelIqamaTime);
    updateLabel('toggle-adhkar', t.labelAdhkar);
    updateLabel('input-adhkar-time', t.labelAdhkarTime);

    if (btnSaveSettings) btnSaveSettings.textContent = t.save;
    if (btnResetLocation) btnResetLocation.textContent = t.reset;
    if (btnManualSearch) btnManualSearch.textContent = t.manualSearch;
    if (btnAutoLocate) btnAutoLocate.textContent = t.autoLocate;

    if (langSelect) langSelect.value = lang;
}

/* ---------------------------------------------------
   التشغيل
--------------------------------------------------- */
const init = async () => {
    switchView('loading');

    const settings = await getFromStorage(STORAGE_KEYS.SETTINGS) || {};
    const lang = settings.language || 'ar';
    applyLanguage(lang);

    const location = await getFromStorage(STORAGE_KEYS.USER_LOCATION);
    if (location) {
        loadMainView(location);
    } else {
        switchView('onboarding');
    }
};

function switchView(view) {
    Object.values(views).forEach(v => v && v.classList.add('hidden'));
    views[view]?.classList.remove('hidden');
}

/* ---------------------------------------------------
   الشاشة الرئيسية
--------------------------------------------------- */
async function loadMainView(locationData) {
    locationNameEl.textContent = locationData.name;

    const times = await getFromStorage(STORAGE_KEYS.PRAYER_TIMES);
    if (!times) return;

    const settings = await getFromStorage(STORAGE_KEYS.SETTINGS) || {};
    const lang = settings.language || 'ar';
    const enableSunrise = settings.enableSunrise === true;
    const iqamaMinutes = settings.iqamaMinutes || 25;
    const isFriday = new Date().getDay() === 5;

    applyLanguage(lang);

    if (currentDateEl) {
        const locale = lang === 'ar' ? 'ar-SA' : 'en-US';
        currentDateEl.textContent = new Date().toLocaleDateString(locale, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    const timezone = locationData.timezone;
    const iqamaPeriod = getCurrentIqamaPeriod(times, iqamaMinutes, timezone);

    if (iqamaPeriod) {
        updateHeader(iqamaPeriod.prayer, true, lang, isFriday);
        startCountdown(iqamaPeriod.prayerTime, true, timezone);
        renderPrayersList(times, iqamaPeriod.prayer, enableSunrise, lang, isFriday);
    } else {
        const next = getNextPrayer(times, timezone, enableSunrise);
        updateHeader(next.key, false, lang, isFriday);
        startCountdown(next.time, false, timezone);
        renderPrayersList(times, next.key, enableSunrise, lang, isFriday);
    }

    switchView('main');
}

function renderPrayersList(timings, activeKey, includeSunrise, lang, isFriday) {
    prayersListEl.innerHTML = '';
    const t = TRANSLATIONS[lang];

    let keys = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    if (includeSunrise) keys.splice(1, 0, 'Sunrise');

    const names = {
        Fajr: t.prayerFajr,
        Sunrise: t.prayerSunrise,
        Dhuhr: isFriday ? t.prayerJumuah : t.prayerDhuhr,
        Asr: t.prayerAsr,
        Maghrib: t.prayerMaghrib,
        Isha: t.prayerIsha
    };

    keys.forEach(key => {
        const [h, m] = timings[key].split(':');
        let hour = +h;
        const ampm = hour >= 12 ? (lang === 'ar' ? 'م' : 'PM') : (lang === 'ar' ? 'ص' : 'AM');
        hour = hour % 12 || 12;

        const item = document.createElement('div');
        item.className = `prayer-item ${key === activeKey ? 'active' : ''}`;

        if (key === 'Dhuhr' && isFriday) {
            item.style.borderRightColor = '#00d2d3';
        }

        item.innerHTML = `
            <span class="prayer-name">${names[key]}</span>
            <span class="prayer-time" dir="ltr">${hour}:${m} ${ampm}</span>
        `;
        prayersListEl.appendChild(item);
    });
}

function updateHeader(prayerKey, isIqama, lang, isFriday) {
    const t = TRANSLATIONS[lang];
    const name = {
        Fajr: t.prayerFajr,
        Sunrise: t.prayerSunrise,
        Dhuhr: isFriday ? t.prayerJumuah : t.prayerDhuhr,
        Asr: t.prayerAsr,
        Maghrib: t.prayerMaghrib,
        Isha: t.prayerIsha
    }[prayerKey];

    nextPrayerNameEl.textContent = isIqama
        ? `${t.alertIqamaTitle} (${name})`
        : (prayerKey === 'Sunrise'
            ? name
            : lang === 'ar' ? `صلاة ${name}` : `${name} Prayer`);

    dateDisplayEl.textContent = isIqama ? t.elapsedTime : t.remainingTime;
}

function startCountdown(baseTime, isIqama, timezone) {
    clearInterval(countdownInterval);
    const tick = () => {
        const now = getNowInZone(timezone);
        const diff = isIqama ? now - baseTime : baseTime - now;
        countdownEl.textContent = (isIqama ? '+' : '') + msToTime(diff);
        if (!isIqama && diff <= 0) {
            clearInterval(countdownInterval);
            setTimeout(init, 1500);
        }
    };
    tick();
    countdownInterval = setInterval(tick, 1000);
}

const msToTime = (d) => {
    d = Math.abs(d);
    const s = Math.floor(d / 1000) % 60;
    const m = Math.floor(d / 60000) % 60;
    const h = Math.floor(d / 3600000);
    return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
};

/* ---------------------------------------------------
   الإعدادات
--------------------------------------------------- */
btnSettings.addEventListener('click', async () => {
    const settings = await getFromStorage(STORAGE_KEYS.SETTINGS) || {};
    applyLanguage(settings.language || 'ar');

    toggleAdhan.checked = settings.adhanSound !== false;
    toggleSunrise.checked = settings.enableSunrise === true;
    toggleFullscreen.checked = settings.fullscreenIqama === true;
    inputPreTime.value = settings.preAdhanMinutes || 15;
    inputIqamaTime.value = settings.iqamaMinutes || 25;

    if (toggleAdhkar) toggleAdhkar.checked = settings.adhkarEnabled === true;
    if (inputAdhkarTime) inputAdhkarTime.value = settings.adhkarInterval || 30;

    views.settings.classList.remove('hidden');
    requestAnimationFrame(() => views.settings.classList.add('active'));
});

btnSaveSettings.addEventListener('click', async () => {
    await saveToStorage(STORAGE_KEYS.SETTINGS, {
        language: langSelect.value,
        adhanSound: toggleAdhan.checked,
        enableSunrise: toggleSunrise.checked,
        fullscreenIqama: toggleFullscreen.checked,
        preAdhanMinutes: +inputPreTime.value || 15,
        iqamaMinutes: +inputIqamaTime.value || 25,
        adhkarEnabled: toggleAdhkar?.checked || false,
        adhkarInterval: +inputAdhkarTime?.value || 30
    });
    chrome.runtime.sendMessage({ action: 'RESHEDULE_ALARMS' });
    views.settings.classList.remove('active');
    setTimeout(() => views.settings.classList.add('hidden'), 300);
    init();
});

btnCloseSettings?.addEventListener('click', () => {
    views.settings.classList.remove('active');
    setTimeout(() => views.settings.classList.add('hidden'), 300);
});

init();
