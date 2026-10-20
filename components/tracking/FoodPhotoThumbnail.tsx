import { AppRadii, AppTheme as theme } from '../../constants/AppTheme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import type { PhotoFood } from '../../services/mealTracking';
export function FoodPhotoThumbnail({ photo, item, size = 46 }: {
    photo?: {
        uri: string;
        width: number;
        height: number;
    };
    item: PhotoFood;
    size?: number;
}) {
    const b = item.box;
    if (!b || !photo)
        return <View style={[styles.container, { width: size, height: size, alignItems: 'center', justifyContent: 'center' }]}><Text style={{ fontSize: size * .58 }}>{item.icon || '🍽️'}</Text></View>;
    const width = b.width * photo.width, height = b.height * photo.height, scale = size / Math.max(width, height);
    return <View style={[styles.container, { width: size, height: size }]}><Image source={{ uri: photo.uri }} contentFit="fill" accessible={false} style={{ position: 'absolute', width: photo.width * scale, height: photo.height * scale, left: -b.x * photo.width * scale + (size - width * scale) / 2, top: -b.y * photo.height * scale + (size - height * scale) / 2 }}/></View>;
}
const styles = StyleSheet.create({ container: { borderRadius: AppRadii.control, overflow: 'hidden', backgroundColor: theme.yellowSoft } });
