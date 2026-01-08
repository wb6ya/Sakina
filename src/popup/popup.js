/**
 * @file popup.js
 * @description الواجهة الأمامية (النسخة النهائية مع تعريب الأزرار والمدخلات)
 */

import { TRANSLATIONS } from '../utils/translations.js';
import { getNextPrayer, getCurrentIqamaPeriod, PRAYER_NAMES, getNowInZone } from '../utils/time-utils.js';
import { getFromStorage, saveToStorage, STORAGE_KEYS } from '../utils/storage.js';

// --- العناصر ---
const views = {
    loading: document.getElementById('loading-view'),
    onboarding: document.getElementById('onboarding-view'),
    main: document.getElementById('main-view'),
    settings: document.getElementById('settings-view')
};

// عناصر المودال
const modalOverlay = document.getElementById('custom-modal');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalIcon = document.getElementById('modal-icon');
const modalConfirmBtns = document.getElementById('modal-actions-confirm');
const modalAlertBtns = document.getElementById('modal-actions-alert');
const btnModalYes = document.getElementById('btn-modal-yes');
const btnModalNo = document.getElementById('btn-modal-no');
const btnModalOk = document.getElementById('btn-modal-ok');

// عناصر البحث
const cityInput = document.getElementById('city-input');
const countryInput = document.getElementById('country-input');
const suggestionsList = document.getElementById('suggestions-list');
const btnManualSearch = document.getElementById('btn-manual-search');
const btnAutoLocate = document.getElementById('btn-auto-locate');

// عناصر الشاشة الرئيسية
const locationNameEl = document.getElementById('location-name');
const countdownEl = document.getElementById('countdown');
const dateDisplayEl = document.getElementById('date-display');
const nextPrayerNameEl = document.getElementById('next-prayer-name');
const prayersListEl = document.getElementById('prayers-list');
const btnSettings = document.getElementById('btn-settings');

// عناصر الإعدادات
const langSelect = document.getElementById('language-select');
const btnCloseSettings = document.getElementById('btn-close-settings');
const btnSaveSettings = document.getElementById('btn-save-settings');
const btnResetLocation = document.getElementById('btn-reset-location');
const inputPreTime = document.getElementById('input-pre-time');
const inputIqamaTime = document.getElementById('input-iqama-time');
const toggleAdhan = document.getElementById('toggle-adhan-sound');
const toggleSunrise = document.getElementById('toggle-sunrise');
const toggleFullscreen = document.getElementById('toggle-fullscreen-iqama');

let countdownInterval = null;

// --- دوال المودال ---
function showToast(title, message, icon = 'ℹ️') {
    return new Promise((resolve) => {
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        modalIcon.textContent = icon;
        modalConfirmBtns.classList.add('hidden');
        modalAlertBtns.classList.remove('hidden');
        modalOverlay.classList.remove('hidden');
        setTimeout(() => modalOverlay.classList.add('show'), 10);
        btnModalOk.onclick = () => {
            modalOverlay.classList.remove('show');
            setTimeout(() => modalOverlay.classList.add('hidden'), 200);
            resolve();
        };
    });
}

function showConfirm(title, message, icon = '🤔') {
    return new Promise((resolve) => {
        modalTitle.textContent = title;
        modalMessage.innerHTML = message;
        modalIcon.textContent = icon;
        modalAlertBtns.classList.add('hidden');
        modalConfirmBtns.classList.remove('hidden');
        modalOverlay.classList.remove('hidden');
        setTimeout(() => modalOverlay.classList.add('show'), 10);
        const close = (result) => {
            modalOverlay.classList.remove('show');
            setTimeout(() => modalOverlay.classList.add('hidden'), 200);
            resolve(result);
        };
        btnModalYes.onclick = () => close(true);
        btnModalNo.onclick = () => close(false);
    });
}

