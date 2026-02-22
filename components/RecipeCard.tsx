import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import FastImage from 'react-native-fast-image';
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
}

export const RecipeCard = ({ item, onPress }: RecipeCardProps) => {
  const ingredientsCount = item.ingredientsCount || item.ingredients?.length || 0;
  const stepsCount = item.stepsCount || item.steps?.length || 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        <FastImage
          source={{ 
            uri: item.image || 'https://via.placeholder.com/150',
            priority: FastImage.priority.normal,
          }}
          style={styles.image}
          resizeMode={FastImage.resizeMode.cover}
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
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontFamily: 'Cronos Pro',
    color: '#CF817D',
    fontWeight: 'bold',
  },
  timeRight: {
    fontSize: 13,
    fontFamily: 'Cronos Pro',
    color: '#AEAEB2',
    fontWeight: '500',
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
    fontFamily: 'Cronos Pro',
    color: '#8E8E93',
    fontWeight: '500',
  },
  recipeTitle: {
    fontSize: 18,
    fontFamily: 'Degular',
    fontWeight: 'bold',
    color: Colors.light.text,
  },
});
