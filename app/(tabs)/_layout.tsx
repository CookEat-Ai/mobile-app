import { Tabs, router } from 'expo-router';
import React, { useState, useRef } from 'react';
import { Platform, TouchableOpacity, View, StyleSheet, Modal, TextInput, Text, Pressable, Alert, ActivityIndicator } from 'react-native';
import { IconSymbol } from "../../components/ui/IconSymbol";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HapticTab } from '../../components/HapticTab';
import I18n from '../../i18n';
import { Colors } from '../../constants/Colors';
import revenueCatService from '../../config/revenuecat';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const [tapCount, setTapCount] = useState(0);
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [secretCode, setSecretCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const lastTapRef = useRef<number>(0);

  const handleProfilePress = (props: any) => {
    const now = Date.now();
    if (now - lastTapRef.current < 500) {
      const newCount = tapCount + 1;
      if (newCount === 7) {
        setTapCount(0);
        setShowSecretModal(true);
      } else {
        setTapCount(newCount);
      }
    } else {
      setTapCount(1);
    }
    lastTapRef.current = now;
    
    // Appeler le onPress original si nécessaire pour la navigation
    if (props.onPress) props.onPress();
  };

  const handleValidateCode = async () => {
    if (!secretCode.trim()) return;
    
    setIsValidating(true);
    try {
      const success = await revenueCatService.activatePromoCode(secretCode);
      if (success) {
        Alert.alert(I18n.t('common.success'), I18n.t('promoCode.activated'));
        setShowSecretModal(false);
        setSecretCode('');
        // Forcer un rafraîchissement global si nécessaire
        router.replace('/(tabs)');
      } else {
        Alert.alert(I18n.t('common.error'), I18n.t('promoCode.invalid'));
      }
    } catch (error) {
      Alert.alert(I18n.t('common.error'), I18n.t('common.unexpectedError'));
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <>
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
            tabBarButton: (props) => (
              <HapticTab
                {...props}
                onPress={() => handleProfilePress(props)}
              />
            ),
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

      <Modal
        visible={showSecretModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSecretModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{I18n.t('profile.settings')}</Text>
            <TextInput
              style={styles.input}
              placeholder="Code"
              value={secretCode}
              onChangeText={setSecretCode}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.modalButtons}>
              <Pressable 
                style={[styles.button, styles.cancelButton]} 
                onPress={() => setShowSecretModal(false)}
              >
                <Text style={styles.cancelButtonText}>{I18n.t('common.cancel')}</Text>
              </Pressable>
              <Pressable 
                style={[styles.button, styles.confirmButton]} 
                onPress={handleValidateCode}
                disabled={isValidating}
              >
                {isValidating ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.confirmButtonText}>{I18n.t('common.confirm')}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#E9E9E9',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 25,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  button: {
    flex: 1,
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  confirmButton: {
    backgroundColor: Colors.light.button,
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: 'bold',
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
