import { CREATOR_PROMO_CODES_ENABLED } from '../../config/storeCompliance';
import { feedback } from '../../services/haptics';
import { EntranceView } from '../../components/motion/Entrance';
import { AppScreenHeading } from '../../components/AppScreenHeading';
import { SettingsRow } from '../../components/SettingsRow';
import { Ionicons } from '@expo/vector-icons';
import { NavigationIconButton } from '../../components/NavigationIconButton';
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
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '../../components/ui/IconSymbol';
import { AppTheme as theme, appStyles } from '../../constants/AppTheme';
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
  const { height: screenHeight, gutter } = useResponsive();
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
    if (newLanguage !== currentLanguage) feedback.selection();
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
    <View style={appStyles.screen}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ ...contentColumn(), paddingTop: insets.top + 8, paddingHorizontal: gutter, paddingBottom: theme.bottomSpace }} showsVerticalScrollIndicator={false}>
        <AppScreenHeading title={t('tabs.profile')} />
        <Text style={styles.sectionTitle}>{t('profile.generalSettings')}</Text>
        <EntranceView entranceIndex={0} style={styles.card}>
          <SettingsRow icon="notifications-outline" title={t('profile.notifications')} onPress={handleNotificationsPress} />
          <View style={styles.separator} />
          <SettingsRow icon="language-outline" title={t('profile.language')} description={getLanguageText()} onPress={() => setIsLanguageModalVisible(true)} />
          <View style={styles.separator} />
          <SettingsRow icon="mail-outline" title={t('profile.feedback')} description={t('profile.feedbackDescription')} onPress={handleFeedbackPress} />
          {!subscriptionStatus.isSubscribed && <>
            <View style={styles.separator} />
            {CREATOR_PROMO_CODES_ENABLED && <SettingsRow icon="pricetag-outline" title={t('profile.promoCode')} description={t('profile.promoCodeDescription')} onPress={() => setIsPromoModalVisible(true)} />}
          </>}
        </EntranceView>

        <Text style={styles.sectionTitle}>{t('profile.plan')}</Text>
        <EntranceView entranceIndex={1}>
        {subscriptionLoading ? <View style={styles.card}><View style={styles.loadingContainer}>
          <ActivityIndicator color={theme.yellow} /><Text style={styles.loadingText}>{t('profile.loadingSubscription')}</Text>
        </View></View> : <TouchableOpacity accessibilityRole="button" accessibilityLabel={t(subscriptionStatus.isSubscribed ? 'profile.manage' : 'dailyApp.subscriptionDetails')} style={styles.subscriptionCard}
          onPress={() => { feedback.light(); if (subscriptionStatus.isSubscribed) setIsSubscriptionModalVisible(true); else router.push({ pathname: '/paywall', params: { source: 'profile_banner' } }); }} activeOpacity={0.8}>
          <View style={styles.planIcon}><Ionicons name="sparkles-outline" size={23} color={theme.yellow} /></View>
          <View style={styles.currentPlanInfo}>
            <Text style={styles.planName}>{t('profile.premiumPlan')}</Text>
            <Text style={styles.planExpiration}>{subscriptionStatus.isSubscribed
              ? (subscriptionStatus.expirationDate ? `${t('profile.expiresOn')} ${subscriptionStatus.expirationDate.toLocaleDateString(getLanguageLocale(i18n.language))}` : t('profile.premium'))
              : t('dailyApp.subscriptionDetails')}</Text>
            {subscriptionStatus.isSubscribed && <Text style={styles.manageText}>{t('profile.manage')}</Text>}
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.muted} />
        </TouchableOpacity>}
        </EntranceView>

        <Text style={styles.sectionTitle}>{t('profile.legal')}</Text>
        <EntranceView entranceIndex={3} style={styles.card}>
          <SettingsRow icon="shield-checkmark-outline" title={t('profile.privacyPolicy')} onPress={handlePrivacyPolicyPress} />
          <View style={styles.separator} />
          <SettingsRow icon="document-text-outline" title={t('profile.termsOfService')} onPress={handleTermsOfServicePress} />
        </EntranceView>
        <EntranceView entranceIndex={4} style={styles.card}><SettingsRow icon="trash-outline" title={t('profile.deleteAccount')} onPress={handleDeleteAccount} destructive /></EntranceView>
        {__DEV__ && <TouchableOpacity accessibilityRole="button" style={styles.devResetButton} onPress={handleResetOnboardingDev}><Text style={styles.devResetButtonText}>Reset onboarding (dev)</Text></TouchableOpacity>}
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
                  <AppScreenHeading title={t('profile.mySubscription')} action={<NavigationIconButton kind="close"
                      style={styles.modalCloseButton}
                      onPress={closeSubscriptionModal}
                      accessibilityRole="button"
                      accessibilityLabel={t('common.close')}
                     />} />

                  <ScrollView
                    style={styles.modalScrollView}
                    contentContainerStyle={styles.modalScrollContent}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                  >
                    <View style={styles.modalBody}>
                      <View style={styles.modalPlanCard}>
                        <View style={styles.planBadge}>
                          <IconSymbol name="crown.fill" size={20} color={theme.yellow} />
                          <Text style={styles.planBadgeText}>
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
                        style={[styles.closeModalButton, { backgroundColor: theme.yellow }]}
                        onPress={closeSubscriptionModal}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.subscriptionModalButtonText}>{t('profile.continueCooking')}</Text>
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
                    { paddingBottom: Math.max(insets.bottom, 16) + 16, maxHeight: screenHeight - insets.top - 24 },
                  ]}
                >
                  <AppScreenHeading title={t('profile.language')} action={<NavigationIconButton kind="close"
                      style={styles.modalCloseButton}
                      onPress={() => setIsLanguageModalVisible(false)}
                      accessibilityRole="button"
                      accessibilityLabel={t('common.close')}
                     />} />

                  <ScrollView showsVerticalScrollIndicator={false}>
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
                        <Text style={[styles.languageOptionText, selected && styles.languageOptionSelectedText]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  </ScrollView>
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
                      maxHeight: screenHeight - insets.top - 24,
                      paddingBottom: Math.max(insets.bottom, 16) + 16,
                    },
                  ]}
                >
                  <AppScreenHeading title={t('profile.promoCodeTitle')} action={<NavigationIconButton kind="close" onPress={closePromoModal} />} />

                  <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalBody}>
                    <View style={styles.promoInputContainer}>
                      <TextInput
                        style={styles.promoInput}
                        accessibilityLabel={t('profile.promoCodeTitle')}
                        value={promoCode}
                        onChangeText={(text) => {
                          setPromoCode(text.toUpperCase());
                          setPromoError('');
                        }}
                        placeholder={t('profile.promoCodePlaceholder')}
                        placeholderTextColor={theme.muted}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        returnKeyType="done"
                        onSubmitEditing={handleValidatePromoCode}
                      />
                    </View>

                    {promoError ? (
                      <Text accessibilityRole="alert" style={styles.promoErrorText}>{promoError}</Text>
                    ) : null}

                    <TouchableOpacity
                      style={[
                        styles.closeModalButton,
                        { backgroundColor: theme.yellow },
                        (!promoCode.trim() || promoLoading) && { opacity: 0.5 },
                      ]}
                      onPress={handleValidatePromoCode}
                      disabled={!promoCode.trim() || promoLoading}
                      activeOpacity={0.8}
                    >
                      {promoLoading ? (
                        <ActivityIndicator color={theme.ink} />
                      ) : (
                        <Text style={styles.closeModalButtonText}>
                          {t('profile.promoCodeValidate')}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </ScrollView>
                </Animated.View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...appStyles.card, paddingHorizontal: 16, paddingVertical: 2, marginBottom: 24 },
  sectionTitle: { ...appStyles.section, marginBottom: 12 },
  separator: { height: 1, backgroundColor: theme.line, marginLeft: 52 },
  subscriptionCard: { ...appStyles.card, borderColor: theme.yellow, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  planIcon: { width: 44, height: 44, borderRadius: 16, backgroundColor: theme.yellowSoft, alignItems: 'center', justifyContent: 'center' },
  currentPlanInfo: { flex: 1, minWidth: 0 },
  planBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  planBadgeText: { fontFamily: 'CronosProBold', fontSize: 14, color: theme.ink },
  planName: { fontFamily: 'Degular', fontSize: 21, lineHeight: 25, color: theme.ink },
  planExpiration: { fontFamily: 'CronosPro', fontSize: 14, lineHeight: 20, marginTop: 4, color: theme.muted },
  manageText: { ...appStyles.textAction, marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(8,26,16,0.38)', justifyContent: 'flex-end', alignItems: 'center' },
  modalOverlayInner: { flex: 1, width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  modalContent: { backgroundColor: theme.background, width: '100%', maxWidth: 560, alignSelf: 'center', borderTopLeftRadius: theme.radius, borderTopRightRadius: theme.radius, padding: 20, overflow: 'hidden' },
  modalCloseButton: {},
  modalScrollView: { width: '100%', flexShrink: 1 },
  modalScrollContent: { paddingBottom: 8 },
  modalBody: { alignItems: 'stretch' },
  languageOption: { minHeight: 58, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderRadius: 17, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface, marginBottom: 10 },
  languageOptionSelected: { backgroundColor: theme.yellow, borderColor: theme.yellow },
  languageOptionText: { flex: 1, fontFamily: 'Degular', fontSize: 19, color: theme.ink },
  languageOptionSelectedText: { color: appStyles.buttonText.color },
  modalPlanCard: { ...appStyles.card, marginBottom: 20 },
  modalPlanName: { ...appStyles.section, marginTop: 12, marginBottom: 8 },
  modalPlanDescription: { fontFamily: 'CronosPro', fontSize: 16, lineHeight: 23, color: theme.muted, marginBottom: 16 },
  modalExpirationText: { fontFamily: 'CronosPro', fontSize: 14, lineHeight: 20, color: theme.muted },
  closeModalButton: { ...appStyles.button, width: '100%', marginBottom: 12 },
  closeModalButtonText: { ...appStyles.buttonText, color: theme.ink, textAlign: 'center' },
  subscriptionModalButtonText: { ...appStyles.buttonText, textAlign: 'center' },
  hiddenCancelButton: { minHeight: 48, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center' },
  hiddenCancelButtonText: { ...appStyles.textAction, textAlign: 'center', textDecorationLine: 'underline' },
  loadingContainer: { alignItems: 'center', gap: 10, paddingVertical: 24 },
  loadingText: { fontFamily: 'CronosPro', fontSize: 14, color: theme.muted },
  devResetButton: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  devResetButtonText: { fontFamily: 'CronosPro', fontSize: 13, color: theme.muted },
  promoInputContainer: { width: '100%', backgroundColor: theme.surface, borderRadius: 17, borderWidth: 1, borderColor: theme.line, paddingHorizontal: 16, marginBottom: 16 },
  promoInput: { minHeight: 60, fontFamily: 'Degular', fontSize: 23, color: theme.ink, paddingVertical: 16, textAlign: 'center' },
  promoErrorText: { ...appStyles.error, textAlign: 'center' },
});
