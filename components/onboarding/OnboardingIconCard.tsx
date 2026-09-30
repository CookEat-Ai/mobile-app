import { EntranceView } from '../motion/Entrance';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { AppTheme as theme } from '../../constants/AppTheme';

export function OnboardingIconCard({ name, style }: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <EntranceView entranceIndex={0} style={[styles.card, style]}>
      <Ionicons name={name} size={30} color={theme.yellow} />
    </EntranceView>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 66, height: 66, borderRadius: 24, backgroundColor: theme.yellowSoft,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center',
  },
});
