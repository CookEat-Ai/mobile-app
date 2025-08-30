import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import Paywall from '../components/Paywall';
import I18n from '../i18n';

export default function PaywallScreen() {

  const [showPaywall, setShowPaywall] = useState(true);

  const handleSubscribe = (planId: string) => {
    setShowPaywall(false);
  };

  const handleClose = () => {
    setShowPaywall(false);

    if (router.canGoBack())
      router.back();
    else
      router.replace('/(tabs)');

  };

  const handleRestore = () => {
    Alert.alert(
      I18n.t('paywall.restoreTitle'),
      I18n.t('paywall.restoreDescription'),
      [{ text: 'OK' }]
    );
  };

  const handlePromoCode = () => {
    Alert.alert(
      I18n.t('paywall.promoCodeTitle'),
      I18n.t('paywall.promoCodeDescription'),
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      <Paywall
        visible={showPaywall}
        onClose={handleClose}
        onSubscribe={handleSubscribe}
        onRestore={handleRestore}
        onPromoCode={handlePromoCode}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
}); 