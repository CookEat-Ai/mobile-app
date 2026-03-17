import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, Animated } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MESSAGE_HEIGHT = 30;
const GAP = 6;

export default function NetworkStatusBanner() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const pathname = usePathname();
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const [isApiAvailable, setIsApiAvailable] = useState(true);

  const totalBannerHeight = MESSAGE_HEIGHT + insets.top;
  const translateY = useRef(new Animated.Value(-totalBannerHeight)).current;
  const spacerHeight = useRef(new Animated.Value(0)).current;

  const isInOnboarding = pathname.includes('/onboarding/');

  useEffect(() => {
    // Écouter les changements de connexion Internet native
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });

    // Lancer le monitoring API via WebSocket
    apiService.monitorApiHealth((isAvailable) => {
      setIsApiAvailable(isAvailable);
    });

    return () => {
      unsubscribe();
      // On ne ferme pas le monitoring global car il sert à toute l'app
    };
  }, []);

  const showBanner = (!isConnected || !isApiAvailable) && !isInOnboarding;

  useEffect(() => {
    // Animation de la banderole (glissement)
    Animated.spring(translateY, {
      toValue: showBanner ? 0 : -totalBannerHeight,
      useNativeDriver: true,
      tension: 40,
      friction: 8
    }).start();

    // Animation du décalage du contenu (spacer)
    Animated.spring(spacerHeight, {
      toValue: showBanner ? (MESSAGE_HEIGHT + GAP) : 0,
      useNativeDriver: false,
      tension: 40,
      friction: 8
    }).start();
  }, [showBanner, totalBannerHeight, translateY, spacerHeight]);

  if (isInOnboarding) return null;

  return (
    <>
      <Animated.View
        style={[
          styles.banner,
          {
            height: totalBannerHeight,
            transform: [{ translateY }],
            paddingTop: insets.top,
          },
          !isConnected ? styles.offlineBanner : styles.maintenanceBanner
        ]}
      >
        <View style={styles.content}>
          <Text style={styles.text}>
            {!isConnected
              ? t('common.networkError', 'Pas de connexion internet')
              : t('common.maintenanceMode', 'Serveur indisponible (maintenance)')}
          </Text>
        </View>
      </Animated.View>
      <Animated.View style={{ height: spacerHeight }} />
    </>
  );
}


const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999999,
    justifyContent: 'flex-start',
    alignItems: 'center',
    overflow: 'hidden',
    // Petite ombre pour la lisibilité sur fond clair
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  content: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  offlineBanner: {
    backgroundColor: '#FF3B30',
  },
  maintenanceBanner: {
    backgroundColor: '#FF9500',
  },
  text: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Degular',
    textAlign: 'center',
  },
});
