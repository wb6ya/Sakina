/**
 * @file popup.js
 * @description النسخة الاحترافية الشاملة (البحث الذكي، المواقع، الجمعة، الأذكار)
 */

import { TRANSLATIONS } from '../utils/translations.js';
import { getNextPrayer, getCurrentIqamaPeriod, getNowInZone } from '../utils/time-utils.js';
import { getFromStorage, saveToStorage, STORAGE_KEYS } from '../utils/storage.js';

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
    inputAdhkarTime: getEl('input-adhkar-time')
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

/**
 * جلب الاقتراحات من API الخرائط
 */
async function fetchCitySuggestions(query) {
    try {
        const lang = document.body.lang || 'ar';
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&accept-language=${lang}`;
        const response = await fetch(url, { headers: { 'User-Agent': 'PrayerFocusExtension/1.1' } });
        const results = await response.json();
        displaySuggestions(results);
    } catch (err) {
        console.error("Search Error:", err);
    }
}

/**
 * رسم قائمة الاقتراحات تحت حقل البحث
 */
function displaySuggestions(results) {
    if (!search.suggestionsList) return;
    
    // 1. تنظيف القائمة تماماً
    search.suggestionsList.innerHTML = '';
    
    // 2. التحقق من وجود نتائج
    if (!results || results.length === 0) {
        search.suggestionsList.classList.add('hidden'); // إخفاء باستخدام الكلاس
        search.suggestionsList.style.display = 'none';   // زيادة تأكيد الإخفاء
        return;
    }

    // 

    // 3. بناء العناصر
    results.forEach(item => {
        const addr = item.address;
        const cityName = addr.city || addr.town || addr.village || addr.suburb || addr.state || item.display_name.split(',')[0];
        const countryName = addr.country || "";
        const fullLabel = `${cityName}${countryName ? ', ' + countryName : ''}`;
        
        const li = document.createElement('li');
        li.className = 'suggestion-item';
        // إضافة أيقونة الدبوس مع النص
        li.innerHTML = `<span class="loc-icon">📍</span><span class="loc-text">${fullLabel}</span>`;
        
        // منع تداخل النقر مع العناصر الخلفية
        li.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            search.cityInput.value = cityName;
            
            // إخفاء القائمة فور الاختيار
            search.suggestionsList.classList.add('hidden');
            search.suggestionsList.style.display = 'none';
            
            // استدعاء دالة التأكيد
            confirmAndSelectLocation(item.lat, item.lon, fullLabel);
        });
        
        search.suggestionsList.appendChild(li);
    });

    // 4. الإظهار الفعلي (إزالة كلاس hidden وتحديد النوع block)
    search.suggestionsList.classList.remove('hidden');
    search.suggestionsList.style.display = 'block';
    
    // تصحيح برمجي لضمان بقاء القائمة فوق العناصر الأخرى
    search.suggestionsList.style.zIndex = "9999";
}

/**
 * تأكيد الموقع قبل اعتماده نهائياً
 */
async function confirmAndSelectLocation(lat, lon, displayName) {
    const confirmed = await showConfirm(
        TRANSLATIONS[document.body.lang].appTitle, 
        `هل تريد اعتماد هذا الموقع؟<br><strong>${displayName}</strong>`, 
        "📍"
    );
    if (confirmed) handleLocationSelection(lat, lon, displayName);
}

/**
 * جلب مواقيت الصلاة للموقع المختار وحفظه
 */
async function handleLocationSelection(lat, lon, displayName) {
    switchView('loading');
    try {
        const res = await fetch(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}&method=4`);
        const data = await res.json();
        if (data.code === 200) {
            const locObj = { name: displayName, lat, lng: lon, timezone: data.data.meta.timezone };
            await saveToStorage(STORAGE_KEYS.USER_LOCATION, locObj);
            await saveToStorage(STORAGE_KEYS.PRAYER_TIMES, data.data.timings);
            chrome.runtime.sendMessage({ action: 'RESHEDULE_ALARMS' });
            loadMainView(locObj);
        }
    } catch (e) {
        showToast("خطأ", "فشل الاتصال، تحقق من الإنترنت", "⚠️");
        switchView('onboarding');
    }
}

/**
 * البحث اليدوي عند ضغط الزر
 */
