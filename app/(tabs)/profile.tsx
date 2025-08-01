import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '../../components/ui/IconSymbol';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../hooks/useAuth';
import { useSubscription } from '../../hooks/useSubscription';

// Données utilisateur (à remplacer par un vrai système d'auth)
const userData = {
  isLoggedIn: false, // Changer à true pour tester l'état connecté
  name: 'John Doe',
  email: 'john.doe@example.com',
  avatar: 'https://img.cuisineaz.com/660x660/2015/02/28/i113047-photo-de-poulet-a-la-creme-fraiche.jpeg',
  preferences: {
    halal: false,
    vegetarian: false,
    vegan: false,
  },
  plan: 'basic', // 'free', 'premium', 'pro'
};

export default function ProfileScreen() {
  const { t } = useTranslation();
  const colors = Colors.light;
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();
  const { subscription, hasSubscription, isLoading: subscriptionLoading } = useSubscription();
  const [halal, setHalal] = useState(userData.preferences.halal);
  const [vegetarian, setVegetarian] = useState(userData.preferences.vegetarian);
  const [vegan, setVegan] = useState(userData.preferences.vegan);
  const handleLogin = () => {
    // Ici vous ajouteriez la logique de connexion réelle
    // Pour l'instant, on utilise les données mock
    console.log('Login clicked');
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  const handlePlanChange = (newPlan: string) => {
    // Ici vous ajouteriez la logique de changement de plan
    console.log('Plan changed to:', newPlan);
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
      }
    }
  };

  const getCurrentPlan = () => {
    if (!hasSubscription) return 'basic';
    // Logique pour déterminer le plan basé sur l'abonnement
    // À adapter selon votre logique métier
    return 'pro'; // Par défaut
  };

  const getPlanPrice = (plan: string) => {
    switch (plan) {
      case 'basic': return t('profile.plans.freePrice');
      case 'proQuarter': return t('profile.plans.quarterPrice');
      case 'proYear': return t('profile.plans.yearPrice');
      default: return t('profile.plans.freePrice');
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top }}
    >
      {/* Section Avatar et Nom */}
      <View style={styles.avatarSection}>
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: userData.avatar }}
            style={styles.avatar}
          />
        </View>

        {/* {isAuthenticated ? (
          <>
            <Text style={[styles.userName, { color: colors.text }]}>
              {userData.name}
            </Text>
            <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
              {userData.email}
            </Text>
            <TouchableOpacity
              style={[styles.logoutButton, { borderColor: colors.border }]}
              onPress={handleLogout}
            >
              <IconSymbol name="logout" size={16} color={colors.text} />
              <Text style={[styles.logoutText, { color: colors.text }]}>
                {t('profile.logout')}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={[styles.userName, { color: colors.text }]}>
              {t('profile.guest')}
            </Text>
            <TouchableOpacity
              style={[styles.loginButton, { backgroundColor: colors.button }]}
              onPress={handleLogin}
            >
              <Text style={[styles.loginText, { color: colors.background }]}>
                {t('profile.login')}
              </Text>
            </TouchableOpacity>
          </>
        )} */}
      </View>

      {/* Section Préférences */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t('profile.preferences')}
        </Text>

        <View style={styles.preferenceItem}>
          <View style={styles.preferenceInfo}>
            <Text style={[styles.preferenceLabel, { color: colors.text }]}>
              {t('profile.halal')}
            </Text>
            <Text style={[styles.preferenceDescription, { color: colors.textSecondary }]}>
              {t('profile.halalDescription')}
            </Text>
          </View>
          <Switch
            value={halal}
            onValueChange={setHalal}
            trackColor={{ false: colors.border, true: colors.button }}
            thumbColor={colors.background}
          />
        </View>

        <View style={styles.preferenceItem}>
          <View style={styles.preferenceInfo}>
            <Text style={[styles.preferenceLabel, { color: colors.text }]}>
              {t('profile.vegetarian')}
            </Text>
            <Text style={[styles.preferenceDescription, { color: colors.textSecondary }]}>
              {t('profile.vegetarianDescription')}
            </Text>
          </View>
          <Switch
            value={vegetarian}
            onValueChange={setVegetarian}
            trackColor={{ false: colors.border, true: colors.button }}
            thumbColor={colors.background}
          />
        </View>
        {/* Vegan */}
        <View style={styles.preferenceItem}>
          <View style={styles.preferenceInfo}>
            <Text style={[styles.preferenceLabel, { color: colors.text }]}>
              {t('profile.vegan')}
            </Text>
            <Text style={[styles.preferenceDescription, { color: colors.textSecondary }]}>
              {t('profile.veganDescription')}
            </Text>
          </View>
          <Switch
            value={vegan}
            onValueChange={setVegan}
            trackColor={{ false: colors.border, true: colors.button }}
            thumbColor={colors.background}
          />
        </View>
      </View>

      {/* Section Plan */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t('profile.plan')}
        </Text>

        <View style={styles.planContainer}>
          <View style={styles.currentPlan}>
            <Text style={[styles.planName, { color: colors.text }]}>
              {t(`profile.plans.${getCurrentPlan()}`)}
            </Text>
            <Text style={[styles.planPrice, { color: colors.textSecondary }]}>
              {getPlanPrice(getCurrentPlan())}
            </Text>
          </View>

          {/* <TouchableOpacity
            style={[styles.changePlanButton, { borderColor: colors.button }]}
            onPress={() => handlePlanChange('proQuarter')}
          >
            <Text style={[styles.changePlanText, { color: colors.button }]}>
              {t('profile.changePlan')}
            </Text>
          </TouchableOpacity> */}
        </View>

        {/* Options de plans */}
        <View style={styles.planOptions}>
          {['basic', 'proQuarter', 'proYear'].map((plan) => (
            <TouchableOpacity
              key={plan}
              style={[
                styles.planOption,
                {
                  backgroundColor: getCurrentPlan() === plan ? colors.button : colors.surface,
                  borderColor: getCurrentPlan() === plan ? colors.button : colors.border,
                }
              ]}
              onPress={() => handlePlanChange(plan)}
            >
              <Text style={[
                styles.planOptionText,
                { color: getCurrentPlan() === plan ? colors.background : colors.text }
              ]}>
                {t(`profile.plans.${plan}`)}
              </Text>
              <Text style={[
                styles.planOptionPrice,
                { color: getCurrentPlan() === plan ? colors.background : colors.textSecondary }
              ]}>
                {getPlanPrice(plan)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Section Paramètres */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t('profile.settings')}
        </Text>

        <TouchableOpacity style={styles.settingItem} onPress={handleNotificationsPress}>
          <IconSymbol name={Platform.OS === 'ios' ? "bell" : "notifications"} size={20} color={colors.button} />
          <Text style={[styles.settingText, { color: colors.text }]}>
            {t('profile.notifications')}
          </Text>
          <IconSymbol name={Platform.OS === 'ios' ? "chevron.right" : "chevron-forward"} size={20} color={colors.button} />
        </TouchableOpacity>
      </View>

      {/* Espace en bas pour la barre de navigation */}
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#007AFF',
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    marginBottom: 16,
  },
  loginButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
  },
  loginText: {
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  logoutText: {
    fontSize: 14,
    marginLeft: 8,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sectionTitle: {
    fontFamily: 'Degular',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
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
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  preferenceDescription: {
    fontFamily: 'Cronos Pro',
    fontSize: 14,
  },
  planContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  currentPlan: {
    flex: 1,
  },
  planName: {
    fontFamily: 'Degular',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  planPrice: {
    fontFamily: 'Cronos Pro',
    fontSize: 14,
  },
  changePlanButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  changePlanText: {
    fontFamily: 'Cronos Pro',
    fontSize: 14,
    fontWeight: '600',
  },
  planOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  planOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  planOptionText: {
    fontFamily: 'Degular',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  planOptionPrice: {
    fontFamily: 'Cronos Pro',
    fontSize: 12,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  settingText: {
    fontFamily: 'Cronos Pro',
    fontSize: 16,
    flex: 1,
    marginLeft: 12,
  },
  bottomSpacer: {
    height: 120,
  },
}); 