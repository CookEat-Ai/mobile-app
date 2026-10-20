import { AppRadii, AppTheme as theme } from '../../constants/AppTheme';
import { createSettingsTapDetector, requestPresentationModePrompt } from '../../services/presentationModeTrigger';
import { Ionicons } from '@expo/vector-icons';
import { Tabs, router } from 'expo-router';
import React, { useRef } from 'react';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { HapticTab } from '../../components/HapticTab';

import { getTabBarHeight } from '../../constants/Layout';
import { useResponsive } from '../../hooks/useResponsive';

export default function TabLayout() {
  const settingsTaps = useRef(createSettingsTapDetector());
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { width, height, isTablet, isShortScreen, font } = useResponsive();
  const tabBarContentHeight = getTabBarHeight(width, height);
  const iconSize = isTablet ? 30 : isShortScreen ? 23 : 25;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Tabs
        initialRouteName="tracking"
        screenListeners={({ route }) => ({
          tabPress: () => {
            if (__DEV__ && settingsTaps.current(route.name === 'profile', Date.now())) requestPresentationModePrompt();
          },
        })}
        screenOptions={{
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarActiveTintColor: theme.yellow,
          tabBarInactiveTintColor: theme.muted,
          tabBarAllowFontScaling: false,
          tabBarHideOnKeyboard: true,
          tabBarStyle: {
            height: tabBarContentHeight + insets.bottom,
            paddingTop: 9,
            paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 4 : 8),
            backgroundColor: theme.surface,
            borderTopWidth: 1,
            borderTopColor: theme.line,
          },
          tabBarLabelStyle: { marginTop: 2, fontFamily: 'Degular', fontWeight: 'normal', fontSize: font(13) },
        }}
      >
        <Tabs.Screen name="tracking" options={{ title: t('tabs.tracking'), tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'pie-chart' : 'pie-chart-outline'} size={iconSize} color={color} /> }} />
        <Tabs.Screen name="index" options={{ title: t('tabs.planning'), tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={iconSize} color={color} /> }} />
        <Tabs.Screen name="plus" listeners={{ tabPress: event => { event.preventDefault(); router.push('/tracking/capture'); } }} options={{ title: t('tracking.scanMeal'), tabBarLabel: () => null, tabBarAccessibilityLabel: t('tracking.scanMeal'), tabBarIcon: () => <View style={{ width: 58, height: 58, borderRadius: AppRadii.sheet, backgroundColor: theme.yellow, alignItems: 'center', justifyContent: 'center', marginTop: -17, borderWidth: 4, borderColor: theme.surface }}><Ionicons name="camera" size={27} color={theme.onPrimary} /></View> }} />
        <Tabs.Screen name="meals" options={{ title: t('tabs.meals'), tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'restaurant' : 'restaurant-outline'} size={iconSize} color={color} /> }} />
        <Tabs.Screen name="goal" options={{ href: null }} />
        <Tabs.Screen name="profile" options={{ title: t('tabs.profile'), tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'settings' : 'settings-outline'} size={iconSize} color={color} /> }} />
        <Tabs.Screen name="planning" options={{ href: null }} />
        <Tabs.Screen name="shopping" options={{ href: null }} />
        <Tabs.Screen name="imported" options={{ href: null }} />
      </Tabs>
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: theme.background, zIndex: 10, elevation: 10 }} />
    </View>
  );
}
