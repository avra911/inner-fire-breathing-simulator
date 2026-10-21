import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Linking, Platform, StatusBar as RNStatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ChevronDown, Plus, RotateCcw, Save, X, Trash2 } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_SETTINGS } from '../hooks/useBreathing';
import { t } from '../utils/i18n';

const BUILT_IN_PROFILES = [
  { name: 'Default', settings: DEFAULT_SETTINGS },
  {
    name: 'Advanced',
    settings: {
      ...DEFAULT_SETTINGS,
      rounds: 4,
      breathOutHold: 90,
      customRounds: [
        { round: 2, time: 120 },
        { round: 3, time: 150 },
        { round: 4, time: 180 },
      ],
    },
  },
];

export default function SettingsPanel({ visible, settings, setSettings, onClose }) {
  const [customRoundNum, setCustomRoundNum] = useState('');
  const [customRoundTime, setCustomRoundTime] = useState('');
  const [savedProfiles, setSavedProfiles] = useState([]);
  const [profileName, setProfileName] = useState('');
  const [profilesExpanded, setProfilesExpanded] = useState(false);
  const [profilesLoaded, setProfilesLoaded] = useState(false);

  useEffect(() => {
    const loadProfiles = async () => {
      try {
        const storedProfiles = await AsyncStorage.getItem('innerfire_profiles');
        if (storedProfiles) {
          const parsedProfiles = JSON.parse(storedProfiles);
          if (Array.isArray(parsedProfiles)) setSavedProfiles(parsedProfiles);
        }
      } catch (e) {
        console.log('Error loading profiles', e);
      } finally {
        setProfilesLoaded(true);
      }
    };
    loadProfiles();
  }, []);

  const allProfiles = [...BUILT_IN_PROFILES, ...savedProfiles];
  const activeProfile = allProfiles.find(profile => JSON.stringify(profile.settings) === JSON.stringify(settings));

  const applyProfile = (profile) => {
    setSettings(JSON.parse(JSON.stringify(profile.settings)));
    setProfilesExpanded(false);
  };

  const saveProfile = async () => {
    const name = profileName.trim();
    if (!name) {
      alert(t('alerts.profileNameRequired'));
      return;
    }
    if (allProfiles.some(profile => profile.name.toLowerCase() === name.toLowerCase())) {
      alert(t('alerts.profileExists'));
      return;
    }

    const nextProfiles = [...savedProfiles, {
      id: Date.now().toString(),
      name,
      settings: JSON.parse(JSON.stringify(settings)),
    }];
    setSavedProfiles(nextProfiles);
    setProfileName('');
    try {
      await AsyncStorage.setItem('innerfire_profiles', JSON.stringify(nextProfiles));
    } catch (e) {
      console.log('Error saving profiles', e);
    }
  };

  const deleteProfile = async (profileId) => {
    const nextProfiles = savedProfiles.filter(profile => profile.id !== profileId);
    setSavedProfiles(nextProfiles);
    try {
      await AsyncStorage.setItem('innerfire_profiles', JSON.stringify(nextProfiles));
    } catch (e) {
      console.log('Error saving profiles', e);
    }
  };

  const handleChange = (name, value) => {
    // Allow numbers only.
    const numValue = value === '' ? 0 : parseFloat(value);
    setSettings(prev => ({ ...prev, [name]: numValue }));
  };

  const handleAddCustomRound = () => {
    const round = parseInt(customRoundNum, 10);
    const time = parseInt(customRoundTime, 10);
    const maxRounds = settings.rounds || 1;

    if (!round || round < 1 || round > maxRounds) {
      alert(t('alerts.roundRange', { max: maxRounds }));
      return;
    }
    if (!time || time < 1) {
      alert(t('alerts.timePositive'));
      return;
    }

    const currentCustomRounds = settings.customRounds || [];

    if (currentCustomRounds.find(r => r.round === round)) {
      alert(t('alerts.roundExists', { round }));
      return;
    }

    if (currentCustomRounds.length >= maxRounds - 1 && maxRounds > 1) {
      alert(t('alerts.maxCustomRounds', { max: maxRounds - 1 }));
      return;
    }

    setSettings(prev => ({
      ...prev,
      customRounds: [...(prev.customRounds || []), { round, time }].sort((a, b) => a.round - b.round)
    }));

    setCustomRoundNum('');
    setCustomRoundTime('');
  };

  const inputGroups = [
    { title: 'settings.session', inputs: ['prepTime', 'rounds', 'numBreaths'] },
    { title: 'settings.breathing', inputs: ['breathSpeed', 'breathOutHold'] },
    { title: 'settings.recovery', inputs: ['deepBreathTime', 'holdTime', 'pauseAfterRound'] },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <SafeAreaProvider>
        <StatusBar hidden />
        <SafeAreaView
          edges={Platform.OS === 'android' ? ['left', 'right', 'bottom'] : undefined}
          style={styles.container}
        >
        <View style={styles.headerFrame}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('settings.title')}</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('close')} onPress={onClose} style={styles.closeBtn}>
              <X color="#9CA3AF" size={26} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>

          <View style={styles.profileSection}>
            <Text style={styles.sectionEyebrow}>{t('profiles.title')}</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('profiles.select')}
              style={styles.profileSelector}
              onPress={() => setProfilesExpanded(!profilesExpanded)}
            >
              <View>
                <Text style={styles.profileCaption}>{t('profiles.select')}</Text>
                <Text style={styles.profileSelectorText}>
                  {activeProfile?.name || t('profiles.custom')}
                </Text>
              </View>
              <ChevronDown color="#86efac" size={21} />
            </TouchableOpacity>
            {profilesExpanded && (
              <View style={styles.profileOptions}>
                {allProfiles.map(profile => (
                  <TouchableOpacity
                    key={profile.id || profile.name}
                    style={[
                      styles.profileOption,
                      activeProfile?.name === profile.name && styles.activeProfileOption,
                    ]}
                    onPress={() => applyProfile(profile)}
                  >
                    <Text style={[
                      styles.profileOptionText,
                      activeProfile?.name === profile.name && styles.activeProfileText,
                    ]}>{profile.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.profileSubheading}>{t('profiles.saveTitle')}</Text>
            <View style={styles.customAddRow}>
              <TextInput
                style={[styles.input, styles.profileNameInput]}
                placeholder={t('profiles.namePlaceholder')}
                placeholderTextColor="#71817a"
                value={profileName}
                onChangeText={setProfileName}
                returnKeyType="done"
              />
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t('profiles.save')}
                style={[styles.profileSaveButton, !profilesLoaded && styles.disabledButton]}
                onPress={saveProfile}
                disabled={!profilesLoaded}
              >
                <Save color="#07110d" size={19} />
              </TouchableOpacity>
            </View>
            {savedProfiles.map(profile => (
              <View key={profile.id} style={styles.savedProfileRow}>
                <Text style={styles.profileOptionText}>{profile.name}</Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={`${t('profiles.delete')}: ${profile.name}`}
                  style={styles.iconButton}
                  onPress={() => deleteProfile(profile.id)}
                >
                  <Trash2 color="#f87171" size={17} />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {inputGroups.map(group => (
            <View key={group.title} style={styles.settingsSection}>
              <Text style={styles.sectionTitle}>{t(group.title)}</Text>
              <View style={styles.inputGrid}>
                {group.inputs.map(name => (
                  <View key={name} style={styles.inputBlock}>
                    <Text style={styles.label}>{t(`inputs.${name}`)}</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={settings[name].toString()}
                      onChangeText={(val) => handleChange(name, val)}
                      returnKeyType="done"
                    />
                  </View>
                ))}
              </View>
            </View>
          ))}

          {/* Custom rounds. */}
          <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>{t('settings.customRounds')}</Text>
          <View style={styles.customAddRow}>
            <TextInput
              style={[styles.input, styles.roundNumberInput]}
              placeholder={t('customRoundPlaceholderRound')}
              placeholderTextColor="#71817a"
              keyboardType="numeric"
              value={customRoundNum}
              onChangeText={setCustomRoundNum}
            />
            <TextInput
              style={[styles.input, styles.roundTimeInput]}
              placeholder={t('customRoundPlaceholderTime')}
              placeholderTextColor="#71817a"
              keyboardType="numeric"
              value={customRoundTime}
              onChangeText={setCustomRoundTime}
            />
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('addCustomRound')}
              style={styles.addIconButton}
              onPress={handleAddCustomRound}
            >
              <Plus color="#07110d" size={21} />
            </TouchableOpacity>
          </View>

          <View style={styles.list}>
            {(settings.customRounds || []).map(cr => (
              <View key={cr.round} style={styles.listItem}>
                <Text style={styles.listItemText}>{t('customRoundLabel', { round: cr.round, time: cr.time })}</Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={`${t('profiles.delete')}: ${t('customRoundLabel', { round: cr.round, time: cr.time })}`}
                  style={styles.iconButton}
                  onPress={() => setSettings(prev => ({ ...prev, customRounds: prev.customRounds.filter(r => r.round !== cr.round) }))}
                >
                  <Trash2 color="#f87171" size={17} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
          </View>

          {/* Restore Defaults */}
          <TouchableOpacity
            style={styles.restoreBtn}
            onPress={() => setSettings(DEFAULT_SETTINGS)}
          >
            <RotateCcw color="#fca5a5" size={17} />
            <Text style={styles.restoreBtnText}>{t('restoreDefaults')}</Text>
          </TouchableOpacity>

          {/* --- FOOTER: ABOUT & DONATIONS --- */}
          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>
              {t('footer.madeWith')}
              <Text 
                style={styles.linkText} 
                onPress={() => Linking.openURL('https://github.com/avra911/inner-fire-breathing-simulator')}
              >
                {t('footer.githubRepo')}
              </Text>
            </Text>

            <Text style={styles.donationText}>
              {t('donations')}{'\n'}
              <Text 
                style={styles.btcLink} 
                onPress={() => Linking.openURL('bitcoin:1AvraENtvcM4odsFrFYG7N7G9nK77KXSf4')}
              >
                {t('btcWallet')}
              </Text>
            </Text>
          </View>

        </ScrollView>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight + 15 : 0,
  },
  headerFrame: { width: '100%', borderBottomWidth: 1, borderBottomColor: '#1f2937', marginBottom: 22 },
  header: { width: '100%', maxWidth: 680, height: 60, alignSelf: 'center', paddingHorizontal: 20, paddingBottom: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  title: { color: '#ffffff', fontSize: 26, fontWeight: 'bold', textAlign: 'center' },
  closeBtn: { position: 'absolute', right: 20, top: 0, padding: 10, backgroundColor: '#111827', borderRadius: 50, borderWidth: 1, borderColor: '#374151', zIndex: 10 },
  scrollArea: { flex: 1 },
  scrollContent: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: 22, paddingTop: 22, paddingBottom: 44 },
  profileSection: { padding: 17, backgroundColor: '#0d1914', borderWidth: 1, borderColor: '#1d3c2e', borderRadius: 14, marginBottom: 26 },
  sectionEyebrow: { color: '#86efac', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 10 },
  profileSelector: { minHeight: 66, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#101e18', paddingHorizontal: 14, paddingVertical: 11, borderRadius: 10, borderWidth: 1, borderColor: '#2b4a3a' },
  profileCaption: { color: '#81948a', fontSize: 12, marginBottom: 3 },
  profileSelectorText: { color: '#f3f7f4', fontSize: 17, fontWeight: '600' },
  profileOptions: { marginTop: 7, overflow: 'hidden', borderRadius: 9, backgroundColor: '#0a1410' },
  profileOption: { paddingHorizontal: 13, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1b2b25' },
  activeProfileOption: { backgroundColor: '#14271d' },
  profileOptionText: { color: '#c5d0c9', fontSize: 14 },
  activeProfileText: { color: '#86efac', fontWeight: '600' },
  profileSubheading: { color: '#9aaba1', fontSize: 12, marginTop: 16, marginBottom: 8 },
  profileNameInput: { flex: 1, minWidth: 0 },
  profileSaveButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: '#86efac', borderRadius: 10 },
  disabledButton: { opacity: 0.5 },
  savedProfileRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10 },
  settingsSection: { marginBottom: 23 },
  inputGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  inputBlock: { width: '48%', marginBottom: 14 },
  label: { color: '#a4b2aa', fontSize: 12, marginBottom: 7 },
  input: { minWidth: 0, minHeight: 48, backgroundColor: '#101915', color: '#f3f7f4', paddingHorizontal: 13, paddingVertical: 10, borderRadius: 9, fontSize: 16, borderWidth: 1, borderColor: '#283a32' },
  sectionTitle: { color: '#edf4ef', fontSize: 16, fontWeight: '700', marginBottom: 13 },
  customAddRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 9, gap: 8 },
  roundNumberInput: { flex: 0.8 },
  roundTimeInput: { flex: 1 },
  addIconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: '#86efac', borderRadius: 9 },
  list: { marginBottom: 12 },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#1b2b25', alignItems: 'center' },
  listItemText: { fontSize: 14, color: '#d5dfd8' },
  iconButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: '#1d211d' },
  restoreBtn: { flexDirection: 'row', gap: 8, padding: 13, borderWidth: 1, borderColor: '#573333', borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  restoreBtnText: { color: '#fca5a5', fontWeight: '600', fontSize: 14 },
  footerContainer: {
    marginTop: 40,
    marginBottom: 20,
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#374151', // Subtle separator line above.
  },
  footerText: {
    color: '#9ca3af', // text-gray-400 for dark mode.
    fontSize: 14,
    textAlign: 'center',
  },
  linkText: {
    color: '#3b82f6', // text-blue-500
    textDecorationLine: 'underline',
  },
  donationText: {
    color: '#9ca3af',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 15,
  },
  btcLink: {
    fontWeight: 'bold',
    color: '#f59e0b', // Auriu/Portocaliu specific Bitcoin
    textDecorationLine: 'underline',
  },
});