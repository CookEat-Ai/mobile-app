import React from 'react';
import { Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { IconSymbol } from './ui/IconSymbol';

interface RecipeCardProps {
  title: string;
  image: any;
  isLiked?: boolean;
  onPress?: () => void;
  onLikePress?: () => void;
  cookingTime?: number; // en minutes
  difficulty?: 'easy' | 'medium' | 'hard';
  rating?: number; // note sur 5
}

export default function RecipeCard({
  title,
  image,
  isLiked = false,
  onPress,
  onLikePress,
  cookingTime,
  difficulty,
  rating
}: RecipeCardProps) {
  const colors = Colors.light;

  const formatCookingTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h${remainingMinutes}min`;
  };

  return (
    <TouchableOpacity style={[styles.container, { backgroundColor: colors.card }]} onPress={onPress}>
      <View style={styles.imageContainer}>
        <Image src={image} style={styles.image} />

        {/* Note en haut à droite */}
        {rating && (
          <View style={styles.ratingContainer}>
            <View style={styles.starsContainer}>
              <IconSymbol
                name={Platform.OS === 'ios' ? "star.fill" : "star"}
                size={16}
                color="#FFD700"
              />
            </View>
            <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
          </View>
        )}
      </View>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.titleText} numberOfLines={2}>
            {title}
          </Text>
          {cookingTime && (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <IconSymbol
                name="clock"
                size={18}
                color={colors.textSecondary}
              />
              <Text style={[styles.cookingTime, { color: colors.textSecondary }]}>
                {formatCookingTime(cookingTime)}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 280,
    borderRadius: 16,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 180,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  ratingContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 4,
  },
  ratingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleText: {
    fontFamily: 'Degular',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
    flex: 1,
    marginRight: 8,
  },
  cookingTime: {
    fontFamily: 'Cronos Pro',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
    marginLeft: 4,
  },
}); 