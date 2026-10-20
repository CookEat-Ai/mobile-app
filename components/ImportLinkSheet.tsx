import { AppModal as Modal } from './ui/AppModal';
import { AppIconBadge } from './ui/AppIconBadge';
import { AppRadii, AppTheme as theme } from '../constants/AppTheme';
import { NavigationIconButton } from './NavigationIconButton';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

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
  /** L'import enrichit le planning déjà affiché au lieu de remplacer sa recette graine. */
  isPlanImport?: boolean;
};

export function ImportLinkSheet({ visible, onClose, source, isOnboarding, onboardingNext, isPlanImport }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPrefilling, setIsPrefilling] = useState(false);
  const [prefilledFromClipboard, setPrefilledFromClipboard] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const afterDismiss = useRef<(() => void) | null>(null);

  // À l'ouverture on lit le presse-papier : c'est le moment où l'utilisateur a
  // exprimé son intention, donc la bannière iOS « collé depuis TikTok » est
  // attendue plutôt que subie.
  useEffect(() => {
    if (!visible) return;

    let cancelled = false;
    afterDismiss.current = null;
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
    if (afterDismiss.current) return;
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

    afterDismiss.current = () => router.push({
      pathname: '/share-intent',
      params: {
        url: validUrl,
        source,
        ...(isOnboarding ? { isOnboarding: 'true' } : {}),
        ...(onboardingNext ? { onboardingNext } : {}),
        ...(isPlanImport ? { isPlanImport: 'true' } : {}),
      },
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      onRequestClose={onClose}
      onDismiss={() => {
        const next = afterDismiss.current;
        afterDismiss.current = null;
        next?.();
      }}
      statusBarTranslucent
    >
      <Pressable accessible={false} style={styles.overlay} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.centering, { paddingTop: insets.top + 16 }]}
        >
          {/* Absorbe les taps sur la carte pour qu'ils ne ferment pas la modale. */}
          <Pressable accessible={false} style={styles.card} onPress={() => {}}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={{ flexShrink: 1 }} contentContainerStyle={[styles.cardContent, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
            <View style={styles.header}>
              <AppIconBadge name="link-outline" />
              <NavigationIconButton kind="close" onPress={onClose} hitSlop={12} accessibilityRole="button" />
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
                <ActivityIndicator size="small" color={theme.yellow} />
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
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.overlay,
  },
  centering: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  card: {
    ...contentColumn(),
    backgroundColor: theme.background,
    borderTopLeftRadius: AppRadii.sheet,
    borderTopRightRadius: AppRadii.sheet,
    flexShrink: 1,
    overflow: 'hidden',
  },
  cardContent: {
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
    borderRadius: AppRadii.card,
    backgroundColor: theme.yellow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: font(24),
    fontFamily: 'Degular',
    color: theme.ink,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: font(16),
    fontFamily: 'CronosPro',
    color: theme.muted,
    lineHeight: font(22),
    marginBottom: 18,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: AppRadii.control,
    paddingHorizontal: 14,
    height: 54,
    backgroundColor: theme.surface,
  },
  inputRowError: {
    borderColor: '#E5484D',
  },
  input: {
    flex: 1,
    fontSize: font(15),
    fontFamily: 'CronosPro',
    color: theme.ink,
  },
  pasteText: {
    fontSize: font(15),
    fontFamily: 'CronosProBold',
    color: theme.ink,
  },
  hint: {
    fontSize: font(13),
    fontFamily: 'CronosPro',
    color: theme.muted,
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
    backgroundColor: theme.yellow,
    borderRadius: AppRadii.pill,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitText: {
    color: theme.onPrimary,
    fontSize: font(17),
    fontFamily: 'Degular',
  },
});

export default ImportLinkSheet;