// --- دالة تطبيق اللغة (تحديث شامل) ---
function applyLanguage(lang) {
    const t = TRANSLATIONS[lang];
    document.body.dir = t.dir;
    document.body.lang = lang;

    // 1. Placeholder للبحث
    if(cityInput) cityInput.placeholder = t.placeholderCity;

    // 2. أزرار المودال (نعم/لا/موافق)
    if(btnModalYes) btnModalYes.textContent = t.btnYes;
    if(btnModalNo) btnModalNo.textContent = t.btnNo;
    if(btnModalOk) btnModalOk.textContent = t.btnOk;

    // 3. نصوص الإعدادات (Labels)
    const updateLabel = (inputId, text) => {
        const input = document.getElementById(inputId);
        if (input) {
            // نبحث عن أقرب container سواء كان setting-group أو غيره
            const group = input.closest('.setting-group') || input.parentElement;
            if (group) {
                // نبحث عن Label لا يكون switch
                const labelEl = group.querySelector('label:not(.switch)');
                if (labelEl) labelEl.textContent = text;
            }
        }
    };

    updateLabel('toggle-adhan-sound', t.labelAdhan);
    updateLabel('toggle-sunrise', t.labelSunrise);
    updateLabel('toggle-fullscreen-iqama', t.labelFullscreen);
    updateLabel('input-pre-time', t.labelPreTime);
    updateLabel('input-iqama-time', t.labelIqamaTime);
    
    const langLabel = document.querySelector('label[data-i18n="labelLanguage"]');
    if(langLabel) langLabel.textContent = t.labelLanguage;

    // 4. الأزرار الرئيسية
    if(btnSaveSettings) btnSaveSettings.textContent = t.save;
    if(btnResetLocation) btnResetLocation.textContent = t.reset;
    if(btnManualSearch) btnManualSearch.textContent = t.manualSearch;
    if(btnAutoLocate) btnAutoLocate.textContent = t.autoLocate;

    // 5. القائمة المنسدلة
    if(langSelect) langSelect.value = lang;
}

// --- التشغيل ---
const init = async () => {
    switchView('loading');
    
    const settings = await getFromStorage(STORAGE_KEYS.SETTINGS) || {};
    const currentLang = settings.language || 'ar';
    applyLanguage(currentLang);

    const location = await getFromStorage(STORAGE_KEYS.USER_LOCATION);
    if (location) {
        await updatePrayersIfOutdated(location);
        loadMainView(location);
    } else {
        switchView('onboarding');
    }

    updateSkyCycle();
};

// --- البحث ---
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

