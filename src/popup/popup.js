/**
 * @file popup.js
 * @description وحدة التحكم الرئيسية - النسخة الذهبية (إصلاحات الذاكرة والرفع والترجمة)
 */

import { TRANSLATIONS } from '../utils/translations.js';
import { getNextPrayer } from '../utils/time-utils.js';
import { getFromStorage, saveToStorage, STORAGE_KEYS, removeFromStorage } from '../utils/storage.js';
import { fetchPrayerTimes } from '../utils/api.js';
import { getGeolocation } from '../utils/locations.js';
import { switchView } from '../utils/ui-helpers.js';
import { getPrayerState } from '../utils/prayer-logic.js';

let searchDebounceTimer = null;
let timerInterval = null;
let headerUpdateInterval = null;
let currentToastTimeout = null;
const EMAIL_ID = "sakina_user@example.com";

let lastActivePrayerKey = null;
let lastLanguage = null;

let timeFormatter = null;
let hijriFormatter = null;
let gregFormatter = null;

const getT = () => {
    const lang = document.documentElement.lang || document.body.lang || 'ar';
    return TRANSLATIONS[lang] || TRANSLATIONS['ar'];
};

document.addEventListener('DOMContentLoaded', async () => {

    const getEl = (id) => document.getElementById(id);

    const views = {
        loading: getEl('loading-view'),
        onboarding: getEl('onboarding-view'),
        main: getEl('main-view'),
        settings: getEl('settings-view')
    };

    const mainUI = {
        digitalClock: getEl('digital-clock'),
        hijriDate: getEl('hijri-date'),
        currentDate: getEl('current-date'),
        locationName: getEl('location-name'),
        countdown: getEl('countdown'),
        dateDisplay: getEl('date-display'),
        nextPrayerName: getEl('next-prayer-name'),
        prayersList: getEl('prayers-list'),
        btnSettings: getEl('btn-settings'),
        btnQuran: getEl('btn-open-quran')
    };

    const settingsUI = {
        langSelect: getEl('language-select'),
        btnClose: getEl('btn-close-settings'),
        btnSave: getEl('btn-save-settings'),
        btnReset: getEl('btn-reset-location'),
        
        inputPreTime: getEl('input-pre-time'),
        inputIqamaTime: getEl('input-iqama-time'),
        inputAdhkarTime: getEl('input-adhkar-time'),
        
        toggleAdhan: getEl('toggle-adhan-sound'),
        toggleSunrise: getEl('toggle-sunrise'),
        toggleFullscreen: getEl('toggle-fullscreen-iqama'),
        toggleAdhkar: getEl('toggle-adhkar'),

        btnUploadAdhan: getEl('btn-upload-adhan'), inputUploadAdhan: getEl('upload-adhan'), 
        btnResetAdhan: getEl('btn-reset-adhan'), statusAdhan: getEl('status-adhan'),
        btnUploadIqama: getEl('btn-upload-iqama'), inputUploadIqama: getEl('upload-iqama'), 
        btnResetIqama: getEl('btn-reset-iqama'), statusIqama: getEl('status-iqama')
    };

    const modal = {
        overlay: getEl('custom-modal'),
        title: getEl('modal-title'),
        message: getEl('modal-message'),
        icon: getEl('modal-icon'),
        confirmBtns: getEl('modal-actions-confirm'),
        alertBtns: getEl('modal-actions-alert'),
        btnYes: getEl('btn-modal-yes'),
        btnNo: getEl('btn-modal-no'),
        btnOk: getEl('btn-modal-ok')
    };

    const search = {
        cityInput: getEl('city-input'),
        suggestionsList: getEl('suggestions-list'),
        btnManual: getEl('btn-manual-search'),
        btnAuto: getEl('btn-auto-locate')
    };

    // --- الوظائف المساعدة ---

    function updateHeaderNow() {
        const now = new Date();
        const lang = document.body.lang || 'ar';

        if (!timeFormatter) {
            const locale = lang === 'ar' ? 'ar-SA' : 'en-US';
            timeFormatter = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', hour12: true });
        }
        if (!hijriFormatter) {
            const locale = lang === 'ar' ? 'ar-SA-u-ca-islamic' : 'en-US-u-ca-islamic';
            hijriFormatter = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' });
        }
        if (!gregFormatter) {
            const locale = lang === 'ar' ? 'ar-SA' : 'en-US';
            gregFormatter = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' });
        }

        if(mainUI.digitalClock) mainUI.digitalClock.textContent = timeFormatter.format(now);
        if(mainUI.hijriDate) { try { mainUI.hijriDate.textContent = hijriFormatter.format(now); } catch (e) { mainUI.hijriDate.textContent = "--"; } }
        if(mainUI.currentDate) { try { mainUI.currentDate.style.display = "inline"; mainUI.currentDate.textContent = gregFormatter.format(now); } catch (e) {} }
    }

    function startLiveHeaderUpdate() {
        if (headerUpdateInterval) clearInterval(headerUpdateInterval);
        updateHeaderNow();
        headerUpdateInterval = setInterval(updateHeaderNow, 1000);
    }

    // 🔥 دالة ذكية جداً لفحص وجود الملفات وتحديث الأزرار والترجمة
    async function updateAudioStatusLabels() {
        const t = getT();
        
        try {
            // 1. فحص ملف الأذان (بالحجم)
            const adhanBytes = await chrome.storage.local.getBytesInUse(STORAGE_KEYS.CUSTOM_ADHAN);
            const hasCustomAdhan = adhanBytes > 0;
            
            if(settingsUI.statusAdhan) {
                settingsUI.statusAdhan.textContent = hasCustomAdhan ? t.statusCustom : t.statusDefault;
                settingsUI.statusAdhan.style.color = hasCustomAdhan ? "green" : "#666";
            }
            if(settingsUI.btnResetAdhan) {
                settingsUI.btnResetAdhan.disabled = !hasCustomAdhan;
                settingsUI.btnResetAdhan.style.opacity = hasCustomAdhan ? "1" : "0.3";
                settingsUI.btnResetAdhan.style.cursor = hasCustomAdhan ? "pointer" : "default";
            }

            // 2. فحص ملف الإقامة (بالحجم)
            const iqamaBytes = await chrome.storage.local.getBytesInUse(STORAGE_KEYS.CUSTOM_IQAMA);
            const hasCustomIqama = iqamaBytes > 0;

            if(settingsUI.statusIqama) {
                settingsUI.statusIqama.textContent = hasCustomIqama ? t.statusCustom : t.statusDefault;
                settingsUI.statusIqama.style.color = hasCustomIqama ? "green" : "#666";
            }
            if(settingsUI.btnResetIqama) {
                settingsUI.btnResetIqama.disabled = !hasCustomIqama;
                settingsUI.btnResetIqama.style.opacity = hasCustomIqama ? "1" : "0.3";
                settingsUI.btnResetIqama.style.cursor = hasCustomIqama ? "pointer" : "default";
            }
        } catch (e) {
            console.error("Error checking audio status:", e);
        }
    }

    async function updateUI() {
        try {
            const [timesData, settingsData, locationData] = await Promise.all([
                chrome.storage.local.get('prayer_times'),
                chrome.storage.local.get('app_settings'),
                chrome.storage.local.get('user_location')
            ]);

            const timings = timesData.prayer_times;
            const settings = settingsData.app_settings || {};
            const lang = settings.language || 'ar';
            const t = TRANSLATIONS[lang];
            
            if (!timings) return;

            const state = getPrayerState(timings, Number(settings.iqamaMinutes || 10));
            const pName = t[`prayer${state.prayerKey}`] || state.prayerKey;

            if (state.mode === 'WAITING_IQAMA') {
                setUIState(`${t.stateAdhan} ${pName}`, '#fbbf24', '18px', t.stateWaiting);
                startTimer(state.iqamaTime);
            } else if (state.mode === 'IQAMA_ACTIVE') {
                setUIState(`${t.stateIqama} ${pName}`, '#4ade80', '18px', "");
                if(mainUI.countdown) mainUI.countdown.textContent = "";
            } else {
                const next = getNextPrayer(timings, locationData.user_location?.timezone, settings.enableSunrise);
                if (next) {
                    setUIState(t[`prayer${next.key}`] || next.key, '#ffffff', '', t.nextPrayer || "الصلاة القادمة");
                    startTimer(next.time.getTime());
                    if (next.key !== lastActivePrayerKey || lang !== lastLanguage) {
                        renderPrayersList(timings, next.key, settings.enableSunrise, lang);
                        lastActivePrayerKey = next.key;
                        lastLanguage = lang;
                    }
                }
            }

            if (state.mode !== 'NORMAL') {
                if (state.prayerKey !== lastActivePrayerKey || lang !== lastLanguage) {
                    renderPrayersList(timings, state.prayerKey, settings.enableSunrise, lang);
                    lastActivePrayerKey = state.prayerKey;
                    lastLanguage = lang;
                }
            }
        } catch (e) {
            console.error("UI Update Error:", e);
        }
    }

    function setUIState(text, color, fontSize, label) {
        if(mainUI.nextPrayerName) {
            if (mainUI.nextPrayerName.textContent !== text) {
                mainUI.nextPrayerName.textContent = text;
                mainUI.nextPrayerName.style.color = color;
                if(fontSize) mainUI.nextPrayerName.style.fontSize = fontSize;
                else mainUI.nextPrayerName.style.fontSize = ''; 
            }
        }
        if(label !== null && mainUI.dateDisplay) {
             if (mainUI.dateDisplay.textContent !== label) mainUI.dateDisplay.textContent = label;
        }
    }

    function startTimer(targetTime) {
        if (timerInterval) clearInterval(timerInterval);
        const update = () => {
            let diff = targetTime - Date.now();
            if (diff < 0) diff = 0;
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            if (mainUI.countdown) {
                mainUI.countdown.textContent = 
                    `${h > 0 ? h.toString().padStart(2, '0') + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            }
        };
        update();
        timerInterval = setInterval(update, 1000);
    }

    function renderPrayersList(timings, activeKey, includeSunrise, lang) {
        if (!mainUI.prayersList) return;
        mainUI.prayersList.innerHTML = '';
        const t = TRANSLATIONS[lang];
        const keys = ['Fajr', ...(includeSunrise ? ['Sunrise'] : []), 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
        
        keys.forEach(key => {
            if (!timings[key]) return;
            const [h, m] = timings[key].split(':');
            let hr = parseInt(h);
            const ampm = hr >= 12 ? (lang === 'ar' ? 'م' : 'PM') : (lang === 'ar' ? 'ص' : 'AM');
            hr = hr % 12 || 12;
            const item = document.createElement('div');
            const isFriday = new Date().getDay() === 5;
            const displayKey = (key === 'Dhuhr' && isFriday) ? 'Jumuah' : key;
            const isActive = (key === activeKey) || (activeKey === 'Jumuah' && key === 'Dhuhr');
            item.className = `prayer-item ${isActive ? 'active' : ''}`;
            if(key === 'Sunrise') item.classList.add('prayer-sunrise');
            item.innerHTML = `<span>${t[`prayer${displayKey}`] || t[`prayer${key}`]}</span><span dir="ltr">${hr}:${m} ${ampm}</span>`;
            mainUI.prayersList.appendChild(item);
        });
    }

    async function loadMainView(locData) {
        if(mainUI.locationName) mainUI.locationName.textContent = locData.name || "...";
        const settings = await getFromStorage(STORAGE_KEYS.SETTINGS) || {};
        const lang = settings.language || 'ar';
        applyLanguage(lang);
        startLiveHeaderUpdate(); 
        await updateUI();
        switchView('main', views);
    }

    function applyLanguage(lang) {
        const t = TRANSLATIONS[lang] || TRANSLATIONS['ar'];
        document.body.dir = t.dir;
        document.body.lang = lang;
        document.documentElement.lang = lang;

        timeFormatter = null;
        hijriFormatter = null;
        gregFormatter = null;

        const setText = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        };

        if (search.cityInput) search.cityInput.placeholder = t.placeholderCity;
        setText('txt-welcome-title', t.welcomeTitle);
        setText('txt-welcome-desc', t.welcomeDesc);
        setText('txt-or', t.or);
        setText('txt-btn-auto', t.autoLocate);
        if (search.btnManual) search.btnManual.textContent = t.manualSearch;
        
        const onboardingLangBtn = document.getElementById('btn-toggle-lang-onboarding');
        if (onboardingLangBtn) onboardingLangBtn.textContent = t.langSwitchBtn;

        if (mainUI.dateDisplay) mainUI.dateDisplay.textContent = t.nextPrayer;
        if (mainUI.btnQuran) mainUI.btnQuran.textContent = t.btnQuran;

        setText('txt-settings-title', t.settingsTitle);
        setText('sec-general', t.secGeneral);
        setText('sec-alerts', t.secAlerts);
        setText('sec-audio', t.secAudio);
        setText('sec-adhkar', t.secAdhkar);
        setText('sec-timing', t.secTiming);

        setText('lbl-language', t.lblLanguage);
        setText('lbl-sunrise', t.lblSunriseAlert);
        setText('lbl-adhan-sound', t.lblAdhanSound);
        setText('lbl-pre-time', t.lblPreTime);
        setText('lbl-iqama-time', t.lblIqamaTime);
        setText('lbl-fullscreen', t.lblFullscreen);
        setText('lbl-audio-adhan', t.lblAudioAdhan);
        setText('lbl-audio-iqama', t.lblAudioIqama);
        setText('lbl-adhkar-enable', t.lblAdhkarEnable);
        setText('lbl-adhkar-time', t.lblAdhkarTime);

        if (settingsUI.btnSave) settingsUI.btnSave.textContent = t.save;
        if (settingsUI.btnReset) settingsUI.btnReset.textContent = t.reset;
        if (modal.btnYes) modal.btnYes.textContent = t.btnYes;
        if (modal.btnNo) modal.btnNo.textContent = t.btnNo;
        if (modal.btnOk) modal.btnOk.textContent = t.btnOk;
        
        updateHeaderNow();
        // 🔥 تحديث نصوص الأصوات فوراً بعد تغيير اللغة (هنا الحل)
        updateAudioStatusLabels();
    }

    async function fetchCitySuggestions(query) {
        try {
            const lang = document.body.lang || 'ar';
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&accept-language=${lang}&email=${EMAIL_ID}`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            const text = await res.text();
            if (text.trim().startsWith("<")) return;
            const data = JSON.parse(text);
            displaySuggestions(data);
        } catch (err) {
            if (err.name !== 'AbortError') console.error(err);
        }
    }

    function displaySuggestions(results) {
        if (!search.suggestionsList) return;
        search.suggestionsList.innerHTML = '';
        if (!results || results.length === 0) { 
            search.suggestionsList.style.display = 'none'; 
            return; 
        }
        results.forEach(item => {
            const t = getT();
            const addr = item.address || {};
            const city = addr.city || addr.town || addr.village || item.name;
            const cleanName = addr.country ? `${city}، ${addr.country}` : city;
            const li = document.createElement('li');
            li.className = 'suggestion-item';
            const iconSpan = document.createElement('span');
            iconSpan.className = 'loc-icon';
            iconSpan.textContent = '📍';
            const textSpan = document.createElement('span');
            textSpan.className = 'loc-text';
            textSpan.textContent = cleanName;
            li.appendChild(iconSpan);
            li.appendChild(textSpan);
            li.onclick = () => {
                search.suggestionsList.style.display = 'none';
                showConfirm(modal, t.lblConfirm, `${t.msgConfirmCity} <strong>${cleanName}</strong>؟`).then(ok => {
                    if(ok) handleLocationSelection(item.lat, item.lon, cleanName);
                });
            };
            search.suggestionsList.appendChild(li);
        });
        search.suggestionsList.style.display = 'block';
        search.suggestionsList.classList.remove('hidden');
    }

    async function handleLocationSelection(lat, lon, name) {
        switchView('loading', views);
        try {
            const apiData = await fetchPrayerTimes(lat, lon);
            if (apiData) {
                const locObj = { name, lat, lng: lon, timezone: apiData.meta.timezone };
                await saveToStorage(STORAGE_KEYS.USER_LOCATION, locObj);
                await saveToStorage(STORAGE_KEYS.PRAYER_TIMES, apiData.timings);
                chrome.runtime.sendMessage({ action: 'RESHEDULE_ALARMS' });
                await loadMainView(locObj);
            } else throw new Error("API Error");
        } catch (err) {
            const t = getT();
            showToast(modal, t.lblError, t.msgSearchError, "⚠️");
            switchView('onboarding', views);
        }
    }

    // --- إدارة الأحداث ---

    const init = async () => {
        try {
            switchView('loading', views);
            
            const settings = await getFromStorage(STORAGE_KEYS.SETTINGS) || {};
            const lang = settings.language || 'ar';
            applyLanguage(lang);

            const loc = await getFromStorage(STORAGE_KEYS.USER_LOCATION);
            if (loc) {
                await loadMainView(loc);
                setInterval(updateUI, 1000);
            } else {
                switchView('onboarding', views);
            }
            
            await updateAudioStatusLabels();

        } catch (e) {
            console.error(e);
            switchView('onboarding', views);
        }
    };

    const btnLangOnboarding = document.getElementById('btn-toggle-lang-onboarding');
    if (btnLangOnboarding) {
        btnLangOnboarding.onclick = async () => {
            const isArabic = document.documentElement.lang === 'ar' || document.body.lang === 'ar';
            const currentLang = isArabic ? 'en' : 'ar';
            applyLanguage(currentLang);
            const settings = await getFromStorage(STORAGE_KEYS.SETTINGS) || {};
            settings.language = currentLang;
            await saveToStorage(STORAGE_KEYS.SETTINGS, settings);
        };
    }

    if (search.cityInput) {
        search.cityInput.addEventListener('input', (e) => {
            const q = e.target.value.trim();
            clearTimeout(searchDebounceTimer);
            if (q.length < 2) {
                if(search.suggestionsList) search.suggestionsList.style.display = 'none';
                return;
            }
            searchDebounceTimer = setTimeout(() => fetchCitySuggestions(q), 300);
        });
        document.addEventListener('click', (e) => {
            if (search.suggestionsList && !search.cityInput.contains(e.target) && !search.suggestionsList.contains(e.target)) {
                search.suggestionsList.style.display = 'none';
            }
        });
    }

    if (search.btnManual) {
        search.btnManual.onclick = async () => {
            const t = getT();
            const q = search.cityInput?.value.trim();
            if(!q) return;
            const btn = search.btnManual;
            const txt = btn.textContent;
            btn.textContent = "..."; btn.disabled = true;
            try {
                const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1&addressdetails=1&email=${EMAIL_ID}`;
                const res = await fetch(url);
                const text = await res.text();
                if(text.startsWith("<")) throw new Error("Blocked");
                const data = JSON.parse(text);
                if (data.length > 0) {
                    const item = data[0];
                    const addr = item.address || {};
                    const name = `${addr.city || addr.town || item.name}، ${addr.country || ''}`;
                    if(await showConfirm(modal, t.lblConfirm, `${t.msgConfirmCity} ${name}؟`)) {
                        handleLocationSelection(item.lat, item.lon, name);
                    }
                } else {
                    showToast(modal, t.lblWarning, t.msgCityNotFound, "🔍");
                }
            } catch {
                showToast(modal, t.lblError, t.msgSearchError, "❌");
            } finally {
                btn.textContent = txt; btn.disabled = false;
            }
        };
    }

    if (search.btnAuto) {
        search.btnAuto.onclick = async () => {
            const t = getT();
            const btn = search.btnAuto;
            const txt = btn.textContent;
            btn.textContent = "..."; btn.disabled = true;
            try {
                const coords = await getGeolocation();
                const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}&addressdetails=1&email=${EMAIL_ID}`;
                const res = await fetch(url);
                const text = await res.text();
                if (text.startsWith("<")) throw new Error("Blocked");
                const data = JSON.parse(text);
                const addr = data.address;
                const name = `${addr.city || addr.town || data.name}، ${addr.country || ''}`;
                handleLocationSelection(coords.lat, coords.lng, name);
                showToast(modal, t.lblSuccess, t.msgAutoLocateSuccess + name, "📍");
            } catch (err) {
                console.error(err);
                showToast(modal, t.lblError, t.msgAutoLocateError, "⚠️");
            } finally {
                btn.textContent = txt; btn.disabled = false;
            }
        };
    }

    if (settingsUI.btnSave) {
        settingsUI.btnSave.onclick = async () => {
            const t = getT();
            const btn = settingsUI.btnSave;
            if (btn.dataset.processing === "true") return;
            btn.dataset.processing = "true";
            const txt = btn.textContent;
            btn.textContent = "...";
            btn.style.opacity = "0.7";
            try {
                const newSettings = {
                    language: settingsUI.langSelect?.value || 'ar',
                    adhanSound: settingsUI.toggleAdhan?.checked ?? true,
                    enableSunrise: settingsUI.toggleSunrise?.checked ?? true,
                    fullscreenIqama: settingsUI.toggleFullscreen?.checked ?? false,
                    adhkarEnabled: settingsUI.toggleAdhkar?.checked ?? true,
                    preAdhanMinutes: +(settingsUI.inputPreTime?.value || 15),
                    iqamaMinutes: +(settingsUI.inputIqamaTime?.value || 10),
                    adhkarInterval: +(settingsUI.inputAdhkarTime?.value || 30)
                };
                await saveToStorage(STORAGE_KEYS.SETTINGS, newSettings);
                lastLanguage = null; 
                applyLanguage(newSettings.language);
                
                await updateAudioStatusLabels();

                chrome.runtime.sendMessage({ action: 'RESHEDULE_ALARMS' });
                const loc = await getFromStorage(STORAGE_KEYS.USER_LOCATION);
                if(loc) await loadMainView(loc);
                await showToast(modal, t.lblSuccess, t.msgSaved, "✅");
                settingsUI.btnClose?.click();
            } catch (e) {
                showToast(modal, t.lblError, t.msgSaveError, "❌");
            } finally {
                btn.textContent = txt;
                btn.style.opacity = "1";
                btn.dataset.processing = "false";
            }
        };
    }

    if (settingsUI.btnReset) {
        settingsUI.btnReset.onclick = async (e) => {
            const t = getT();
            e.preventDefault();
            const ok = await showConfirm(modal, t.lblWarning, t.msgResetConfirm, "🗑️");
            if (ok) {
                await chrome.storage.local.remove([STORAGE_KEYS.USER_LOCATION, STORAGE_KEYS.PRAYER_TIMES]);
                if(views.settings) views.settings.classList.remove('active');
                switchView('onboarding', views);
                showToast(modal, t.lblSuccess, t.msgResetDone, "✅");
            }
        };
    }

    if (mainUI.btnSettings) {
        mainUI.btnSettings.onclick = async () => {
            const s = await getFromStorage(STORAGE_KEYS.SETTINGS) || {};
            
            if(settingsUI.langSelect) settingsUI.langSelect.value = s.language || 'ar';
            if(settingsUI.toggleAdhan) settingsUI.toggleAdhan.checked = s.adhanSound !== false;
            
            if(settingsUI.toggleSunrise) settingsUI.toggleSunrise.checked = s.enableSunrise !== false;
            if(settingsUI.inputIqamaTime) settingsUI.inputIqamaTime.value = s.iqamaMinutes || 10;
            if(settingsUI.toggleAdhkar) settingsUI.toggleAdhkar.checked = s.adhkarEnabled !== false;

            if(settingsUI.toggleFullscreen) settingsUI.toggleFullscreen.checked = s.fullscreenIqama || false;
            if(settingsUI.inputPreTime) settingsUI.inputPreTime.value = s.preAdhanMinutes || 15;
            if(settingsUI.inputAdhkarTime) settingsUI.inputAdhkarTime.value = s.adhkarInterval || 30;

            await updateAudioStatusLabels();

            if(views.settings) {
                views.settings.classList.remove('hidden');
                views.settings.scrollTop = 0;
                requestAnimationFrame(() => views.settings.classList.add('active'));
            }
        };
    }

    if (mainUI.btnQuran) {
        mainUI.btnQuran.onclick = async () => {
            const t = getT();
            try {
                const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tabs[0]) {
                    if (tabs[0].url.startsWith("chrome://") || tabs[0].url.startsWith("edge://")) {
                        showToast(modal, t.lblWarning, t.msgQuranSystem, "⚠️");
                        return;
                    }
                    chrome.tabs.sendMessage(tabs[0].id, { action: "OPEN_QURAN_MODAL" });
                    window.close();
                }
            } catch (e) {
                console.error("Error opening Quran:", e);
            }
        };
    }

    if (settingsUI.btnClose) {
        settingsUI.btnClose.onclick = () => {
            if(views.settings) {
                views.settings.classList.remove('active');
                setTimeout(() => views.settings.classList.add('hidden'), 300);
            }
        };
    }

    if (settingsUI.langSelect) {
        settingsUI.langSelect.onchange = (e) => {
            applyLanguage(e.target.value);
            updateAudioStatusLabels();
        };
    }

    // 🔥 دالة رفع الملفات مع التحديث المركزي (الحل النهائي)
    const setupUpload = (btn, input, reset, status, key) => {
        if(btn && input) {
            btn.onclick = () => {
                input.value = ''; // تفريغ الزر
                input.click();
            };
            
            input.onchange = (e) => {
                const t = getT();
                const f = e.target.files[0];
                if(!f) return;

                const MAX_SIZE_MB = 2;
                const MAX_BYTES = MAX_SIZE_MB * 1024 * 1024;

                if (f.size > MAX_BYTES) {
                    showToast(modal, t.lblWarning, t.msgFileTooBig, "⚠️");
                    input.value = ""; 
                    return;
                }

                const r = new FileReader();
                if(status) status.textContent = t.btnUpload || "...";

                r.onload = async (ev) => {
                    try {
                        await saveToStorage(key, ev.target.result);
                        
                        // 🔥 استدعاء الدالة المركزية لتحديث الواجهة فوراً
                        await updateAudioStatusLabels();

                        showToast(modal, t.lblSuccess, t.msgFileSaved, "✅");
                    } catch (err) {
                        if (err.message && err.message.includes("QUOTA")) {
                            showToast(modal, t.lblError, t.msgQuotaError, "❌");
                        } else {
                            showToast(modal, t.lblError, t.msgFileError, "❌");
                        }
                        if(status) status.textContent = t.lblError;
                    }
                };
                r.readAsDataURL(f);
            };
        }

        if(reset) {
            reset.onclick = async () => {
                const t = getT();
                try {
                    await removeFromStorage([key]);
                    
                    // 🔥 تحديث مركزي
                    await updateAudioStatusLabels();

                    showToast(modal, t.lblSuccess, t.msgDefaultRestored, "↺");
                } catch (e) {
                    showToast(modal, t.lblError, t.msgRestoreError, "❌");
                }
            };
        }
    };
    
    setupUpload(settingsUI.btnUploadAdhan, settingsUI.inputUploadAdhan, settingsUI.btnResetAdhan, settingsUI.statusAdhan, STORAGE_KEYS.CUSTOM_ADHAN);
    setupUpload(settingsUI.btnUploadIqama, settingsUI.inputUploadIqama, settingsUI.btnResetIqama, settingsUI.statusIqama, STORAGE_KEYS.CUSTOM_IQAMA);

    function showConfirm(els, title, msg, icon = "ℹ️") {
        return new Promise(resolve => {
            const { overlay, title: t, message: m, icon: i, confirmBtns, alertBtns, btnYes, btnNo } = els;
            if(!overlay) return resolve(false);
            
            if(t) t.textContent = title;
            if(m) m.innerHTML = msg;
            if(i) i.textContent = icon;
            
            if(confirmBtns) confirmBtns.classList.remove('hidden');
            if(alertBtns) alertBtns.classList.add('hidden');
            
            overlay.classList.remove('hidden');
            requestAnimationFrame(() => overlay.classList.add('show'));

            const close = (res) => {
                overlay.classList.remove('show');
                setTimeout(() => overlay.classList.add('hidden'), 300);
                if(btnYes) btnYes.onclick = null;
                if(btnNo) btnNo.onclick = null;
                resolve(res);
            };

            if(btnYes) btnYes.onclick = () => close(true);
            if(btnNo) btnNo.onclick = () => close(false);
            overlay.onclick = (e) => { if(e.target === overlay) close(false); };
        });
    }

    function showToast(els, title, msg, icon = "✅") {
        return new Promise(resolve => {
            const { overlay, title: t, message: m, icon: i, confirmBtns, alertBtns, btnOk } = els;
            if(!overlay) return resolve();

            if (currentToastTimeout) {
                clearTimeout(currentToastTimeout);
                currentToastTimeout = null;
            }

            if(t) t.textContent = title;
            if(m) m.innerHTML = msg;
            if(i) i.textContent = icon;

            if(confirmBtns) confirmBtns.classList.add('hidden');
            if(alertBtns) alertBtns.classList.remove('hidden');

            overlay.classList.remove('hidden');
            requestAnimationFrame(() => overlay.classList.add('show'));

            const close = () => {
                overlay.classList.remove('show');
                setTimeout(() => overlay.classList.add('hidden'), 300);
                if(btnOk) btnOk.onclick = null;
                resolve();
            };

            if(btnOk) btnOk.onclick = close;
            overlay.onclick = (e) => { if(e.target === overlay) close(); };

            const currentT = getT();
            const isWarning = title === currentT.lblWarning || title === currentT.lblError || icon === "⚠️" || icon === "❌";
            
            if(!isWarning) {
                currentToastTimeout = setTimeout(() => {
                    if(overlay.classList.contains('show') && confirmBtns.classList.contains('hidden')) close();
                }, 2500);
            }
        });
    }

    init();

    window.addEventListener('pagehide', () => {
        if (timerInterval) clearInterval(timerInterval);
        if (headerUpdateInterval) clearInterval(headerUpdateInterval);
        if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
        if (currentToastTimeout) clearTimeout(currentToastTimeout);
    });
});