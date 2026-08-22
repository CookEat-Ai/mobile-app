import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { font, rw } from '../../constants/Layout';
import {
  getProjection,
  OnboardingProfile,
} from '../../services/onboardingProfile';
import { formatNumber, formatTargetDate, UNIT_KEY } from './projectionFormat';
import { HighlightedText } from './HighlightedText';

/**
 * Titre de la question d'engagement.
 *
 * Un engagement daté ne fonctionne que s'il porte sur *quelque chose* : demander
 * « es-tu motivé ? » ne coûte rien à l'utilisateur. On lui demande donc de
 * s'engager sur l'objectif qu'il a déclaré, chiffré avec ses propres réponses et
 * borné par une date réelle — la même que celle de la projection affichée juste
 * après, sinon les deux écrans se contredisent.
 */
export function CommitmentTitle({ profile }: { profile: OnboardingProfile | null }) {
  const { t, i18n } = useTranslation();

  const projection = useMemo(() => (profile ? getProjection(profile) : null), [profile]);

  if (!projection || !profile) {
    // Repli neutre le temps que le profil se charge : le tunnel ne doit jamais
    // afficher un écran vide, même 100ms.
    return (
      <View>
        <Text style={styles.title}>{t('onboarding.commitment.fallbackTitle')}</Text>
      </View>
    );
  }

  const date = formatTargetDate(projection.targetDate, i18n.language);
  const value = t(UNIT_KEY[projection.unit], {
    value: formatNumber(projection.value, i18n.language),
  });

  // La branche import parle de recettes déjà vues en vidéo, la branche generate
  // de recettes à créer : la même promesse sonnerait faux dans les deux cas.
  const branchSuffix = profile.branch === 'import' ? 'Import' : 'Generate';

  return (
    <View>
      <HighlightedText
        style={styles.title}
        text={t(`onboarding.commitment.goals.${projection.goal}.title${branchSuffix}`, {
          value,
          date,
        })}
      />
      <Text style={styles.subtitle}>{t('onboarding.commitment.subtitle')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    textAlign: 'center',
    fontSize: rw(0.075),
    lineHeight: rw(0.095),
    fontFamily: 'Degular',
    color: Colors.light.text,
  },
  subtitle: {
    fontSize: font(15),
    fontFamily: 'CronosPro',
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
});
