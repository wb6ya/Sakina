/**
 * @file popup.js
 * @description النسخة النهائية المتكاملة (تستخدم api.js, locations.js وتدعم رفع الصوتيات)
 */

import { TRANSLATIONS } from '../utils/translations.js';
import { getNextPrayer, getNowInZone } from '../utils/time-utils.js';
import { getFromStorage, saveToStorage, STORAGE_KEYS, removeFromStorage } from '../utils/storage.js';
import { fetchPrayerTimes } from '../utils/api.js';
import { getGeolocation } from '../utils/locations.js';

/* ---------------------------------------------------
    1. تعريف العناصر (DOM Objects)
--------------------------------------------------- */
const getEl = (id) => document.getElementById(id);

const views = {
    loading: getEl('loading-view'),
    onboarding: getEl('onboarding-view'),
    main: getEl('main-view'),
    settings: getEl('settings-view')
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

const mainUI = {
    currentDate: getEl('current-date'),
    locationName: getEl('location-name'),
    countdown: getEl('countdown'),
    dateDisplay: getEl('date-display'),
    nextPrayerName: getEl('next-prayer-name'),
    prayersList: getEl('prayers-list'),
    btnSettings: getEl('btn-settings')
};

const settingsUI = {
    langSelect: getEl('language-select'),
    btnClose: getEl('btn-close-settings'),
    btnSave: getEl('btn-save-settings'),
    btnReset: getEl('btn-reset-location'),
    
    inputPreTime: getEl('input-pre-time'),
    inputIqamaTime: getEl('input-iqama-time'),
    
    toggleAdhan: getEl('toggle-adhan-sound'),
    toggleSunrise: getEl('toggle-sunrise'),
    toggleFullscreen: getEl('toggle-fullscreen-iqama'),
    toggleAdhkar: getEl('toggle-adhkar'),
    inputAdhkarTime: getEl('input-adhkar-time'),

    // عناصر الصوتيات الجديدة
    btnUploadAdhan: getEl('btn-upload-adhan'),
    inputUploadAdhan: getEl('upload-adhan'),
    btnResetAdhan: getEl('btn-reset-adhan'),
    statusAdhan: getEl('status-adhan'),

    btnUploadIqama: getEl('btn-upload-iqama'),
    inputUploadIqama: getEl('upload-iqama'),
    btnResetIqama: getEl('btn-reset-iqama'),
    statusIqama: getEl('status-iqama')
};

let countdownInterval = null;
let searchDebounceTimer = null;

/* ---------------------------------------------------
    2. نظام المودال والرسائل (Modals)
--------------------------------------------------- */
function showToast(title, message, icon = 'ℹ️') {
    return new Promise(resolve => {
        modal.title.textContent = title;
        modal.message.textContent = message;
        modal.icon.textContent = icon;
        modal.confirmBtns.classList.add('hidden');
        modal.alertBtns.classList.remove('hidden');
        modal.overlay.classList.remove('hidden');
        requestAnimationFrame(() => modal.overlay.classList.add('show'));
        modal.btnOk.onclick = () => {
            modal.overlay.classList.remove('show');
            setTimeout(() => modal.overlay.classList.add('hidden'), 200);
            resolve();
        };
    });
}

function showConfirm(title, message, icon = '🤔') {
    return new Promise(resolve => {
        modal.title.textContent = title;
        modal.message.innerHTML = message;
        modal.icon.textContent = icon;
        modal.alertBtns.classList.add('hidden');
        modal.confirmBtns.classList.remove('hidden');
        modal.overlay.classList.remove('hidden');
        requestAnimationFrame(() => modal.overlay.classList.add('show'));
        const close = (result) => {
            modal.overlay.classList.remove('show');
            setTimeout(() => modal.overlay.classList.add('hidden'), 200);
            resolve(result);
        };
        modal.btnYes.onclick = () => close(true);
        modal.btnNo.onclick = () => close(false);
    });
}

/* ---------------------------------------------------
    3. معالجة المواقع والبحث الذكي
--------------------------------------------------- */
async function fetchCitySuggestions(query) {
    try {
        const lang = document.body.lang || 'ar';
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&accept-language=${lang}`;
        const response = await fetch(url, { headers: { 'User-Agent': 'SakinaApp/1.0' } });
        const results = await response.json();
        displaySuggestions(results);
    } catch (err) {
        console.error("Search Error:", err);
    }
}

function displaySuggestions(results) {
    if (!search.suggestionsList) return;
    search.suggestionsList.innerHTML = '';
    
    if (!results || results.length === 0) {
        search.suggestionsList.classList.add('hidden');
        search.suggestionsList.style.display = 'none';
        return;
    }

    results.forEach(item => {
        const addr = item.address;
        const cityName = addr.city || addr.town || addr.village || addr.suburb || addr.state || item.display_name.split(',')[0];
        const countryName = addr.country || "";
        const fullLabel = `${cityName}${countryName ? ', ' + countryName : ''}`;
        
        const li = document.createElement('li');
        li.className = 'suggestion-item';
        li.innerHTML = `<span class="loc-icon">📍</span><span class="loc-text">${fullLabel}</span>`;
        
        li.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            search.cityInput.value = cityName;
            search.suggestionsList.classList.add('hidden');
            search.suggestionsList.style.display = 'none';
            confirmAndSelectLocation(item.lat, item.lon, fullLabel);
        });
        
        search.suggestionsList.appendChild(li);
    });

    search.suggestionsList.classList.remove('hidden');
    search.suggestionsList.style.display = 'block';
    search.suggestionsList.style.zIndex = "9999";
}

async function confirmAndSelectLocation(lat, lon, displayName) {
    const appTitle = TRANSLATIONS[document.body.lang]?.appTitle || 'Sakina';
    const confirmed = await showConfirm(appTitle, `هل تريد اعتماد هذا الموقع؟<br><strong>${displayName}</strong>`, "📍");
    if (confirmed) handleLocationSelection(lat, lon, displayName);
}

async function handleLocationSelection(lat, lon, displayName) {
    switchView('loading');
    const apiData = await fetchPrayerTimes(lat, lon);
    
    if (apiData) {
        const locObj = { name: displayName, lat, lng: lon, timezone: apiData.meta.timezone };
        await saveToStorage(STORAGE_KEYS.USER_LOCATION, locObj);
        await saveToStorage(STORAGE_KEYS.PRAYER_TIMES, apiData.timings);
        chrome.runtime.sendMessage({ action: 'RESHEDULE_ALARMS' });
        loadMainView(locObj);
    } else {
        showToast("خطأ", "فشل الاتصال بالخادم، حاول مرة أخرى", "⚠️");
        switchView('onboarding');
    }
}

async function handleManualSearch(query) {
    const searchQuery = query || search.cityInput.value.trim();
    if (!searchQuery) {
        showToast("تنبيه", "يرجى إدخال اسم المدينة", "✍️");
        return;
    }

    const originalText = search.btnManual.textContent;
    search.btnManual.textContent = "...";
    search.btnManual.classList.add('btn-loading');
    search.btnManual.disabled = true;

    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&addressdetails=1`;
        const response = await fetch(url);
        const results = await response.json();

        if (results && results.length > 0) {
            const item = results[0];
            const city = item.address.city || item.address.town || item.address.village || item.name;
            const country = item.address.country;
            const fullDisplayName = `${city}, ${country}`;
            confirmAndSelectLocation(item.lat, item.lon, fullDisplayName);
        } else {
            showToast("عذراً", "لم يتم العثور على المدينة", "❓");
        }
    } catch (err) {
        showToast("خطأ", "تحقق من اتصالك بالإنترنت", "⚠️");
    } finally {
        search.btnManual.textContent = originalText;
        search.btnManual.classList.remove('btn-loading');
        search.btnManual.disabled = false;
    }
}

/* ---------------------------------------------------
    4. إدارة الصوتيات (Audio Management) - جديد 🎵
--------------------------------------------------- */
const handleFileUpload = async (file, storageKey, statusElement) => {
    if (!file) return;

    // التحقق من الحجم (مثلاً 5 ميجابايت)
    if (file.size > 5 * 1024 * 1024) {
        showToast("خطأ", "الملف كبير جداً. الحد الأقصى 5 ميجابايت", "⚠️");
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        const base64Audio = e.target.result;
        const success = await saveToStorage(storageKey, base64Audio);
        if (success) {
            statusElement.textContent = "مخصص (Custom)";
            statusElement.style.color = "#4CAF50"; // أخضر
            showToast("تم", "تم حفظ الملف الصوتي بنجاح", "✅");
        } else {
            showToast("خطأ", "فشل حفظ الملف", "❌");
        }
    };
    reader.readAsDataURL(file);
};

const handleFileReset = async (storageKey, statusElement) => {
    const success = await removeFromStorage([storageKey]);
    if (success) {
        statusElement.textContent = "الافتراضي";
        statusElement.style.color = "#666";
        showToast("تم", "تمت استعادة الصوت الافتراضي", "↺");
    }
};

const updateAudioStatusUI = async () => {
    const customAdhan = await getFromStorage(STORAGE_KEYS.CUSTOM_ADHAN);
    const customIqama = await getFromStorage(STORAGE_KEYS.CUSTOM_IQAMA);

    if (customAdhan) {
        settingsUI.statusAdhan.textContent = "مخصص";
        settingsUI.statusAdhan.style.color = "var(--primary-color)";
    }
    if (customIqama) {
        settingsUI.statusIqama.textContent = "مخصص";
        settingsUI.statusIqama.style.color = "var(--primary-color)";
    }
};

/* ---------------------------------------------------
    5. تحديث الواجهة واللغة (UI & Lang)
--------------------------------------------------- */
function applyLanguage(lang) {
    const t = TRANSLATIONS[lang] || TRANSLATIONS['ar'];
    document.body.dir = t.dir;
    document.body.lang = lang;

    if (search.cityInput) search.cityInput.placeholder = t.placeholderCity;
    modal.btnYes.textContent = t.btnYes;
    modal.btnNo.textContent = t.btnNo;
    modal.btnOk.textContent = t.btnOk;

    settingsUI.btnSave.textContent = t.save;
    settingsUI.btnReset.textContent = t.reset;
    search.btnManual.textContent = t.manualSearch;
    search.btnAuto.textContent = t.autoLocate;
}

function switchView(viewName) {
    Object.values(views).forEach(v => v?.classList.add('hidden'));
    views[viewName]?.classList.remove('hidden');
}

async function loadMainView(locationData) {
    mainUI.locationName.textContent = locationData.name;
    const times = await getFromStorage(STORAGE_KEYS.PRAYER_TIMES);
    const settings = await getFromStorage(STORAGE_KEYS.SETTINGS) || {};
    const lang = settings.language || 'ar';
    const isFriday = new Date().getDay() === 5;

    applyLanguage(lang);

    if (mainUI.currentDate) {
        const locale = lang === 'ar' ? 'ar-SA' : 'en-US';
        mainUI.currentDate.textContent = new Date().toLocaleDateString(locale, {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    }

    const next = getNextPrayer(times, locationData.timezone, settings.enableSunrise);
    updateHeader(next.key, false, lang, isFriday);
    startCountdown(next.time, false, locationData.timezone);
    renderPrayersList(times, next.key, settings.enableSunrise, lang, isFriday);
    
    switchView('main');
}

function renderPrayersList(timings, activeKey, includeSunrise, lang, isFriday) {
    mainUI.prayersList.innerHTML = '';
    const t = TRANSLATIONS[lang];
    const keys = ['Fajr', ...(includeSunrise ? ['Sunrise'] : []), 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    const names = {
        Fajr: t.prayerFajr, Sunrise: t.prayerSunrise,
        Dhuhr: isFriday ? t.prayerJumuah : t.prayerDhuhr,
        Asr: t.prayerAsr, Maghrib: t.prayerMaghrib, Isha: t.prayerIsha
    };
    keys.forEach(key => {
        const [h, m] = timings[key].split(':');
        let hr = parseInt(h);
        const ampm = hr >= 12 ? (lang === 'ar' ? 'م' : 'PM') : (lang === 'ar' ? 'ص' : 'AM');
        hr = hr % 12 || 12;
        const item = document.createElement('div');
        item.className = `prayer-item ${key === activeKey ? 'active' : ''}`;
        item.innerHTML = `<span>${names[key]}</span><span dir="ltr">${hr}:${m} ${ampm}</span>`;
        mainUI.prayersList.appendChild(item);
    });
}

function updateHeader(prayerKey, isIqama, lang, isFriday) {
    const t = TRANSLATIONS[lang];
    const name = { Fajr: t.prayerFajr, Sunrise: t.prayerSunrise, Dhuhr: isFriday ? t.prayerJumuah : t.prayerDhuhr, Asr: t.prayerAsr, Maghrib: t.prayerMaghrib, Isha: t.prayerIsha }[prayerKey];
    mainUI.nextPrayerName.textContent = isIqama ? `${t.alertIqamaTitle} (${name})` : (prayerKey === 'Sunrise' ? name : (lang === 'ar' ? `صلاة ${name}` : `${name} Prayer`));
    mainUI.dateDisplay.textContent = isIqama ? t.elapsedTime : t.remainingTime;
}

function startCountdown(baseTime, isIqama, timezone) {
    clearInterval(countdownInterval);
    const tick = () => {
        const now = getNowInZone(timezone);
        const diff = isIqama ? now - baseTime : baseTime - now;
        mainUI.countdown.textContent = (isIqama ? '+' : '') + msToTime(diff);
        if (!isIqama && diff <= 0) { 
            clearInterval(countdownInterval); 
            setTimeout(init, 1500); 
        }
    };
    tick(); countdownInterval = setInterval(tick, 1000);
}

const msToTime = (d) => {
    d = Math.abs(d);
    const s = Math.floor(d / 1000) % 60;
    const m = Math.floor(d / 60000) % 60;
    const h = Math.floor(d / 3600000);
    return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
};

/* ---------------------------------------------------
    6. إدارة الإعدادات والأحداث (Settings & Events)
--------------------------------------------------- */

// دالة لملء واجهة الإعدادات بالقيم المحفوظة
async function populateSettingsUI() {
    const settings = await getFromStorage(STORAGE_KEYS.SETTINGS) || {};
    
    settingsUI.langSelect.value = settings.language || 'ar';
    settingsUI.toggleAdhan.checked = settings.adhanSound !== false; // الافتراضي true
    settingsUI.toggleSunrise.checked = settings.enableSunrise === true;
    settingsUI.toggleFullscreen.checked = settings.fullscreenIqama === true;
    settingsUI.toggleAdhkar.checked = settings.adhkarEnabled === true;
    
    settingsUI.inputPreTime.value = settings.preAdhanMinutes || 15;
    settingsUI.inputIqamaTime.value = settings.iqamaMinutes || 25;
    settingsUI.inputAdhkarTime.value = settings.adhkarInterval || 30;

    // تحديث حالة الصوتيات
    await updateAudioStatusUI();
}

// --- ربط الأحداث (Event Listeners) ---

// 1. البحث الذكي (Input)
if (search.cityInput) {
    search.cityInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        clearTimeout(searchDebounceTimer);
        if (query.length < 2) {
            search.suggestionsList.innerHTML = '';
            search.suggestionsList.style.display = 'none';
            return;
        }
        searchDebounceTimer = setTimeout(() => fetchCitySuggestions(query), 300);
    });

    search.cityInput.addEventListener('focus', () => {
        if (search.suggestionsList.children.length > 0) {
            search.suggestionsList.style.display = 'block';
        }
    });
    
    search.cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleManualSearch();
    });
}

