import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/Colors';

interface CategoryButtonProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  isMore?: boolean;
  colorIcon?: string;
}

export default function CategoryButton({ title, icon, colorIcon, onPress, isMore = false }: CategoryButtonProps) {
  const colors = Colors.light;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: isMore ? colors.accent : colors.surface,
          borderColor: colors.border
        }
      ]}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={26}
        color={colorIcon}
      />
      <Text style={[styles.title, { color: colors.button }]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    aspectRatio: 1,
    width: '23.9%',
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  moreContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreDots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 24,
    height: 24,
    justifyContent: 'space-between',
    alignContent: 'space-between',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
}); 