/**
 * @file popup.js
 * @description وحدة التحكم الرئيسية (Main Controller) - نسخة محسنة ونظيفة
 */

// 1. الاستيرادات
import { TRANSLATIONS } from '../utils/translations.js';
import { getNextPrayer } from '../utils/time-utils.js';
import { getFromStorage, saveToStorage, STORAGE_KEYS, removeFromStorage } from '../utils/storage.js';
import { fetchPrayerTimes } from '../utils/api.js';
import { getGeolocation } from '../utils/locations.js';
import { switchView } from '../utils/ui-helpers.js'; // نستورد فقط switchView
import { getPrayerState } from '../utils/prayer-logic.js';

// 2. المتغيرات العامة
let searchDebounceTimer = null;
let timerInterval = null;
let headerUpdateInterval = null;
const EMAIL_ID = "sakina_user@example.com"; // لتجنب حظر API الخرائط

document.addEventListener('DOMContentLoaded', async () => {

    /* =========================================
       (أ) تعريف العناصر (DOM Elements)
       ========================================= */
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

        // Upload Elements
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

    /* =========================================
       (ب) دوال المنطق وتحديث الواجهة
       ========================================= */

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

            const state = getPrayerState(timings, Number(settings.iqamaMinutes || 25));
            const pName = t[`prayer${state.prayerKey}`] || state.prayerKey;

            // تحديث النصوص والألوان حسب الحالة
            if (state.mode === 'WAITING_IQAMA') {
                setUIState(
                    lang === 'ar' ? `يُرفع الآن أذان ${pName}` : `Now Adhan for ${pName}`,
                    '#fbbf24', '18px',
                    lang === 'ar' ? "متبقي على الإقامة" : "Time until Iqama"
                );
                startTimer(state.iqamaTime);
            } else if (state.mode === 'IQAMA_ACTIVE') {
                setUIState(
                    lang === 'ar' ? `تُقام الآن صلاة ${pName}` : `Now Iqama for ${pName}`,
                    '#4ade80', '18px', ""
                );
                if(mainUI.countdown) mainUI.countdown.textContent = "";
            } else {
                // الوضع الطبيعي (الصلاة القادمة)
                const next = getNextPrayer(timings, locationData.user_location?.timezone, settings.enableSunrise);
                if (next) {
                    setUIState(t[`prayer${next.key}`] || next.key, '#ffffff', '', t.nextPrayer || "الصلاة القادمة");
                    startTimer(next.time.getTime());
                    renderPrayersList(timings, next.key, settings.enableSunrise, lang);
                }
            }

            // إذا كانت الحالة غير طبيعية، نحدث القائمة أيضاً
            if (state.mode !== 'NORMAL') {
                renderPrayersList(timings, state.prayerKey, settings.enableSunrise, lang);
            }
        } catch (e) {
            console.error("UI Update Error:", e);
        }
    }

    function setUIState(text, color, fontSize, label) {
        if(mainUI.nextPrayerName) {
            mainUI.nextPrayerName.textContent = text;
            mainUI.nextPrayerName.style.color = color;
            if(fontSize) mainUI.nextPrayerName.style.fontSize = fontSize;
        }
        if(label !== null && mainUI.dateDisplay) mainUI.dateDisplay.textContent = label;
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
            const isActive = (key === activeKey) || (activeKey === 'Jumuah' && key === 'Dhuhr');
            
            item.className = `prayer-item ${isActive ? 'active' : ''}`;
            if(key === 'Sunrise') item.classList.add('prayer-sunrise');
            
            item.innerHTML = `<span>${t[`prayer${key}`]}</span><span dir="ltr">${hr}:${m} ${ampm}</span>`;
            mainUI.prayersList.appendChild(item);
        });
    }

    async function loadMainView(locData) {
        if(mainUI.locationName) mainUI.locationName.textContent = locData.name || "...";
        
        const settings = await getFromStorage(STORAGE_KEYS.SETTINGS) || {};
        applyLanguage(settings.language || 'ar');
        
        await updateUI();
        switchView('main', views);
    }

    function applyLanguage(lang) {
        const t = TRANSLATIONS[lang] || TRANSLATIONS['ar'];
        document.body.dir = t.dir;
        document.body.lang = lang;
        
        // تحديث النصوص الثابتة
        const mapping = [
            [search.cityInput, 'placeholder', t.placeholderCity],
            [modal.btnYes, 'textContent', t.btnYes],
            [modal.btnNo, 'textContent', t.btnNo],
            [modal.btnOk, 'textContent', t.btnOk],
            [settingsUI.btnSave, 'textContent', t.save],
            [settingsUI.btnReset, 'textContent', t.reset],
            [search.btnManual, 'textContent', t.manualSearch],
            [search.btnAuto, 'textContent', t.autoLocate]
        ];
        
        mapping.forEach(([el, prop, val]) => { if(el) el[prop] = val; });
    }

    // تحديث الهيدر (الساعة والتاريخ)
    function startLiveHeaderUpdate() {
        const update = () => {
            const now = new Date();

        // 1. الساعة بنظام 12 ساعة
        if(mainUI.digitalClock) {
            // نستخدم Intl للحصول على تحكم أفضل في AM/PM
            const timeString = now.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit', 
                hour12: true 
            });
            mainUI.digitalClock.textContent = timeString;
        }

        // 2. التاريخ الهجري (اليوم والشهر فقط)
        if(mainUI.hijriDate) {
            try {
                const hijri = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
                    day: 'numeric', 
                    month: 'long' 
                }).format(now);
                mainUI.hijriDate.textContent = hijri;
            } catch (e) {
                mainUI.hijriDate.textContent = "--";
            }
        }

        // 3. التاريخ الميلادي (اليوم والشهر والسنة)
        if(mainUI.currentDate) {
            try {
                // نظهر التاريخ الميلادي باختصار
                const greg = new Intl.DateTimeFormat('ar-SA', {
                    day: 'numeric',
                    month: 'short', // اسم الشهر مختصر
                    year: 'numeric'
                }).format(now);
                
                mainUI.currentDate.style.display = "inline"; // التأكد من ظهوره
                mainUI.currentDate.textContent = greg;
            } catch (e) {
                console.error(e);
            }
        }
        };
        update();
        headerUpdateInterval = setInterval(update, 1000);
    }

    /* =========================================
       (ج) دوال البحث والموقع (مع إصلاحات الحظر)
       ========================================= */

    async function fetchCitySuggestions(query) {
        try {
            const lang = document.body.lang || 'ar';
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&accept-language=${lang}&email=${EMAIL_ID}`;
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            const text = await res.text();
            if (text.trim().startsWith("<")) return; // تجاهل أخطاء الحظر

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
            const addr = item.address || {};
            const city = addr.city || addr.town || addr.village || item.name;
            const cleanName = addr.country ? `${city}، ${addr.country}` : city;

            const li = document.createElement('li');
            li.className = 'suggestion-item';
            li.innerHTML = `<span class="loc-icon">📍</span><span class="loc-text">${cleanName}</span>`;
            li.onclick = () => {
                search.suggestionsList.style.display = 'none';
                showConfirm(modal, 'تأكيد', `اعتماد: <strong>${cleanName}</strong>؟`).then(ok => {
                    if(ok) handleLocationSelection(item.lat, item.lon, cleanName);
                });
            };
            search.suggestionsList.appendChild(li);
        });
        search.suggestionsList.style.display = 'block';
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
            showToast(modal, "خطأ", "فشل الاتصال", "⚠️");
            switchView('onboarding', views);
        }
    }

    /* =========================================
       (د) إدارة الأحداث (Event Listeners)
       ========================================= */

    // 1. البحث
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
        
        // إخفاء القائمة عند النقر خارجها
        document.addEventListener('click', (e) => {
            if (search.suggestionsList && !search.cityInput.contains(e.target) && !search.suggestionsList.contains(e.target)) {
                search.suggestionsList.style.display = 'none';
            }
        });
    }

    // 2. البحث اليدوي
    if (search.btnManual) {
        search.btnManual.onclick = async () => {
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
                    if(await showConfirm(modal, 'تأكيد', `هل تختار: ${name}؟`)) {
                        handleLocationSelection(item.lat, item.lon, name);
                    }
                } else {
                    showToast(modal, "تنبيه", "لم يتم العثور على المدينة", "🔍");
                }
            } catch {
                showToast(modal, "خطأ", "تعذر البحث", "❌");
            } finally {
                btn.textContent = txt; btn.disabled = false;
            }
        };
    }

    // 3. البحث التلقائي
    if (search.btnAuto) {
        search.btnAuto.onclick = async () => {
            const btn = search.btnAuto;
            const txt = btn.textContent;
            btn.textContent = "جاري التحديد..."; btn.disabled = true;

            try {
                const coords = await getGeolocation();
                const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}&addressdetails=1&email=${EMAIL_ID}`;
                const res = await fetch(url);
                const text = await res.text();
                if (text.startsWith("<")) throw new Error("Blocked");
                
                const data = JSON.parse(text);
                const addr = data.address;
                const name = `${addr.city || addr.town || data.name}، ${addr.country || ''}`;

                // هنا نستخدم handleLocationSelection مباشرة لأن showConfirm يسبب مشاكل أحياناً في التلقائي
                handleLocationSelection(coords.lat, coords.lng, name);
                showToast(modal, "نجاح", `تم تحديد: ${name}`, "📍");

            } catch (err) {
                console.error(err);
                showToast(modal, "خطأ", "فشل تحديد الموقع التلقائي", "⚠️");
            } finally {
                btn.textContent = txt; btn.disabled = false;
            }
        };
    }

    // 4. حفظ الإعدادات (مع الإصلاح)
    if (settingsUI.btnSave) {
        settingsUI.btnSave.onclick = async () => {
            const btn = settingsUI.btnSave;
            if (btn.dataset.processing === "true") return;
            
            btn.dataset.processing = "true";
            const txt = btn.textContent;
            btn.textContent = "جاري الحفظ...";
            btn.style.opacity = "0.7";

            try {
                await saveToStorage(STORAGE_KEYS.SETTINGS, {
                    language: settingsUI.langSelect?.value || 'ar',
                    adhanSound: settingsUI.toggleAdhan?.checked ?? true,
                    enableSunrise: settingsUI.toggleSunrise?.checked ?? false,
                    fullscreenIqama: settingsUI.toggleFullscreen?.checked ?? false,
                    adhkarEnabled: settingsUI.toggleAdhkar?.checked ?? false,
                    preAdhanMinutes: +(settingsUI.inputPreTime?.value || 15),
                    iqamaMinutes: +(settingsUI.inputIqamaTime?.value || 25),
                    adhkarInterval: +(settingsUI.inputAdhkarTime?.value || 30)
                });

                chrome.runtime.sendMessage({ action: 'RESHEDULE_ALARMS' });
                const loc = await getFromStorage(STORAGE_KEYS.USER_LOCATION);
                if(loc) await loadMainView(loc);
                
                await showToast(modal, "تم", "تم حفظ الإعدادات", "✅");
                settingsUI.btnClose?.click();

            } catch (e) {
                showToast(modal, "خطأ", "فشل الحفظ", "❌");
            } finally {
                btn.textContent = txt;
                btn.style.opacity = "1";
                btn.dataset.processing = "false";
            }
        };
    }

    // 5. زر إعادة الضبط (مع المودال)
    if (settingsUI.btnReset) {
        settingsUI.btnReset.onclick = async (e) => {
            e.preventDefault();
            const ok = await showConfirm(modal, "تحذير", "مسح الموقع والبيانات؟", "🗑️");
            if (ok) {
                await chrome.storage.local.remove([STORAGE_KEYS.USER_LOCATION, STORAGE_KEYS.PRAYER_TIMES]);
                if(views.settings) views.settings.classList.remove('active');
                switchView('onboarding', views);
                showToast(modal, "تم", "تمت إعادة الضبط", "✅");
            }
        };
    }

    // 6. فتح الإعدادات (حل مشكلة السكرول)
    if (mainUI.btnSettings) {
        mainUI.btnSettings.onclick = async () => {
            const s = await getFromStorage(STORAGE_KEYS.SETTINGS) || {};
            // تعبئة القيم...
            if(settingsUI.langSelect) settingsUI.langSelect.value = s.language || 'ar';
            if(settingsUI.toggleAdhan) settingsUI.toggleAdhan.checked = s.adhanSound !== false;
            // ... بقية الحقول ...
            
            if(views.settings) {
                views.settings.classList.remove('hidden');
                views.settings.scrollTop = 0; // 🔥 إعادة السكرول للأعلى
                requestAnimationFrame(() => views.settings.classList.add('active'));
            }
        };
    }

    // 7. زر المصحف
    if (mainUI.btnQuran) {
        mainUI.btnQuran.onclick = async () => {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { action: "OPEN_QURAN_MODAL" });
            window.close();
        };
    }

    // 8. إغلاق الإعدادات
    if (settingsUI.btnClose) {
        settingsUI.btnClose.onclick = () => {
            if(views.settings) {
                views.settings.classList.remove('active');
                setTimeout(() => views.settings.classList.add('hidden'), 300);
            }
        };
    }

    // 9. إعداد رفع الملفات (Generic Helper)
    const setupUpload = (btn, input, reset, status, key) => {
        if(btn && input) {
            btn.onclick = () => input.click();
            input.onchange = (e) => {
                const f = e.target.files[0];
                if(f) {
                    const r = new FileReader();
                    r.onload = async (ev) => {
                        await saveToStorage(key, ev.target.result);
                        if(status) { status.textContent = "مخصص"; status.style.color = "green"; }
                        showToast(modal, "تم", "تم رفع الملف", "✅");
                    };
                    r.readAsDataURL(f);
                }
            };
        }
        if(reset) {
            reset.onclick = async () => {
                await removeFromStorage([key]);
                if(status) { status.textContent = "الافتراضي"; status.style.color = "#666"; }
                showToast(modal, "تم", "تمت الاستعادة", "↺");
            };
        }
    };
    
    setupUpload(settingsUI.btnUploadAdhan, settingsUI.inputUploadAdhan, settingsUI.btnResetAdhan, settingsUI.statusAdhan, STORAGE_KEYS.CUSTOM_ADHAN);
    setupUpload(settingsUI.btnUploadIqama, settingsUI.inputUploadIqama, settingsUI.btnResetIqama, settingsUI.statusIqama, STORAGE_KEYS.CUSTOM_IQAMA);

    /* =========================================
       (و) دوال المودال الداخلية (لضمان التوافق مع CSS)
       ========================================= */
    
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

            if(title !== "خطأ") setTimeout(() => {
                if(overlay.classList.contains('show') && confirmBtns.classList.contains('hidden')) close();
            }, 2500);
        });
    }

    // التشغيل الأولي
    const init = async () => {
        try {
            switchView('loading', views);
            const loc = await getFromStorage(STORAGE_KEYS.USER_LOCATION);
            if (loc) {
                await loadMainView(loc);
                setInterval(updateUI, 1000);
                startLiveHeaderUpdate();
            } else {
                switchView('onboarding', views);
            }
        } catch (e) {
            console.error(e);
            switchView('onboarding', views);
        }
    };

    init();

    window.addEventListener('unload', () => {
        if (timerInterval) clearInterval(timerInterval);
        if (headerUpdateInterval) clearInterval(headerUpdateInterval);
        if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    });
});