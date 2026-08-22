import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { font, rw } from '../../constants/Layout';
import {
  getProofContent,
  OnboardingProfile,
  ProofKey,
} from '../../services/onboardingProfile';
import { HighlightedText } from './HighlightedText';

/**
 * Écran de preuve intercalé entre deux questions.
 *
 * Il n'existe qu'une raison de couper un questionnaire en deux : redonner une
 * raison de continuer. Le contenu est donc choisi d'après la réponse qui vient
 * d'être donnée (cf. `getProofContent`) plutôt que fixe, sinon autant l'afficher
 * une seule fois à la fin — ce que faisait la version précédente.
 */
export function ContextualProof({
  proofKey,
  profile,
}: {
  proofKey: ProofKey;
  profile: OnboardingProfile | null;
}) {
  const { t } = useTranslation();
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    enter.setValue(0);
    Animated.timing(enter, {
      toValue: 1,
      duration: 600,
      delay: 150,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enter, proofKey, profile]);

  // Tant que le profil n'est pas chargé, on n'affiche rien plutôt qu'un contenu
  // par défaut : un flash de « mauvaise » stat est pire qu'un écran vide de 100ms.
  if (!profile) return <View style={styles.container} />;

  const content = getProofContent(proofKey, profile);
  const review = content.reviewKey ? t(content.reviewKey, { defaultValue: '' }) : '';
  const reviewAuthor = content.reviewKey
    ? t(`${content.reviewKey}Author`, { defaultValue: '' })
    : '';

  return (
    <View style={styles.container}>
      <Animated.View
        style={{
          opacity: enter,
          transform: [
            {
              translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }),
            },
          ],
          alignItems: 'center',
          width: '100%',
        }}
      >
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{t(content.badgeKey)}</Text>
        </View>

        <HighlightedText style={styles.title} text={t(content.titleKey, content.values)} />

        <Text style={styles.subtitle}>{t(content.subtitleKey, content.values)}</Text>

        {review ? (
          <View style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <Text style={styles.reviewAuthor}>{reviewAuthor}</Text>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons key={star} name="star" size={13} color="#FEB50A" />
                ))}
              </View>
            </View>
            <Text style={styles.reviewText}>{review}</Text>
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Pas de `flex: 1` : le conteneur d'interstitiel parent centre déjà son
  // contenu sur une `minHeight`, un enfant flexible s'y effondrerait.
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  badge: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FEB50A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    marginBottom: 24,
  },
  badgeText: {
    color: '#FEB50A',
    fontSize: 14,
    fontFamily: 'Degular',
  },
  title: {
    textAlign: 'center',
    fontSize: rw(0.075),
    lineHeight: rw(0.095),
    fontFamily: 'Degular',
    color: Colors.light.text,
  },
  subtitle: {
    fontSize: font(16),
    fontFamily: 'CronosPro',
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 12,
  },
  reviewCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginTop: 28,
    width: '100%',
    marginHorizontal: Platform.OS === 'android' ? 2 : 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewAuthor: {
    fontSize: 15,
    fontFamily: 'Degular',
    color: Colors.light.text,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewText: {
    fontFamily: 'CronosPro',
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
});
