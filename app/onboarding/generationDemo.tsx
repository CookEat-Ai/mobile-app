import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/Colors';
import { font } from '../../constants/Layout';
import { contentColumn } from '../../hooks/useResponsive';
import analytics from '../../services/analytics';
import {
  buildGenerationDemoIngredients,
  buildGenerationDemoParams,
} from '../../services/onboardingDemo';

const NEXT_ROUTE = '/onboarding/promoCode?generationDemoCompleted=true';

export default function GenerationDemoScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const fade = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;

  const previewIngredients = useMemo(
    () => [
      { emoji: '🍗', label: t('home.categories.meats.chicken') },
      { emoji: '🍅', label: t('home.categories.vegetables.tomato') },
      { emoji: '🫑', label: t('home.categories.vegetables.onion') },
      { emoji: '🍚', label: t('home.categories.essentials.rice') },
    ],
    [t],
  );
  const prefilledIngredientCount = useMemo(
    () => buildGenerationDemoIngredients(t).length,
    [t],
  );

  useEffect(() => {
    analytics.track('onboarding_cross_feature_demo_viewed', {
      primary_feature: 'import',
      demo_feature: 'generate',
      demo_role: 'secondary',
    });

    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, translateY]);

  const startDemo = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    analytics.track('onboarding_cross_feature_demo_started', {
      primary_feature: 'import',
      demo_feature: 'generate',
      demo_role: 'secondary',
    });
    router.replace({
      pathname: '/ingredient-list',
      params: buildGenerationDemoParams(t, 'secondary', NEXT_ROUTE),
    });
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 18, paddingBottom: Math.max(insets.bottom, 18) },
      ]}
    >
      <Animated.View style={[styles.content, { opacity: fade, transform: [{ translateY }] }]}>
        <View style={styles.header}>
          <View style={styles.badge}>
            <Ionicons name="sparkles" size={15} color={Colors.light.button} />
            <Text style={styles.badgeText}>{t('onboarding.generationDemo.badge')}</Text>
          </View>
          <Text style={styles.title}>{t('onboarding.generationDemo.title')}</Text>
          <Text style={styles.subtitle}>{t('onboarding.generationDemo.subtitle')}</Text>
        </View>

        <View style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <View>
              <Text style={styles.previewEyebrow}>{t('onboarding.generationDemo.listReady')}</Text>
              <Text style={styles.previewTitle}>{t('recipeSummary.ingredients')}</Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{prefilledIngredientCount}</Text>
            </View>
          </View>

          <View style={styles.ingredientsGrid}>
            {previewIngredients.map((ingredient) => (
              <View key={ingredient.label} style={styles.ingredientChip}>
                <Text style={styles.ingredientEmoji}>{ingredient.emoji}</Text>
                <Text style={styles.ingredientLabel} numberOfLines={1}>{ingredient.label}</Text>
                <Ionicons name="checkmark-circle" size={17} color={Colors.light.button} />
              </View>
            ))}
          </View>

          <View style={styles.resultRow}>
            <View style={styles.resultIcon}>
              <Ionicons name="restaurant" size={21} color="white" />
            </View>
            <View style={styles.resultCopy}>
              <Text style={styles.resultTitle}>{t('onboarding.generationDemo.resultTitle')}</Text>
              <Text style={styles.resultSubtitle}>{t('onboarding.generationDemo.resultSubtitle')}</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color={Colors.light.textSecondary} />
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryButton} activeOpacity={0.85} onPress={startDemo}>
            <Text style={styles.primaryButtonText}>{t('onboarding.generationDemo.tryButton')}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF9E2', paddingHorizontal: 22 },
  content: { flex: 1, ...contentColumn(), justifyContent: 'space-between' },
  header: { alignItems: 'center' },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF2D1',
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 100, marginBottom: 16,
  },
  badgeText: { fontFamily: 'CronosProBold', fontSize: font(13), color: Colors.light.button },
  title: {
    fontFamily: 'Degular', fontSize: font(34), lineHeight: font(39), color: Colors.light.text,
    textAlign: 'center', paddingHorizontal: 8,
  },
  subtitle: {
    fontFamily: 'CronosPro', fontSize: font(16), lineHeight: font(22),
    color: Colors.light.textSecondary, textAlign: 'center', marginTop: 10, paddingHorizontal: 10,
  },
  previewCard: {
    backgroundColor: 'white', borderRadius: 28, padding: 18, borderWidth: 1,
    borderColor: '#F0EAD1', shadowColor: '#5A3B00', shadowOpacity: 0.08,
    shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 3,
  },
  previewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  previewEyebrow: { fontFamily: 'CronosProBold', fontSize: font(12), color: Colors.light.button, textTransform: 'uppercase', letterSpacing: 0.6 },
  previewTitle: { fontFamily: 'Degular', fontSize: font(24), color: Colors.light.text, marginTop: 2 },
  countBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF4D8', alignItems: 'center', justifyContent: 'center' },
  countText: { fontFamily: 'Degular', fontSize: font(18), color: Colors.light.button },
  ingredientsGrid: { gap: 8 },
  ingredientChip: {
    minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFFDF5', borderRadius: 15, paddingHorizontal: 12,
  },
  ingredientEmoji: { fontSize: font(20) },
  ingredientLabel: { flex: 1, fontFamily: 'CronosProBold', fontSize: font(15), color: Colors.light.text },
  resultRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16,
    paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E8E2CB',
  },
  resultIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: Colors.light.button, alignItems: 'center', justifyContent: 'center' },
  resultCopy: { flex: 1 },
  resultTitle: { fontFamily: 'Degular', fontSize: font(18), color: Colors.light.text },
  resultSubtitle: { fontFamily: 'CronosPro', fontSize: font(13), color: Colors.light.textSecondary, marginTop: 1 },
  actions: { gap: 6 },
  primaryButton: {
    backgroundColor: Colors.light.button, borderRadius: 100, paddingVertical: 17,
    alignItems: 'center', shadowColor: Colors.light.button, shadowOpacity: 0.25,
    shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  primaryButtonText: { color: 'white', fontFamily: 'Degular', fontSize: font(19) },
});
