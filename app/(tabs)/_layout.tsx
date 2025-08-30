import { Tabs } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, View } from 'react-native';
import { HapticTab } from '../../components/HapticTab';
import { IconSymbol } from "../../components/ui/IconSymbol";
import { Colors } from '../../constants/Colors';
import I18n from '../../i18n';

const { width, height } = Dimensions.get('window');

// Composant personnalisé pour l'icône avec rond autour de l'icône active
const TabIcon = ({ name, focused, color }: { name: any; focused: boolean; color: string }) => {
  return (
    <View style={styles.iconContainer}>
      {focused && <View style={styles.activeCircle} />}
      <IconSymbol
        size={28}
        name={focused ? name.includes('magnifyingglass') ? name : `${name}.fill` : name}
        // color={focused ? Colors.light.button : color}
        color={focused ? Colors.light.button : 'white'}
      />
    </View>
  );
};

export default function TabLayout() {
  const colors = Colors.light;

  const [showTabBar, setShowTabBar] = useState(true);
  const tabBarOpacity = useRef(new Animated.Value(1)).current;
  const tabBarTranslateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Exposer la fonction pour que l'écran principal puisse la modifier
    (global as any).setTabBarVisibility = (visible: boolean) => {
      setShowTabBar(visible);

      if (visible) {
        // Animation d'apparition
        Animated.parallel([
          Animated.timing(tabBarOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(tabBarTranslateY, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        // Animation de disparition
        Animated.parallel([
          Animated.timing(tabBarOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(tabBarTranslateY, {
            toValue: 100,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }
    };
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarLabel: '',
        tabBarPosition: 'bottom',
        // tabBarBackground: () => <View style={{ backgroundColor: Colors.light.button, position: 'absolute', left: -width / 3.84, height: 150, width: width }} />,
        tabBarStyle: {
          position: 'absolute',
          flexDirection: "row",
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: Colors.light.button,
          borderTopWidth: 0,
          borderRadius: 1000,
          maxHeight: Platform.OS === 'ios' ? height * 0.08 : height * 0.092,
          paddingHorizontal: 5,
          marginHorizontal: "26%",
          marginBottom: Platform.OS === 'ios' ? "5%" : "10%",
          opacity: tabBarOpacity,
          transform: [{ translateY: tabBarTranslateY }],
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: I18n.t('tabs.home'),
          tabBarIcon: ({ color, focused }) => <TabIcon name="house" focused={focused} color={color} />,
        }}
      />
      {/* <Tabs.Screen
        name="search"
        options={{
          title: I18n.t('tabs.search'),
          tabBarIcon: ({ color, focused }) => <TabIcon name="magnifyingglass" focused={focused} color={color} />,
        }}
      /> */}
      <Tabs.Screen
        name="favorites"
        options={{
          title: I18n.t('tabs.favorites'),
          tabBarIcon: ({ color, focused }) => <TabIcon name="heart" focused={focused} color={color} />,
        }}
      />
      {/* <Tabs.Screen
        name="offers"
        options={{
          title: I18n.t('tabs.offers'),
          tabBarIcon: ({ color, focused }) => <TabIcon name="square.grid.2x2" focused={focused} color={color} />,
        }}
      /> */}
      <Tabs.Screen
        name="profile"
        options={{
          title: I18n.t('tabs.profile'),
          tabBarIcon: ({ color, focused }) => <TabIcon name="person" focused={focused} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: height > 1000 ? height * 0.015 : Platform.OS === 'ios' ? height * 0.006 : height * 0.025,
  },
  activeCircle: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 300,
    backgroundColor: 'white',
  },
});
