import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '../constants/Colors';
import { font } from '../constants/Layout';

type Props = {
  testimonialKey: string;
  style?: StyleProp<ViewStyle>;
};

/** Avis autorisé déjà utilisé dans l'onboarding, choisi selon le profil. */
export function PaywallTestimonial({ testimonialKey, style }: Props) {
  const { t } = useTranslation();

  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <Text style={styles.author}>{t(`${testimonialKey}Author`)}</Text>
        <View style={styles.stars} accessible accessibilityLabel="5/5">
          {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons key={star} name="star" size={14} color="#FEB50A" />
          ))}
        </View>
      </View>
      <Text style={styles.quote}>“{t(testimonialKey)}”</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    minHeight: 92,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#EDE7CE',
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  author: {
    flexShrink: 1,
    color: Colors.light.text,
    fontFamily: 'Degular',
    fontSize: font(16),
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  quote: {
    color: Colors.light.textSecondary,
    fontFamily: 'CronosPro',
    fontSize: font(14),
    lineHeight: font(18),
  },
});

export default PaywallTestimonial;
