/**
 * @file alert.js
 * @description نظام العرض الذكي (يتبع المستخدم + دعم الترجمة)
 */

let timerInterval = null;

// =================================================
// 1. استقبال الأوامر (للرسم المباشر أو الإغلاق)
// =================================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "SHOW_PRAYER_ALERT") {
        createCustomAlert(
            request.title, 
            request.message, 
            request.type, 
            request.timerData, 
            request.quoteData, 
            request.isFullscreen,
            request.btnLabels // 🆕 استقبال نصوص الأزرار
        );
    }
    else if (request.action === "FORCE_CLOSE_ALERT") {
        removeAlert(true);
    }
});

// =================================================
// 2. مزامنة الإغلاق (إذا أغلقت في تبويب، يغلق في الكل)
// =================================================
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.dismiss_timestamp) {
        removeAlert(true);
    }
});

// =================================================
// 3. الذكاء الحركي (Follow Me Logic) 🏃‍♂️
// =================================================

// أ) عند تحميل الصفحة
setTimeout(checkAndDrawAlert, 500);

// ب) عند الانتقال لهذا التبويب (Focus/Visibility)
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === 'visible') {
        checkAndDrawAlert();
    }
});

// دالة تفحص الخلفية وترسم التنبيه
function checkAndDrawAlert() {
    try {
        chrome.runtime.sendMessage({ action: "GET_ACTIVE_ALERT" }, (response) => {
            // هل يوجد تنبيه نشط في الخلفية؟
            if (response && response.action === "SHOW_PRAYER_ALERT") {
                // نرسمه (دالة الرسم ذكية بما يكفي لعدم التكرار)
                createCustomAlert(
                    response.title, 
                    response.message, 
                    response.type, 
                    response.timerData, 
                    response.quoteData,
                    response.isFullscreen,
                    response.btnLabels // 🆕 تمرير نصوص الأزرار
                );
            } else {
                // إذا قالت الخلفية "لا يوجد تنبيه"، نتأكد من تنظيف الشاشة
                if (document.getElementById('prayer-focus-alert')) {
                    removeAlert(true);
                }
            }
        });
    } catch (e) {
        // نتجاهل أخطاء الاتصال
    }
}

