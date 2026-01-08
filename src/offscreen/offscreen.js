/**
 * @file offscreen.js
 * @description مسؤول عن تشغيل الصوت لأن Service Worker لا يستطيع فعل ذلك مباشرة.
 */

// الاستماع للرسائل من الخلفية
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'PLAY_AUDIO') {
        playAudio(msg.source, msg.volume);
    } else if (msg.action === 'STOP_AUDIO') {
        stopAudio();
    }
});

function playAudio(source, volume = 0.5) { // جعلنا الافتراضي 0.5 (نصف الصوت)
    const audio = document.getElementById('audio-player');
    
    audio.src = chrome.runtime.getURL(source);
    audio.volume = volume; // تطبيق مستوى الصوت
    
    audio.play().then(() => {
        console.log(`[Audio] Playing: ${source}`);
    }).catch(err => {
        console.error("[Audio] Play Error:", err);
    });
}

function stopAudio() {
    const audio = document.getElementById('audio-player');
    audio.pause();
    audio.currentTime = 0;
}