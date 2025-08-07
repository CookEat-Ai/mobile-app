import React, { useState } from 'react';
import I18n from '../i18n';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Checkout from '../components/Checkout';
import { IconSymbol } from '../components/ui/IconSymbol';
import { Colors } from '../constants/Colors';

const subscriptions: any = [];

export default function OffersScreen() {

  const colors = Colors.light;
  const insets = useSafeAreaInsets();
  const [selectedSubscription, setSelectedSubscription] = useState<string | null>(null);
  const [showGuestCheckout, setShowGuestCheckout] = useState(false);

  const handleGuestCheckoutContinue = (email: string, firstName: string) => {
    setShowGuestCheckout(false);
  };

  const handleGuestCheckoutCancel = () => {
    setShowGuestCheckout(false);
    setSelectedSubscription(null);
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
            {I18n.t('offers.title')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {I18n.t('offers.subtitle')}
          </Text>
        </View>

        {/* Plans */}
        <View style={styles.plansContainer}>
          {subscriptions.map((subscription: any) => (
            <TouchableOpacity
              key={subscription.id}
              style={[
                styles.planCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: selectedSubscription === subscription.id ? colors.button : colors.border,
                  borderWidth: selectedSubscription === subscription.id ? 2 : 1,
                }
              ]}
              onPress={() => setSelectedSubscription(subscription.id)}
              activeOpacity={0.8}
            >
              {/* Badge Popular */}
              {subscription.id === "XKSRATBQW" && (
                <View style={[styles.popularBadge, { backgroundColor: colors.button }]}>
                  <Text style={[styles.popularText, { color: colors.background }]}>
                    {I18n.t('offers.popular')}
                  </Text>
                </View>
              )}

              {/* Header du plan */}
              <View style={styles.planHeader}>
                <View style={styles.planInfo}>
                  <Text style={[styles.planName, { color: colors.text }]}>
                    {subscription.title}
                  </Text>
                  <Text style={[styles.planPrice, { color: colors.textSecondary }]}>
                    {subscription.price || subscription.displayPrice}
                  </Text>
                </View>

                {/* Checkmark si sélectionné */}
                {selectedSubscription === subscription.id && (
                  <View style={[styles.checkmark, { backgroundColor: colors.button }]}>
                    <IconSymbol name="checkmark" size={16} color={colors.background} />
                  </View>
                )}
              </View>

              {/* Features */}
              <View style={styles.featuresContainer}>
                {subscriptions.map((subscription: any, index: number) => (
                  <View key={index} style={styles.featureItem}>
                    <IconSymbol
                      name="checkmark"
                      size={16}
                      color={colors.button}
                    />
                    <Text style={[styles.featureText, { color: colors.text }]}>
                      {I18n.t(`offers.features.${subscription.id}.${index + 1}`) || ''}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Bouton de sélection */}
              <TouchableOpacity
                style={[
                  styles.selectButton,
                  {
                    backgroundColor: selectedSubscription === subscription.id ? colors.button : 'transparent',
                    borderColor: colors.button,
                  }
                ]}
                onPress={() => setSelectedSubscription(subscription.id)}
              >
                <Text style={[
                  styles.selectButtonText,
                  {
                    color: selectedSubscription === subscription.id ? colors.background : colors.button
                  }
                ]}>
                  {selectedSubscription === subscription.id ? I18n.t('offers.selected') : I18n.t('offers.select')}
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