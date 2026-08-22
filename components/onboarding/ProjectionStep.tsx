import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { Colors } from '../../constants/Colors';
import { font, rw } from '../../constants/Layout';
import { useResponsive } from '../../hooks/useResponsive';
import {
  getProjection,
  OnboardingProfile,
  PROJECTION_HORIZON_DAYS,
} from '../../services/onboardingProfile';
import { formatNumber, formatTargetDate, UNIT_KEY } from './projectionFormat';

const CHART_HEIGHT = 150;
/**
 * Marge intérieure du tracé. Sans elle, le point final (rayon 6 + halo 11) est
 * coupé par le bord droit du SVG et le sommet de la courbe perd la moitié de son
 * épaisseur de trait.
 */
const CHART_INSET = { right: 14, top: 6 };

/**
 * Construit le tracé de la courbe et l'aire sous la courbe à partir de la série
 * de la projection. Courbe lissée par des Bézier cubiques horizontales : une
 * polyline donne un rendu « graphique Excel » qui casse le côté premium.
 */
function buildPaths(series: number[], width: number, height: number) {
  const max = Math.max(...series, 1);
  const usableWidth = Math.max(width - CHART_INSET.right, 1);
  const usableHeight = Math.max(height - CHART_INSET.top, 1);
  const points = series.map((value, i) => ({
    x: (i / (series.length - 1)) * usableWidth,
    y: CHART_INSET.top + usableHeight - (value / max) * usableHeight,
  }));

  let line = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cx = (prev.x + curr.x) / 2;
    line += ` C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
  }

  const last = points[points.length - 1];
  const area = `${line} L ${last.x} ${height} L 0 ${height} Z`;
  return { line, area, last };
}

/**
 * Projection à 30 jours, personnalisée par l'objectif déclaré.
 *
 * L'écran ne promet pas un résultat : il affiche l'objectif que l'utilisateur
 * vient de se fixer, avec la valeur calculée à partir de *ses* réponses. C'est
 * ce qui rend la fin de tunnel spécifique à lui — et c'est la dernière chose
 * qu'il voit avant la preuve sociale et le paywall.
 */
export function ProjectionStep({ profile }: { profile: OnboardingProfile | null }) {
  const { t, i18n } = useTranslation();
  const { layoutWidth } = useResponsive();
  const progress = useRef(new Animated.Value(0)).current;

  const chartWidth = Math.max(layoutWidth - 96, 180);

  const projection = useMemo(
    () => (profile ? getProjection(profile) : null),
    [profile]
  );

  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 1100,
      delay: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progress, projection]);

  if (!projection) return <View style={styles.container} />;

  const { line, area, last } = buildPaths(projection.series, chartWidth, CHART_HEIGHT);
  const targetDate = formatTargetDate(projection.targetDate, i18n.language);

  const mainValue = t(UNIT_KEY[projection.unit], {
    value: formatNumber(projection.value, i18n.language),
  });
  const secondaryValue = projection.secondary
    ? t(UNIT_KEY[projection.secondary.unit], {
        value: formatNumber(projection.secondary.value, i18n.language),
      })
    : null;

  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Ionicons name="trending-up" size={16} color="#E67E22" />
        <Text style={styles.badgeText}>
          {t('onboarding.projection.badge', { days: PROJECTION_HORIZON_DAYS })}
        </Text>
      </View>

      <Text style={styles.title}>
        {t(`onboarding.projection.goals.${projection.goal}.title`)}
      </Text>

      <View style={styles.card}>
        <Text style={styles.value}>{mainValue}</Text>
        <Text style={styles.valueCaption}>
          {t(`onboarding.projection.goals.${projection.goal}.caption`, { date: targetDate })}
        </Text>

        {/* L'animation porte sur une View native et non sur les `Path` : le
            driver natif de Reanimated/RN ne pilote pas fiablement les props SVG
            selon les versions, et un fondu de conteneur donne le même effet. */}
        <Animated.View
          style={{
            height: CHART_HEIGHT,
            width: chartWidth,
            marginTop: 20,
            opacity: progress,
            transform: [
              { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
            ],
          }}
        >
          <Svg width={chartWidth} height={CHART_HEIGHT}>
            <Defs>
              <LinearGradient id="projectionFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#FEB50A" stopOpacity="0.35" />
                <Stop offset="1" stopColor="#FEB50A" stopOpacity="0" />
              </LinearGradient>
            </Defs>
            <Path d={area} fill="url(#projectionFill)" />
            <Path d={line} stroke="#FEB50A" strokeWidth={3} strokeLinecap="round" fill="none" />
            <Circle cx={last.x} cy={last.y} r={11} fill="#FEB50A" opacity={0.2} />
            <Circle cx={last.x} cy={last.y} r={6} fill="#FEB50A" />
          </Svg>
        </Animated.View>

        <View style={styles.axis}>
          <Text style={styles.axisLabel}>{t('onboarding.projection.today')}</Text>
          <Text style={styles.axisLabelStrong}>{targetDate}</Text>
        </View>
      </View>

      {secondaryValue ? (
        <View style={styles.secondaryRow}>
          <Ionicons name="leaf-outline" size={16} color={Colors.light.textSecondary} />
          <Text style={styles.secondaryText}>
            {t(`onboarding.projection.goals.${projection.goal}.secondary`, {
              value: secondaryValue,
            })}
          </Text>
        </View>
      ) : null}

      <Text style={styles.disclaimer}>{t('onboarding.projection.disclaimer')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(230, 126, 34, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    marginBottom: 16,
  },
  badgeText: {
    color: '#E67E22',
    fontSize: 15,
    fontFamily: 'Degular',
  },
  title: {
    textAlign: 'center',
    fontSize: rw(0.07),
    lineHeight: rw(0.088),
    fontFamily: 'Degular',
    color: Colors.light.text,
    marginBottom: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  value: {
    fontSize: rw(0.14),
    lineHeight: rw(0.15),
    fontFamily: 'Degular',
    color: Colors.light.button,
  },
  valueCaption: {
    fontSize: font(15),
    fontFamily: 'CronosPro',
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  axis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 8,
  },
  axisLabel: {
    fontSize: 13,
    fontFamily: 'CronosPro',
    color: Colors.light.textSecondary,
  },
  axisLabelStrong: {
    fontSize: 13,
    fontFamily: 'Degular',
    color: Colors.light.text,
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  secondaryText: {
    fontSize: font(15),
    fontFamily: 'CronosPro',
    color: Colors.light.textSecondary,
  },
  disclaimer: {
    fontSize: 12,
    fontFamily: 'CronosPro',
    color: '#A0A0A0',
    textAlign: 'center',
    marginTop: 14,
    paddingHorizontal: 16,
  },
});
