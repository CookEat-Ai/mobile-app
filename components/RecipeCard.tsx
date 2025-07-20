import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { IconSymbol } from './ui/IconSymbol';

interface RecipeCardProps {
  title: string;
  image: any;
  isLiked?: boolean;
  onPress?: () => void;
  onLikePress?: () => void;
}

export default function RecipeCard({ title, image, isLiked = false, onPress, onLikePress }: RecipeCardProps) {
  const colors = Colors.light;

  return (
    <TouchableOpacity style={[styles.container, { backgroundColor: colors.card }]} onPress={onPress}>
      <View style={styles.imageContainer}>
        <Image src={image} style={styles.image} />
        <TouchableOpacity style={styles.likeButton} onPress={onLikePress}>
          <IconSymbol
            name={isLiked ? "heart" : "heart-outline"}
            size={20}
            color={isLiked ? "#FF6B6B" : "#FFFFFF"}
          />
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {title}
        </Text>
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
  likeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
  },
}); 