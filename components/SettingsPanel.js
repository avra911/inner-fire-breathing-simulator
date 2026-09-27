import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, Linking } from 'react-native';
import { X, Trash2 } from 'lucide-react-native';
import { DEFAULT_SETTINGS } from '../hooks/useBreathing';
import { t } from '../utils/i18n';

export default function SettingsPanel({ visible, settings, setSettings, onClose }) {
  const [customRoundNum, setCustomRoundNum] = useState('');
  const [customRoundTime, setCustomRoundTime] = useState('');

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

  const inputs = [
    { name: 'prepTime' },
    { name: 'rounds' },
    { name: 'breathSpeed' },
    { name: 'numBreaths' },
    { name: 'breathOutHold' },
    { name: 'deepBreathTime' },
    { name: 'holdTime' },
    { name: 'pauseAfterRound' },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('settings.title')}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X color="#ffffff" size={24} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollArea} contentContainerStyle={{ paddingBottom: 40 }}>

          {/* General settings. */}
          <View style={styles.inputGrid}>
            {inputs.map(input => (
              <View key={input.name} style={styles.inputBlock}>
                <Text style={styles.label}>{t(`inputs.${input.name}`)}</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={settings[input.name].toString()}
                  onChangeText={(val) => handleChange(input.name, val)}
                  returnKeyType="done"
                />
              </View>
            ))}
          </View>

          <View style={styles.divider} />

          {/* Custom rounds. */}
          <Text style={styles.sectionTitle}>{t('settings.customRounds')}</Text>
          <View style={styles.customAddRow}>
            <TextInput
              style={[styles.input, { flex: 0.8, marginRight: 10 }]}
              placeholder={t('customRoundPlaceholderRound')}
              placeholderTextColor="#6b7280"
              keyboardType="numeric"
              value={customRoundNum}
              onChangeText={setCustomRoundNum}
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder={t('customRoundPlaceholderTime')}
              placeholderTextColor="#6b7280"
              keyboardType="numeric"
              value={customRoundTime}
              onChangeText={setCustomRoundTime}
            />
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={handleAddCustomRound}>
            <Text style={styles.addBtnText}>{t('addCustomRound')}</Text>
          </TouchableOpacity>

          <View style={styles.list}>
            {(settings.customRounds || []).map(cr => (
              <View key={cr.round} style={styles.listItem}>
                <Text style={styles.listItemText}>{t('customRoundLabel', { round: cr.round, time: cr.time })}</Text>
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => setSettings(prev => ({ ...prev, customRounds: prev.customRounds.filter(r => r.round !== cr.round) }))}
                >
                  <Trash2 color="#ffffff" size={20} />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Restore Defaults */}
          <TouchableOpacity
            style={styles.restoreBtn}
            onPress={() => setSettings(DEFAULT_SETTINGS)}
          >
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  title: { color: '#ffffff', fontSize: 22, fontWeight: 'bold' },
  closeBtn: { padding: 5, backgroundColor: '#1f2937', borderRadius: 20 },
  scrollArea: { padding: 20 },
  inputGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  inputBlock: { width: '48%', marginBottom: 20 },
  label: { color: '#9ca3af', fontSize: 13, marginBottom: 8 },
  input: { backgroundColor: '#111827', color: '#ffffff', padding: 15, borderRadius: 15, fontSize: 16, borderWidth: 1, borderColor: '#374151' },
  divider: { height: 1, backgroundColor: '#1f2937', marginVertical: 20 },
  sectionTitle: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  customAddRow: { flexDirection: 'row', marginBottom: 15 },
  addBtn: { backgroundColor: '#1f2937', padding: 15, borderRadius: 15, alignItems: 'center', marginBottom: 20 },
  addBtnText: { color: '#d1d5db', fontWeight: 'bold', fontSize: 16 },
  list: { marginBottom: 30 },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#ffffff', padding: 15, borderRadius: 15, marginBottom: 10, alignItems: 'center' },
  listItemText: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  removeBtn: { backgroundColor: '#ef4444', padding: 10, borderRadius: 10 },
  restoreBtn: { padding: 15, borderWidth: 1, borderColor: '#ef4444', borderRadius: 15, alignItems: 'center' },
  restoreBtnText: { color: '#ef4444', fontWeight: 'bold', fontSize: 16 },
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