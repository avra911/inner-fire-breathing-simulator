import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, Platform, StatusBar as RNStatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Play, Settings, Square, Pause, Volume2, VolumeX } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useKeepAwake } from 'expo-keep-awake';

import BreathCircle from './components/BreathCircle';
import SettingsPanel from './components/SettingsPanel';
import { t } from './utils/i18n';
import { useBreathing, DEFAULT_SETTINGS } from './hooks/useBreathing';

export default function App() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);

  useKeepAwake();

  // Load saved settings.
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const saved = await AsyncStorage.getItem('innerfire_settings');
        if (saved) setSettings(JSON.parse(saved));
      } catch (e) {
        console.log('Error loading settings', e);
      }
    };
    loadSettings();
  }, []);

  // Save settings automatically when they change.
  useEffect(() => {
    AsyncStorage.setItem('innerfire_settings', JSON.stringify(settings));
  }, [settings]);

  const { phase, timerText, scaleAnim, progress, isRunning, isPaused, canPause, soundEnabled, toggleSound, start, pause, resume, stop, currentRound } = useBreathing(settings);

  // Define the color theme ("Level Up") as a spectrum from green to white.
  const getThemeColor = (round) => {
    if (!isRunning) return '#22c55e'; // Standard green when stopped.
    
    // Color list: index 0 is round 1, index 1 is round 2, and so on.
    const roundColors = [
      '#22c55e', // Round 1: Green (Calm / Base)
      '#06b6d4', // Round 2: Turquoise (Oxygenation)
      '#3b82f6', // Round 3: Blue (Ice Man)
      '#6366f1', // Round 4: Indigo (Deep)
      '#8b5cf6', // Round 5: Violet (Zen State)
      '#d946ef', // Round 6: Pink/Magenta (Pineal gland)
      '#ffffff'  // Round 7+: Pure white (Transcendence)
    ];

    // If the round exceeds the number of available colors,
    // use the last color in the list (white in this case).
    const colorIndex = Math.min(round - 1, roundColors.length - 1);
    
    return roundColors[colorIndex];
  };
  const activeColor = getThemeColor(currentRound);
  const soundToggleButton = (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={t(soundEnabled ? 'soundOff' : 'soundOn')}
      accessibilityState={{ selected: !soundEnabled }}
      title={t(soundEnabled ? 'soundOff' : 'soundOn')}
      hitSlop={8}
      style={[styles.soundToggle, soundEnabled ? styles.soundEnabled : styles.soundMuted]}
      onPress={toggleSound}
    >
      {soundEnabled ? <Volume2 color="#86efac" size={24} /> : <VolumeX color="#fca5a5" size={24} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaProvider>
      <SafeAreaView
        edges={Platform.OS === 'android' ? ['left', 'right', 'bottom'] : undefined}
        style={styles.container}
      >
      <StatusBar hidden={true} />

      {/* Settings displayed in a native modal. */}
      <SettingsPanel
        visible={showSettings}
        settings={settings}
        setSettings={setSettings}
        onClose={() => setShowSettings(false)}
      />

      <View style={styles.headerFrame}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {t('app.title')} <Text style={[styles.titleHighlight, { color: activeColor }]}>{t('app.subtitle')}</Text>
          </Text>
          <TouchableOpacity
            style={[styles.settingsButton, isRunning && { opacity: 0.3 }]}
            onPress={() => setShowSettings(true)}
            disabled={isRunning}
          >
            <Settings color="#9CA3AF" size={26} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.mainContent}>
        <View style={styles.centerArea}>
          <BreathCircle
            scaleAnim={scaleAnim}
            timerText={timerText}
            phase={phase}
            progress={progress}
            themeColor={activeColor}
            breathSpeed={settings.breathSpeed}
          />
        </View>

        <Text style={styles.phaseText}>{phase}</Text>

        <View style={styles.controls}>
          {!isRunning ? (
            <View style={styles.activeControls}>
              {soundToggleButton}
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t('startSession')}
                title={t('startSession')}
                style={[styles.controlIconButton, styles.startButton]}
                onPress={start}
              >
                <Play color="#ffffff" size={24} fill="#ffffff" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.activeControls}>
              {soundToggleButton}
              {!isPaused ? (
                canPause ? (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={t('pause')}
                    title={t('pause')}
                    style={[styles.controlIconButton, styles.pauseButton]}
                    onPress={pause}
                  >
                    <Pause color="#ffffff" size={24} fill="#ffffff" />
                  </TouchableOpacity>
                ) : null
              ) : (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={t('resume')}
                  title={t('resume')}
                  style={[styles.controlIconButton, styles.resumeButton]}
                  onPress={resume}
                >
                  <Play color="#ffffff" size={24} fill="#ffffff" />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t('stop')}
                title={t('stop')}
                style={[styles.controlIconButton, styles.stopButton]}
                onPress={stop}
              >
                <Square color="#ffffff" size={24} fill="#ffffff" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight + 15 : (Platform.OS === 'web' ? 20 : 0)
  },
  headerFrame: { width: '100%', borderBottomWidth: 1, borderBottomColor: '#1f2937', marginBottom: 40 },
  mainContent: { flex: 1, width: '100%', maxWidth: 680, paddingHorizontal: 20, alignSelf: 'center' },
  header: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center', // Center the title.
    alignItems: 'center',
    paddingBottom: 15,
    position: 'relative',
    height: 60,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  titleHighlight: {
    color: '#22c55e',
    fontWeight: '300'
  },
  settingsButton: {
    position: 'absolute',
    right: 20,
    top: 0,
    padding: 10,
    backgroundColor: '#111827',
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#374151',
    zIndex: 10
  },
  centerArea: { flex: 1, justifyContent: 'center', alignItems: 'center', transform: [{ translateY: 18 }] },
  phaseText: { fontSize: 22, color: '#d1d5db', textAlign: 'center', marginBottom: 30, fontWeight: '500' },
  controls: { paddingBottom: 40 },
  activeControls: { flexDirection: 'row', justifyContent: 'center', gap: 15 },
  controlIconButton: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center', borderRadius: 30 },
  soundToggle: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center', borderRadius: 30, borderWidth: 1 },
  soundEnabled: { backgroundColor: '#101915', borderColor: '#2b4a3a' },
  soundMuted: { backgroundColor: '#241212', borderColor: '#6b3333' },
  startButton: { backgroundColor: '#16a34a' },
  pauseButton: { backgroundColor: '#ca8a04' },
  resumeButton: { backgroundColor: '#2563eb' },
  stopButton: { backgroundColor: '#dc2626' },
});