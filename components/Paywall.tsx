import React, { useState, useEffect, useMemo, useRef } from 'react';
import I18n from '../i18n';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from './ui/IconSymbol';
import { Colors } from '../constants/Colors';
import revenueCatService from '../config/revenuecat';

interface PaywallProps {
  visible: boolean;
  onClose: () => void;
  onSubscribe: (plan: string) => void;
  onRestore?: () => void;
  onPromoCode?: () => void;
}

export default function Paywall({
  visible,
  onClose,
  onSubscribe,
  onRestore,
  onPromoCode
}: PaywallProps) {

  const colors = Colors.light;
  const insets = useSafeAreaInsets();
  const [offerings, setOfferings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const closeButtonOpacity = useRef(new Animated.Value(0)).current;

  const features = useMemo(() => [
    {
      icon: 'infinity',
      title: I18n.t('paywall.unlimitedRecipes'),
      color: '#FEB50A'
    },
    {
      icon: 'heart',
      title: I18n.t('paywall.saveRecipes'),
      color: '#FF8A65'
    },
    {
      icon: 'slider.horizontal.3',
      title: I18n.t('paywall.customFilter'),
      color: '#FFB74D'
    },
    {
      icon: 'person.2',
      title: I18n.t('paywall.portionsChoice'),
      color: '#FFCC02'
    },
    {
      icon: 'globe',
      title: I18n.t('paywall.worldCuisine'),
      color: '#FFA726'
    },
    {
      icon: 'sparkles',
      title: I18n.t('paywall.customRecipe'),
      color: '#FF9800'
    },
    {
      icon: 'refrigerator',
      title: I18n.t('paywall.pantry'),
      color: '#FF8F00'
    }
  ], []);

  useEffect(() => {
    setTimeout(() => {
      Animated.timing(closeButtonOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, 1500);

    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    try {
      const offerings = await revenueCatService.getOfferings();
      setOfferings(offerings?.availablePackages.sort((a: any, b: any) => a.price - b.price ? 1 : -1));

      // Sélectionner l'offre du milieu par défaut
      if (offerings?.availablePackages?.[1]) {
        setSelectedPackage(offerings.availablePackages[1]);
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des offres:', error);
    }
  };

  const handleSubscribe = async (packageToPurchase: any) => {
    try {
      setIsLoading(true);
      const success = await revenueCatService.purchasePackage(packageToPurchase);

      if (success) {
        // Fermer directement le paywall après un achat réussi
        onSubscribe('Pro');
        onClose();
      } else {
        Alert.alert(I18n.t('paywall.purchaseErrorTitle'), I18n.t('paywall.purchaseErrorDescription'));
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'achat:', error);
      Alert.alert(I18n.t('paywall.purchaseErrorTitle'), I18n.t('paywall.purchaseErrorDescription'));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePackageSelect = (pkg: any) => {
    setSelectedPackage(pkg);
  };

  const handleRestore = async () => {
    try {
      setIsLoading(true);
      const restored = await revenueCatService.restorePurchases();

      if (restored) {
        // Fermer directement le paywall après une restauration réussie
        onSubscribe('premium');
        onClose();
      } else {
        Alert.alert(I18n.t('paywall.restoreErrorTitle'), I18n.t('paywall.restoreErrorDescription'));
      }
    } catch (error) {
      console.error('❌ Erreur lors de la restauration:', error);
      Alert.alert(I18n.t('paywall.restoreErrorTitle'), I18n.t('paywall.restoreErrorDescription'));
    } finally {
      setIsLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Bouton de fermeture */}
      <Animated.View style={[styles.closeButton, { opacity: closeButtonOpacity }]}>
        <TouchableOpacity
          onPress={onClose}
          activeOpacity={0}
        >
          <IconSymbol name="xmark" size={24} color={colors.text} weight="bold" />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Titre principal */}
        <View style={styles.titleContainer}>
          <Text style={styles.mainTitle}>
            {I18n.t('paywall.lessStress')},{'\n'}
            <Text style={styles.titleHighlight}>{I18n.t('paywall.moreFlavors')}</Text>
          </Text>
        </View>

        {/* Section des fonctionnalités */}
        <View style={styles.featuresContainer}>
          <View style={styles.featuresGrid}>
            {features.map((feature, index) => (
              <View
                key={index}
                style={[
                  styles.featureItem,
                  index === 6 && styles.featureItemLast // Centrer le dernier élément
                ]}
              >
                <View style={[styles.featureIcon, { backgroundColor: feature.color }]}>
                  <IconSymbol
                    name={feature.icon as any}
                    size={24}
                    color="white"
                    weight="bold"
                  />
                </View>
                <Text style={styles.featureText}>{feature.title}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Section des abonnements */}
        <View style={styles.subscriptionContainer}>
          <Text style={styles.subscriptionTitle}>{I18n.t('paywall.choosePlan')}</Text>

          {offerings ? (
            <View style={styles.plansContainer}>
              {offerings.map((pkg: any, index: number) => (
                <TouchableOpacity
                  key={pkg.identifier}
                  style={[
                    styles.planCard,
                    index === 1 && selectedPackage?.identifier === pkg.identifier && styles.planCardBest,
                    selectedPackage?.identifier === pkg.identifier && styles.planCardSelected
                  ]}
                  onPress={() => handlePackageSelect(pkg)}
                  activeOpacity={0.8}
                  disabled={isLoading}
                >
                  {index === 1 && selectedPackage?.identifier === pkg.identifier && (
                    <View style={styles.bestBadge}>
                      <Text
                        style={styles.bestBadgeText}
                        numberOfLines={1}
                        adjustsFontSizeToFit={true}
                        minimumFontScale={0.8}
                      >
                        {I18n.t('paywall.plans.best')}
                      </Text>
                    </View>
                  )}

                  <View style={styles.planContent}>
                    <Text style={styles.planTitle}>
                      {
                        index === 0
                          ? I18n.t('paywall.plans.weekly')
                          : index === 1
                            ? I18n.t('paywall.plans.yearly')
                            : I18n.t('paywall.plans.monthly')
                      }
                    </Text>
                    <View style={styles.priceContainer}>
                      <Text style={styles.planPrice}>{pkg.product.priceString}</Text>
                    </View>
                    <Text style={{ ...styles.planPrice, fontSize: 16 }}>
                      {
                        index === 0
                          ? '/ ' + I18n.t('paywall.plans.week')
                          : index === 1
                            ? '/ ' + I18n.t('paywall.plans.year')
                            : '/ ' + I18n.t('paywall.plans.month')
                      }
                    </Text>
                  </View>

                  {index === 1 && selectedPackage?.identifier === pkg.identifier && (
                    <View style={styles.discountBadgeBottom}>
                      <Text style={styles.discountBadgeText}>-80%</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.button} />
              <Text style={styles.loadingText}>{I18n.t('paywall.loadingOfferings')}</Text>
            </View>
          )}
        </View>

        {/* Bouton d'action principal */}
        <TouchableOpacity
          style={[styles.ctaButton, isLoading && styles.ctaButtonDisabled]}
          onPress={() => {
            if (selectedPackage) {
              handleSubscribe(selectedPackage);
            } else {
              Alert.alert(I18n.t('paywall.selectPlanTitle'), I18n.t('paywall.selectPlanDescription'));
            }
          }}
          activeOpacity={0.8}
          disabled={isLoading || !offerings || !selectedPackage}
        >
          <Text style={styles.ctaButtonText}>
            {isLoading ? I18n.t('paywall.loading') : I18n.t('paywall.tryFree')}
          </Text>
        </TouchableOpacity>

        {/* Liens du bas */}
        <View style={styles.bottomLinks}>
          <TouchableOpacity onPress={handleRestore} disabled={isLoading}>
            <Text style={[styles.bottomLinkText, isLoading && styles.disabledText]}>
              {I18n.t('paywall.restore')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onPromoCode} disabled={isLoading}>
            <Text style={[styles.bottomLinkText, isLoading && styles.disabledText]}>
              {I18n.t('paywall.promoCode')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  mainTitle: {
    fontSize: 32,
    fontFamily: 'Degular',
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    lineHeight: 40,
  },
  titleHighlight: {
    color: '#FEB50A', // Orange au lieu de vert
  },
  featuresContainer: {
    marginBottom: 20,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureItem: {
    width: '30%', // 3 colonnes avec espacement
    alignItems: 'center',
    marginBottom: 25,
  },
  featureItemLast: {
    marginLeft: '35%', // Pour centrer le dernier élément (30% + 5% de marge)
  },
  featureIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  featureText: {
    fontSize: 14,
    fontFamily: 'Cronos Pro',
    color: '#374151',
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '500',
  },
  subscriptionContainer: {
    marginBottom: 30,
  },
  subscriptionTitle: {
    fontSize: 20,
    fontFamily: 'Degular',
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 20,
  },
  plansContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  planCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  planCardBest: {
    borderColor: '#FEB50A',
    backgroundColor: '#FFF8E6', // Dérivé clair de #FEB50A
  },
  planCardSelected: {
    borderColor: '#FEB50A',
    borderWidth: 3,
  },
  bestBadge: {
    position: 'absolute',
    top: -12,
    backgroundColor: '#FEB50A',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bestBadgeText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Cronos Pro',
    fontWeight: 'bold',
  },
  planContent: {
    alignItems: 'center',
    marginTop: 8,
  },
  planTitle: {
    fontSize: 16,
    fontFamily: 'Degular',
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  priceContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  planPrice: {
    fontSize: 20,
    fontFamily: 'Degular',
    fontWeight: 'bold',
    color: '#1F2937',
  },
  planPeriod: {
    fontSize: 12,
    fontFamily: 'Cronos Pro',
    color: '#6B7280',
  },
  discountBadge: {
    backgroundColor: '#FEB50A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  discountText: {
    color: 'white',
    fontSize: 10,
    fontFamily: 'Cronos Pro',
    fontWeight: 'bold',
  },
  ctaButton: {
    backgroundColor: '#F59E0B', // Orange comme dans l'image
    borderRadius: 250,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  ctaButtonText: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Degular',
    fontWeight: 'bold',
  },
  bottomLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 30,
  },
  bottomLinkText: {
    fontSize: 14,
    fontFamily: 'Cronos Pro',
    color: '#6B7280',
    textDecorationLine: 'underline',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontFamily: 'Cronos Pro',
  },
  ctaButtonDisabled: {
    backgroundColor: '#ccc',
  },
  disabledText: {
    opacity: 0.5,
  },
  discountBadgeTop: {
    position: 'absolute',
    top: -8,
    backgroundColor: '#FEB50A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  discountBadgeText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Cronos Pro',
    fontWeight: 'bold',
  },
  discountBadgeBottom: {
    position: 'absolute',
    bottom: -12,
    backgroundColor: '#FEB50A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
}); 