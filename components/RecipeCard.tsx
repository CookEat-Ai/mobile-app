import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Colors } from '../constants/Colors';
import { font, MAX_FONT_SIZE_MULTIPLIER, space } from '../constants/Layout';
import { useResponsive } from '../hooks/useResponsive';
import { getRecipeImageSource } from '../constants/RecipeImages';
import { IconSymbol } from './ui/IconSymbol';

interface RecipeCardProps {
  item: {
    id: string;
    title: string;
    image?: string;
    cooking_time: string;
    ingredientsCount?: number;
    stepsCount?: number;
    createdAt?: string | Date;
    ingredients?: any[];
    steps?: any[];
  };
  onPress: () => void;
  onLongPress?: () => void;
}

export const RecipeCard = ({ item, onPress, onLongPress }: RecipeCardProps) => {
  const [imageError, setImageError] = useState(false);
  const { t, i18n } = useTranslation();
  const { isTablet } = useResponsive();

  useEffect(() => {
    setImageError(false);
  }, [item?.image]);

  const ingredientsCount = item.ingredientsCount || item.ingredients?.length || 0;
  const stepsCount = item.stepsCount || item.steps?.length || 0;
  const imageSource = getRecipeImageSource(imageError ? null : item.image);
  const thumbSize = isTablet ? 110 : space(90);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      onLongPress={onLongPress ? () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        onLongPress();
      } : undefined}
      delayLongPress={500}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        <Image
          source={imageSource}
          style={[styles.image, { width: thumbSize, height: thumbSize }]}
          contentFit="cover"
          onError={() => {
            if (item.image) setImageError(true);
          }}
        />
        <View style={[styles.info, { minHeight: thumbSize + space(30) }]}>
          <View style={styles.headerRow}>
            <Text style={styles.timeLeft} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              {item.cooking_time}
            </Text>
            {item.createdAt && (
              <Text style={styles.timeRight} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {new Date(item.createdAt).toLocaleDateString(i18n.language, { day: '2-digit', month: 'short' }).replace('.', '')}
              </Text>
            )}
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <IconSymbol name="list.bullet" size={14} color="#8E8E93" />
              <Text style={styles.statText} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {ingredientsCount} {t('common.ingredientsShort')}
              </Text>
            </View>
            {stepsCount > 0 && (
              <>
                <View style={styles.miniDot} />
                <View style={styles.statItem}>
                  <IconSymbol name="checklist" size={14} color="#8E8E93" />
                  <Text style={styles.statText} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    {stepsCount} {t(stepsCount > 1 ? 'common.stepsShort' : 'common.stepShort')}
                  </Text>
                </View>
              </>
            )}
          </View>

          <Text style={styles.recipeTitle} numberOfLines={2} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            {item.title}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F8F8FD',
    borderRadius: 24,
    marginBottom: 16,
    // On ne met pas overflow: 'hidden' ici car ça coupe l'ombre sur Android
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    overflow: 'hidden',
  },
  image: {
    borderRadius: 18,
    marginLeft: 12,
  },
  info: {
    flex: 1,
    minWidth: 0,
    padding: 16,
    paddingLeft: 12,
    // `height: 120` en dur rognait le titre dès que la police système grossissait
    // ou que la traduction passait sur deux lignes.
    justifyContent: 'space-between',
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  timeLeft: {
    fontSize: font(18),
    fontFamily: 'CronosProBold',
    color: '#CF817D',
    flexShrink: 1,
  },
  timeRight: {
    fontSize: font(13),
    fontFamily: 'CronosProBold',
    color: '#AEAEB2',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#D1D1D6',
  },
  statText: {
    fontSize: font(15),
    fontFamily: 'CronosProBold',
    color: '#8E8E93'
  },
  recipeTitle: {
    fontSize: font(18),
    color: Colors.light.text,
    fontFamily: 'Degular'
  },
});
