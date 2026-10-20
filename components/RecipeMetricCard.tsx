import React, { type ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppTheme as theme, appStyles } from '../constants/AppTheme';
import { font } from '../constants/Layout';
import { EntranceView } from './motion/Entrance';

/** Shared geometry for both rows, including the 44pt portion controls. */
export function RecipeMetricCard({ icon, label, value, children, locked = false, onPress, index = 0 }: {
  icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value?: string;
  children?: ReactNode; locked?: boolean; onPress?: () => void; index?: number;
}) {
  const { fontScale } = useWindowDimensions();
  const content = <View style={styles.content}>
    <View style={styles.heading}><Ionicons name={icon} size={24} color={theme.muted}/><Text style={styles.label}>{label}</Text></View>
    <View style={styles.valueArea}>{children || (locked ? <Ionicons name="lock-closed-outline" size={24} color={theme.ink}/> : <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>)}</View>
  </View>;
  return <EntranceView entranceIndex={index} style={[styles.card, { height: Math.ceil(144 * Math.max(1, fontScale)) }]}>
    {onPress ? <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.content}>{content}</TouchableOpacity> : content}
  </EntranceView>;
}
const styles=StyleSheet.create({
  card:{...appStyles.card,flex:1,minWidth:0,paddingHorizontal:8,paddingVertical:12},
  content:{flex:1,alignItems:'center',justifyContent:'space-between',width:'100%'},
  heading:{alignItems:'center'},
  label:{textAlign:'center',fontFamily:'CronosProBold',fontSize:font(15),color:theme.muted,marginTop:8,marginBottom:4},
  valueArea:{minHeight:44,justifyContent:'center',alignItems:'center',width:'100%'},
  value:{textAlign:'center',fontFamily:'Degular',fontSize:font(16),color:theme.ink},
});
