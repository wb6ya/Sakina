/**
 * @file popup.js
 * @description وحدة التحكم الرئيسية (Main Controller)
 */

// 1. الاستيرادات (Imports)
import { TRANSLATIONS } from '../utils/translations.js';
import { getNextPrayer, parsePrayerTime } from '../utils/time-utils.js';
import { getFromStorage, saveToStorage, STORAGE_KEYS, removeFromStorage } from '../utils/storage.js';
import { fetchPrayerTimes } from '../utils/api.js';
import { getGeolocation } from '../utils/locations.js';
import { switchView, showToast, showConfirm } from '../utils/ui-helpers.js'; // دوال الواجهة
import { getPrayerState } from '../utils/prayer-logic.js'; // منطق الصلاة

// 2. المتغيرات العامة
let searchDebounceTimer = null;
let timerInterval = null;

// 3. عند تحميل الصفحة (تغليف الكود لضمان الأمان)
document.addEventListener('DOMContentLoaded', async () => {

    /* =========================================
       (أ) تعريف العناصر (DOM Elements Mapping)
       ========================================= */
    const getEl = (id) => document.getElementById(id);

    // كائن الشاشات
    const views = {
        loading: getEl('loading-view'),
        onboarding: getEl('onboarding-view'),
        main: getEl('main-view'),
        settings: getEl('settings-view')
    };

    // عناصر الواجهة الرئيسية
    const mainUI = {
        currentDate: getEl('current-date'),
        locationName: getEl('location-name'),
        countdown: getEl('countdown'),
        dateDisplay: getEl('date-display'),
        nextPrayerName: getEl('next-prayer-name'),
        prayersList: getEl('prayers-list'),
        btnSettings: getEl('btn-settings')
    };

    // عناصر الإعدادات
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

        btnUploadAdhan: getEl('btn-upload-adhan'),
        inputUploadAdhan: getEl('upload-adhan'),
        btnResetAdhan: getEl('btn-reset-adhan'),
        statusAdhan: getEl('status-adhan'),

        btnUploadIqama: getEl('btn-upload-iqama'),
        inputUploadIqama: getEl('upload-iqama'),
        btnResetIqama: getEl('btn-reset-iqama'),
        statusIqama: getEl('status-iqama')
    };

    // عناصر المودال (الرسائل المنبثقة)
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

    // عناصر البحث
    const search = {
        cityInput: getEl('city-input'),
        suggestionsList: getEl('suggestions-list'),
        btnManual: getEl('btn-manual-search'),
        btnAuto: getEl('btn-auto-locate')
    };

    /* =========================================
       (ب) المنطق الأساسي وتحديث الواجهة
       ========================================= */

    /**
     * الدالة الرئيسية لتحديث البيانات على الشاشة
     */
    async function updateUI() {
        try {
            // جلب البيانات المخزنة بالتوازي
            const [timesData, settingsData, locationData] = await Promise.all([
                chrome.storage.local.get('prayer_times'),
                chrome.storage.local.get('app_settings'),
                chrome.storage.local.get('user_location')
            ]);

            const timings = timesData.prayer_times;
            const settings = settingsData.app_settings || {};
            const lang = settings.language || 'ar';
            const t = TRANSLATIONS[lang];
            const iqamaOffset = Number(settings.iqamaMinutes || 25);
            
            if (!timings) return;

            // 1. حساب الحالة (أذان، إقامة، عادي) باستخدام الملف الخارجي
            const state = getPrayerState(timings, iqamaOffset);
            
            // 2. تجهيز النصوص
            const prayerKey = state.prayerKey;
            const prayerNameTranslated = t[`prayer${prayerKey}`] || prayerKey;
            
            // إعادة ضبط العناصر للحالة الافتراضية
            if(mainUI.countdown) mainUI.countdown.style.display = 'block';
            if(mainUI.nextPrayerName) mainUI.nextPrayerName.style.fontSize = ''; 

            // 3. تطبيق السيناريوهات
            if (state.mode === 'WAITING_IQAMA') {
                // --- سيناريو 1: وقت الأذان والانتظار ---
                const adhanText = lang === 'ar' ? `يُرفع الآن أذان صلاة ${prayerNameTranslated}` : `Now Adhan for ${prayerNameTranslated}`;
                const labelText = lang === 'ar' ? "متبقي على الإقامة" : "Time until Iqama";

                setUIState(adhanText, '#fbbf24', '18px', labelText);
                startTimer(state.iqamaTime); // عد تنازلي للإقامة
            }
            else if (state.mode === 'IQAMA_ACTIVE') {
                // --- سيناريو 2: وقت الإقامة ---
                const iqamaText = lang === 'ar' ? `تُقام الآن صلاة ${prayerNameTranslated}` : `Now Iqama for ${prayerNameTranslated}`;
                
                setUIState(iqamaText, '#4ade80', '18px', "");
                if(mainUI.countdown) mainUI.countdown.style.display = 'none'; // إخفاء العداد
            }
            else {
                // --- سيناريو 3: الوضع الطبيعي (الصلاة القادمة) ---
                if(mainUI.dateDisplay) mainUI.dateDisplay.textContent = t.nextPrayer || "الصلاة القادمة";
                
                const nextPrayerObj = getNextPrayer(timings, locationData.user_location?.timezone, settings.enableSunrise);
                
                if (nextPrayerObj) {
                    const nextKey = nextPrayerObj.key;
                    setUIState(t[`prayer${nextKey}`] || nextKey, '#ffffff', '', null);
                    startTimer(nextPrayerObj.time.getTime());
                    renderPrayersList(timings, nextKey, settings.enableSunrise, lang);
                }
            }
            
            // تحديث القائمة الجانبية في الحالات النشطة
            if (state.mode !== 'NORMAL') {
                renderPrayersList(timings, state.prayerKey, settings.enableSunrise, lang);
            }
        } catch (e) {
            console.error("Update UI Error:", e);
        }
    }

    // دالة مساعدة لتحديث النصوص والألوان
    function setUIState(mainText, color, fontSize, subText) {
        if(mainUI.nextPrayerName) {
            mainUI.nextPrayerName.textContent = mainText;
            mainUI.nextPrayerName.style.color = color;
            if(fontSize) mainUI.nextPrayerName.style.fontSize = fontSize;
        }
        if(subText !== null && mainUI.dateDisplay) {
            mainUI.dateDisplay.textContent = subText;
        }
    }

    // دالة العداد التنازلي
    function startTimer(targetTime) {
        if (timerInterval) clearInterval(timerInterval);
        
        function update() {
            const now = Date.now();
            let diff = targetTime - now;
            if (diff < 0) diff = 0;
            
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            
            const formatted = (h > 0 ? h.toString().padStart(2, '0') + ':' : '') + 
                              m.toString().padStart(2, '0') + ':' + 
                              s.toString().padStart(2, '0');
                              
            if (mainUI.countdown) mainUI.countdown.textContent = formatted;
        }
        update();
        timerInterval = setInterval(update, 1000);
    }

    // رسم قائمة الصلوات الجانبية
    function renderPrayersList(timings, activeKey, includeSunrise, lang) {
        if (!mainUI.prayersList) return;
        mainUI.prayersList.innerHTML = '';
        const t = TRANSLATIONS[lang];
        const keys = ['Fajr', ...(includeSunrise ? ['Sunrise'] : []), 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
        const names = { Fajr: t.prayerFajr, Sunrise: t.prayerSunrise, Dhuhr: t.prayerDhuhr, Asr: t.prayerAsr, Maghrib: t.prayerMaghrib, Isha: t.prayerIsha };
        
        keys.forEach(key => {
            const [h, m] = timings[key].split(':');
            let hr = parseInt(h);
            const ampm = hr >= 12 ? (lang === 'ar' ? 'م' : 'PM') : (lang === 'ar' ? 'ص' : 'AM');
            hr = hr % 12 || 12;
            
            const item = document.createElement('div');
            const isActive = (key === activeKey) || (activeKey === 'Jumuah' && key === 'Dhuhr');
            item.className = `prayer-item ${isActive ? 'active' : ''}`;
            item.innerHTML = `<span>${names[key]}</span><span dir="ltr">${hr}:${m} ${ampm}</span>`;
            mainUI.prayersList.appendChild(item);
        });
    }

    // تحميل الشاشة الرئيسية والبيانات
    async function loadMainView(locationData) {
        try {
            if(mainUI.locationName) mainUI.locationName.textContent = locationData.name;
            const settings = await getFromStorage(STORAGE_KEYS.SETTINGS) || {};
            const lang = settings.language || 'ar';
            applyLanguage(lang);
            
            if (mainUI.currentDate) {
                const locale = lang === 'ar' ? 'ar-SA' : 'en-US';
                mainUI.currentDate.textContent = new Date().toLocaleDateString(locale, {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                });
            }
            await updateUI();
            switchView('main', views);
        } catch (e) {
            console.error("Load Error:", e);
            switchView('onboarding', views);
        }
    }

    // تطبيق اللغة على الواجهة
    function applyLanguage(lang) {
        const t = TRANSLATIONS[lang] || TRANSLATIONS['ar'];
        document.body.dir = t.dir;
        document.body.lang = lang;
        if (search.cityInput) search.cityInput.placeholder = t.placeholderCity;
        if (modal.btnYes) modal.btnYes.textContent = t.btnYes;
        if (modal.btnNo) modal.btnNo.textContent = t.btnNo;
        if (modal.btnOk) modal.btnOk.textContent = t.btnOk;
        if (settingsUI.btnSave) settingsUI.btnSave.textContent = t.save;
        if (settingsUI.btnReset) settingsUI.btnReset.textContent = t.reset;
        if (search.btnManual) search.btnManual.textContent = t.manualSearch;
        if (search.btnAuto) search.btnAuto.textContent = t.autoLocate;
    }

    /* =========================================
       (ج) إدارة البحث والموقع (Search Logic)
       ========================================= */

    async function handleLocationSelection(lat, lon, displayName) {
        switchView('loading', views);
        try {
            const apiData = await fetchPrayerTimes(lat, lon);
            if (apiData) {
                const locObj = { name: displayName, lat, lng: lon, timezone: apiData.meta.timezone };
                await saveToStorage(STORAGE_KEYS.USER_LOCATION, locObj);
                await saveToStorage(STORAGE_KEYS.PRAYER_TIMES, apiData.timings);
                chrome.runtime.sendMessage({ action: 'RESHEDULE_ALARMS' });
                await loadMainView(locObj);
            } else { throw new Error("API Error"); }
        } catch (err) {
            showToast(modal, "خطأ", "فشل الاتصال", "⚠️");
            switchView('onboarding', views);
        }
    }

    async function handleManualSearch(query) {
        const searchQuery = query || (search.cityInput ? search.cityInput.value.trim() : '');
        if (!searchQuery) return;
        
        if(search.btnManual) {
            search.btnManual.textContent = "...";
            search.btnManual.disabled = true;
        }

        try {
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&addressdetails=1`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.length > 0) {
                const item = data[0];
                const dName = item.display_name.split(',')[0];
                // تأكيد قبل الحفظ
                const confirmed = await showConfirm(modal, 'تأكيد', `هل تريد اختيار: ${dName}؟`);
                if(confirmed) handleLocationSelection(item.lat, item.lon, dName);
            } else {
                showToast(modal, "تنبيه", "لم يتم العثور على المدينة", "🔍");
            }
        } catch {
            showToast(modal, "خطأ", "مشكلة في الاتصال", "❌");
        } finally {
            if(search.btnManual) {
                search.btnManual.textContent = TRANSLATIONS[document.body.lang || 'ar'].manualSearch;
                search.btnManual.disabled = false;
            }
        }
    }

    async function fetchCitySuggestions(query) {
        try {
            const lang = document.body.lang || 'ar';
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&accept-language=${lang}`;
            const response = await fetch(url);
            displaySuggestions(await response.json());
        } catch (err) { console.error(err); }
    }

    function displaySuggestions(results) {
        if (!search.suggestionsList) return;
        search.suggestionsList.innerHTML = '';
        if (!results || results.length === 0) { search.suggestionsList.style.display = 'none'; return; }
        
        results.forEach(item => {
            const li = document.createElement('li');
            li.className = 'suggestion-item';
            li.textContent = item.display_name.split(',').slice(0, 2).join(',');
            li.onclick = () => {
                if(search.cityInput) search.cityInput.value = li.textContent;
                search.suggestionsList.style.display = 'none';
                const dName = item.display_name.split(',')[0];
                showConfirm(modal, 'تأكيد', `هل تريد اختيار: ${dName}؟`).then(confirmed => {
                    if(confirmed) handleLocationSelection(item.lat, item.lon, dName);
                });
            };
            search.suggestionsList.appendChild(li);
        });
        search.suggestionsList.style.display = 'block';
        search.suggestionsList.classList.remove('hidden');
    }

    /* =========================================
       (د) ربط الأحداث (Event Listeners)
       ========================================= */

    // 1. البحث
    if (search.cityInput) {
        search.cityInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            clearTimeout(searchDebounceTimer);
            if (query.length < 2) {
                if(search.suggestionsList) search.suggestionsList.style.display = 'none';
                return;
            }
            searchDebounceTimer = setTimeout(() => fetchCitySuggestions(query), 300);
        });
        search.cityInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleManualSearch(); });
        document.addEventListener('click', (e) => {
            if (!search.cityInput.contains(e.target) && search.suggestionsList) {
                search.suggestionsList.style.display = 'none';
            }
        });
    }

    if (search.btnManual) search.btnManual.onclick = () => handleManualSearch();
    
    // التحديد التلقائي مع اسم المدينة
    if (search.btnAuto) {
        search.btnAuto.onclick = async () => {
            const originalText = search.btnAuto.textContent;
            search.btnAuto.textContent = "جاري التحديد...";
            search.btnAuto.disabled = true;

            try {
                const coords = await getGeolocation();
                const lang = document.body.lang || 'ar';
                // Reverse Geocoding لجلب الاسم
                const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}&addressdetails=1&accept-language=${lang}`;
                
                const response = await fetch(url);
                const data = await response.json();

                const addr = data.address;
                const city = addr.city || addr.town || addr.village || addr.county || addr.state || data.name;
                const country = addr.country || "";
                const finalName = country ? `${city}، ${country}` : city;

                const confirmed = await showConfirm(modal, 'تم تحديد الموقع', `هل تريد اعتماد: <strong>${finalName}</strong>؟`, "📍");
                
                if (confirmed) {
                    handleLocationSelection(coords.lat, coords.lng, finalName);
                }
            } catch (error) {
                showToast(modal, "خطأ", "تعذر جلب اسم المدينة", "⚠️");
                // يمكن هنا تفعيل اختيار احتياطي بالإحداثيات فقط إذا رغبت
            } finally {
                search.btnAuto.textContent = originalText;
                search.btnAuto.disabled = false;
            }
        };
    }

    // 2. إدارة الإعدادات (Save & Reset)
    if (settingsUI.btnSave) {
        settingsUI.btnSave.onclick = async () => {
            const oldText = settingsUI.btnSave.textContent;
            settingsUI.btnSave.textContent = "...";
            try {
                await saveToStorage(STORAGE_KEYS.SETTINGS, {
                    language: settingsUI.langSelect ? settingsUI.langSelect.value : 'ar',
                    adhanSound: settingsUI.toggleAdhan ? settingsUI.toggleAdhan.checked : true,
                    enableSunrise: settingsUI.toggleSunrise ? settingsUI.toggleSunrise.checked : false,
                    fullscreenIqama: settingsUI.toggleFullscreen ? settingsUI.toggleFullscreen.checked : false,
                    preAdhanMinutes: settingsUI.inputPreTime ? +settingsUI.inputPreTime.value : 15,
                    iqamaMinutes: settingsUI.inputIqamaTime ? +settingsUI.inputIqamaTime.value : 25,
                    adhkarEnabled: settingsUI.toggleAdhkar ? settingsUI.toggleAdhkar.checked : false,
                    adhkarInterval: settingsUI.inputAdhkarTime ? +settingsUI.inputAdhkarTime.value : 30
                });
                chrome.runtime.sendMessage({ action: 'RESHEDULE_ALARMS' });
                if(settingsUI.btnClose) settingsUI.btnClose.click();
                
                const loc = await getFromStorage(STORAGE_KEYS.USER_LOCATION);
                if(loc) loadMainView(loc);
                showToast(modal, "نجاح", "تم حفظ الإعدادات", "✅");
            } catch(e) { console.error(e); } 
            finally { settingsUI.btnSave.textContent = oldText; }
        };
    }

    if (settingsUI.btnReset) {
        settingsUI.btnReset.onclick = async () => {
            if (await showConfirm(modal, "تنبيه", "هل تريد مسح الموقع؟", "⚠️")) {
                await chrome.storage.local.remove([STORAGE_KEYS.USER_LOCATION, STORAGE_KEYS.PRAYER_TIMES]);
                if(settingsUI.btnClose) settingsUI.btnClose.click();
                switchView('onboarding', views);
            }
        };
    }

    // 3. فتح وغلق الإعدادات
    if (mainUI.btnSettings) {
        mainUI.btnSettings.onclick = async () => {
            const settings = await getFromStorage(STORAGE_KEYS.SETTINGS) || {};
            // تعبئة البيانات عند الفتح
            if(settingsUI.langSelect) settingsUI.langSelect.value = settings.language || 'ar';
            if(settingsUI.toggleAdhan) settingsUI.toggleAdhan.checked = settings.adhanSound !== false;
            if(settingsUI.toggleSunrise) settingsUI.toggleSunrise.checked = settings.enableSunrise === true;
            if(settingsUI.toggleFullscreen) settingsUI.toggleFullscreen.checked = settings.fullscreenIqama === true;
            if(settingsUI.toggleAdhkar) settingsUI.toggleAdhkar.checked = settings.adhkarEnabled === true;
            if(settingsUI.inputPreTime) settingsUI.inputPreTime.value = settings.preAdhanMinutes || 15;
            if(settingsUI.inputIqamaTime) settingsUI.inputIqamaTime.value = settings.iqamaMinutes || 25;
            if(settingsUI.inputAdhkarTime) settingsUI.inputAdhkarTime.value = settings.adhkarInterval || 30;

            if(views.settings) {
                views.settings.classList.remove('hidden');
                requestAnimationFrame(() => views.settings.classList.add('active'));
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

    // 4. رفع الملفات الصوتية (Helper)
    const setupFileUpload = (btn, input, resetBtn, statusEl, key) => {
        if(btn && input) {
            btn.onclick = () => input.click();
            input.onchange = (e) => {
                const file = e.target.files[0];
                if(!file) return;
                const r = new FileReader();
                r.onload = async (ev) => {
                    await saveToStorage(key, ev.target.result);
                    if(statusEl) { statusEl.textContent = "مخصص"; statusEl.style.color="green"; }
                    showToast(modal, "تم", "تم الحفظ", "✅");
                };
                r.readAsDataURL(file);
            };
        }
        if(resetBtn) {
            resetBtn.onclick = async () => {
                await removeFromStorage([key]);
                if(statusEl) { statusEl.textContent = "الافتراضي"; statusEl.style.color="#666"; }
                showToast(modal, "تم", "تمت الاستعادة", "↺");
            };
        }
    };

    setupFileUpload(settingsUI.btnUploadAdhan, settingsUI.inputUploadAdhan, settingsUI.btnResetAdhan, settingsUI.statusAdhan, STORAGE_KEYS.CUSTOM_ADHAN);
    setupFileUpload(settingsUI.btnUploadIqama, settingsUI.inputUploadIqama, settingsUI.btnResetIqama, settingsUI.statusIqama, STORAGE_KEYS.CUSTOM_IQAMA);

/* =========================================
   (هـ) التشغيل الأولي (Initialization)
   ========================================= */
const init = async () => {
    switchView('loading', views);
    const loc = await getFromStorage(STORAGE_KEYS.USER_LOCATION);
    
    if (loc) {
        await loadMainView(loc);
        
        // 🔥 هذا هو السطر الجديد والإصلاح:
        // يقوم بتحديث الواجهة (والأرقام والحالة) كل ثانية طالما البوب أب مفتوح
        setInterval(() => updateUI(), 1000); 
        
    } else {
        switchView('onboarding', views);
    }
};

init();
});