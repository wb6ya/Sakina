/**
 * @file alert.js
 * @description إدارة واجهة الإشعارات (نسخة محمية ومنع التكرار)
 */

if (typeof window.sakinaAlertInitialized === 'undefined') {
    window.sakinaAlertInitialized = true;

    const ICONS = {
        MOSQUE: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L4 7v13h16V7l-8-5z"/><path d="M9.5 20v-5h5v5"/><path d="M12 2v5"/><circle cx="12" cy="10" r="1.5"/></svg>`,
        PRAYING: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/><path d="M14 8c0 2.5-2 2.5-2 6v6h-4v-6c0-3.5-2-3.5-2-6 0-3 3-5 5-5s5 2 5 5z"/></svg>`,
        TASBIH: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="7" r="1"/><circle cx="16" cy="9" r="1"/><circle cx="17" cy="13" r="1"/><circle cx="15" cy="17" r="1"/><circle cx="12" cy="19" r="1"/><circle cx="9" cy="17" r="1"/><circle cx="7" cy="13" r="1"/><circle cx="8" cy="9" r="1"/><path d="M12 2v2"/></svg>`,
        SUN: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2"/><path d="M12 21v2"/><path d="M4.22 4.22l1.42 1.42"/><path d="M18.36 18.36l1.42 1.42"/><path d="M1 12h2"/><path d="M21 12h2"/><path d="M4.22 19.78l1.42-1.42"/><path d="M18.36 5.64l1.42-1.42"/></svg>`,
        HOURGLASS: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg>`
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

        const duration = data.isFullscreen ? 300000 : 25000;
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