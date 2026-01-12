/**
 * @file alert.js
 * @description إدارة واجهة الإشعارات (نسخة محمية ومنع التكرار)
 */

if (typeof window.sakinaAlertInitialized === 'undefined') {
    window.sakinaAlertInitialized = true;

    const ICONS = {
        MOSQUE: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 20h16"/>
        <path d="M6 20V10"/>
        <path d="M18 20V10"/>
        <path d="M12 4c-3 2-6 4-6 6h12c0-2-3-4-6-6z"/>
        <path d="M12 4V2"/>
        <path d="M10 20v-4h4v4"/>
        </svg>`,
        PRAYING: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="5" r="1.5"/>
        <path d="M10 8c1.5 1.5 3.5 1.5 5 3"/>
        <path d="M8 14h8"/>
        <path d="M6 16h12"/>
        </svg>`,
        TASBIH: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 3c4 0 7 3 7 7s-3 8-7 11c-4-3-7-7-7-11s3-7 7-7z"/>
        <circle cx="12" cy="8" r="1"/>
        </svg>`,
        SUN: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 14a8 8 0 0 1 16 0"/>
        <path d="M12 2v4"/>
        <path d="M6 10l-2-2"/>
        <path d="M18 10l2-2"/>
        </svg>`,
        HOURGLASS: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6 2h12"/>
        <path d="M6 22h12"/>
        <path d="M8 2v4l4 4 4-4V2"/>
        <path d="M8 22v-4l4-4 4 4v4"/>
        </svg>
        `
    };

    let countdownInterval = null;
    let currentAlertId = null;

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "SHOW_PRAYER_ALERT") {
            createAlert(request);
        } else if (request.action === "ALERT_CLOSED") {
            const el = document.getElementById('sakina-overlay');
            if (el) closeAlert(el);
        }
    });

    // إبقاء الفحص الذكي كاحتياط إضافي
    setTimeout(checkActiveAlert, 500);
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === 'visible') checkActiveAlert();
    });

    function checkActiveAlert() {
        try {
            chrome.runtime.sendMessage({ action: "GET_ACTIVE_ALERT" }, (response) => {
                if (response && response.action === "SHOW_PRAYER_ALERT") {
                    createAlert(response);
                } else {
                    const existing = document.getElementById('sakina-overlay');
                    if (existing) closeAlert(existing);
                }
            });
        } catch (e) {}
    }

    function getIconByType(type, prayerKey) {
        if (prayerKey === 'Sunrise') return ICONS.SUN;
        switch (type) {
            case 'ADHAN': return ICONS.MOSQUE;
            case 'IQAMA': return ICONS.PRAYING;
            case 'PRE': return ICONS.HOURGLASS;
            case 'NORMAL': return ICONS.TASBIH;
            default: return ICONS.MOSQUE;
        }
    }

    function createAlert(data) {
        const newAlertId = data.title + data.type;
        if (currentAlertId === newAlertId && document.getElementById('sakina-overlay')) return;
        currentAlertId = newAlertId;

        const oldAlert = document.getElementById('sakina-overlay');
        if (oldAlert) oldAlert.remove();
        if (countdownInterval) clearInterval(countdownInterval);

        const overlay = document.createElement('div');
        overlay.id = 'sakina-overlay';
        if (data.isFullscreen) overlay.classList.add('sakina-fullscreen');

        const iconSvg = getIconByType(data.type, data.quoteData ? null : 'Prayer');
        const showMessage = !data.quoteData; 

        overlay.innerHTML = `
            <div class="sakina-card">
                <div class="sakina-header-row">
                    <div class="sakina-icon-box">
                        ${iconSvg}
                    </div>
                    <div class="sakina-text-content">
                        <h2 class="sakina-title">${data.title}</h2>
                        ${showMessage ? `<p class="sakina-msg">${data.message}</p>` : ''} 
                    </div>
                    <button id="sakina-close-btn" class="sakina-close-btn">&times;</button>
                </div>

                ${data.timerData ? `
                    <div class="sakina-timer-container">
                        <span class="sakina-timer-digits" id="sakina-timer">--:--</span>
                    </div>
                ` : ''}

                ${data.quoteData ? `
                    <div class="sakina-quote-container">
                        <p class="sakina-quote-body">"${data.quoteData.text}"</p>
                        <span class="sakina-quote-source">— ${data.quoteData.source}</span>
                    </div>
                ` : ''}

                <div class="sakina-actions-row">
                     ${(data.type === 'ADHAN' || data.type === 'IQAMA' || data.type === 'NORMAL') ? `
                        <button id="sakina-stop-btn" class="sakina-action-btn stop">
                            ${data.btnLabels.stopAudio} 🔇
                        </button>
                    ` : ''}
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        if (data.timerData) startTimer(data.timerData);

        document.getElementById('sakina-close-btn').onclick = () => {
            closeAlert(overlay);
            chrome.runtime.sendMessage({ action: "ALERT_CLOSED" });
        };
        
        const stopBtn = document.getElementById('sakina-stop-btn');
        if (stopBtn) {
            stopBtn.onclick = () => {
                chrome.runtime.sendMessage({ action: 'STOP_AUDIO' });
                stopBtn.innerHTML = `${data.btnLabels.muted} 😶`;
                stopBtn.classList.add('muted');
                stopBtn.disabled = true;
            };
        }

let duration;
        
        if (data.isFullscreen) {
            duration = 300000; // 5 دقائق
        } else if (data.type === 'ADHAN' || data.type === 'IQAMA') {
            duration = 240000; // 4 دقائق
        } else if (data.type === 'PRE' && data.timerData) {
            // 🔥 المنطق الجديد هنا:
            if (data.stayUntilAdhan) {
                // إذا وصلنا أمر بالبقاء (لأن الوقت قصير أو جاء موعد الدقيقتين)
                // نجعل المدة تساوي الوقت المتبقي للأذان + 2 ثانية زيادة
                duration = (data.timerData.targetTime - Date.now()) + 2000;
            } else {
                // التنبيه المبكر (يظهر ويختفي)
                duration = 25000; 
            }
        } else {
            duration = 25000; 
        }

        setTimeout(() => {
            if (document.body.contains(overlay)) closeAlert(overlay);
        }, duration);
    }

    function startTimer(timerData) {
        const timerEl = document.getElementById('sakina-timer');
        if (!timerEl) return;

        const update = () => {
            const now = Date.now();
            let diff;
            if (timerData.mode === 'COUNTDOWN') {
                diff = timerData.targetTime - now;
                if (diff <= 0) {
                    timerEl.textContent = "00:00";
                    clearInterval(countdownInterval);
                    setTimeout(checkActiveAlert, 1000);
                    return;
                }
            } else {
                diff = now - timerData.startTime;
            }
            const m = Math.floor(diff / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            timerEl.textContent = `${m}:${s.toString().padStart(2, '0')}`;
        };
        update();
        countdownInterval = setInterval(update, 1000);
    }

    function closeAlert(el) {
        currentAlertId = null;
        if (!el) return;
        el.style.opacity = '0';
        el.style.transform = 'translateY(-10px)';
        setTimeout(() => { if (el && el.parentNode) el.remove(); }, 300);
    }
}