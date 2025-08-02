import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Paywall from '../../components/Paywall';

export default function Offer7DaysScreen() {
  const { t } = useTranslation();
  const [showPaywall, setShowPaywall] = useState(true);

  const handleSubscribe = (planId: string) => {
    console.log('Souscription au plan:', planId);
    // Ici vous ajouteriez la logique de souscription
    router.replace('/(tabs)');
  };

  const handleClose = () => {
    setShowPaywall(false);
    router.replace('/(tabs)');
  };

  const handleRestore = () => {
    console.log('Restaurer les achats');
    // Logique de restauration
  };

  const handlePromoCode = () => {
    console.log('Code promo');
    // Logique de code promo
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