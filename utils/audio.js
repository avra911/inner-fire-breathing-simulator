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

const playerPromises = {};

// Players are reused because remove() leaves Android AudioTracks allocated until the process runs out.
function getPlayer(type, { volume, loop = false }) {
    if (!playerPromises[type]) {
        playerPromises[type] = (async () => {
            await ensureAudioMode();
            const player = createAudioPlayer(ZEN_SOUNDS[type]);
            player.volume = volume;
            player.loop = loop;
            try {
                await waitForPlayerReady(player);
            } catch (error) {
                player.remove();
                throw error;
            }
            return player;
        })().catch((error) => {
            delete playerPromises[type];
            throw error;
        });
    }
    return playerPromises[type];
}

// Play a short sound (inhale, exhale, or bowl).
export async function playSound(type) {
    try {
        const player = await getPlayer(type, { volume: 0.6 });
        await player.seekTo(0);
        player.play();
    } catch (error) {
        console.warn(`Error playing ${type} sound:`, error);
    }
}

// Start the continuous hold sound.
export async function startLoopingSound(type) {
    const requestId = ++loopRequestId;
    pauseLoopingSound();

    try {
        const player = await getPlayer(type, { volume: 0.3, loop: true });
        if (requestId !== loopRequestId) return;
        await player.seekTo(0);
        if (requestId !== loopRequestId) return;

        currentLoopingSound = player;
        player.play();
    } catch (error) {
        console.warn('Error starting looping sound:', error);
    }
}

// Stop the looping hold sound.
export async function stopLoopingSound() {
    loopRequestId++;
    pauseLoopingSound();
}

function pauseLoopingSound() {
    if (currentLoopingSound) {
        const player = currentLoopingSound;
        currentLoopingSound = null;
        try {
            player.pause();
        } catch (error) {
            console.warn('Error stopping looping sound:', error);
        }
    }
}