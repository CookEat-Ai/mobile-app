import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Checkout from '../../components/Checkout';
import { IconSymbol } from '../../components/ui/IconSymbol';
import { Colors } from '../../constants/Colors';
import { useIAP } from "expo-iap";

// Données des plans avec prix
const productIds = [
  'XKJXATBXR',
  'XKSRATBQW',
];

export default function OffersScreen() {
  const { t } = useTranslation();
  const colors = Colors.light;
  const insets = useSafeAreaInsets();
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [showGuestCheckout, setShowGuestCheckout] = useState(false);

  let { connected, products, getProducts, requestPurchase, validateReceipt } =
    useIAP({
      onPurchaseSuccess: (purchase) => {
        console.log('Purchase successful:', purchase);
        // Handle successful purchase
        validatePurchase(purchase);
      },
      onPurchaseError: (error) => {
        console.error('Purchase failed:', error);
        // Handle purchase error
      },
    });

  useEffect(() => {
    if (connected) {
      getProducts(productIds);
      console.log(products);

      products.push({
        id: 'free',
        title: 'Free',
        displayPrice: 'Free'
      } as any)

      products.push({
        id: 'XKJXATBXR',
        title: 'Pro Monthly',
        displayPrice: '$7.99/month'
      } as any)

      products.push({
        id: 'XKSRATBQW',
        title: 'Pro Yearly',
        displayPrice: '$5.99/month'
      } as any)
    }
    // products.push({
    //   id: 'free',
    //   title: 'Free',
    //   displayPrice: 'Free'
    // } as any)
  }, [connected]);

  const validatePurchase = async (purchase: any) => {
    try {
      const result = await validateReceipt(purchase.transactionId);
      if (result.isValid) {
        // Grant user the purchased content
        console.log('Receipt is valid');
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleGuestCheckoutContinue = (email: string, firstName: string) => {
    setShowGuestCheckout(false);
  };

  const handleGuestCheckoutCancel = () => {
    setShowGuestCheckout(false);
    setSelectedProduct(null);
  };

  return (
    <View style={[styles.container, {
      backgroundColor: colors.background,
      paddingTop: insets.top
    }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            {t('offers.title')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('offers.subtitle')}
          </Text>
        </View>

        {/* Plans */}
        <View style={styles.plansContainer}>
          {products.map((product) => (
            <TouchableOpacity
              key={product.id}
              style={[
                styles.planCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: selectedProduct === product.id ? colors.button : colors.border,
                  borderWidth: selectedProduct === product.id ? 2 : 1,
                }
              ]}
              onPress={() => setSelectedProduct(product.id)}
              activeOpacity={0.8}
            >
              {/* Badge Popular */}
              {product.id === "XKSRATBQW" && (
                <View style={[styles.popularBadge, { backgroundColor: colors.button }]}>
                  <Text style={[styles.popularText, { color: colors.background }]}>
                    {t('offers.popular')}
                  </Text>
                </View>
              )}

              {/* Header du plan */}
              <View style={styles.planHeader}>
                <View style={styles.planInfo}>
                  <Text style={[styles.planName, { color: colors.text }]}>
                    {product.title}
                  </Text>
                  <Text style={[styles.planPrice, { color: colors.textSecondary }]}>
                    {product.price || product.displayPrice}
                  </Text>
                </View>

                {/* Checkmark si sélectionné */}
                {selectedProduct === product.id && (
                  <View style={[styles.checkmark, { backgroundColor: colors.button }]}>
                    <IconSymbol name="checkmark" size={16} color={colors.background} />
                  </View>
                )}
              </View>

              {/* Features */}
              <View style={styles.featuresContainer}>
                {products.map((product, index) => (
                  <View key={index} style={styles.featureItem}>
                    <IconSymbol
                      name="checkmark"
                      size={16}
                      color={colors.button}
                    />
                    <Text style={[styles.featureText, { color: colors.text }]}>
                      {t(`offers.features.${product.id}.${index + 1}`) || ''}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Bouton de sélection */}
              <TouchableOpacity
                style={[
                  styles.selectButton,
                  {
                    backgroundColor: selectedProduct === product.id ? colors.button : 'transparent',
                    borderColor: colors.button,
                  }
                ]}
                onPress={() => setSelectedProduct(product.id)}
              >
                <Text style={[
                  styles.selectButtonText,
                  {
                    color: selectedProduct === product.id ? colors.background : colors.button
                  }
                ]}>
                  {selectedProduct === product.id ? t('offers.selected') : t('offers.select')}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>

        {/* Espace en bas */}
        <View style={styles.bottomSpacer} />
      </ScrollView>


      {/* Modal de checkout */}
      <Checkout
        visible={showGuestCheckout}
        onCancel={handleGuestCheckoutCancel}
        onContinue={handleGuestCheckoutContinue}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  plansContainer: {
    paddingHorizontal: 20,
  },
  planCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    right: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    fontSize: 12,
    fontWeight: '600',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 18,
    fontWeight: '600',
  },
  checkmark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuresContainer: {
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 16,
    marginLeft: 12,
  },
  selectButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    borderWidth: 2,
    alignItems: 'center',
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 120,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 0, // Espace pour la status bar
  },
}); 