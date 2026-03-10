import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { Colors } from '../constants/Colors';
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

const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/150';

export const RecipeCard = ({ item, onPress, onLongPress }: RecipeCardProps) => {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [item?.image]);

  const ingredientsCount = item.ingredientsCount || item.ingredients?.length || 0;
  const stepsCount = item.stepsCount || item.steps?.length || 0;
  const imageUri = imageError || !item.image ? PLACEHOLDER_IMAGE : item.image;

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
          source={{ uri: imageUri }}
          style={styles.image}
          contentFit="cover"
          onError={() => setImageError(true)}
        />
        <View style={styles.info}>
          <View style={styles.headerRow}>
            <Text style={styles.timeLeft}>{item.cooking_time}</Text>
            {item.createdAt && (
              <Text style={styles.timeRight}>
                {new Date(item.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }).replace('.', '')}
              </Text>
            )}
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <IconSymbol name="list.bullet" size={14} color="#8E8E93" />
              <Text style={styles.statText}>{ingredientsCount} ingr.</Text>
            </View>
            {stepsCount > 0 && (
              <>
                <View style={styles.miniDot} />
                <View style={styles.statItem}>
                  <IconSymbol name="checklist" size={14} color="#8E8E93" />
                  <Text style={styles.statText}>{stepsCount} étapes</Text>
                </View>
              </>
            )}
          </View>

          <Text style={styles.recipeTitle} numberOfLines={1}>
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
    width: 90,
    height: 90,
    borderRadius: 18,
    marginLeft: 12,
  },
  info: {
    flex: 1,
    padding: 16,
    paddingLeft: 12,
    height: 120,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeLeft: {
    fontSize: 18,
    fontFamily: 'CronosProBold',
    color: '#CF817D',
  },
  timeRight: {
    fontSize: 13,
    fontFamily: 'CronosProBold',
    color: '#AEAEB2',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontSize: 15,
    fontFamily: 'CronosProBold',
    color: '#8E8E93'
  },
  recipeTitle: {
    fontSize: 18,
    color: Colors.light.text,
    fontFamily: 'Degular'
  },
});
