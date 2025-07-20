import { Tabs } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { HapticTab } from '../../components/HapticTab';
import { IconSymbol } from '../../components/ui/IconSymbol';
// import TabBarBackground from '../../components/ui/TabBarBackground';
import { Colors } from '../../constants/Colors';

// Composant personnalisé pour l'icône avec rond autour de l'icône active
const TabIcon = ({ name, focused, color }: { name: any; focused: boolean; color: string }) => {
  return (
    <View style={styles.iconContainer}>
      {focused && <View style={styles.activeCircle} />}
      <IconSymbol
        size={28}
        name={focused ? name.includes('magnifyingglass') ? name : `${name}.fill` : name}
        color={focused ? Colors.light.button : color}
      />
    </View>
  );
};

export default function TabLayout() {
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
        tabBarStyle: {
          // display: showTabBar ? 'flex' : 'none',
          position: 'absolute',
          flexDirection: "row",
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: Colors.light.button,
          borderTopWidth: 0,
          borderRadius: 1000,
          height: 70,
          paddingHorizontal: 5,
          marginHorizontal: "10%",
          marginBottom: "5%",
          opacity: tabBarOpacity,
          transform: [{ translateY: tabBarTranslateY }],
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="house" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="magnifyingglass" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Favorites',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="heart" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          title: 'Recipes',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="square.grid.2x2" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="person" focused={focused} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: 5.5,
  },
  activeCircle: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 300,
    backgroundColor: Colors.light.accent,
  },
});
