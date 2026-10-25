import React, { useEffect, useRef, useState } from 'react';
import { Alert, Modal, View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Linking, Platform, StatusBar as RNStatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Check, ChevronDown, Minus, Plus, RotateCcw, Save, X, Trash2 } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_SETTINGS } from '../hooks/useBreathing';
import { t } from '../utils/i18n';

const BUILT_IN_PROFILES = [
  { id: 'default', name: 'Default', settings: DEFAULT_SETTINGS },
  {
    id: 'advanced',
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

const FIELD_RULES = {
  prepTime: { seconds: true },
  rounds: { min: 1, integer: true },
  numBreaths: { min: 1, integer: true },
  breathSpeed: { min: 0.1, step: 0.05, seconds: true },
  breathOutHold: { step: 5, seconds: true },
  deepBreathTime: { seconds: true },
  holdTime: { seconds: true },
  pauseAfterRound: { seconds: true },
};

// Ignores audio playback latency, so the real session runs slightly longer.
const estimateSessionSeconds = (s) => {
  let total = s.prepTime;
  for (let round = 1; round <= s.rounds; round++) {
    const custom = s.customRounds?.find(r => r.round === round);
    total += s.numBreaths * 2 * s.breathSpeed
      + (custom ? custom.time : s.breathOutHold)
      + s.deepBreathTime + s.holdTime + s.pauseAfterRound;
  }
  return Math.round(total);
};

const formatDuration = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = String(seconds % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
};

const confirmAction = (message, confirmLabel, onConfirm) => {
  // Alert.alert is a no-op on react-native-web.
  if (Platform.OS === 'web') {
    if (window.confirm(message)) onConfirm();
    return;
  }
  Alert.alert(message, undefined, [
    { text: t('profiles.cancel'), style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
};

export default function SettingsPanel({ visible, settings, setSettings, onClose }) {
  const [customRoundNum, setCustomRoundNum] = useState('');
  const [customRoundTime, setCustomRoundTime] = useState('');
  const [savedProfiles, setSavedProfiles] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [profileName, setProfileName] = useState('');
  const [savingAsNew, setSavingAsNew] = useState(false);
  const [profilesExpanded, setProfilesExpanded] = useState(false);
  const [profilesLoaded, setProfilesLoaded] = useState(false);
  const [drafts, setDrafts] = useState({});
  const repeatRef = useRef(null);

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
  const selectedProfile = allProfiles.find(profile => profile.id === selectedProfileId);
  const settingsMatchProfile = profile => JSON.stringify(profile.settings) === JSON.stringify(settings);
  const activeProfile = selectedProfile
    ? settingsMatchProfile(selectedProfile) ? selectedProfile : null
    : allProfiles.find(settingsMatchProfile);
  const selectedIsModified = !!selectedProfile && !settingsMatchProfile(selectedProfile);
  const profileLabel = selectedIsModified
    ? `${selectedProfile.name} • ${t('profiles.modified')}`
    : activeProfile?.name || t('profiles.custom');
  const selectedSavedProfile = savedProfiles.find(profile => profile.id === selectedProfileId);
  const isBuiltIn = profile => BUILT_IN_PROFILES.some(systemProfile => systemProfile.id === profile.id);

  const persistProfiles = async (nextProfiles) => {
    setSavedProfiles(nextProfiles);
    try {
      await AsyncStorage.setItem('innerfire_profiles', JSON.stringify(nextProfiles));
    } catch (e) {
      console.log('Error saving profiles', e);
    }
  };

  const applyProfile = (profile) => {
    setSelectedProfileId(profile.id);
    setDrafts({});
    setSettings(JSON.parse(JSON.stringify(profile.settings)));
    setProfilesExpanded(false);
  };

  const updateSelectedProfile = () => {
    persistProfiles(savedProfiles.map(profile => profile.id === selectedSavedProfile.id
      ? { ...profile, settings: JSON.parse(JSON.stringify(settings)) }
      : profile));
  };

  const cancelSaveAsNew = () => {
    setSavingAsNew(false);
    setProfileName('');
  };

  const saveNewProfile = () => {
    const name = profileName.trim();
    if (!name) {
      alert(t('alerts.profileNameRequired'));
      return;
    }
    if (allProfiles.some(profile => profile.name.toLowerCase() === name.toLowerCase())) {
      alert(t('alerts.profileExists'));
      return;
    }

    const newProfile = {
      id: Date.now().toString(),
      name,
      settings: JSON.parse(JSON.stringify(settings)),
    };
    persistProfiles([...savedProfiles, newProfile]);
    setSelectedProfileId(newProfile.id);
    cancelSaveAsNew();
  };

  const deleteProfile = (profile) => {
    confirmAction(t('profiles.confirmDelete', { name: profile.name }), t('profiles.delete'), () => {
      persistProfiles(savedProfiles.filter(p => p.id !== profile.id));
      if (selectedProfileId === profile.id) setSelectedProfileId(null);
    });
  };

  const handleChange = (name, value) => {
    const { min = 0, integer = false } = FIELD_RULES[name] || {};
    const pattern = integer ? /^\d*$/ : /^\d*\.?\d*$/;
    if (!pattern.test(value)) return;
    setDrafts(prev => ({ ...prev, [name]: value }));
    const numValue = parseFloat(value);
    if (!Number.isNaN(numValue) && numValue >= min) {
      setSettings(prev => ({ ...prev, [name]: numValue }));
    }
  };

  // Drop the draft so an empty or out-of-range entry reverts to the last valid value.
  const handleBlur = (name) => {
    setDrafts(prev => {
      const { [name]: _, ...rest } = prev;
      return rest;
    });
  };

  const stepValue = (name, direction) => {
    const { min = 0, step = 1 } = FIELD_RULES[name] || {};
    handleBlur(name);
    setSettings(prev => ({
      ...prev,
      [name]: Math.max(min, Math.round((prev[name] + direction * step) * 100) / 100),
    }));
  };

  const startRepeat = (name, direction) => {
    clearInterval(repeatRef.current);
    repeatRef.current = setInterval(() => stepValue(name, direction), 80);
  };

  const stopRepeat = () => {
    clearInterval(repeatRef.current);
    repeatRef.current = null;
  };

  useEffect(() => stopRepeat, []);

  const renderStepButton = (name, direction) => (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${t(`inputs.${name}`)} ${direction < 0 ? '−' : '+'}`}
      style={styles.stepperButton}
      onPress={() => stepValue(name, direction)}
      onLongPress={() => startRepeat(name, direction)}
      onPressOut={stopRepeat}
      delayLongPress={350}
    >
      {direction < 0 ? <Minus color="#86efac" size={18} /> : <Plus color="#86efac" size={18} />}
    </TouchableOpacity>
  );

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
            <Text style={styles.title}>
              {t('settings.title') === 'Session Settings' ? (
                <>
                  Session <Text style={styles.titleHighlight}>Settings</Text>
                </>
              ) : t('settings.title')}
            </Text>
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
                  {profileLabel}
                </Text>
              </View>
              <ChevronDown color="#86efac" size={21} />
            </TouchableOpacity>
            {profilesExpanded && (
              <View style={styles.profileOptions}>
                {allProfiles.map(profile => {
                  const isActive = activeProfile?.id === profile.id;
                  const builtIn = isBuiltIn(profile);
                  return (
                    <View
                      key={profile.id}
                      style={[styles.profileOption, isActive && styles.activeProfileOption]}
                    >
                      <TouchableOpacity
                        accessibilityRole="button"
                        style={styles.profileOptionMain}
                        onPress={() => applyProfile(profile)}
                      >
                        <Text style={[styles.profileOptionText, isActive && styles.activeProfileText]}>
                          {profile.name}
                        </Text>
                        <Text style={styles.profileBadge}>
                          {t(builtIn ? 'profiles.system' : 'profiles.user')}
                        </Text>
                      </TouchableOpacity>
                      {!builtIn && (
                        <TouchableOpacity
                          accessibilityRole="button"
                          accessibilityLabel={`${t('profiles.delete')}: ${profile.name}`}
                          style={styles.iconButton}
                          onPress={() => deleteProfile(profile)}
                        >
                          <Trash2 color="#f87171" size={17} />
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {savingAsNew ? (
              <View style={[styles.customAddRow, styles.profileActions]}>
                <TextInput
                  style={[styles.input, styles.profileNameInput]}
                  placeholder={t('profiles.namePlaceholder')}
                  placeholderTextColor="#71817a"
                  value={profileName}
                  onChangeText={setProfileName}
                  onSubmitEditing={saveNewProfile}
                  autoFocus
                  returnKeyType="done"
                />
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={t('profiles.save')}
                  style={[styles.profileSaveButton, !profilesLoaded && styles.disabledButton]}
                  onPress={saveNewProfile}
                  disabled={!profilesLoaded}
                >
                  <Check color="#07110d" size={19} />
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={t('profiles.cancel')}
                  style={styles.profileCancelButton}
                  onPress={cancelSaveAsNew}
                >
                  <X color="#9CA3AF" size={19} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.profileActions}>
                {selectedSavedProfile && selectedIsModified && (
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={[styles.profileActionButton, styles.profilePrimaryAction]}
                    onPress={updateSelectedProfile}
                    disabled={!profilesLoaded}
                  >
                    <Save color="#07110d" size={16} />
                    <Text style={styles.profilePrimaryActionText} numberOfLines={1}>
                      {t('profiles.update', { name: selectedSavedProfile.name })}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  accessibilityRole="button"
                  style={styles.profileActionButton}
                  onPress={() => setSavingAsNew(true)}
                  disabled={!profilesLoaded}
                >
                  <Plus color="#86efac" size={16} />
                  <Text style={styles.profileActionText}>{t('profiles.saveAsNew')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {inputGroups.map((group, index) => (
            <View key={group.title} style={styles.settingsSection}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, styles.sectionHeaderTitle]}>{t(group.title)}</Text>
                {index === 0 && (
                  <Text style={styles.totalTime}>
                    {t('settings.totalTime')} ≈ <Text style={styles.totalTimeValue}>{formatDuration(estimateSessionSeconds(settings))}</Text>
                  </Text>
                )}
              </View>
              <View style={styles.inputGrid}>
                {group.inputs.map(name => (
                  <View key={name} style={styles.inputBlock}>
                    <Text style={styles.label}>{t(`inputs.${name}`)}</Text>
                    <View style={styles.stepper}>
                      {renderStepButton(name, -1)}
                      <View style={styles.stepperValue}>
                        <TextInput
                          style={styles.stepperInput}
                          keyboardType="numeric"
                          value={drafts[name] ?? settings[name].toString()}
                          onChangeText={(val) => handleChange(name, val)}
                          onBlur={() => handleBlur(name)}
                          returnKeyType="done"
                          selectTextOnFocus
                        />
                        {FIELD_RULES[name]?.seconds && <Text style={styles.unit}>{t('units.secondsShort')}</Text>}
                      </View>
                      {renderStepButton(name, 1)}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}

          {/* Custom rounds. */}
          <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>{t('settings.customRounds')}</Text>
          <View style={styles.customRoundRow}>
            <TextInput
              style={[styles.input, styles.roundNumberInput]}
              placeholder={t('customRoundPlaceholderRound')}
              placeholderTextColor="#71817a"
              keyboardType="numeric"
              value={customRoundNum}
              onChangeText={setCustomRoundNum}
            />
            <View style={styles.roundTimeGroup}>
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
          </View>

          {settings.customRounds?.length > 0 && (
          <View style={styles.list}>
            {settings.customRounds.map(cr => (
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
          )}
          </View>

          {/* Restore Defaults */}
          <TouchableOpacity
            style={styles.restoreBtn}
            onPress={() => {
              setSelectedProfileId('default');
              setDrafts({});
              setSettings(DEFAULT_SETTINGS);
            }}
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
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight + 15 : (Platform.OS === 'web' ? 20 : 0),
  },
  headerFrame: { width: '100%', borderBottomWidth: 1, borderBottomColor: '#1f2937', marginBottom: 22 },
  header: { width: '100%', maxWidth: 680, height: 60, alignSelf: 'center', paddingHorizontal: 20, paddingBottom: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  title: { color: '#ffffff', fontSize: 26, fontWeight: 'bold', textAlign: 'center' },
  titleHighlight: { color: '#22c55e', fontWeight: '300' },
  closeBtn: { position: 'absolute', right: 20, top: 0, padding: 10, backgroundColor: '#111827', borderRadius: 50, borderWidth: 1, borderColor: '#374151', zIndex: 10 },
  scrollArea: { flex: 1 },
  scrollContent: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: 22, paddingTop: 22, paddingBottom: 44 },
  profileSection: { padding: 17, backgroundColor: '#0d1914', borderWidth: 1, borderColor: '#1d3c2e', borderRadius: 14, marginBottom: 16 },
  sectionEyebrow: { color: '#86efac', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 10 },
  profileSelector: { minHeight: 66, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#101e18', paddingHorizontal: 14, paddingVertical: 11, borderRadius: 10, borderWidth: 1, borderColor: '#2b4a3a' },
  profileCaption: { color: '#81948a', fontSize: 12, marginBottom: 3 },
  profileSelectorText: { color: '#f3f7f4', fontSize: 17, fontWeight: '600' },
  profileOptions: { marginTop: 7, overflow: 'hidden', borderRadius: 9, backgroundColor: '#0a1410' },
  profileOption: { flexDirection: 'row', alignItems: 'center', paddingRight: 8, borderBottomWidth: 1, borderBottomColor: '#1b2b25' },
  profileOptionMain: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 13, paddingVertical: 12 },
  activeProfileOption: { backgroundColor: '#14271d' },
  profileOptionText: { color: '#c5d0c9', fontSize: 14 },
  activeProfileText: { color: '#86efac', fontWeight: '600' },
  profileBadge: { color: '#81948a', fontSize: 11, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#2b4a3a', overflow: 'hidden' },
  profileActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, marginBottom: 0 },
  profileActionButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 13, paddingVertical: 10, borderRadius: 9, borderWidth: 1, borderColor: '#2b4a3a' },
  profileActionText: { color: '#86efac', fontSize: 14, fontWeight: '600' },
  profilePrimaryAction: { flexShrink: 1, backgroundColor: '#86efac', borderColor: '#86efac' },
  profilePrimaryActionText: { flexShrink: 1, color: '#07110d', fontSize: 14, fontWeight: '600' },
  profileNameInput: { flex: 1, minWidth: 0 },
  profileSaveButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: '#86efac', borderRadius: 10 },
  profileCancelButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827', borderRadius: 10, borderWidth: 1, borderColor: '#374151' },
  disabledButton: { opacity: 0.5 },
  settingsSection: { padding: 17, backgroundColor: '#0b0f0d', borderWidth: 1, borderColor: '#1f2a25', borderRadius: 14, marginBottom: 16 },
  inputGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: -14 },
  inputBlock: { width: '48%', marginBottom: 14 },
  label: { color: '#a4b2aa', fontSize: 12, marginBottom: 7 },
  input: { minWidth: 0, minHeight: 48, backgroundColor: '#101915', color: '#f3f7f4', paddingHorizontal: 13, paddingVertical: 10, borderRadius: 9, fontSize: 16, borderWidth: 1, borderColor: '#283a32' },
  sectionTitle: { color: '#a4b2aa', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  sectionHeaderTitle: { marginBottom: 0 },
  totalTime: { color: '#81948a', fontSize: 12 },
  totalTimeValue: { color: '#86efac', fontWeight: '700', fontVariant: ['tabular-nums'] },
  stepper: { flexDirection: 'row', alignItems: 'stretch', minHeight: 48, backgroundColor: '#101915', borderRadius: 9, borderWidth: 1, borderColor: '#283a32', overflow: 'hidden' },
  stepperButton: { width: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0d1612' },
  stepperValue: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  stepperInput: { flexShrink: 1, minWidth: 24, color: '#f3f7f4', fontSize: 16, textAlign: 'center', paddingVertical: 10, paddingHorizontal: 0 },
  unit: { color: '#71817a', fontSize: 14, marginLeft: 3 },
  customAddRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 9, gap: 8 },
  customRoundRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  roundNumberInput: { width: '48%' },
  roundTimeGroup: { width: '48%', flexDirection: 'row', alignItems: 'center', gap: 8 },
  roundTimeInput: { flex: 1 },
  addIconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: '#86efac', borderRadius: 9 },
  list: { marginTop: 6, marginBottom: -6 },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderTopWidth: 1, borderTopColor: '#1b2b25', alignItems: 'center' },
  listItemText: { fontSize: 14, color: '#d5dfd8' },
  iconButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: '#1d211d' },
  restoreBtn: { flexDirection: 'row', gap: 8, padding: 13, borderWidth: 1, borderColor: '#573333', borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
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