cityInput.addEventListener('input', debounce(async (e) => {
    const query = e.target.value.trim();
    if (query.length < 3) {
        suggestionsList.classList.add('hidden');
        return;
    }
    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`;
        const response = await fetch(url);
        const results = await response.json();
        renderSuggestions(results);
    } catch (err) { console.error(err); }
}, 400));

function renderSuggestions(results) {
    suggestionsList.innerHTML = '';
    if (results.length === 0) {
        suggestionsList.classList.add('hidden');
        return;
    }
    results.forEach(item => {
        const city = item.address.city || item.address.town || item.address.village || item.name;
        const country = item.address.country;
        const displayName = `${city}, ${country}`;
        const li = document.createElement('li');
        li.className = 'suggestion-item';
        li.textContent = displayName;
        li.addEventListener('click', () => {
            cityInput.value = city;
            countryInput.value = country;
            suggestionsList.classList.add('hidden');
            handleLocationSelection(item.lat, item.lon, item.display_name);
        });
        suggestionsList.appendChild(li);
    });
    suggestionsList.classList.remove('hidden');
}

document.addEventListener('click', (e) => {
    if (!cityInput.contains(e.target) && !suggestionsList.contains(e.target)) {
        suggestionsList.classList.add('hidden');
    }
});

async function handleLocationSelection(lat, lon, fullDisplayName) {
    const settings = await getFromStorage(STORAGE_KEYS.SETTINGS) || {};
    const t = TRANSLATIONS[settings.language || 'ar'];

    const originalBtnText = btnManualSearch.textContent;
    btnManualSearch.textContent = t.loading;
    btnManualSearch.disabled = true;

    try {
        const adhanUrl = `http://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}&method=4`;
        const adhanRes = await fetch(adhanUrl);
        const adhanData = await adhanRes.json();
        const timings = adhanData.data.timings;
        const timezone = adhanData.data.meta.timezone;

        const confirmMsg = settings.language === 'en' ? "Is this the correct location?" : "هل تقصد هذا المكان؟";

        const confirmed = await showConfirm(
            confirmMsg,
            `<b>${fullDisplayName}</b><br><span style="font-size:12px; color:#aaa">${timezone}</span>`,
            "📍"
        );

        if (confirmed) {
            const locationData = { 
                type: 'manual', 
                name: fullDisplayName.split(',')[0],
                lat: lat,
                lng: lon,
                timezone: timezone 
            };
            await saveToStorage(STORAGE_KEYS.USER_LOCATION, locationData);
            await saveToStorage(STORAGE_KEYS.PRAYER_TIMES, timings);
            loadMainView(locationData);
        }
    } catch (e) {
        showToast("Error", settings.language === 'en' ? "Failed to fetch timings." : "فشل جلب المواقيت.", "⚠️");
    } finally {
        btnManualSearch.textContent = originalBtnText;
        btnManualSearch.disabled = false;
    }
}

// أزرار البحث
btnManualSearch.addEventListener('click', async () => {
    const settings = await getFromStorage(STORAGE_KEYS.SETTINGS) || {};
    const t = TRANSLATIONS[settings.language || 'ar'];
    
    const city = cityInput.value.trim();
    if (!city) { showToast("!", settings.language === 'en' ? "Enter city name." : "اكتب اسم المدينة.", "✍️"); return; }
});

btnAutoLocate.addEventListener('click', async () => {
    const settings = await getFromStorage(STORAGE_KEYS.SETTINGS) || {};
    const t = TRANSLATIONS[settings.language || 'ar'];

    btnAutoLocate.textContent = t.loading;
    
    try {
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        const { latitude, longitude } = position.coords;
        const gpsText = settings.language === 'en' ? "My Location (GPS)" : "موقعي الحالي (GPS)";
        await handleLocationSelection(latitude, longitude, gpsText);
    } catch (error) {
        showToast("GPS Error", settings.language === 'en' ? "Enable location services." : "تأكد من تفعيل الموقع.", "🚫");
    } finally {
        btnAutoLocate.textContent = t.autoLocate;
    }
});


// --- الشاشة الرئيسية ---
async function loadMainView(locationData) {
    if (locationNameEl) locationNameEl.textContent = locationData.name;
    const times = await getFromStorage(STORAGE_KEYS.PRAYER_TIMES);
    const settings = await getFromStorage(STORAGE_KEYS.SETTINGS) || {};
    
    const iqamaMinutes = settings.iqamaMinutes || 25; 
    const enableSunrise = settings.enableSunrise === true;
    const currentLang = settings.language || 'ar';

    applyLanguage(currentLang);

    if (!times) return;

    const timezone = locationData.timezone; 
    const iqamaPeriod = getCurrentIqamaPeriod(times, iqamaMinutes, timezone);

    if (iqamaPeriod) {
        updateHeader(iqamaPeriod.prayer, true, currentLang);
        startCountdown(iqamaPeriod.prayerTime, true, timezone);
        renderPrayersList(times, iqamaPeriod.prayer, enableSunrise, currentLang);
    } else {
        const nextPrayer = getNextPrayer(times, timezone, enableSunrise);
        updateHeader(nextPrayer.key, false, currentLang);
        startCountdown(nextPrayer.time, false, timezone);
        renderPrayersList(times, nextPrayer.key, enableSunrise, currentLang);
    }
    
    switchView('main');
}

function renderPrayersList(timings, activePrayerKey, includeSunrise, lang) {
    if (!prayersListEl) return;
    prayersListEl.innerHTML = '';
    const t = TRANSLATIONS[lang];

    let prayerKeys = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    if (includeSunrise) {
        prayerKeys.splice(1, 0, 'Sunrise');
    }

    const prayerNamesTranslated = {
        Fajr: t.prayerFajr,
        Sunrise: t.prayerSunrise,
        Dhuhr: t.prayerDhuhr,
        Asr: t.prayerAsr,
        Maghrib: t.prayerMaghrib,
        Isha: t.prayerIsha
    };

    prayerKeys.forEach(key => {
        const timeStr = timings[key].split(" ")[0];
        const displayName = prayerNamesTranslated[key];
        const [h, m] = timeStr.split(':');
        
        let hour = parseInt(h);
        const ampm = hour >= 12 ? (lang === 'ar' ? 'م' : 'PM') : (lang === 'ar' ? 'ص' : 'AM');
        hour = hour % 12;
        hour = hour ? hour : 12; 
        const niceTime = `${hour}:${m} ${ampm}`;

        const item = document.createElement('div');
        const isActive = key === activePrayerKey;
        const isSunrise = key === 'Sunrise';

        item.className = `prayer-item ${isActive ? 'active' : ''} ${isSunrise ? 'prayer-sunrise' : ''}`;
        
        item.innerHTML = `
            <span class="prayer-name">${displayName}</span>
            <span class="prayer-time" dir="ltr">${niceTime}</span>
        `;
        prayersListEl.appendChild(item);
        
        if (isActive) {
            setTimeout(() => {
                item.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 500);
        }
    });
}

function updateHeader(prayerKey, isIqamaMode, lang) {
    if (!nextPrayerNameEl || !dateDisplayEl) return;

    const t = TRANSLATIONS[lang];
    const prayerNamesTranslated = {
        Fajr: t.prayerFajr,
        Sunrise: t.prayerSunrise,
        Dhuhr: t.prayerDhuhr,
        Asr: t.prayerAsr,
        Maghrib: t.prayerMaghrib,
        Isha: t.prayerIsha
    };
    
    const displayName = prayerNamesTranslated[prayerKey];

    if (isIqamaMode) {
        nextPrayerNameEl.textContent = `${t.alertIqamaTitle} (${displayName})`;
        nextPrayerNameEl.style.color = "#4dabf7";
        dateDisplayEl.textContent = t.elapsedTime;
    } else {
        if (prayerKey === 'Sunrise') {
            nextPrayerNameEl.textContent = displayName;
            nextPrayerNameEl.style.color = "#ffc107";
        } else {
            if(lang === 'ar') nextPrayerNameEl.textContent = `صلاة ${displayName}`;
            else nextPrayerNameEl.textContent = `${displayName} Prayer`;
            nextPrayerNameEl.style.color = "#d4af37";
        }
        dateDisplayEl.textContent = t.remainingTime;
    }
}

function startCountdown(baseTime, isIqamaMode, timezone) {
    if (countdownInterval) clearInterval(countdownInterval);
    const tick = () => {
        const nowInZone = getNowInZone(timezone); 
        updateSkyCycle();

        if (isIqamaMode) {
            const diff = nowInZone - baseTime; 
            if (countdownEl) {
                countdownEl.textContent = "+" + msToTime(diff);
                countdownEl.style.color = "#a5d8ff";
            }
        } else {
            const diff = baseTime - nowInZone;
            if (diff > 0) {
                if (countdownEl) {
                    countdownEl.textContent = msToTime(diff);
                    countdownEl.style.color = "white";
                }
            } else {
                if (countdownEl) countdownEl.textContent = "00:00:00";
                clearInterval(countdownInterval);
                setTimeout(() => init(), 2000); 
            }
        }
    };
    tick();
    countdownInterval = setInterval(tick, 1000);
}

function msToTime(duration) {
    duration = Math.abs(duration);
    let seconds = Math.floor((duration / 1000) % 60);
    let minutes = Math.floor((duration / (1000 * 60)) % 60);
    let hours = Math.floor((duration / (1000 * 60 * 60)) % 24);
    return [hours, minutes, seconds].map(v => v < 10 ? "0" + v : v).join(":");
}

// --- الإعدادات ---
if (btnSettings) {
    btnSettings.addEventListener('click', async () => {
        // 1. تجهيز البيانات
        const settings = await getFromStorage(STORAGE_KEYS.SETTINGS) || {};
        const lang = settings.language || 'ar';
        applyLanguage(lang);

        toggleAdhan.checked = settings.adhanSound !== false;
        toggleSunrise.checked = settings.enableSunrise === true; 
        toggleFullscreen.checked = settings.fullscreenIqama === true;
        
        inputPreTime.value = settings.preAdhanMinutes || 15;
        inputIqamaTime.value = settings.iqamaMinutes || 25;
        
        if (langSelect) langSelect.value = lang;

        checkCustomSounds();

        // 2. إظهار الصفحة (Slide Up Animation)
        // لا نستخدم classList.remove('hidden') لأننا نعتمد على transform في CSS
        // لكن للتأكد، نزيل hidden أولاً ثم نضيف active
        views.settings.classList.remove('hidden'); 
        
        // تأخير بسيط جداً لتفعيل الانيميشن
        requestAnimationFrame(() => {
            views.settings.classList.add('active');
        });
    });
}

langSelect.addEventListener('change', (e) => {
    const selectedLang = e.target.value;
    applyLanguage(selectedLang);
});

if (btnCloseSettings) btnCloseSettings.addEventListener('click', () => closeSettingsView());

if (btnSaveSettings) btnSaveSettings.addEventListener('click', async () => {
    const newSettings = {
        language: langSelect.value,
        adhanSound: toggleAdhan.checked,
        enableSunrise: toggleSunrise.checked,
        fullscreenIqama: toggleFullscreen.checked,
        preAdhanMinutes: parseInt(inputPreTime.value) || 15,
        iqamaMinutes: parseInt(inputIqamaTime.value) || 25
    };
    await saveToStorage(STORAGE_KEYS.SETTINGS, newSettings);
    
    chrome.runtime.sendMessage({ action: 'RESHEDULE_ALARMS' });
    
    closeSettingsView();
    init();
});

btnResetLocation.addEventListener('click', async () => {
    const settings = await getFromStorage(STORAGE_KEYS.SETTINGS) || {};
    const lang = settings.language || 'ar';
    const t = TRANSLATIONS[lang];
    
    const confirmMsg = lang === 'en' ? "Are you sure you want to reset location?" : "هل أنت متأكد من تغيير الموقع؟";
    
    const confirmed = await showConfirm(t.reset, confirmMsg, "⚠️");
    if (confirmed) {
        await chrome.storage.local.remove([STORAGE_KEYS.USER_LOCATION, STORAGE_KEYS.PRAYER_TIMES]);
        location.reload();
    }
});

function closeSettingsView() {
    views.settings.classList.remove('active');
    setTimeout(() => views.settings.classList.add('hidden'), 300);
}

function switchView(viewName) {
    if (viewName !== 'settings') {
        Object.values(views).forEach(el => {
            if (el.id !== 'settings-view') el.classList.add('hidden');
        });
        if (views[viewName]) views[viewName].classList.remove('hidden');
    }
}

async function updatePrayersIfOutdated(location) {}

function updateSkyCycle() {
    const cardEl = document.getElementById('dynamic-card');
    if (!cardEl) return;

    const now = new Date();
    const hours = now.getHours();
    const isDayTime = hours >= 6 && hours < 18; 

    if (isDayTime) {
        cardEl.classList.add('is-day');
        cardEl.classList.remove('is-night');
    } else {
        cardEl.classList.add('is-night');
        cardEl.classList.remove('is-day');
    }
}

// --- منطق رفع الأصوات ---
const uploadAdhanInput = document.getElementById('upload-adhan');
const btnUploadAdhan = document.getElementById('btn-upload-adhan');
const btnResetAdhan = document.getElementById('btn-reset-adhan');
const statusAdhan = document.getElementById('status-adhan');

const uploadIqamaInput = document.getElementById('upload-iqama');
const btnUploadIqama = document.getElementById('btn-upload-iqama');
const btnResetIqama = document.getElementById('btn-reset-iqama');
const statusIqama = document.getElementById('status-iqama');

// ربط الأزرار بحقول الإدخال المخفية
btnUploadAdhan.addEventListener('click', () => uploadAdhanInput.click());
btnUploadIqama.addEventListener('click', () => uploadIqamaInput.click());

// دالة مساعدة لقراءة الملف وتحويله لـ Base64
const handleFileUpload = (file, storageKey, statusEl) => {
    if (!file) return;
    
    // التحقق من الحجم (مثلاً لا يزيد عن 5 ميجا)
    if (file.size > 5 * 1024 * 1024) {
        alert("حجم الملف كبير جداً! يرجى اختيار ملف أقل من 5 ميجابايت.");
        return;
    }

    const reader = new FileReader();
    statusEl.textContent = "جاري المعالجة...";
    
    reader.onload = async function(e) {
        const base64Audio = e.target.result;
        await chrome.storage.local.set({ [storageKey]: base64Audio });
        statusEl.textContent = "✅ تم تعيين الملف المخصص (" + file.name + ")";
        statusEl.style.color = "#4dabf7";
    };
    
    reader.readAsDataURL(file);
};

// عند اختيار ملف أذان
uploadAdhanInput.addEventListener('change', (e) => {
    handleFileUpload(e.target.files[0], 'custom_adhan_sound', statusAdhan);
});

// عند اختيار ملف إقامة
uploadIqamaInput.addEventListener('change', (e) => {
    handleFileUpload(e.target.files[0], 'custom_iqama_sound', statusIqama);
});

// زر الاستعادة (حذف المخصص)
btnResetAdhan.addEventListener('click', async () => {
    await chrome.storage.local.remove('custom_adhan_sound');
    statusAdhan.textContent = "الافتراضي";
    statusAdhan.style.color = "#888";
    uploadAdhanInput.value = ""; // تصفير الإدخال
});

btnResetIqama.addEventListener('click', async () => {
    await chrome.storage.local.remove('custom_iqama_sound');
    statusIqama.textContent = "الافتراضي";
    statusIqama.style.color = "#888";
    uploadIqamaInput.value = "";
});

// عند فتح الإعدادات، نتحقق من الحالة الحالية
async function checkCustomSounds() {
    const data = await chrome.storage.local.get(['custom_adhan_sound', 'custom_iqama_sound']);
    
    if (data.custom_adhan_sound) {
        statusAdhan.textContent = "✅ مخصص (محفوظ)";
        statusAdhan.style.color = "#4dabf7";
    }
    
    if (data.custom_iqama_sound) {
        statusIqama.textContent = "✅ مخصص (محفوظ)";
        statusIqama.style.color = "#4dabf7";
    }
}

// ⚠️ مهم: استدعِ checkCustomSounds() داخل زر فتح الإعدادات
btnSettings.addEventListener('click', async () => {
    // ... (الكود القديم) ...
    checkCustomSounds(); // 🆕 أضف هذا السطر
});

init();