async function handleManualSearch(query) {
    const t = TRANSLATIONS[document.body.lang || 'ar'];
    const originalText = search.btnManual.textContent;
    
    // 1. إظهار حالة البحث (Visual Feedback)
    search.btnManual.textContent = "... جارٍ البحث";
    search.btnManual.classList.add('btn-loading');
    search.btnManual.disabled = true;

    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`;
        const response = await fetch(url);
        const results = await response.json();

        if (results && results.length > 0) {
            const item = results[0];
            const city = item.address.city || item.address.town || item.address.village || item.name;
            const country = item.address.country;
            const fullDisplayName = `${city}, ${country}`;

            // استدعاء التأكيد
            confirmAndSelectLocation(item.lat, item.lon, fullDisplayName);
        } else {
            showToast("عذراً", "لم يتم العثور على المدينة، حاول كتابة الاسم بشكل أدق", "❓");
        }
    } catch (err) {
        showToast("خطأ", "تحقق من اتصالك بالإنترنت", "⚠️");
    } finally {
        // 2. إعادة الزر لوضعه الطبيعي
        search.btnManual.textContent = originalText;
        search.btnManual.classList.remove('btn-loading');
        search.btnManual.disabled = false;
    }
}

/* ---------------------------------------------------
    4. تحديث الواجهة واللغة (UI & Lang)
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

/* ---------------------------------------------------
    5. إدارة الأحداث والعد التنازلي (Logic)
--------------------------------------------------- */
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

// ربط البحث الذكي المطور
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
}

// الأزرار الرئيسية
search.btnManual.onclick = () => handleManualSearch();

search.btnAuto.onclick = async () => {
    const t = TRANSLATIONS[document.body.lang || 'ar'];
    const originalText = search.btnAuto.textContent;
    
    search.btnAuto.textContent = "... جارٍ تحديد موقعك";
    search.btnAuto.disabled = true;

    navigator.geolocation.getCurrentPosition(
        async (p) => {
            const lat = p.coords.latitude;
            const lon = p.coords.longitude;

            try {
                // 1. عملية البحث العكسي لجلب اسم المدينة الحقيقي
                const lang = document.body.lang || 'ar';
                const geoUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1&accept-language=${lang}`;
                
                const response = await fetch(geoUrl, {
                    headers: { 'User-Agent': 'PrayerFocusApp/1.1' }
                });
                const data = await response.json();

                // 2. استخلاص اسم المدينة بذكاء
                const addr = data.address;
                const cityName = addr.city || addr.town || addr.village || addr.suburb || addr.state || data.display_name.split(',')[0];
                const countryName = addr.country || "";
                const fullDisplayName = `${cityName}${countryName ? '، ' + countryName : ''}`;

                // 3. تمرير الاسم الحقيقي بدلاً من "موقعي الحالي"
                handleLocationSelection(lat, lon, fullDisplayName);
                
            } catch (error) {
                console.error("Reverse Geocoding Error:", error);
                // في حال فشل جلب الاسم، نستخدم "موقعي الحالي" كاحتياط
                handleLocationSelection(lat, lon, "موقعي الحالي");
            } finally {
                search.btnAuto.textContent = originalText;
                search.btnAuto.disabled = false;
            }
        },
        () => {
            showToast("خطأ", "فشل الوصول للموقع، يرجى تفعيل الـ GPS في المتصفح", "🚫");
            search.btnAuto.textContent = originalText;
            search.btnAuto.disabled = false;
        },
        { timeout: 10000 }
    );
};

settingsUI.btnReset.onclick = async () => {
    const confirmed = await showConfirm("تغيير الموقع", "هل تريد مسح الموقع الحالي واختيار موقع جديد؟", "📍");
    if (confirmed) {
        await chrome.storage.local.remove([STORAGE_KEYS.USER_LOCATION, STORAGE_KEYS.PRAYER_TIMES]);
        settingsUI.btnClose.click();
        switchView('onboarding');
    }
};

// إغلاق القوائم عند النقر في الخارج
document.addEventListener('click', (e) => {
    if (!search.cityInput.contains(e.target)) search.suggestionsList.style.display = 'none';
});

// دوال التشغيل والإغلاق
mainUI.btnSettings.onclick = () => {
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
        adhkarEnabled: settingsUI.toggleAdhkar?.checked || false,
        adhkarInterval: +settingsUI.inputAdhkarTime?.value || 30
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