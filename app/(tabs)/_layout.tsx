import { Tabs, router } from 'expo-router';
import React, { useState, useRef } from 'react';
import { Platform, TouchableOpacity, View, StyleSheet, Modal, TextInput, Text, Pressable, Alert, ActivityIndicator } from 'react-native';
import { IconSymbol } from "../../components/ui/IconSymbol";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HapticTab } from '../../components/HapticTab';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/Colors';
import { getTabBarHeight } from '../../constants/Layout';
import { useResponsive } from '../../hooks/useResponsive';
import revenueCatService from '../../config/revenuecat';
import analytics from '../../services/analytics';
import { ImportLinkSheet } from '../../components/ImportLinkSheet';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { width, height, isTablet, isShortScreen, font } = useResponsive();
  const [tapCount, setTapCount] = useState(0);
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [secretCode, setSecretCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showImportSheet, setShowImportSheet] = useState(false);
  const lastTapRef = useRef<number>(0);

  // Le bouton central ouvrait directement la caméra, ce qui faisait de la
  // génération la seule action « créer » de l'app. Il propose désormais les deux
  // façons d'obtenir une recette, à poids visuel égal.
  const handleCreatePress = () => {
    analytics.track('create_menu_opened');
    setShowCreateMenu(true);
  };

  const handleChooseGenerate = () => {
    setShowCreateMenu(false);
    analytics.track('create_menu_option_selected', { option: 'generate' });
    router.push('/camera');
  };

  const handleChooseImport = () => {
    setShowCreateMenu(false);
    analytics.track('create_menu_option_selected', { option: 'import' });
    // Laisse la première modale se fermer avant d'ouvrir la seconde : sur iOS,
    // deux modales qui se croisent laissent un écran figé.
    setTimeout(() => setShowImportSheet(true), 250);
  };

  // Hauteur utile de la barre + la safe area réelle. L'ancien code ajoutait 30pt
  // en dur sur iOS, ce qui laissait un vide sous les libellés sur les appareils
  // sans home indicator (iPhone SE) et rognait la zone tactile.
  const tabBarContentHeight = getTabBarHeight(width, height);
  const tabIconSize = isTablet ? 36 : isShortScreen ? 26 : 30;
  // Le bouton caméra déborde au-dessus de la barre : sur écran court on réduit le
  // débord pour ne pas masquer le contenu de la page.
  const fabSize = isTablet ? 78 : isShortScreen ? 56 : 65;
  const fabOverhang = Math.round(fabSize * 0.6);

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
        Alert.alert(t('common.success'), t('promoCode.activated'));
        setShowSecretModal(false);
        setSecretCode('');
        // Forcer un rafraîchissement global si nécessaire
        router.replace('/(tabs)');
      } else {
        Alert.alert(t('common.error'), t('promoCode.invalid'));
      }
    } catch {
      Alert.alert(t('common.error'), t('common.unexpectedError'));
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
            height: tabBarContentHeight + insets.bottom,
            // Sur les appareils sans zone sûre basse (SE, la plupart des Android
            // à boutons) on garde un minimum pour que la barre ne colle pas au bord.
            paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 4 : 8),
            paddingTop: isShortScreen ? 6 : 10,
          },
          tabBarLabelStyle: {
            fontSize: font(13),
            marginTop: 2,
            fontFamily: 'CronosProBold'
          },
          tabBarAllowFontScaling: false,
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: t('tabs.home'),
            tabBarIcon: ({ color, focused }) => <IconSymbol size={tabIconSize} name={focused ? "house.fill" : "house"} color={color} />,
          }}
        />
        <Tabs.Screen
          name="imported"
          options={{
            title: t('tabs.imported'),
            tabBarIcon: ({ color, focused }) => <IconSymbol size={tabIconSize} name={focused ? "square.and.arrow.down.fill" : "square.and.arrow.down"} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: t('tabs.profile'),
            tabBarIcon: ({ color, focused }) => <IconSymbol size={tabIconSize - 3} name={focused ? "settings.fill" : "settings"} color={color} />,
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
            tabBarIcon: ({ color }) => <IconSymbol size={tabIconSize} name="camera" color={color} />,
            tabBarButton: (props: any) => (
              <TouchableOpacity
                {...props}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={t('createMenu.title')}
                onPress={handleCreatePress}
                style={{
                  top: -fabOverhang,
                  justifyContent: 'center',
                  alignItems: 'center',
                  width: fabSize + 5,
                  height: fabSize + 5,
                }}
              >
                <View style={{
                  width: fabSize,
                  height: fabSize,
                  borderRadius: fabSize / 2,
                  backgroundColor: Colors.light.button,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  {/* Icône neutre : le bouton ne mène plus uniquement à la caméra. */}
                  <Ionicons name="add" size={Math.round(fabSize * 0.55)} color="white" />
                </View>
              </TouchableOpacity>
            ),
          }}
        />
      </Tabs>

      <Modal
        visible={showCreateMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateMenu(false)}
      >
        <Pressable style={styles.createOverlay} onPress={() => setShowCreateMenu(false)}>
          <Pressable style={styles.createSheet} onPress={() => {}}>
            <Text style={styles.createTitle}>{t('createMenu.title')}</Text>

            <TouchableOpacity style={styles.createOption} onPress={handleChooseGenerate} activeOpacity={0.8}>
              <View style={[styles.createIcon, { backgroundColor: '#FDF0E8' }]}>
                <Ionicons name="camera" size={24} color={Colors.light.button} />
              </View>
              <View style={styles.createOptionText}>
                <Text style={styles.createOptionTitle}>{t('createMenu.generate.title')}</Text>
                <Text style={styles.createOptionDescription}>{t('createMenu.generate.description')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.createOption} onPress={handleChooseImport} activeOpacity={0.8}>
              <View style={[styles.createIcon, { backgroundColor: '#EDEBFE' }]}>
                <Ionicons name="link" size={24} color="#6C5CE7" />
              </View>
              <View style={styles.createOptionText}>
                <Text style={styles.createOptionTitle}>{t('createMenu.import.title')}</Text>
                <Text style={styles.createOptionDescription}>{t('createMenu.import.description')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <ImportLinkSheet
        visible={showImportSheet}
        onClose={() => setShowImportSheet(false)}
        source="create_menu"
      />

      <Modal
        visible={showSecretModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSecretModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('profile.settings')}</Text>
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
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable 
                style={[styles.button, styles.confirmButton]} 
                onPress={handleValidateCode}
                disabled={isValidating}
              >
                {isValidating ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.confirmButtonText}>{t('common.confirm')}</Text>
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
  createOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  createSheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    // Dégage la barre d'onglets et le bouton flottant, qui restent visibles sous
    // la feuille.
    paddingTop: 20,
    paddingBottom: 48,
    gap: 12,
  },
  createTitle: {
    fontSize: 22,
    fontFamily: 'Degular',
    color: Colors.light.text,
    marginBottom: 4,
  },
  createOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FAFAFA',
    borderRadius: 20,
    padding: 16,
  },
  createIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createOptionText: {
    flex: 1,
  },
  createOptionTitle: {
    fontSize: 17,
    fontFamily: 'Degular',
    color: Colors.light.text,
    marginBottom: 2,
  },
  createOptionDescription: {
    fontSize: 14,
    fontFamily: 'CronosPro',
    color: '#8E8E93',
  },
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
