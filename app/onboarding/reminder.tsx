import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { IconSymbol } from '../../components/ui/IconSymbol';
import { Colors } from '../../constants/Colors';

const { width, height } = Dimensions.get('window');

export default function ReminderScreen() {
  const [isLoading, setIsLoading] = useState(false);

  const handleActivateNotifications = async () => {
    try {
      setIsLoading(true);

      // Demander les permissions de notification
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Si les permissions ne sont pas accordées, les demander
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      // Vérifier si les permissions ont été accordées
      if (finalStatus !== 'granted') {
        Alert.alert(
          'Permissions refusées',
          'Les notifications ne peuvent pas être activées sans votre autorisation. Vous pouvez les activer plus tard dans les paramètres de votre appareil.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Configurer les notifications
      await Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });

      // Programmer une notification de rappel (2 jours avant la fin de l'essai)
      // Pour cet exemple, on programme une notification dans 1 minute
      // TO DO : déplacer ce code dans la partie après paiement
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Votre essai CookEat se termine bientôt !",
          body: "Il vous reste 2 jours pour profiter de toutes les fonctionnalités premium. Continuez votre expérience culinaire !",
          data: { type: 'trial_reminder' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 5 * 24 * 60 * 60, // 5 jours
        },
      });
    } catch (error) {
      console.error('Erreur lors de l\'activation des notifications:', error);
      Alert.alert(
        'Erreur',
        'Impossible d\'activer les notifications. Veuillez réessayer.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={{
        fontSize: 30,
        fontFamily: 'Degular',
        color: Colors.light.text,
        textAlign: 'right',
        // marginTop: 20,
        marginRight: 20
      }}
      >
        CookEat AI
      </Text>

      <View style={styles.content}>
        {/* Section principale */}
        <View style={styles.mainSection}>

          <View style={{ flex: 1, marginBottom: 30 }}>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
              <Text style={styles.title}>Recevez des rappels pour <Text style={{ fontFamily: 'Degular', color: Colors.light.button }}>cuisiner</Text> et profiter de vos <Text style={{ fontFamily: 'Degular', color: Colors.light.button }}>recettes favorites</Text> !</Text>
              <Text style={{
                fontSize: 16,
                fontFamily: 'Cronos Pro',
                color: Colors.light.textSecondary,
                marginTop: 16,
                textAlign: 'center',
                paddingHorizontal: 20,
                lineHeight: 22
              }}>
                Nous vous enverrons des rappels discrets pour vous encourager à découvrir de nouvelles recettes et rester actif en cuisine.
              </Text>
            </View>

            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Image
                source={require('../../assets/images/reminder.jpg')}
                style={styles.illustration}
              />
            </View>

            <TouchableOpacity style={styles.continueButton} onPress={handleActivateNotifications}>
              <Text style={styles.buttonText}>Autoriser les notifications</Text>
              <IconSymbol
                style={{ position: 'absolute', right: 20 }}
                name={Platform.OS === 'ios' ? "bell.fill" : "notifications"}
                size={24}
                color="white"
              />
            </TouchableOpacity>

            <TouchableOpacity style={{ ...styles.continueButton, marginTop: 15 }} onPress={() => router.replace('/(tabs)')}>
              <Text style={styles.buttonText}>Commencer</Text>
              <IconSymbol
                style={{ position: 'absolute', right: 20 }}
                name={Platform.OS === 'ios' ? "arrow.right" : "arrow_forward"}
                size={24}
                color="white"
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',//Colors.light.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  mainSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: height * 0.1,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    textAlign: 'center',
    fontSize: width * 0.09,
    fontFamily: 'Degular',
    color: Colors.light.text,
    lineHeight: 36,
    paddingHorizontal: 20,
  },
  descriptionSection: {
    marginBottom: 48,
    paddingHorizontal: 20,
  },
  description: {
    textAlign: 'left',
    fontSize: 18,
    fontFamily: 'Cronos Pro Bold',
    color: Colors.light.textSecondary,
    lineHeight: 26,
  },
  highlight: {
    color: Colors.light.text,
    fontWeight: '600',
  },
  illustrationPlaceholder: {
    width: width * 0.6,
    height: width * 0.4,
    backgroundColor: Colors.light.surface,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  placeholderText: {
    fontSize: 48,
  },
  illustration: {
    width: width * 0.6,
    height: width * 0.5,
    // resizeMode: 'contain',
    marginBottom: 32,
  },
  buttonSection: {
    paddingBottom: 40,
  },
  continueButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.button,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 200,
    shadowColor: Colors.light.tint,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginTop: 50,
  },
  buttonText: {
    color: 'white',
    fontSize: 20,
    fontFamily: 'Degular',
  },
}); 