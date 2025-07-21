import React, { useState, useEffect } from 'react';
import { View, Text, Alert, Platform, ActivityIndicator } from 'react-native';
import * as IAP from 'expo-iap';
import { apiService } from '../services/api';
import { useTranslation } from 'react-i18next';

interface NativePaymentProps {
  planId: string;
  amount: number;
  onSuccess: (data: { planId: string; amount: number }) => void;
  onCancel: () => void;
  isGuest?: boolean;
  guestEmail?: string;
  guestFirstName?: string;
}

export default function NativePayment({
  planId,
  amount,
  onSuccess,
  onCancel,
  isGuest = false,
  guestEmail = '',
  guestFirstName = '',
}: NativePaymentProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [canMakePurchases, setCanMakePurchases] = useState(false);

  useEffect(() => {
    checkPurchaseAvailability();
  }, []);

  const checkPurchaseAvailability = async () => {
    try {
      // Initialiser la connexion
      await IAP.initConnection();

      if (Platform.OS === 'ios') {
        // Vérifier In-App Purchases iOS
        const available = await IAP.getProducts([planId]);
        setCanMakePurchases(available.length > 0);
      } else {
        // Vérifier Google Play Billing Android
        const available = await IAP.getProducts([planId]);
        setCanMakePurchases(available.length > 0);
      }
    } catch (error) {
      console.log('❌ Erreur vérification In-App Purchases:', error);
      setCanMakePurchases(false);
    }
  };

  const handlePayment = async () => {
    if (!canMakePurchases) {
      Alert.alert('Erreur', 'In-App Purchases non disponibles');
      return;
    }

    setLoading(true);

    try {
      // 1. Créer l'utilisateur si guest
      if (isGuest) {
        console.log('👤 Création utilisateur guest...');
        const response = await apiService.createGuestUser(guestEmail, guestFirstName);

        if (response.data) {
          // Connecter l'utilisateur
          apiService.setToken(response.data.token);
          console.log('✅ Utilisateur créé et connecté');
          console.log('🔑 Mot de passe temporaire:', response.data.tempPassword);
        }
      }

      // 2. Lancer l'achat In-App
      if (Platform.OS === 'ios') {
        await handleAppleInAppPurchase();
      } else {
        await handleGooglePlayPurchase();
      }
    } catch (error) {
      console.error('❌ Erreur paiement:', error);
      Alert.alert('Erreur', 'Erreur lors du paiement');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleInAppPurchase = async () => {
    try {
      console.log('🍎 Lancement In-App Purchase Apple...');

      // Lancer l'achat d'abonnement
      const purchase = await IAP.requestPurchase({
        request: { sku: planId },
        type: 'subs'
      });

      console.log('✅ Achat Apple réussi:', purchase);

      // Finaliser la transaction
      if (purchase && Array.isArray(purchase) && purchase.length > 0) {
        await IAP.finishTransaction({ purchase: purchase[0] });
      }

      // Confirmer côté backend
      await apiService.confirmPayment(planId, amount);

      onSuccess({ planId, amount });
    } catch (error) {
      console.error('❌ Erreur Apple In-App Purchase:', error);
      Alert.alert('Erreur', 'Erreur lors de l\'achat Apple');
    }
  };

  const handleGooglePlayPurchase = async () => {
    try {
      console.log('🤖 Lancement Google Play Billing...');

      // Lancer l'achat d'abonnement
      const purchase = await IAP.requestPurchase({
        request: { sku: planId },
        type: 'subs'
      });

      console.log('✅ Achat Google Play réussi:', purchase);

      // Finaliser la transaction
      if (purchase && Array.isArray(purchase) && purchase.length > 0) {
        await IAP.finishTransaction({ purchase: purchase[0] });
      }

      // Confirmer côté backend
      await apiService.confirmPayment(planId, amount);

      onSuccess({ planId, amount });
    } catch (error) {
      console.error('❌ Erreur Google Play Billing:', error);
      Alert.alert('Erreur', 'Erreur lors de l\'achat Google Play');
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 10 }}>{t('processing')}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20 }}>
        Abonnement {planId}
      </Text>

      <Text style={{ fontSize: 16, marginBottom: 10 }}>
        Montant: {amount}€
      </Text>

      <Text style={{ fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 30 }}>
        {Platform.OS === 'ios' ? 'Apple In-App Purchase' : 'Google Play Billing'}
        {'\n'}Renouvellement automatique
      </Text>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Text
          style={{
            backgroundColor: '#007AFF',
            color: 'white',
            padding: 15,
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 'bold',
          }}
          onPress={handlePayment}
        >
          Acheter
        </Text>

        <Text
          style={{
            backgroundColor: '#FF3B30',
            color: 'white',
            padding: 15,
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 'bold',
          }}
          onPress={onCancel}
        >
          Annuler
        </Text>
      </View>
    </View>
  );
} 