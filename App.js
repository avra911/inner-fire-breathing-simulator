import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Platform, StatusBar as RNStatusBar } from 'react-native';
import { Play, Settings, Square, Pause } from 'lucide-react-native';
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

  const { phase, timerText, scaleAnim, progress, isRunning, isPaused, canPause, start, pause, resume, stop, currentRound } = useBreathing(settings);

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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar hidden={true} />

      {/* Settings displayed in a native modal. */}
      <SettingsPanel
        visible={showSettings}
        settings={settings}
        setSettings={setSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* Header bar with Android status bar spacing. */}
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

      <View style={styles.centerArea}>
        <BreathCircle 
          scaleAnim={scaleAnim} 
          timerText={timerText} 
          progress={progress} 
          themeColor={activeColor} 
          breathSpeed={settings.breathSpeed}
        />
      </View>

      <Text style={styles.phaseText}>{phase}</Text>

      <View style={styles.controls}>
        {!isRunning ? (
            <TouchableOpacity style={[styles.button, styles.startButton]} onPress={start}>
            <Play color="#ffffff" size={24} fill="#ffffff" />
              <Text style={styles.buttonText}>{t('startSession')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.activeControls}>
            {!isPaused ? (
              <TouchableOpacity
                style={[styles.button, styles.pauseButton, !canPause && { opacity: 0.5 }]}
                onPress={pause}
                disabled={!canPause}
              >
                <Pause color="#ffffff" size={24} fill="#ffffff" />
                <Text style={styles.buttonText}>{t('pause')}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.button, styles.resumeButton]} onPress={resume}>
                <Play color="#ffffff" size={24} fill="#ffffff" />
                <Text style={styles.buttonText}>{t('resume')}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={[styles.button, styles.stopButton]} onPress={stop}>
              <Square color="#ffffff" size={24} fill="#ffffff" />
              <Text style={styles.buttonText}>{t('stop')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    paddingLeft: 20,
    paddingRight: 20,
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight + 15 : (Platform.OS === 'web' ? 20 : 0)
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center', // Center the title.
    alignItems: 'center',
    marginBottom: 40,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
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
    right: 0,
    top: 0,
    padding: 10,
    backgroundColor: '#111827',
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#374151',
    zIndex: 10
  },
  centerArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  phaseText: { fontSize: 22, color: '#d1d5db', textAlign: 'center', marginBottom: 30, fontWeight: '500' },
  controls: { paddingBottom: 40 },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, borderRadius: 30, gap: 10 },
  activeControls: { flexDirection: 'row', gap: 15 },
  startButton: { backgroundColor: '#16a34a', width: '100%' },
  pauseButton: { backgroundColor: '#ca8a04', flex: 1 },
  resumeButton: { backgroundColor: '#2563eb', flex: 1 },
  stopButton: { backgroundColor: '#dc2626', flex: 1 },
  buttonText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
});