search.btnManual.onclick = () => handleManualSearch();

// 2. الموقع التلقائي
search.btnAuto.onclick = async () => {
    const originalText = search.btnAuto.textContent;
    search.btnAuto.textContent = "...";
    search.btnAuto.disabled = true;

    try {
        const coords = await getGeolocation();
        const lang = document.body.lang || 'ar';
        const geoUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}&addressdetails=1&accept-language=${lang}`;
        const response = await fetch(geoUrl);
        const data = await response.json();
        
        const addr = data.address;
        const cityName = addr.city || addr.town || addr.village || addr.suburb || addr.state || data.display_name.split(',')[0];
        const countryName = addr.country || "";
        const fullDisplayName = `${cityName}${countryName ? '، ' + countryName : ''}`;

        handleLocationSelection(coords.lat, coords.lng, fullDisplayName);

    } catch (error) {
        showToast("خطأ", error.message || "فشل تحديد الموقع", "🚫");
    } finally {
        search.btnAuto.textContent = originalText;
        search.btnAuto.disabled = false;
    }
};

settingsUI.btnReset.onclick = async () => {
    const confirmed = await showConfirm("تغيير الموقع", "هل تريد مسح الموقع الحالي واختيار موقع جديد؟", "📍");
    if (confirmed) {
        await chrome.storage.local.remove([STORAGE_KEYS.USER_LOCATION, STORAGE_KEYS.PRAYER_TIMES]);
        settingsUI.btnClose.click();
        switchView('onboarding');
    }
};

document.addEventListener('click', (e) => {
    if (search.cityInput && !search.cityInput.contains(e.target)) {
        if(search.suggestionsList) search.suggestionsList.style.display = 'none';
    }
});

// 3. أزرار الصوتيات (جديد)
settingsUI.btnUploadAdhan.onclick = () => settingsUI.inputUploadAdhan.click();
settingsUI.inputUploadAdhan.onchange = (e) => handleFileUpload(e.target.files[0], STORAGE_KEYS.CUSTOM_ADHAN, settingsUI.statusAdhan);
settingsUI.btnResetAdhan.onclick = () => handleFileReset(STORAGE_KEYS.CUSTOM_ADHAN, settingsUI.statusAdhan);

settingsUI.btnUploadIqama.onclick = () => settingsUI.inputUploadIqama.click();
settingsUI.inputUploadIqama.onchange = (e) => handleFileUpload(e.target.files[0], STORAGE_KEYS.CUSTOM_IQAMA, settingsUI.statusIqama);
settingsUI.btnResetIqama.onclick = () => handleFileReset(STORAGE_KEYS.CUSTOM_IQAMA, settingsUI.statusIqama);

// 4. فتح الإعدادات (مع تعبئة البيانات)
mainUI.btnSettings.onclick = async () => {
    await populateSettingsUI(); // 👈 إصلاح مهم: تعبئة القيم عند الفتح
    views.settings.classList.remove('hidden');
    requestAnimationFrame(() => views.settings.classList.add('active'));
};

settingsUI.btnClose.onclick = () => {
    views.settings.classList.remove('active');
    setTimeout(() => views.settings.classList.add('hidden'), 300);
};

settingsUI.btnSave.onclick = async () => {
    await saveToStorage(STORAGE_KEYS.SETTINGS, {
        language: settingsUI.langSelect.value,
        adhanSound: settingsUI.toggleAdhan.checked,
        enableSunrise: settingsUI.toggleSunrise.checked,
        fullscreenIqama: settingsUI.toggleFullscreen.checked,
        preAdhanMinutes: +settingsUI.inputPreTime.value || 15,
        iqamaMinutes: +settingsUI.inputIqamaTime.value || 25,
        adhkarEnabled: settingsUI.toggleAdhkar.checked,
        adhkarInterval: +settingsUI.inputAdhkarTime.value || 30
    });
    chrome.runtime.sendMessage({ action: 'RESHEDULE_ALARMS' });
    settingsUI.btnClose.click();
    init();
};

const init = async () => {
    switchView('loading');
    const settings = await getFromStorage(STORAGE_KEYS.SETTINGS) || {};
    applyLanguage(settings.language || 'ar');
    const loc = await getFromStorage(STORAGE_KEYS.USER_LOCATION);
    if (loc) loadMainView(loc); else switchView('onboarding');
};

init();