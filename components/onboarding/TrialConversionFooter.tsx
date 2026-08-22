import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { ONBOARDING_CTA_BOTTOM_GAP } from '../../constants/Layout';

type Props = {
  reassurance?: string | null;
  primaryLabel: string;
  onPrimaryPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  footnote?: string | null;
  leadingContent?: React.ReactNode;
  bottomContent?: React.ReactNode;
  primarySuffix?: string;
  showChevron?: boolean;
};

// Espace maximal à réserver au-dessus du contenu principal. Le CTA lui-même
// reste calé sur la baseline historique de l'onboarding : safe-area + 24 px.
export const TRIAL_CONVERSION_FOOTER_RESERVED_HEIGHT = 150;
export const PAYWALL_CTA_HORIZONTAL_INSET = 18;

/**
 * Chevron volontairement plus présent que le glyphe natif seul. Le second
 * calque épaissit le trait sans transformer le chevron en flèche, tandis que
 * le léger mouvement horizontal attire l'œil sans concurrencer le libellé.
 */
export function AnimatedChevron() {
  const translateX = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;

    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    translateX.stopAnimation();
    translateX.setValue(0);

    if (reduceMotion) return;

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, {
          toValue: 5,
          duration: 460,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: 0,
          duration: 460,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(520),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [reduceMotion, translateX]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.primaryChevron, { transform: [{ translateX }] }]}
    >
      <Ionicons name="chevron-forward-sharp" size={25} color="white" style={styles.chevronLayer} />
      <Ionicons
        name="chevron-forward-sharp"
        size={25}
        color="white"
        style={[styles.chevronLayer, styles.chevronBoldLayer]}
      />
    </Animated.View>
  );
}

/**
 * Bloc de conversion partagé par l'introduction à l'essai, le rappel et le
 * paywall. Une seule implémentation garantit le même rythme visuel et évite
 * que les CTA divergent au fil des itérations.
 */
export function TrialConversionFooter({
  reassurance,
  primaryLabel,
  onPrimaryPress,
  loading = false,
  disabled = false,
  footnote,
  leadingContent,
  bottomContent,
  primarySuffix,
  showChevron = false,
}: Props) {
  const isDisabled = disabled || loading;

  return (
    <View style={styles.container}>
      {leadingContent ? (
        <View style={styles.leadingSlot}>{leadingContent}</View>
      ) : null}

      {reassurance ? (
        <View style={styles.reassuranceRow}>
          <Ionicons name="checkmark" size={23} color={Colors.light.text} />
          <Text style={styles.reassuranceText}>{reassurance}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        accessibilityRole="button"
        activeOpacity={0.85}
        style={[styles.primaryButton, isDisabled && styles.primaryButtonDisabled]}
        onPress={onPrimaryPress}
        disabled={isDisabled}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <View
            style={[
              styles.primaryContent,
              showChevron && styles.primaryContentWithChevron,
            ]}
          >
            <Text style={styles.primaryLabel} numberOfLines={2} adjustsFontSizeToFit>
              {primaryLabel}
            </Text>
            {primarySuffix ? (
              <Text style={styles.primarySuffix}>{primarySuffix}</Text>
            ) : null}
            {showChevron ? <AnimatedChevron /> : null}
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.bottomSlot}>
        {bottomContent ?? (footnote ? <Text style={styles.footnote}>{footnote}</Text> : null)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },
  leadingSlot: {
    width: '100%',
    minHeight: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reassuranceRow: {
    height: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  reassuranceText: {
    flexShrink: 1,
    color: Colors.light.text,
    fontFamily: 'CronosProBold',
    fontSize: 17,
    lineHeight: 22,
    textAlign: 'center',
  },
  primaryButton: {
    width: '100%',
    height: 62,
    marginTop: 10,
    paddingHorizontal: PAYWALL_CTA_HORIZONTAL_INSET,
    borderRadius: 100,
    backgroundColor: Colors.light.button,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.light.button,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryContent: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryContentWithChevron: {
    paddingHorizontal: 32,
  },
  primaryLabel: {
    flexShrink: 1,
    color: 'white',
    fontFamily: 'Degular',
    fontSize: 21,
    lineHeight: 25,
    textAlign: 'center',
  },
  primarySuffix: {
    marginLeft: 6,
    fontSize: 20,
    lineHeight: 24,
  },
  primaryChevron: {
    position: 'absolute',
    right: 0,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronLayer: {
    position: 'absolute',
  },
  chevronBoldLayer: {
    transform: [{ translateX: -1 }],
  },
  footnote: {
    paddingHorizontal: 8,
    color: '#858589',
    fontFamily: 'CronosPro',
    fontSize: 11,
    lineHeight: 13,
    textAlign: 'center',
  },
  bottomSlot: {
    width: '100%',
    height: ONBOARDING_CTA_BOTTOM_GAP,
    paddingTop: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
