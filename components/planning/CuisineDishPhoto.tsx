import React from 'react';
import { StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { CUISINE_PHOTOS } from '../../constants/CuisinePhotos';
import { GENERIC_RECIPE_IMAGE } from '../../constants/RecipeImages';

export function CuisineDishPhoto({ cuisineId }: { cuisineId: string }) {
  const source = CUISINE_PHOTOS[cuisineId]?.image || GENERIC_RECIPE_IMAGE;
  return <Image source={source} placeholder={GENERIC_RECIPE_IMAGE} placeholderContentFit="cover"
    style={styles.photo} contentFit="cover" cachePolicy="memory-disk" transition={150}
    accessible={false} recyclingKey={cuisineId} />;
}

const styles = StyleSheet.create({
  photo: { width: '100%', aspectRatio: 1.35, borderRadius: 11 },
});
