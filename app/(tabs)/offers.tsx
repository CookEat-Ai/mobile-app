import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '../../components/ui/IconSymbol';
import { Colors } from '../../constants/Colors';

// Données des plans
const plans = [
  {
    id: 'basic',
    name: 'basic',
    price: 'freePrice',
    features: ['freeFeature1', 'freeFeature2', 'freeFeature3'],
    popular: false,
  },
  {
    id: 'premium',
    name: 'pro',
    price: 'premiumPrice',
    features: ['premiumFeature1', 'premiumFeature2', 'premiumFeature3', 'premiumFeature4'],
    popular: true,
  },
  {
    id: 'pro',
    name: 'pro',
    price: 'proPrice',
    features: ['proFeature1', 'proFeature2', 'proFeature3', 'proFeature4', 'proFeature5'],
    popular: false,
  },
];

export default function OffersScreen() {
  const { t } = useTranslation();
  const colors = Colors.light;
  const insets = useSafeAreaInsets();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
    // Ici vous ajouteriez la logique pour souscrire au plan
    console.log('Plan sélectionné:', planId);
  };

  const getPlanName = (plan: string) => {
    return t(`profile.plans.${plan}`);
  };

  const getPlanPrice = (plan: string) => {
    return t(`profile.plans.${plan}`);
  };

  const getFeatureText = (featureKey: string) => {
    return t(`offers.features.${featureKey}`);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top }}
    >
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
        {plans.map((plan) => (
          <TouchableOpacity
            key={plan.id}
            style={[
              styles.planCard,
              {
                backgroundColor: colors.surface,
                borderColor: selectedPlan === plan.id ? colors.button : colors.border,
                borderWidth: selectedPlan === plan.id ? 2 : 1,
              }
            ]}
            onPress={() => handlePlanSelect(plan.id)}
            activeOpacity={0.8}
          >
            {/* Badge Popular */}
            {plan.popular && (
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
                  {getPlanName(plan.name)}
                </Text>
                <Text style={[styles.planPrice, { color: colors.textSecondary }]}>
                  {getPlanPrice(plan.price)}
                </Text>
              </View>

              {/* Checkmark si sélectionné */}
              {selectedPlan === plan.id && (
                <View style={[styles.checkmark, { backgroundColor: colors.button }]}>
                  <IconSymbol name="checkmark" size={16} color={colors.background} />
                </View>
              )}
            </View>

            {/* Features */}
            <View style={styles.featuresContainer}>
              {plan.features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <IconSymbol
                    name="checkmark"
                    size={16}
                    color={colors.button}
                  />
                  <Text style={[styles.featureText, { color: colors.text }]}>
                    {getFeatureText(feature)}
                  </Text>
                </View>
              ))}
            </View>

            {/* Bouton de sélection */}
            <TouchableOpacity
              style={[
                styles.selectButton,
                {
                  backgroundColor: selectedPlan === plan.id ? colors.button : 'transparent',
                  borderColor: colors.button,
                }
              ]}
              onPress={() => handlePlanSelect(plan.id)}
            >
              <Text style={[
                styles.selectButtonText,
                {
                  color: selectedPlan === plan.id ? colors.background : colors.button
                }
              ]}>
                {selectedPlan === plan.id ? t('offers.selected') : t('offers.select')}
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </View>

      {/* Espace en bas */}
      <View style={styles.bottomSpacer} />
    </ScrollView>
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
}); 