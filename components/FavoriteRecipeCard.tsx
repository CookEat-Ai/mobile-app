import React from 'react';
import { Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { IconSymbol } from './ui/IconSymbol';

interface FavoriteRecipeCardProps {
  title: string;
  image?: any;
  icon?: string;
  cookingTime: number; // en minutes
  rating: number; // note sur 5
  onPress?: () => void;
  onRemove?: () => void;
}

export default function FavoriteRecipeCard({
  title,
  image,
  icon,
  cookingTime,
  rating,
  onPress,
  onRemove
}: FavoriteRecipeCardProps) {
  const colors = Colors.light;

  const formatCookingTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} mins`;
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
        {
          icon
            ? <Text style={{ fontSize: 34 }}>{icon}</Text>
            : image
              ? <Image src={image} style={styles.image} />
              : <Text style={{ fontSize: 34 }}>🍲</Text>
        }
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {title}
        </Text>
        <View style={styles.detailsRow}>
          <View style={styles.timeContainer}>
            <IconSymbol name={Platform.OS === 'ios' ? "timer" : "time"} size={18} color={colors.button} />
            <Text style={[styles.cookingTime, { color: colors.textSecondary }]}>
              {formatCookingTime(cookingTime)}
            </Text>
          </View>
          <View style={styles.ratingContainer}>
            {/* <IconSymbol name={Platform.OS === 'ios' ? "star.fill" : "star"} size={18} color={"#FFD700"} />
            <Text style={[styles.ratingText, { color: colors.text }]}>
              {rating.toFixed(1)}
            </Text> */}
          </View>
        </View>
      </View>
      <View style={styles.arrowContainer}>
        {onRemove && (
          <TouchableOpacity
            style={styles.removeButton}
            onPress={onRemove}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <IconSymbol name="trash" size={24} color="grey" />
          </TouchableOpacity>
        )}
        {/* <IconSymbol name={Platform.OS === 'ios' ? "chevron.right" : "chevron-forward"} size={20} color={"grey"} /> */}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    padding: 12,
    paddingVertical: 16,
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
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Degular',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 20,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  cookingTime: {
    fontFamily: 'Cronos Pro',
    fontSize: 16,
    marginLeft: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontFamily: 'Cronos Pro',
    fontSize: 16,
    marginLeft: 4,
  },
  arrowContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 24,
  },
  removeButton: {
    padding: 8,
    marginRight: 8,
  },
}); 