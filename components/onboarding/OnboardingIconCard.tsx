import { AppIconBadge } from '../ui/AppIconBadge';
import { AppRadii, AppTheme as theme } from '../../constants/AppTheme';
import { EntranceView } from '../motion/Entrance';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

export function OnboardingIconCard({ name, style }: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <EntranceView entranceIndex={0} style={[styles.card, style]}>
      <AppIconBadge name={name} size={66} />
    </EntranceView>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 66, height: 66, borderRadius: AppRadii.card, backgroundColor: theme.yellow,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center',
  },
});
