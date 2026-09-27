import { useState, useRef, useCallback } from 'react';
import { Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sleep, playSound, startLoopingSound, stopLoopingSound } from '../utils/audio';
import { t } from '../utils/i18n';

export const DEFAULT_SETTINGS = {
  prepTime: 10, rounds: 3, breathSpeed: 1.55, numBreaths: 30,
  breathOutHold: 90, holdTime: 15, deepBreathTime: 4, pauseAfterRound: 7,
  customRounds: [{ round: 1, time: 60 }]
};

export function useBreathing(settings = DEFAULT_SETTINGS) {
  const [phase, setPhase] = useState(t('phase.ready'));
  const [timerText, setTimerText] = useState('');
  const [progress, setProgress] = useState(0);
  const [currentRound, setCurrentRound] = useState(1); // Track the active round.

  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [canPause, setCanPause] = useState(false);

  const stopRef = useRef(false);
  const pauseRef = useRef(false);
  const pauseResolveRef = useRef(null);

  const displayTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}:${s.toString().padStart(2, '0')} sec` : `${s} sec`;
  };

  const checkPaused = async () => {
    if (pauseRef.current) await new Promise(resolve => pauseResolveRef.current = resolve);
  };

  const animateBreath = ({ duration, inhale }) => {
    return new Promise((resolve) => {
      if (stopRef.current) return resolve();
      Animated.timing(scaleAnim, {
        toValue: inhale ? 1.2 : 0.3, duration: duration * 1000, useNativeDriver: true,
      }).start(() => resolve());
    });
  };

  const runSession = async () => {
    setIsRunning(true); setIsPaused(false);
    stopRef.current = false; pauseRef.current = false;
    setProgress(0); setCurrentRound(1);

    setPhase(t('phase.preparing'));
    startLoopingSound('hold');
    for (let i = settings.prepTime; i > 0; i--) {
      if (stopRef.current) break;
      setProgress((settings.prepTime - i + 1) / settings.prepTime);
      setTimerText(displayTime(i));
      await sleep(1000);
    }
    stopLoopingSound();
    setProgress(1);

    if (stopRef.current) return reset();

    for (let round = 1; round <= settings.rounds; round++) {
      if (stopRef.current) break;
      setCurrentRound(round);

      for (let breath = 1; breath <= settings.numBreaths; breath++) {
        await checkPaused();
        if (stopRef.current) break;

        const breathsLeft = settings.numBreaths - breath + 1;
        setProgress(breath / settings.numBreaths);

        // --- INHALE ---
        setPhase(t('phase.round', { round, total: settings.rounds }));
        setTimerText(`${breathsLeft} / ${settings.numBreaths}`);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        playSound('inhale');
        await animateBreath({ duration: settings.breathSpeed, inhale: true });

        if (stopRef.current) break;

        // --- EXHALE ---
        setTimerText(`${breathsLeft} / ${settings.numBreaths}`);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        playSound('exhale');
        await animateBreath({ duration: settings.breathSpeed, inhale: false });
      }

      if (stopRef.current) break;

      const customRoundSetting = settings.customRounds?.find(r => r.round === round);
      const currentHoldTime = customRoundSetting ? customRoundSetting.time : settings.breathOutHold;

      setPhase(t('phase.round_hold', { round, total: settings.rounds }));
      setProgress(0); setCanPause(true);
      startLoopingSound('hold');
      
      for (let i = currentHoldTime; i > 0; i--) {
        await checkPaused();
        if (stopRef.current) break;
        setProgress((currentHoldTime - i + 1) / currentHoldTime);
        setTimerText(displayTime(i));
        await sleep(1000);
      }
      
      stopLoopingSound(); setCanPause(false); setProgress(1);

      // Save a successful retention round to history.
      if (!stopRef.current) {
        // Strong success vibration at the end of the retention.
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); 

        // Save the retention time on the device.
        try {
          const date = new Date().toISOString().split('T')[0]; // Example: 2026-03-01.
          const record = { date, round, time: currentHoldTime };
          const existing = await AsyncStorage.getItem('innerfire_history');
          const history = existing ? JSON.parse(existing) : [];
          history.push(record);
          await AsyncStorage.setItem('innerfire_history', JSON.stringify(history));
        } catch(e) { console.log('Error saving history', e); }
      }

      if (stopRef.current) break;

      setPhase(t('phase.deepBreath'));
      setProgress(0);
      playSound('inhale');
      await animateBreath({ duration: settings.deepBreathTime, inhale: true });
      for (let i = settings.deepBreathTime; i > 0; i--) {
        if (stopRef.current) break;
        setTimerText(displayTime(i));
        setProgress((settings.deepBreathTime - i + 1) / settings.deepBreathTime);
        await sleep(1000);
      }
      setProgress(1);

      if (stopRef.current) break;

      setPhase(t('phase.holdSeconds', { seconds: settings.holdTime }));
      setProgress(0);
      startLoopingSound('hold');
      for (let i = settings.holdTime; i > 0; i--) {
        if (stopRef.current) break;
        setProgress((settings.holdTime - i + 1) / settings.holdTime);
        setTimerText(displayTime(i));
        await sleep(1000);
      }
      stopLoopingSound();
      setProgress(1);

      if (stopRef.current) break;

      setPhase(t('phase.letItGo'));
      playSound('exhale');
      setProgress(0);
      await animateBreath({ duration: settings.pauseAfterRound, inhale: false });
      for (let i = settings.pauseAfterRound; i > 0; i--) {
        if (stopRef.current) break;
        setTimerText(displayTime(i));
        setProgress((settings.pauseAfterRound - i + 1) / settings.pauseAfterRound);
        await sleep(1000);
      }
      setProgress(1);
    }

    if (!stopRef.current) {
      setPhase(t('phase.sessionComplete')); setTimerText('Bravo!'); setProgress(1);
      playSound('bowl');
    }
    setTimeout(reset, 3000);
  };

  const reset = () => {
    setIsRunning(false); setIsPaused(false); setCanPause(false); setCurrentRound(1); // Reset the round.
    setPhase(t('phase.ready')); setTimerText(''); setProgress(0);
    stopLoopingSound();
    Animated.timing(scaleAnim, { toValue: 0.3, duration: 500, useNativeDriver: true }).start();
  };

  const start = useCallback(() => runSession(), [settings]);
  const pause = useCallback(() => { setIsPaused(true); pauseRef.current = true; setPhase(t('phase.paused')); }, []);
  const resume = useCallback(() => { setIsPaused(false); pauseRef.current = false; setPhase(t('phase.resumed')); if (pauseResolveRef.current) { pauseResolveRef.current(); pauseResolveRef.current = null; } }, []);
  const stop = useCallback(() => { stopRef.current = true; if (pauseRef.current && pauseResolveRef.current) { pauseResolveRef.current(); } reset(); }, []);

  // Expose currentRound for the UI.
  return { phase, timerText, scaleAnim, progress, isRunning, isPaused, canPause, start, pause, resume, stop, currentRound };
}