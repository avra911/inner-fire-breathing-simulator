import { Audio } from 'expo-av';

export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const ZEN_SOUNDS = {
    inhale: require('../assets/sounds/inhale.mp3'),
    exhale: require('../assets/sounds/exhale.mp3'),
    hold: require('../assets/sounds/hold.mp3'),
    bowl: require('../assets/sounds/bowl.mp3'),
};

// Keep a reference to the background looping sound.
let currentLoopingSound = null;

// Play a short sound (inhale, exhale, or bowl).
export async function playSound(type) {
    try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: true });

        const { sound } = await Audio.Sound.createAsync(
            ZEN_SOUNDS[type],
            { shouldPlay: true, volume: 0.6 }
        );

        // Unload the sound as soon as playback finishes.
        sound.setOnPlaybackStatusUpdate((status) => {
            if (status.didJustFinish) {
                sound.unloadAsync();
            }
        });
    } catch (error) {
        console.warn('Error playing sound:', error);
    }
}

// Start the continuous hold sound.
export async function startLoopingSound(type) {
    try {
        await stopLoopingSound(); // Stop any previous loop first.

        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: true });

        const { sound } = await Audio.Sound.createAsync(
            ZEN_SOUNDS[type],
            { shouldPlay: true, isLooping: true, volume: 0.3 } // Lower background volume.
        );

        currentLoopingSound = sound;
    } catch (error) {
        console.warn('Error starting looping sound:', error);
    }
}

// Stop the looping hold sound.
export async function stopLoopingSound() {
    if (currentLoopingSound) {
        try {
            await currentLoopingSound.stopAsync();
            await currentLoopingSound.unloadAsync();
            currentLoopingSound = null;
        } catch (error) {
            console.warn('Error stopping looping sound:', error);
        }
    }
}