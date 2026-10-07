import { usePathname } from 'expo-router';
import { subscribePresentationModePrompt } from '../services/presentationModeTrigger';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, AppState, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import { useTranslation } from 'react-i18next';
import { activatePresentationMode, disablePresentationMode, usePresentationMode } from '../services/presentationMode';
import { createShakeDetector } from '../services/shakeGesture';
import { AppTheme as theme, appStyles } from '../constants/AppTheme';

export function PresentationModeControl() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const enabled = usePresentationMode();
  const [visible, setVisible] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const opening = useRef(false);
  useEffect(() => subscribePresentationModePrompt(() => {
    if (!__DEV__ || AppState.currentState !== 'active' || opening.current) return;
    opening.current = true; setCode(''); setError(''); setVisible(true);
  }), []);
  useEffect(() => {
    if (__DEV__ || pathname === '/paywall') return;
    let active = true;
    let subscription: ReturnType<typeof Accelerometer.addListener> | undefined;
    const detect = createShakeDetector();
    void Accelerometer.isAvailableAsync().then(available => {
      if (!available || !active) return;
      Accelerometer.setUpdateInterval(100);
      subscription = Accelerometer.addListener(sample => {
        if (AppState.currentState !== 'active' || opening.current || !detect(sample, Date.now())) return;
        opening.current = true; setCode(''); setError(''); setVisible(true);
      });
    }).catch(() => undefined);
    return () => { active = false; subscription?.remove(); };
  }, [pathname]);
  const close = () => { if (busy) return; opening.current = false; setVisible(false); setCode(''); };
  const submit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (enabled) await disablePresentationMode();
      else if (!await activatePresentationMode(code)) { setError(t('presentationMode.invalid')); return; }
      opening.current = false; setVisible(false); setCode('');
      Alert.alert(t('presentationMode.title'), t(enabled ? 'presentationMode.disabled' : 'presentationMode.enabled'));
    } catch { setError(t('common.requestError')); }
    finally { setBusy(false); }
  };
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
      <View style={styles.card}><Text style={appStyles.section}>{t('presentationMode.title')}</Text>
        {!enabled && <TextInput accessibilityLabel={t('presentationMode.code')} placeholder={t('presentationMode.code')} secureTextEntry autoCapitalize="characters" autoCorrect={false} autoFocus value={code} onChangeText={setCode} editable={!busy} style={styles.input} onSubmitEditing={() => void submit()} />}
        {!!error && <Text style={appStyles.error}>{error}</Text>}
        <Pressable accessibilityRole="button" disabled={busy || (!enabled && !code.trim())} style={[appStyles.button, (busy || (!enabled && !code.trim())) && { opacity: 0.45 }]} onPress={() => void submit()}><Text style={appStyles.buttonText}>{t(enabled ? 'presentationMode.deactivate' : 'presentationMode.activate')}</Text></Pressable>
        <Pressable accessibilityRole="button" disabled={busy} style={styles.cancel} onPress={close}><Text style={appStyles.textAction}>{t('common.cancel')}</Text></Pressable>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
const styles = StyleSheet.create({ overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 }, card: { padding: 24, gap: 16, backgroundColor: theme.background, borderRadius: 24 }, input: { minHeight: 52, padding: 12, borderWidth: 1, borderColor: theme.line, borderRadius: 14, fontFamily: 'CronosPro', fontSize: 18, color: theme.ink }, cancel: { minHeight: 44, alignItems: 'center', justifyContent: 'center' } });
