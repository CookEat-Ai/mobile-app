import { Tabs, router } from 'expo-router';
import React from 'react';
import { Platform, TouchableOpacity, View, StyleSheet } from 'react-native';
import { IconSymbol } from "../../components/ui/IconSymbol";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HapticTab } from '../../components/HapticTab';
import I18n from '../../i18n';
import { Colors } from '../../constants/Colors';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.light.button,
        tabBarInactiveTintColor: '#999',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#E9E9E9',
          overflow: 'visible',
          height: Platform.OS === 'ios' ? 95 : 80 + (insets.bottom > 0 ? insets.bottom - 10 : 0),
          paddingBottom: Platform.OS === 'ios' ? 30 : (insets.bottom > 0 ? insets.bottom : 15),
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 14,
          marginTop: 4,
          fontFamily: 'CronosProBold'
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: I18n.t('tabs.home'),
          tabBarIcon: ({ color, focused }) => <IconSymbol size={32} name={focused ? "house.fill" : "house"} color={color} />,
        }}
      />
      <Tabs.Screen
        name="imported"
        options={{
          title: I18n.t('tabs.imported'),
          tabBarIcon: ({ color, focused }) => <IconSymbol size={32} name={focused ? "square.and.arrow.down.fill" : "square.and.arrow.down"} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: I18n.t('profile.settings'),
          tabBarIcon: ({ color, focused }) => <IconSymbol size={28} name={focused ? "settings.fill" : "settings"} color={color} />,
        }}
      />
      <Tabs.Screen
        name="plus"
        options={{
          title: '',
          tabBarIcon: ({ color }) => <IconSymbol size={30} name="camera" color={color} />,
          tabBarButton: (props: any) => (
            <TouchableOpacity
              {...props}
              activeOpacity={0.8}
              onPress={() => {
                // Action pour le bouton caméra
                router.push('/camera');
              }}
              style={{
                top: -40,
                justifyContent: 'center',
                alignItems: 'center',
                width: 70,
                height: 70,
              }}
            >
              <View style={{
                width: 65,
                height: 65,
                borderRadius: 40,
                backgroundColor: Colors.light.button,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <IconSymbol name="camera" size={30} color="white" />
              </View>
            </TouchableOpacity>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({});
