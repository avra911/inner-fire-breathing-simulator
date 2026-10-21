import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const ZEN_SOUNDS = {
    inhale: require('../assets/sounds/inhale.mp3'),
    exhale: require('../assets/sounds/exhale.mp3'),
    hold: require('../assets/sounds/hold.mp3'),
    bowl: require('../assets/sounds/bowl.mp3'),
};

const AUDIO_MODE = {
    playsInSilentMode: true,
    shouldPlayInBackground: true,
};

let currentLoopingSound = null;
let audioModePromise = null;
let loopRequestId = 0;

function ensureAudioMode() {
    if (!audioModePromise) {
        audioModePromise = setAudioModeAsync(AUDIO_MODE).catch((error) => {
            audioModePromise = null;
            throw error;
        });
    }
    return audioModePromise;
}

function waitForPlayerReady(player) {
    return new Promise((resolve, reject) => {
        let settled = false;
        let subscription;
        let timeout;
        const finish = (error) => {
            if (settled) return;
            settled = true;
            clearTimeout(timeout);
            subscription?.remove();
            if (error) reject(error);
            else resolve();
        };

        timeout = setTimeout(() => finish(new Error('Audio player load timed out')), 3000);
        subscription = player.addListener('playbackStatusUpdate', (status) => {
            if (status.error) finish(new Error(status.error));
            else if (status.isLoaded) finish();
        });

        if (player.isLoaded) finish();
    });
}

// Play a short sound (inhale, exhale, or bowl).
export async function playSound(type) {
    let player;
    try {
        await ensureAudioMode();

        player = createAudioPlayer(ZEN_SOUNDS[type]);
        player.volume = 0.6;
        await waitForPlayerReady(player);

        const subscription = player.addListener('playbackStatusUpdate', (status) => {
            if (status.error) {
                console.warn(`Audio playback failed for ${type}:`, status.error);
                subscription.remove();
                player.remove();
            } else if (status.didJustFinish) {
                subscription.remove();
                player.remove();
            }
        });
        player.play();
    } catch (error) {
        player?.remove();
        console.warn(`Error playing ${type} sound:`, error);
    }
}

// Start the continuous hold sound.
export async function startLoopingSound(type) {
    const requestId = ++loopRequestId;
    removeLoopingSound();

    try {
        await ensureAudioMode();
        if (requestId !== loopRequestId) return;

        currentLoopingSound = createAudioPlayer(ZEN_SOUNDS[type]);
        currentLoopingSound.loop = true;
        currentLoopingSound.volume = 0.3;
        currentLoopingSound.play();
    } catch (error) {
        currentLoopingSound?.remove();
        currentLoopingSound = null;
        console.warn('Error starting looping sound:', error);
    }
}

// Stop the looping hold sound.
export async function stopLoopingSound() {
    loopRequestId++;
    removeLoopingSound();
}

function removeLoopingSound() {
    if (currentLoopingSound) {
        const player = currentLoopingSound;
        currentLoopingSound = null;
        try {
            player.pause();
            player.remove();
        } catch (error) {
            console.warn('Error stopping looping sound:', error);
        }
    }
}