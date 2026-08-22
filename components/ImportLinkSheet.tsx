import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { font } from '../constants/Layout';
import { contentColumn } from '../hooks/useResponsive';
import analytics from '../services/analytics';
import { extractVideoUrl, readVideoUrlFromClipboard } from '../services/videoLink';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Point d'entrée, repris tel quel dans `import_completed.source`. */
  source: string;
  /** Poursuit le tunnel d'onboarding après l'import au lieu de revenir aux onglets. */
  isOnboarding?: boolean;
  /** Route vers laquelle continuer une fois l'aha moment passé (onboarding seulement). */
  onboardingNext?: string;
};

export function ImportLinkSheet({ visible, onClose, source, isOnboarding, onboardingNext }: Props) {
  const { t } = useTranslation();
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPrefilling, setIsPrefilling] = useState(false);
  const [prefilledFromClipboard, setPrefilledFromClipboard] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // À l'ouverture on lit le presse-papier : c'est le moment où l'utilisateur a
  // exprimé son intention, donc la bannière iOS « collé depuis TikTok » est
  // attendue plutôt que subie.
  useEffect(() => {
    if (!visible) return;

    let cancelled = false;
    setUrl('');
    setError(null);
    setPrefilledFromClipboard(false);
    setIsPrefilling(true);

    (async () => {
      const clipboardUrl = await readVideoUrlFromClipboard();
      if (cancelled) return;
      if (clipboardUrl) {
        setUrl(clipboardUrl);
        setPrefilledFromClipboard(true);
        analytics.track('import_link_prefilled_from_clipboard', { source });
      }
      setIsPrefilling(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, source]);

  const handlePasteFromClipboard = async () => {
    const clipboardUrl = await readVideoUrlFromClipboard();
    if (clipboardUrl) {
      setUrl(clipboardUrl);
      setPrefilledFromClipboard(true);
      setError(null);
    } else {
      setError(t('importLink.clipboardEmpty'));
    }
  };

  const handleSubmit = () => {
    const validUrl = extractVideoUrl(url);
    if (!validUrl) {
      setError(t('importLink.invalid'));
      analytics.track('import_link_rejected', { source });
      return;
    }

    analytics.track('import_link_submitted', {
      source,
      from_clipboard: prefilledFromClipboard,
    });

    onClose();
    router.push({
      pathname: '/share-intent',
      params: {
        url: validUrl,
        source,
        ...(isOnboarding ? { isOnboarding: 'true' } : {}),
        ...(onboardingNext ? { onboardingNext } : {}),
      },
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.centering}
        >
          {/* Absorbe les taps sur la carte pour qu'ils ne ferment pas la modale. */}
          <Pressable style={styles.card} onPress={() => {}}>
            <View style={styles.header}>
              <View style={styles.iconWrapper}>
                <Ionicons name="link" size={22} color={Colors.light.button} />
              </View>
              <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityRole="button">
                <Ionicons name="close" size={24} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <Text style={styles.title}>{t('importLink.title')}</Text>
            <Text style={styles.subtitle}>{t('importLink.subtitle')}</Text>

            <View style={[styles.inputRow, error && styles.inputRowError]}>
              <TextInput
                ref={inputRef}
                style={styles.input}
                value={url}
                onChangeText={(value) => {
                  setUrl(value);
                  if (error) setError(null);
                }}
                placeholder={t('importLink.placeholder')}
                placeholderTextColor="#B0B0B5"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                returnKeyType="go"
                onSubmitEditing={handleSubmit}
                editable={!isPrefilling}
              />
              {isPrefilling ? (
                <ActivityIndicator size="small" color={Colors.light.button} />
              ) : (
                <TouchableOpacity onPress={handlePasteFromClipboard} hitSlop={8}>
                  <Text style={styles.pasteText}>{t('importLink.paste')}</Text>
                </TouchableOpacity>
              )}
            </View>

            {error ? (
              <Text style={styles.error}>{error}</Text>
            ) : prefilledFromClipboard ? (
              <Text style={styles.hint}>{t('importLink.clipboardFound')}</Text>
            ) : (
              <Text style={styles.hint}>{t('importLink.platforms')}</Text>
            )}

            <TouchableOpacity
              style={[styles.submitButton, !url.trim() && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!url.trim()}
              activeOpacity={0.85}
            >
              <Text style={styles.submitText}>{t('importLink.submit')}</Text>
            </TouchableOpacity>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  centering: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    ...contentColumn(),
    backgroundColor: 'white',
    borderRadius: 28,
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FDF0E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: font(24),
    fontFamily: 'Degular',
    color: Colors.light.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: font(16),
    fontFamily: 'CronosPro',
    color: Colors.light.textSecondary,
    lineHeight: font(22),
    marginBottom: 18,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#E9E9E9',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 54,
    backgroundColor: '#FAFAFA',
  },
  inputRowError: {
    borderColor: '#E5484D',
  },
  input: {
    flex: 1,
    fontSize: font(15),
    fontFamily: 'CronosPro',
    color: Colors.light.text,
  },
  pasteText: {
    fontSize: font(15),
    fontFamily: 'CronosProBold',
    color: Colors.light.button,
  },
  hint: {
    fontSize: font(13),
    fontFamily: 'CronosPro',
    color: '#8E8E93',
    marginTop: 8,
    marginBottom: 18,
  },
  error: {
    fontSize: font(13),
    fontFamily: 'CronosPro',
    color: '#E5484D',
    marginTop: 8,
    marginBottom: 18,
  },
  submitButton: {
    backgroundColor: Colors.light.button,
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitText: {
    color: 'white',
    fontSize: font(17),
    fontFamily: 'Degular',
  },
});

export default ImportLinkSheet;
