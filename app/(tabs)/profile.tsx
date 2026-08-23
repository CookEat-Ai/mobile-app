import React, { useCallback, useEffect, useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  Animated,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import Reanimated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '../../components/ui/IconSymbol';
import { Colors } from '../../constants/Colors';
import { font, getTabBarHeight } from '../../constants/Layout';
import { contentColumn, useResponsive } from '../../hooks/useResponsive';
import { useSubscription } from '../../hooks/useSubscription';
import * as WebBrowser from "expo-web-browser";
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { getUniqueDeviceId } from '../../services/deviceStorage';
import analytics from '../../services/analytics';
import { getPrivacyPolicyUrl, getTermsUrl } from '../../config/legal';
import { getLanguageLocale, resolveSupportedLanguage, SupportedLanguage } from '../../i18n';

const ONBOARDING_COMPLETED_KEY = 'onboarding_completed';
const QUESTIONS_ANSWERED_KEY = 'questions_answered';
const LANGUAGE_OPTIONS: readonly { value: SupportedLanguage; label: string }[] = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
  { value: 'es-ES', label: 'Español (España)' },
  { value: 'es-MX', label: 'Español (México)' },
  { value: 'pt-BR', label: 'Português (Brasil)' },
];

export default function ProfileScreen() {

  const colors = Colors.light;
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const { subscriptionStatus, isLoading: subscriptionLoading, loadSubscriptionStatus, cancelSubscription } = useSubscription();
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>(resolveSupportedLanguage(i18n.language));
  const [isLanguageModalVisible, setIsLanguageModalVisible] = useState(false);
  const [isSubscriptionModalVisible, setIsSubscriptionModalVisible] = useState(false);
  const [isPromoModalVisible, setIsPromoModalVisible] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');
  // `useResponsive` suit la rotation / le Split View ; l'ancienne lecture de
  // `Dimensions` était figée au premier import du module.
  const { width, height: screenHeight } = useResponsive();
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const promoSlideAnim = useRef(new Animated.Value(screenHeight)).current;

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
  }, [isSubscriptionModalVisible, screenHeight, slideAnim]);

  useEffect(() => {
    if (isPromoModalVisible) {
      Animated.spring(promoSlideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    } else {
      promoSlideAnim.setValue(screenHeight);
    }
  }, [isPromoModalVisible, promoSlideAnim, screenHeight]);

  const closePromoModal = () => {
    Animated.timing(promoSlideAnim, {
      toValue: screenHeight,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsPromoModalVisible(false);
      setPromoCode('');
      setPromoError('');
    });
  };

  const handleValidatePromoCode = async () => {
    if (!promoCode.trim()) return;
    setPromoError('');
    setPromoLoading(true);

    try {
      const response = await api.validatePromoCode(promoCode.trim());

      if (response.data?.isValid && response.data.discountPercentage) {
        await AsyncStorage.setItem('pending_promo_code', promoCode.trim().toUpperCase());
        await AsyncStorage.setItem('pending_promo_discount', String(response.data.discountPercentage));
        closePromoModal();

        setTimeout(() => {
          router.push({
            pathname: '/paywall',
            params: {
              source: 'profile_promo_code',
              initialState: 'PROMO_DISCOUNTED',
              promoDiscount: String(response.data!.discountPercentage),
            },
          });
        }, 400);
      } else {
        setPromoError(response.error || t('promoCode.invalid'));
      }
    } catch {
      setPromoError(t('promoCode.invalid'));
    } finally {
      setPromoLoading(false);
    }
  };

  const dismissSubscriptionModal = (afterClose?: () => void) => {
    Animated.timing(slideAnim, {
      toValue: screenHeight,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsSubscriptionModalVisible(false);
      afterClose?.();
    });
  };

  const closeSubscriptionModal = () => dismissSubscriptionModal();

  useEffect(() => {
    const loadSavedLanguage = async () => {
      const savedLang = await AsyncStorage.getItem('app_language');
      if (savedLang) setCurrentLanguage(resolveSupportedLanguage(savedLang));
    };
    loadSavedLanguage();
  }, []);

  useFocusEffect(useCallback(() => {
    const checkSubscriptionStatus = async () => {
      loadSubscriptionStatus();
    };
    checkSubscriptionStatus();
  }, []));

  const handleCancelSubscription = () => {
    Alert.alert(
      t('profile.cancelSubscriptionTitle'),
      t('profile.cancelSubscriptionMessage'),
      [
        {
          text: t('profile.cancel'),
          style: 'cancel',
        },
        {
          text: t('profile.confirm'),
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
                  t('profile.cancellationErrorTitle'),
                  t('profile.cancellationErrorMessage'),
                  [{ text: 'OK' }]
                );
              }
            } catch (error) {
              console.error('Erreur lors de la cancellation:', error);
              Alert.alert(
                t('profile.cancellationErrorTitle'),
                t('profile.cancellationErrorMessage'),
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
      const url = getPrivacyPolicyUrl(i18n.language);

      if (Platform.OS === 'android') {
        Linking.openURL(url);
      } else {
        WebBrowser.openBrowserAsync(url);
      }
    } catch (error) {
      console.error('Erreur lors de l\'ouverture de la politique de confidentialité:', error);
      Alert.alert(
        t('common.error'),
        t('profile.privacyError'),
        [{ text: 'OK' }]
      );
    }
  };

  const handleTermsOfServicePress = async () => {
    try {
      const url = getTermsUrl(i18n.language);

      if (Platform.OS === 'android') {
        Linking.openURL(url);
      } else {
        WebBrowser.openBrowserAsync(url);
      }
    } catch (error) {
      console.error('Erreur lors de l\'ouverture des conditions d\'utilisation:', error);
      Alert.alert(
        t('common.error'),
        t('profile.termsError'),
        [{ text: 'OK' }]
      );
    }
  };

  const handleFeedbackPress = async () => {
    try {
      const subject = encodeURIComponent(t('profile.feedbackSubject'));
      const body = encodeURIComponent(t('profile.feedbackBody'));

      const mailtoUrl = `mailto:no-reply@cookeat.info?subject=${subject}&body=${body}`;

      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
      } else {
        // Fallback : copier l'email dans le presse-papiers
        Alert.alert(
          t('profile.emailNotAvailableTitle'),
          t('profile.emailNotAvailableMessage'),
          [{ text: t('common.ok') }]
        );
      }
    } catch (error) {
      console.error('Erreur lors de l\'ouverture de l\'email:', error);
      Alert.alert(
        t('common.error'),
        t('profile.emailError'),
        [{ text: t('common.ok') }]
      );
    }
  };

  const selectLanguage = async (newLanguage: SupportedLanguage) => {
    setCurrentLanguage(newLanguage);
    await i18n.changeLanguage(newLanguage);
    await AsyncStorage.setItem('app_language', newLanguage);
    setIsLanguageModalVisible(false);
  };

  const getLanguageText = () => {
    return LANGUAGE_OPTIONS.find(({ value }) => value === currentLanguage)?.label ?? 'English';
  };

  const handleNotificationsPress = async () => {
    try {
      if (Platform.OS === 'ios') {
        // Sur iOS, ouvrir les paramètres de l'app
        await Linking.openURL('app-settings:');
      } else {
        // Sur Android, ouvrir les paramètres de l'app (où l'utilisateur peut gérer les notifications)
        await Linking.openSettings();
      }
    } catch (error) {
      console.error('Erreur lors de l\'ouverture des paramètres:', error);
      // Fallback : ouvrir les paramètres généraux
      try {
        await Linking.openSettings();
      } catch (fallbackError) {
        console.error('Erreur lors de l\'ouverture des paramètres généraux:', fallbackError);
        Alert.alert(t('common.error'), t('profile.settingsError'));
      }
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('profile.deleteAccountTitle'),
      t('profile.deleteAccountMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              t('profile.deleteAccountConfirmTitle'),
              t('profile.deleteAccountConfirmMessage'),
              [
                { text: t('common.cancel'), style: 'cancel' },
                {
                  text: t('profile.deleteAccountButton'),
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      // Récupérer le mobileId pour la suppression côté API
                      const mobileId = await getUniqueDeviceId();
                      if (mobileId) {
                        const response = await api.deleteUser(mobileId);
                        if (response.error) {
                          throw new Error(response.error);
                        }
                      }

                      // Conserver la langue avant de tout effacer
                      const currentLang = await AsyncStorage.getItem('app_language');
                      await AsyncStorage.clear();
                      await analytics.resetIdentity({
                        rotateDeviceId: true,
                        clearAttribution: true,
                      });
                      if (currentLang) {
                        await AsyncStorage.setItem('app_language', currentLang);
                      }

                      // Revenir à l'onboarding
                      router.replace('/onboarding/welcome');
                    } catch (error) {
                      console.error('Erreur lors de la suppression du compte:', error);
                      Alert.alert(t('common.error'), t('profile.deleteError'));
                    }
                  }
                }
              ]
            );
          },
        },
      ]
    );
  };

  const handleResetOnboardingDev = () => {
    Alert.alert(
      'Mode dev',
      'Revenir au debut de l’onboarding ?',
      [
        { text: t('common.cancel'), style: 'cancel' },
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
              Alert.alert(t('common.error'), t('profile.onboardingResetError'));
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
        contentContainerStyle={{
          paddingTop: insets.top + 60,
          paddingBottom: getTabBarHeight(width, screenHeight) + insets.bottom + 32,
          ...contentColumn(),
        }}
        showsVerticalScrollIndicator={false}
      >

        {/* Section Plan */}
        {subscriptionLoading ? (
          <Reanimated.View entering={FadeInDown.duration(400).delay(50)} style={styles.card}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.button} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                {t('profile.loadingSubscription')}
              </Text>
            </View>
          </Reanimated.View>
        ) : (subscriptionStatus.isSubscribed) ? (
          // Utilisateur avec abonnement - Style Premium
          <Reanimated.View entering={FadeInDown.duration(400).delay(50)}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('profile.plan')}
            </Text>
            <View style={styles.card}>
              <View style={styles.subscriptionInfo}>
                <View style={styles.currentPlanInfo}>
                  <View style={styles.planBadge}>
                    <IconSymbol name="crown.fill" size={16} color={colors.button} />
                    <Text style={[styles.planBadgeText, { color: colors.button }]}>
                      {t('profile.premium')}
                    </Text>
                  </View>
                  <Text style={[styles.planName, { color: colors.text }]}>
                    {t('profile.premiumPlan')}
                  </Text>
                  {subscriptionStatus.expirationDate && (
                    <Text style={[styles.planExpiration, { color: colors.textSecondary }]}>
                      {t('profile.expiresOn')} {subscriptionStatus.expirationDate.toLocaleDateString(getLanguageLocale(i18n.language))}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.manageButton}
                  onPress={() => setIsSubscriptionModalVisible(true)}
                >
                  <Text style={styles.manageButtonText}>{t('profile.manage')}</Text>
                  <IconSymbol name="chevron-forward" size={14} color="#8E8E93" />
                </TouchableOpacity>
              </View>
            </View>
          </Reanimated.View>
        ) : (
          // Utilisateur sans abonnement - Card Upsell style Accueil, ou mode dev
          <Reanimated.View entering={FadeInDown.duration(400).delay(50)}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('profile.plan')}
            </Text>
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
                    <Text style={styles.premiumTitle}>{t('profile.premiumTitle')}</Text>
                    <Text style={styles.premiumDescription}>
                      {t('profile.premiumPrice')}
                    </Text>
                  </View>
                  <View style={styles.premiumIconContainer}>
                    <IconSymbol name="crown.fill" size={40} color="white" />
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Reanimated.View>
        )}

        {/* Section Paramètres */}
        <Reanimated.View entering={FadeInDown.duration(400).delay(100)}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t('profile.generalSettings')}
          </Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.settingItem} onPress={handleNotificationsPress}>
              <IconSymbol name={Platform.OS === 'ios' ? "bell" : "notifications"} size={20} color={colors.button} />
              <Text style={[styles.settingText, { color: colors.text }]}>
                {t('profile.notifications')}
              </Text>
              <IconSymbol name={Platform.OS === 'ios' ? "chevron.right" : "chevron-forward"} size={20} color={colors.button} />
            </TouchableOpacity>

            <View style={styles.separator} />

            <TouchableOpacity style={styles.settingItem} onPress={handleFeedbackPress}>
              <IconSymbol name="envelope" size={20} color={colors.button} />
              <View style={styles.settingInfo}>
                <Text style={[styles.settingText, { marginLeft: 0, marginBottom: 5, color: colors.text }]}>
                  {t('profile.feedback')}
                </Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  {t('profile.feedbackDescription')}
                </Text>
              </View>
              <IconSymbol name={Platform.OS === 'ios' ? "chevron.right" : "chevron-forward"} size={20} color={colors.button} />
            </TouchableOpacity>

            <View style={styles.separator} />

            <TouchableOpacity style={styles.settingItem} onPress={() => setIsLanguageModalVisible(true)}>
              <IconSymbol name="globe" size={20} color={colors.button} />
              <View style={styles.settingInfo}>
                <Text style={[styles.settingText, { marginLeft: 0, marginBottom: 5, color: colors.text }]}>
                  {t('profile.language')}
                </Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  {getLanguageText()}
                </Text>
              </View>
              <IconSymbol name={Platform.OS === 'ios' ? "chevron.right" : "chevron-forward"} size={20} color={colors.button} />
            </TouchableOpacity>

            {!subscriptionStatus.isSubscribed && (
              <>
                <View style={styles.separator} />

                <TouchableOpacity style={styles.settingItem} onPress={() => setIsPromoModalVisible(true)}>
                  <IconSymbol name="pricetag" size={20} color={colors.button} />
                  <View style={styles.settingInfo}>
                    <Text style={[styles.settingText, { marginLeft: 0, marginBottom: 5, color: colors.text }]}>
                      {t('profile.promoCode')}
                    </Text>
                    <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                      {t('profile.promoCodeDescription')}
                    </Text>
                  </View>
                  <IconSymbol name={Platform.OS === 'ios' ? "chevron.right" : "chevron-forward"} size={20} color={colors.button} />
                </TouchableOpacity>
              </>
            )}

            <View style={styles.separator} />

            <TouchableOpacity style={styles.settingItem} onPress={handleDeleteAccount}>
              <IconSymbol name="trash" size={20} color="#FF3B30" />
              <View style={styles.settingInfo}>
                <Text style={[styles.settingText, { marginLeft: 0, color: "#FF3B30" }]}>
                  {t('profile.deleteAccount')}
                </Text>
              </View>
              <IconSymbol name={Platform.OS === 'ios' ? "chevron.right" : "chevron-forward"} size={20} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        </Reanimated.View>

        {__DEV__ && (
          <Reanimated.View entering={FadeInDown.duration(400).delay(150)}>
            <TouchableOpacity
              style={styles.devResetButton}
              onPress={handleResetOnboardingDev}
              activeOpacity={0.85}
            >
              <Text style={styles.devResetButtonText}>Reset onboarding (dev)</Text>
            </TouchableOpacity>
          </Reanimated.View>
        )}

        {/* Section Mentions légales */}
        <Reanimated.View entering={FadeInDown.duration(400).delay(200)}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t('profile.legal')}
          </Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.settingItem} onPress={handlePrivacyPolicyPress}>
              <IconSymbol name="doc.text" size={20} color={colors.button} />
              <Text style={[styles.settingText, { color: colors.text }]}>
                {t('profile.privacyPolicy')}
              </Text>
              <IconSymbol name={Platform.OS === 'ios' ? "chevron.right" : "chevron-forward"} size={20} color={colors.button} />
            </TouchableOpacity>

            <View style={styles.separator} />

            <TouchableOpacity style={styles.settingItem} onPress={handleTermsOfServicePress}>
              <IconSymbol name="doc.text" size={20} color={colors.button} />
              <Text style={[styles.settingText, { color: colors.text }]}>
                {t('profile.termsOfService')}
              </Text>
              <IconSymbol name={Platform.OS === 'ios' ? "chevron.right" : "chevron-forward"} size={20} color={colors.button} />
            </TouchableOpacity>
          </View>
        </Reanimated.View>
      </ScrollView>

      {/* Modal de gestion d'abonnement */}
      <Modal
        visible={isSubscriptionModalVisible}
        transparent={true}
        animationType="fade"
        presentationStyle="overFullScreen"
        statusBarTranslucent={true}
        onRequestClose={closeSubscriptionModal}
      >
        <TouchableWithoutFeedback onPress={closeSubscriptionModal}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalOverlayInner}>
              <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <Animated.View
                  style={[
                    styles.modalContent,
                    {
                      transform: [{ translateY: slideAnim }],
                      paddingBottom: Math.max(insets.bottom, 16) + 16,
                      maxHeight: screenHeight - Math.max(insets.top, 16) - 16,
                    }
                  ]}
                >
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{t('profile.mySubscription')}</Text>
                    <TouchableOpacity
                      style={styles.modalCloseButton}
                      onPress={closeSubscriptionModal}
                      accessibilityRole="button"
                      accessibilityLabel={t('common.close')}
                    >
                      <IconSymbol name="close" size={24} color="#000" />
                    </TouchableOpacity>
                  </View>

                  <ScrollView
                    style={styles.modalScrollView}
                    contentContainerStyle={styles.modalScrollContent}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                  >
                    <View style={styles.modalBody}>
                      <View style={styles.modalPlanCard}>
                        <View style={styles.planBadge}>
                          <IconSymbol name="crown.fill" size={20} color={colors.button} />
                          <Text style={[styles.planBadgeText, { color: colors.button, fontSize: 16 }]}>
                            {t('profile.premium')}
                          </Text>
                        </View>
                        <Text style={styles.modalPlanName}>{t('profile.premiumPlan')}</Text>
                        <Text style={styles.modalPlanDescription}>
                          {t('profile.premiumBenefits')}
                        </Text>
                        {subscriptionStatus.expirationDate && (
                          <Text style={styles.modalExpirationText}>
                            {t('profile.expiresOn')} {subscriptionStatus.expirationDate.toLocaleDateString(getLanguageLocale(i18n.language))}
                          </Text>
                        )}
                      </View>

                      <TouchableOpacity
                        style={[styles.closeModalButton, { backgroundColor: colors.button }]}
                        onPress={closeSubscriptionModal}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.closeModalButtonText}>{t('profile.continueCooking')}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.hiddenCancelButton}
                        onPress={() => {
                          // La confirmation Store est une alerte native : on ne
                          // la présente qu'après la disparition complète de la
                          // feuille pour éviter deux couches natives superposées.
                          dismissSubscriptionModal(handleCancelSubscription);
                        }}
                      >
                        <Text style={styles.hiddenCancelButtonText}>{t('profile.cancelMySubscription')}</Text>
                      </TouchableOpacity>
                    </View>
                  </ScrollView>
                </Animated.View>
              </TouchableWithoutFeedback>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      {/* Sélecteur de langue */}
      <Modal
        visible={isLanguageModalVisible}
        transparent={true}
        animationType="fade"
        presentationStyle="overFullScreen"
        statusBarTranslucent={true}
        onRequestClose={() => setIsLanguageModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsLanguageModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalOverlayInner}>
              <TouchableWithoutFeedback>
                <View
                  style={[
                    styles.modalContent,
                    { paddingBottom: Math.max(insets.bottom, 16) + 16 },
                  ]}
                >
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{t('profile.language')}</Text>
                    <TouchableOpacity
                      style={styles.modalCloseButton}
                      onPress={() => setIsLanguageModalVisible(false)}
                      accessibilityRole="button"
                      accessibilityLabel={t('common.close')}
                    >
                      <IconSymbol name="close" size={24} color="#000" />
                    </TouchableOpacity>
                  </View>

                  {LANGUAGE_OPTIONS.map((option) => {
                    const selected = option.value === currentLanguage;
                    return (
                      <TouchableOpacity
                        key={option.value}
                        style={[styles.languageOption, selected && styles.languageOptionSelected]}
                        onPress={() => selectLanguage(option.value)}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selected }}
                      >
                        <Text style={[styles.languageOptionText, selected && { color: colors.button }]}>
                          {option.label}
                        </Text>
                        {selected && <IconSymbol name="checkmark" size={22} color={colors.button} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </TouchableWithoutFeedback>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      {/* Modal de code promo */}
      <Modal
        visible={isPromoModalVisible}
        transparent={true}
        animationType="fade"
        presentationStyle="overFullScreen"
        statusBarTranslucent={true}
        onRequestClose={closePromoModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={closePromoModal}>
            <View style={styles.modalOverlayInner}>
              <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <Animated.View
                  style={[
                    styles.modalContent,
                    {
                      transform: [{ translateY: promoSlideAnim }],
                      paddingBottom: Math.max(insets.bottom, 16) + 16,
                    },
                  ]}
                >
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{t('profile.promoCodeTitle')}</Text>
                    <TouchableOpacity onPress={closePromoModal}>
                      <IconSymbol name="close" size={24} color="#000" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.modalBody}>
                    <View style={styles.promoInputContainer}>
                      <TextInput
                        style={styles.promoInput}
                        value={promoCode}
                        onChangeText={(text) => {
                          setPromoCode(text.toUpperCase());
                          setPromoError('');
                        }}
                        placeholder={t('profile.promoCodePlaceholder')}
                        placeholderTextColor="#AEAEB2"
                        autoCapitalize="characters"
                        autoCorrect={false}
                        returnKeyType="done"
                        onSubmitEditing={handleValidatePromoCode}
                      />
                    </View>

                    {promoError ? (
                      <Text style={styles.promoErrorText}>{promoError}</Text>
                    ) : null}

                    <TouchableOpacity
                      style={[
                        styles.closeModalButton,
                        { backgroundColor: colors.button },
                        (!promoCode.trim() || promoLoading) && { opacity: 0.5 },
                      ]}
                      onPress={handleValidatePromoCode}
                      disabled={!promoCode.trim() || promoLoading}
                      activeOpacity={0.8}
                    >
                      {promoLoading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.closeModalButtonText}>
                          {t('profile.promoCodeValidate')}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
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
    fontSize: font(24),
    marginBottom: 16,
    marginHorizontal: 20,
    marginTop: 8,
    fontFamily: 'Degular'
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
    letterSpacing: 1,
    fontFamily: 'Degular'
  },
  premiumTitle: {
    fontSize: font(22),
    color: 'white',
    marginBottom: 4,
    fontFamily: 'Degular'
  },
  premiumDescription: {
    fontFamily: 'CronosPro',
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
    fontSize: 18,
    marginBottom: 4,
    fontFamily: 'CronosProBold'
  },
  preferenceDescription: {
    fontFamily: 'CronosPro',
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
    fontSize: 14,
    letterSpacing: 0.5,
    fontFamily: 'CronosProBold'
  },
  planName: {
    fontSize: 20,
    marginBottom: 2,
    fontFamily: 'Degular'
  },
  planExpiration: {
    fontFamily: 'CronosPro',
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
    fontSize: 13,
    color: '#FF3B30',
    fontFamily: 'CronosProBold'
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
    fontSize: 14,
    color: '#8E8E93',
    fontFamily: 'CronosProBold'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalOverlayInner: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: font(24),
    fontFamily: 'Degular'
  },
  modalCloseButton: {
    width: 44,
    height: 44,
    marginRight: -10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  modalScrollView: {
    width: '100%',
  },
  modalScrollContent: {
    paddingBottom: 2,
  },
  modalBody: {
    alignItems: 'center',
  },
  languageOption: {
    minHeight: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    marginBottom: 6,
  },
  languageOptionSelected: {
    backgroundColor: '#FFF8E6',
  },
  languageOptionText: {
    fontFamily: 'CronosProBold',
    fontSize: 17,
    color: '#081A10',
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
    fontSize: 22,
    marginTop: 12,
    marginBottom: 8,
    fontFamily: 'Degular'
  },
  modalPlanDescription: {
    fontFamily: 'CronosPro',
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalExpirationText: {
    fontFamily: 'CronosPro',
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
    fontSize: 18,
    color: 'white',
    fontFamily: 'Degular'
  },
  hiddenCancelButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hiddenCancelButtonText: {
    fontFamily: 'CronosPro',
    fontSize: 15,
    color: '#6B7280',
    textDecorationLine: 'underline',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  settingText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 18,
    fontFamily: 'CronosProBold'
  },
  settingInfo: {
    flex: 1,
    marginLeft: 12,
  },
  settingDescription: {
    fontFamily: 'CronosPro',
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
    fontFamily: 'CronosPro',
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
    fontSize: 16,
    color: '#D9382A',
    fontFamily: 'CronosProBold'
  },
  promoInputContainer: {
    width: '100%',
    backgroundColor: '#F8F8FD',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#F2F2F7',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  promoInput: {
    fontSize: 18,
    fontFamily: 'Degular',
    color: '#081A10',
    paddingVertical: 16,
    letterSpacing: 2,
    textAlign: 'center',
  },
  promoErrorText: {
    color: '#FF3B30',
    fontSize: 14,
    fontFamily: 'CronosPro',
    marginBottom: 12,
    textAlign: 'center',
  },
});
