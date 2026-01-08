let audioBuffer = '';

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'PLAY_AUDIO') {
        console.log("[Offscreen] Received PLAY_AUDIO:", msg.source);
        playSource(msg.source, msg.volume);
    } 
    else if (msg.action === 'AUDIO_CHUNK') {
        audioBuffer += msg.data;
        if (msg.isLast) {
            console.log("[Offscreen] Full custom file received.");
            playSource(audioBuffer, msg.volume);
            audioBuffer = ''; 
        }
    } 
    else if (msg.action === 'STOP_AUDIO') {
        stopAudio();
    }
});

function playSource(source, volume = 1.0) {
    const audio = document.getElementById('audio-player');
    if (!audio) return;
    
    audio.pause();
    audio.currentTime = 0;
    
    if (!source) {
        console.error("[Offscreen] No source to play!");
        return;
    }

    audio.src = source;
    audio.volume = volume;
    
    audio.play().then(() => {
        console.log(`[Offscreen] Playing successfully.`);
    }).catch(err => {
        console.warn("[Offscreen] Play Error:", err);
    });
}

function stopAudio() {
    const audio = document.getElementById('audio-player');
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audio.removeAttribute('src');
        audioBuffer = '';
    }
}