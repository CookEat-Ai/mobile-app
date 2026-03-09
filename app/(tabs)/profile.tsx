import React, { useCallback, useEffect, useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  Modal,
  TouchableWithoutFeedback,
  Animated,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '../../components/ui/IconSymbol';
import { Colors } from '../../constants/Colors';
import { useSubscription } from '../../hooks/useSubscription';
import * as WebBrowser from "expo-web-browser";
import I18n from '../../i18n';

const ONBOARDING_COMPLETED_KEY = 'onboarding_completed';
const QUESTIONS_ANSWERED_KEY = 'questions_answered';

export default function ProfileScreen() {

  const colors = Colors.light;
  const insets = useSafeAreaInsets();
  const { subscriptionStatus, isLoading: subscriptionLoading, loadSubscriptionStatus, cancelSubscription } = useSubscription();
  const [currentLanguage, setCurrentLanguage] = useState<'fr' | 'en'>((I18n.locale?.startsWith('fr') ? 'fr' : 'en') as 'fr' | 'en');
  const [isSubscriptionModalVisible, setIsSubscriptionModalVisible] = useState(false);
  const screenHeight = Dimensions.get('window').height;
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;

  useEffect(() => {
    if (isSubscriptionModalVisible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8
      }).start();
    } else {
      slideAnim.setValue(screenHeight);
    }
  }, [isSubscriptionModalVisible]);

  const closeSubscriptionModal = () => {
    Animated.timing(slideAnim, {
      toValue: screenHeight,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsSubscriptionModalVisible(false);
    });
  };

  useEffect(() => {
    const loadSavedLanguage = async () => {
      const savedLang = await AsyncStorage.getItem('app_language');
      if (savedLang === 'fr' || savedLang === 'en') {
        setCurrentLanguage(savedLang);
      }
    };
    loadSavedLanguage();
  }, []);

  useFocusEffect(useCallback(() => {
    const checkSubscriptionStatus = async () => {
      loadSubscriptionStatus();
    };
    checkSubscriptionStatus();
  }, []));

  const handleUpgradeToPremium = () => {
    // Naviguer vers le paywall
    router.push({ pathname: '/paywall', params: { source: 'profile_settings' } });
  };

  const handleCancelSubscription = () => {
    Alert.alert(
      I18n.t('profile.cancelSubscriptionTitle'),
      I18n.t('profile.cancelSubscriptionMessage'),
      [
        {
          text: I18n.t('profile.cancel'),
          style: 'cancel',
        },
        {
          text: I18n.t('profile.confirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await cancelSubscription();
              if (success) {
                // const successMessage = Platform.OS === 'ios'
                //   ? t('profile.cancellationSuccessMessageIOS')
                //   : t('profile.cancellationSuccessMessageAndroid');

                // Alert.alert(
                //   t('profile.cancellationSuccessTitle'),
                //   successMessage,
                //   [{ text: 'OK' }]
                // );
              } else {
                Alert.alert(
                  I18n.t('profile.cancellationErrorTitle'),
                  I18n.t('profile.cancellationErrorMessage'),
                  [{ text: 'OK' }]
                );
              }
            } catch (error) {
              console.error('Erreur lors de la cancellation:', error);
              Alert.alert(
                I18n.t('profile.cancellationErrorTitle'),
                I18n.t('profile.cancellationErrorMessage'),
                [{ text: 'OK' }]
              );
            }
          },
        },
      ]
    );
  };

  const handlePrivacyPolicyPress = async () => {
    try {
      // URL de la politique de confidentialité (à adapter selon votre politique)
      const url = I18n.locale === 'fr'
        ? 'https://drive.google.com/file/d/1Uwa45KaIrYlDzpS00YFunhBVB-a4zkSi/view?usp=sharing'
        : 'https://drive.google.com/file/d/15eNZBgSnTP4cUFJ7tLi9F0kZCsyQZPUW/view?usp=sharing';

      if (Platform.OS === 'android') {
        Linking.openURL(url);
      } else {
        WebBrowser.openBrowserAsync(url);
      }
    } catch (error) {
      console.error('Erreur lors de l\'ouverture de la politique de confidentialité:', error);
      Alert.alert(
        I18n.t('common.error'),
        I18n.t('profile.privacyError'),
        [{ text: 'OK' }]
      );
    }
  };

  const handleTermsOfServicePress = async () => {
    try {
      WebBrowser.openBrowserAsync(
        'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/'
      )
    } catch (error) {
      console.error('Erreur lors de l\'ouverture des conditions d\'utilisation:', error);
      Alert.alert(
        I18n.t('common.error'),
        I18n.t('profile.termsError'),
        [{ text: 'OK' }]
      );
    }
  };

  const handleFeedbackPress = async () => {
    try {
      const subject = encodeURIComponent(I18n.t('profile.feedbackSubject'));
      const body = encodeURIComponent(I18n.t('profile.feedbackBody'));

      const mailtoUrl = `mailto:no-reply@cookeat.info?subject=${subject}&body=${body}`;

      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
      } else {
        // Fallback : copier l'email dans le presse-papiers
        Alert.alert(
          I18n.t('profile.emailNotAvailableTitle'),
          I18n.t('profile.emailNotAvailableMessage'),
          [{ text: I18n.t('common.ok') }]
        );
      }
    } catch (error) {
      console.error('Erreur lors de l\'ouverture de l\'email:', error);
      Alert.alert(
        I18n.t('common.error'),
        I18n.t('profile.emailError'),
        [{ text: I18n.t('common.ok') }]
      );
    }
  };

  const handleLanguagePress = async () => {
    const newLanguage = currentLanguage === 'fr' ? 'en' : 'fr';
    setCurrentLanguage(newLanguage);
    I18n.locale = newLanguage;

    // Sauvegarder le choix dans AsyncStorage
    try {
      await AsyncStorage.setItem('app_language', newLanguage);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la langue:', error);
    }
  };

  const getLanguageText = () => {
    switch (currentLanguage) {
      case 'fr':
        return I18n.t('profile.languages.french');
      case 'en':
        return I18n.t('profile.languages.english');
      default:
        return I18n.t('profile.languages.french');
    }
  };

  const handleNotificationsPress = async () => {
    try {
      if (Platform.OS === 'ios') {
        // Sur iOS, ouvrir les paramètres de l'app
        await Linking.openURL('app-settings:');
      } else {
        // Sur Android, ouvrir les paramètres de notifications
        await Linking.openURL('android-app://com.android.settings/.notification.NotificationAccessSettings');
      }
    } catch (error) {
      console.error('Erreur lors de l\'ouverture des paramètres:', error);
      // Fallback : ouvrir les paramètres généraux
      try {
        await Linking.openSettings();
      } catch (fallbackError) {
        console.error('Erreur lors de l\'ouverture des paramètres généraux:', fallbackError);
        Alert.alert(I18n.t('common.error'), I18n.t('profile.settingsError'));
      }
    }
  };

  const handleResetOnboardingDev = () => {
    Alert.alert(
      'Mode dev',
      'Revenir au debut de l’onboarding ?',
      [
        { text: I18n.t('common.cancel'), style: 'cancel' },
        {
          text: 'Confirmer',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiSet([
                [ONBOARDING_COMPLETED_KEY, 'false'],
                [QUESTIONS_ANSWERED_KEY, 'false'],
              ]);
              router.replace('/onboarding/welcome');
            } catch (error) {
              console.error('Erreur reset onboarding (dev):', error);
              Alert.alert(I18n.t('common.error'), 'Impossible de reinitialiser l’onboarding.');
            }
          },
        },
      ]
    );
  };

  return (
    <LinearGradient
      colors={['#F6EEE9', '#FFFFFF']}
      start={{ x: 1, y: 0 }}
      end={{ x: 0, y: 1 }}
      locations={[0, 0.3]}
      style={styles.container}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 60 }}
        showsVerticalScrollIndicator={false}
      >

        {/* Section Plan */}
        {subscriptionLoading ? (
          <View style={styles.card}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.button} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                {I18n.t('profile.loadingSubscription')}
              </Text>
            </View>
          </View>
        ) : subscriptionStatus.isSubscribed ? (
          // Utilisateur avec abonnement - Style Premium
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {I18n.t('profile.plan')}
            </Text>
            <View style={styles.card}>
              <View style={styles.subscriptionInfo}>
                <View style={styles.currentPlanInfo}>
                  <View style={styles.planBadge}>
                    <IconSymbol name="crown.fill" size={16} color={colors.button} />
                    <Text style={[styles.planBadgeText, { color: colors.button }]}>
                      {I18n.t('profile.premium')}
                    </Text>
                  </View>
                  <Text style={[styles.planName, { color: colors.text }]}>
                    {I18n.t('profile.premiumPlan')}
                  </Text>
                  {subscriptionStatus.expirationDate && (
                    <Text style={[styles.planExpiration, { color: colors.textSecondary }]}>
                      {I18n.t('profile.expiresOn')} {subscriptionStatus.expirationDate.toLocaleDateString(I18n.locale === 'fr' ? 'fr-FR' : 'en-US')}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.manageButton}
                  onPress={() => setIsSubscriptionModalVisible(true)}
                >
                  <Text style={styles.manageButtonText}>{I18n.t('profile.manage')}</Text>
                  <IconSymbol name="chevron-forward" size={14} color="#8E8E93" />
                </TouchableOpacity>
              </View>
            </View>
          </>
        ) : (
          // Utilisateur sans abonnement - Card Upsell style Accueil
          <TouchableOpacity
            style={styles.premiumCard}
            onPress={() => router.push({ pathname: '/paywall', params: { source: 'profile_banner' } })}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#FFD700', '#FDB931']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.premiumGradient}
            >
              <View style={styles.premiumContent}>
                <View style={{ flex: 1 }}>
                  <View style={styles.proBadge}>
                    <Text style={styles.proBadgeText}>PREMIUM</Text>
                  </View>
                  <Text style={styles.premiumTitle}>{I18n.t('profile.premiumTitle')}</Text>
                  <Text style={styles.premiumDescription}>
                    {I18n.t('profile.premiumPrice')}
                  </Text>
                </View>
                <View style={styles.premiumIconContainer}>
                  <IconSymbol name="crown.fill" size={40} color="white" />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

      {/* Section Paramètres */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {I18n.t('profile.generalSettings')}
      </Text>
      <View style={styles.card}>
          <TouchableOpacity style={styles.settingItem} onPress={handleNotificationsPress}>
            <IconSymbol name={Platform.OS === 'ios' ? "bell" : "notifications"} size={20} color={colors.button} />
            <Text style={[styles.settingText, { color: colors.text }]}>
              {I18n.t('profile.notifications')}
            </Text>
            <IconSymbol name={Platform.OS === 'ios' ? "chevron.right" : "chevron-forward"} size={20} color={colors.button} />
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity style={styles.settingItem} onPress={handleFeedbackPress}>
            <IconSymbol name="envelope" size={20} color={colors.button} />
            <View style={styles.settingInfo}>
              <Text style={[styles.settingText, { marginLeft: 0, marginBottom: 5, color: colors.text }]}>
                {I18n.t('profile.feedback')}
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                {I18n.t('profile.feedbackDescription')}
              </Text>
            </View>
            <IconSymbol name={Platform.OS === 'ios' ? "chevron.right" : "chevron-forward"} size={20} color={colors.button} />
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity style={styles.settingItem} onPress={handleLanguagePress}>
            <IconSymbol name="globe" size={20} color={colors.button} />
            <View style={styles.settingInfo}>
              <Text style={[styles.settingText, { marginLeft: 0, marginBottom: 5, color: colors.text }]}>
                {I18n.t('profile.language')}
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                {getLanguageText()}
              </Text>
            </View>
            <IconSymbol name={Platform.OS === 'ios' ? "chevron.right" : "chevron-forward"} size={20} color={colors.button} />
          </TouchableOpacity>
        </View>

        {__DEV__ && (
          <TouchableOpacity
            style={styles.devResetButton}
            onPress={handleResetOnboardingDev}
            activeOpacity={0.85}
          >
            <Text style={styles.devResetButtonText}>Reset onboarding (dev)</Text>
          </TouchableOpacity>
        )}

        {/* Section Mentions légales */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {I18n.t('profile.legal')}
        </Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.settingItem} onPress={handlePrivacyPolicyPress}>
            <IconSymbol name="doc.text" size={20} color={colors.button} />
            <Text style={[styles.settingText, { color: colors.text }]}>
              {I18n.t('profile.privacyPolicy')}
            </Text>
            <IconSymbol name={Platform.OS === 'ios' ? "chevron.right" : "chevron-forward"} size={20} color={colors.button} />
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity style={styles.settingItem} onPress={handleTermsOfServicePress}>
            <IconSymbol name="doc.text" size={20} color={colors.button} />
            <Text style={[styles.settingText, { color: colors.text }]}>
              {I18n.t('profile.termsOfService')}
            </Text>
            <IconSymbol name={Platform.OS === 'ios' ? "chevron.right" : "chevron-forward"} size={20} color={colors.button} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal de gestion d'abonnement */}
      <Modal
        visible={isSubscriptionModalVisible}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={closeSubscriptionModal}
      >
        <TouchableWithoutFeedback onPress={closeSubscriptionModal}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <Animated.View 
                style={[
                  styles.modalContent,
                  { transform: [{ translateY: slideAnim }] }
                ]}
              >
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{I18n.t('profile.mySubscription')}</Text>
                  <TouchableOpacity onPress={closeSubscriptionModal}>
                    <IconSymbol name="close" size={24} color="#000" />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  <View style={styles.modalPlanCard}>
                    <View style={styles.planBadge}>
                      <IconSymbol name="crown.fill" size={20} color={colors.button} />
                      <Text style={[styles.planBadgeText, { color: colors.button, fontSize: 16 }]}>
                        {I18n.t('profile.premium')}
                      </Text>
                    </View>
                    <Text style={styles.modalPlanName}>{I18n.t('profile.premiumPlan')}</Text>
                    <Text style={styles.modalPlanDescription}>
                      {I18n.t('profile.premiumBenefits')}
                    </Text>
                    {subscriptionStatus.expirationDate && (
                      <Text style={styles.modalExpirationText}>
                        {I18n.t('profile.expiresOn')} {subscriptionStatus.expirationDate.toLocaleDateString(I18n.locale === 'fr' ? 'fr-FR' : 'en-US')}
                      </Text>
                    )}
                  </View>

                  <TouchableOpacity 
                    style={[styles.closeModalButton, { backgroundColor: colors.button }]}
                    onPress={closeSubscriptionModal}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.closeModalButtonText}>{I18n.t('profile.continueCooking')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.hiddenCancelButton}
                    onPress={() => {
                      setIsSubscriptionModalVisible(false);
                      handleCancelSubscription();
                    }}
                  >
                    <Text style={styles.hiddenCancelButtonText}>{I18n.t('profile.cancelMySubscription')}</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  section: {
    paddingVertical: 10,
  },
  sectionTitle: {
    fontFamily: 'Degular',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    marginHorizontal: 20,
    marginTop: 8,
  },
  separator: {
    height: 1,
    backgroundColor: '#F2F2F7',
    marginVertical: 4,
  },
  premiumCard: {
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#FDB931',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  premiumGradient: {
    padding: 24,
  },
  premiumContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  proBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  proBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Degular',
    letterSpacing: 1,
  },
  premiumTitle: {
    fontFamily: 'Degular',
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
    width: '90%',
  },
  premiumDescription: {
    fontFamily: 'Cronos Pro',
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  premiumIconContainer: {
    width: 60,
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  preferenceInfo: {
    flex: 1,
    marginRight: 16,
  },
  preferenceLabel: {
    fontFamily: 'Cronos Pro',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  preferenceDescription: {
    fontFamily: 'Cronos Pro',
    fontSize: 18,
  },
  subscriptionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  currentPlanInfo: {
    flex: 1,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  planBadgeText: {
    fontFamily: 'Cronos Pro',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  planName: {
    fontFamily: 'Degular',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  planExpiration: {
    fontFamily: 'Cronos Pro',
    fontSize: 14,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  cancelButtonText: {
    fontFamily: 'Cronos Pro',
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FF3B30',
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  manageButtonText: {
    fontFamily: 'Cronos Pro',
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontFamily: 'Degular',
    fontSize: 24,
    fontWeight: 'bold',
  },
  modalBody: {
    alignItems: 'center',
  },
  modalPlanCard: {
    width: '100%',
    backgroundColor: '#F8F8FD',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  modalPlanName: {
    fontFamily: 'Degular',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
  },
  modalPlanDescription: {
    fontFamily: 'Cronos Pro',
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalExpirationText: {
    fontFamily: 'Cronos Pro',
    fontSize: 14,
    color: '#AEAEB2',
  },
  closeModalButton: {
    width: '100%',
    borderRadius: 25,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#FEB50A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  closeModalButtonText: {
    fontFamily: 'Degular',
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  hiddenCancelButton: {
    paddingVertical: 10,
  },
  hiddenCancelButtonText: {
    fontFamily: 'Cronos Pro',
    fontSize: 14,
    color: '#D1D1D6',
    textDecorationLine: 'underline',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  settingText: {
    fontFamily: 'Cronos Pro',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    marginLeft: 12,
  },
  settingInfo: {
    flex: 1,
    marginLeft: 12,
  },
  settingDescription: {
    fontFamily: 'Cronos Pro',
    fontSize: 16,
    marginTop: 2,
  },
  preferenceActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Styles pour la gestion d'abonnement
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  loadingText: {
    fontFamily: 'Cronos Pro',
    fontSize: 14,
    marginTop: 8,
  },
  devResetButton: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#FFF1F0',
    borderColor: '#FFB3AE',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  devResetButtonText: {
    fontFamily: 'Cronos Pro',
    fontSize: 16,
    fontWeight: 'bold',
    color: '#D9382A',
  },
}); 