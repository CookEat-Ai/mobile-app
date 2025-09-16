import Voice from '@react-native-voice/voice';
import { Audio } from 'expo-av';
import { router } from 'expo-router';
import React from 'react';
import {
  Dimensions,
  Linking,
  PermissionsAndroid,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { IconSymbol } from '../../components/ui/IconSymbol';
import { Colors } from '../../constants/Colors';
import I18n from '../../i18n';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

export default function ThirdStepScreen() {
  const insets = useSafeAreaInsets();

  const checkVoicePermissions = async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'android') {
        // Pour Android, vérifier la permission RECORD_AUDIO
        const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);

        if (granted) {
          console.log('Permission microphone déjà accordée');
          return true;
        }

        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Permission Microphone',
            message: 'CookEat a besoin d\'accéder au microphone pour la reconnaissance vocale',
            buttonNeutral: 'Plus tard',
            buttonNegative: 'Annuler',
            buttonPositive: 'Autoriser',
          }
        );

        if (result !== PermissionsAndroid.RESULTS.GRANTED)
          return false;

        return true;
      } else {
        // Pour iOS, vérifier explicitement les permissions
        try {
          // 1. Vérifier la permission microphone avec expo-av
          const { status: microphoneStatus } = await Audio.getPermissionsAsync();
          console.log('Statut permission microphone:', microphoneStatus);

          if (microphoneStatus !== 'granted') {
            const { status: newMicrophoneStatus } = await Audio.requestPermissionsAsync();
            console.log('Nouveau statut permission microphone:', newMicrophoneStatus);

            if (newMicrophoneStatus !== 'granted')
              return false;
          }

          // 2. Vérifier la reconnaissance vocale avec Voice
          const isVoiceAvailable = await Voice.isAvailable();
          console.log('Voice disponible (reconnaissance vocale):', isVoiceAvailable);

          if (!isVoiceAvailable)
            return false;

          console.log('✅ Permissions microphone et reconnaissance vocale OK');
          return true;
        } catch (error: any) {
          console.log('❌ Erreur lors de la vérification des permissions iOS:', error);
          return false;
        }
      }
    } catch (error) {
      console.error('Erreur lors de la vérification des permissions:', error);
      return false;
    }
  };

  const handleContinue = async () => {
    try {
      const hasPermissions = await checkVoicePermissions();

      if (hasPermissions) {
        // Si les permissions sont accordées, passer à la page suivante
        router.replace('/onboarding/fourthStep');
      } else {
        // Si les permissions ne sont pas accordées, ouvrir les paramètres
        if (Platform.OS === 'ios') {
          await Linking.openURL('app-settings:');
        } else {
          await Linking.openSettings();
        }
      }
    } catch (error) {
      console.log('Erreur lors de la demande de permission:', error);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top, paddingBottom: Platform.OS === 'ios' ? 0 : insets.bottom }]}>
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
          <View style={{ flex: 1, width: '100%', justifyContent: 'space-between', gap: 16, marginBottom: 30 }}>
            {/* <Text style={{}}>Propulsé par CookEat AI</Text> */}

            <View style={{ flex: 1, justifyContent: 'center' }}>
              <View style={{ marginBottom: 16 }}>
                <Text style={styles.title}>{I18n.t('onboarding.thirdStep.title')}</Text>
              </View>
              <View>
                <Text style={styles.description}>{I18n.t('onboarding.thirdStep.description')}</Text>
              </View>
            </View>

            <View>
              <TouchableOpacity
                style={{ ...styles.continueButton, marginTop: 50 }}
                onPress={handleContinue}
              >
                <Text style={styles.buttonText}>{I18n.t('onboarding.thirdStep.continue')}</Text>
                <IconSymbol
                  style={{ position: 'absolute', right: 20 }}
                  name={Platform.OS === 'ios' ? "arrow.right" : "arrow_forward"}
                  size={width * 0.06}
                  color="white"
                />
              </TouchableOpacity>
            </View>
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
    textAlign: 'left',
    fontSize: width * 0.09,
    fontFamily: 'Degular',
    color: Colors.light.text,
    lineHeight: width * 0.1,
  },
  descriptionSection: {
    marginBottom: 48,
    paddingHorizontal: 20,
  },
  description: {
    textAlign: 'left',
    fontSize: width * 0.046,
    fontFamily: 'Cronos Pro Bold',
    color: Colors.light.textSecondary,
    lineHeight: width * 0.06,
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
    width: width * 0.9,
    height: width * 0.6,
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
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: width * 0.05,
    fontFamily: 'Degular',
  },
}); 