// =================================================
// 4. دالة الرسم (Create Alert)
// =================================================
function createCustomAlert(title, message, type, timerData, quoteData, isFullscreen, btnLabels) {
    // لمنع الوميض: نحذف القديم فوراً ونضع الجديد
    removeAlert(true);

    const alertBox = document.createElement('div');
    alertBox.id = 'prayer-focus-alert';
    
    // 🆕 تحديد الاتجاه بناءً على نص زر الإغلاق (إذا كان "Close" فهو إنجليزي)
    const isEnglish = btnLabels && btnLabels.close === "Close";
    alertBox.style.direction = isEnglish ? "ltr" : "rtl";
    alertBox.setAttribute('lang', isEnglish ? 'en' : 'ar');

    if (isFullscreen && type === 'IQAMA') {
        alertBox.classList.add('pf-fullscreen-mode');
    }

    const isAdhan = type === 'ADHAN';
    const icon = isAdhan ? '🕌' : (type === 'IQAMA' ? '⚡' : (title.includes('Sunrise') || title.includes('الشروق') ? '🌅' : '⏳'));
    
    // 🆕 استخدام النصوص المترجمة للأزرار
    const stopAudioText = btnLabels ? btnLabels.stopAudio : "إيقاف الصوت";
    const closeText = btnLabels ? btnLabels.close : "إغلاق";

    const muteButtonHtml = isAdhan ? `<button id="pf-mute-btn" class="pf-action-btn">${stopAudioText}</button>` : '';

    let contentHtml = '';
    if (quoteData) {
        const isQuran = quoteData.type === 'QURAN';
        const typeIcon = isQuran ? '📖' : '📜';
        const styleClass = isQuran ? 'pf-quran' : 'pf-hadith';
        contentHtml = `
            <div class="pf-quote-container ${styleClass}">
                <div class="pf-quote-header"><span class="pf-quote-icon">${typeIcon}</span></div>
                <div class="pf-quote-text">"${quoteData.text}"</div>
                <div class="pf-quote-source">${quoteData.source}</div>
            </div>`;
    } else {
        contentHtml = `<div class="pf-message" id="pf-msg-text">${message}</div>`;
    }

    alertBox.innerHTML = `
        <div class="pf-icon-wrapper">${icon}</div>
        <div class="pf-content">
            <div class="pf-title">${title}</div>
            ${contentHtml}
            <div class="pf-timer" id="pf-timer-display"></div>
            ${muteButtonHtml}
        </div>
        <button class="pf-close" title="${closeText}">×</button>
    `;

    document.body.appendChild(alertBox);

    if (timerData) startLiveTimer(timerData, isEnglish); // 🆕 نمرر اللغة للعداد

    const muteBtn = alertBox.querySelector('#pf-mute-btn');
    if (muteBtn) {
        muteBtn.onclick = (e) => {
            e.stopPropagation();
            chrome.runtime.sendMessage({ action: "STOP_AUDIO" });
            muteBtn.innerHTML = btnLabels ? btnLabels.muted : "تم الإسكات"; // 🆕 نص "تم الإسكات" مترجم
            muteBtn.disabled = true;
            muteBtn.style.opacity = "0.6";
        };
    }

    alertBox.querySelector('.pf-close').onclick = () => {
        chrome.runtime.sendMessage({ action: "STOP_AUDIO" });
        chrome.runtime.sendMessage({ action: "ALERT_CLOSED" });
        chrome.storage.local.set({ dismiss_timestamp: Date.now() });
        removeAlert();
    };

    // إغلاق تلقائي (لغير الشاشة الكاملة)
    if (!isFullscreen) {
        const duration = (timerData || quoteData) ? 90000 : 20000;
        setTimeout(() => {
            if (document.body.contains(alertBox)) removeAlert();
        }, duration);
    }
}

// =================================================
// 5. دوال مساعدة
// =================================================
function startLiveTimer(data, isEnglish) { // 🆕 استقبال اللغة
    const timerDisplay = document.getElementById('pf-timer-display');
    if (!timerDisplay) return;
    
    if (timerInterval) clearInterval(timerInterval);

    // نصوص العداد حسب اللغة
    const txtRemaining = isEnglish ? "Remaining: " : "متبقي: ";
    const txtElapsed = isEnglish ? "Elapsed: " : "مرَّ: ";

    const update = () => {
        const now = Date.now();
        if (data.mode === 'COUNTDOWN') {
            const target = Number(data.targetTime);
            if (!target) return;
            const diff = target - now;
            if (diff <= 0) {
                timerDisplay.textContent = "00:00:00";
                clearInterval(timerInterval);
            } else {
                timerDisplay.textContent = txtRemaining + msToTime(diff);
                timerDisplay.className = "pf-timer pf-timer-countdown";
            }
        } else if (data.mode === 'COUNTUP') {
            const start = Number(data.startTime);
            const diff = now - start;
            timerDisplay.textContent = txtElapsed + msToTime(diff);
            timerDisplay.className = "pf-timer pf-timer-countup";
        }
    };
    update();
    timerInterval = setInterval(update, 1000);
}

function removeAlert(immediate = false) {
    const el = document.getElementById('prayer-focus-alert');
    if (el) {
        if (timerInterval) clearInterval(timerInterval);
        
        if (immediate) {
            el.remove();
        } else {
            el.style.animation = 'pf-slide-out 0.3s forwards';
            setTimeout(() => { 
                if (el && el.parentNode) el.remove(); 
            }, 300);
        }
    }
}

function msToTime(duration) {
    if (isNaN(duration) || duration < 0) return "00:00";
    let seconds = Math.floor((duration / 1000) % 60);
    let minutes = Math.floor((duration / (1000 * 60)) % 60);
    return [minutes, seconds].map(v => v < 10 ? "0" + v : v).join(":");
}