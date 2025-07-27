import Voice from '@react-native-voice/voice';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { IconSymbol } from '../../components/ui/IconSymbol';
import { Colors } from '../../constants/Colors';

const { width, height } = Dimensions.get('window');

const ONBOARDING_COMPLETED_KEY = 'onboarding_completed';

export default function ThirdStepScreen() {
  const [haveAccessToMicro, setHaveAccessToMicro] = useState(false);

  useEffect(() => {
    const interval = setInterval(async () => {
      console.log(await Voice.isAvailable())

      if (await Voice.isAvailable()) {
        setHaveAccessToMicro(true);
        clearInterval(interval);
      }
    }, 1000);
  }, []);

  const handleMicro = async () => {
    try {
      await Voice.start('fr-FR');
      await Voice.stop();
    } catch (error) {
      console.log('Erreur lors de la demande de permission:', error);
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
          <View style={{ flex: 1, width: '100%', justifyContent: 'space-between', gap: 16, marginBottom: 30 }}>
            {/* <Text style={{}}>Propulsé par CookEat AI</Text> */}

            <View style={{ flex: 1, justifyContent: 'center' }}>
              <View style={{ marginBottom: 16 }}>
                <Text style={styles.title}>Autorisez l&apos;accès au micro 🎙️</Text>
              </View>
              <View>
                <Text style={styles.description}>
                  Nous utiliserons votre micro pour vous écouter nous dicter vos ingrédients.
                </Text>
              </View>
            </View>

            <View>
              <TouchableOpacity style={{ ...styles.continueButton, marginTop: 50 }} onPress={handleMicro}>
                <Text style={styles.buttonText}>Autoriser l&apos;accès au micro</Text>
                <IconSymbol
                  style={{ position: 'absolute', right: 20 }}
                  name={Platform.OS === 'ios' ? "arrow.right" : "arrow_forward"}
                  size={24}
                  color="white"
                />
              </TouchableOpacity>

              <TouchableOpacity
                disabled={!haveAccessToMicro}
                style={{ ...styles.continueButton, backgroundColor: haveAccessToMicro ? Colors.light.button : Colors.light.textSecondary }}
                onPress={() => router.replace('/onboarding/fourthStep')}
              >
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
    lineHeight: 36,
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
    fontSize: 20,
    fontFamily: 'Degular',
  },
}); 