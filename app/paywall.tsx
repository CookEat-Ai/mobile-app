import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import Paywall from '../components/Paywall';

export default function PaywallScreen() {
  const { t } = useTranslation();
  const [showPaywall, setShowPaywall] = useState(true);

  const handleSubscribe = (planId: string) => {
    // console.log('Souscription au plan:', planId);
    // // Ici vous ajouteriez la logique de souscription
    // Alert.alert(
    //   'Souscription',
    //   `Plan ${planId} sélectionné. Redirection vers l'application...`,
    //   [
    //     {
    //       text: 'OK',
    //       onPress: () => {
    //         setShowPaywall(false);
    //         router.replace('/(tabs)');
    //       }
    //     }
    //   ]
    // );
    setShowPaywall(false);
  };

  const handleClose = () => {
    setShowPaywall(false);
    router.back();
  };

  const handleRestore = () => {
    Alert.alert(
      'Restaurer les achats',
      'Fonctionnalité de restauration en cours de développement.',
      [{ text: 'OK' }]
    );
  };

  const handlePromoCode = () => {
    Alert.alert(
      'Code promo',
      'Fonctionnalité de code promo en cours de développement.',
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