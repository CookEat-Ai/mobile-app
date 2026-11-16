import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { AppRadii, AppTheme } from '../constants/AppTheme';

const size = 32;
const stroke = 3;
const edge = stroke / 2;
const radius = AppRadii.control;
const cornerPath = `M ${edge} ${size - edge} V ${edge + radius} A ${radius} ${radius} 0 0 1 ${edge + radius} ${edge} H ${size - edge}`;

/** Decorative capture bounds shared by meal and ingredient cameras. */
export function CameraFramingGuide({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.guide, style]}>
    {[styles.topLeft, styles.topRight, styles.bottomRight, styles.bottomLeft].map((position, index) => (
      <View key={index} style={[styles.corner, position]}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: [{ rotate: `${index * 90}deg` }] }}>
          <Path d={cornerPath} fill="none" stroke={AppTheme.yellow} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </View>
    ))}
  </View>;
}

const styles = StyleSheet.create({
  guide: { position: 'absolute', left: '8%', right: '8%', top: '30%', bottom: '30%' },
  corner: { position: 'absolute', width: size, height: size },
  topLeft: { left: 0, top: 0 },
  topRight: { right: 0, top: 0 },
  bottomRight: { right: 0, bottom: 0 },
  bottomLeft: { left: 0, bottom: 0 },
});
