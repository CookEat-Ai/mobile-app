import React, { useState } from 'react';
import I18n from '../i18n';
import { View, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import Paywall from '../components/Paywall';

export default function PaywallScreen() {

  const [showPaywall, setShowPaywall] = useState(true);

  const handleSubscribe = (planId: string) => {
    setShowPaywall(false);
  };

  const handleClose = () => {
    console.log('close')
    setShowPaywall(false);
    router.back();
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