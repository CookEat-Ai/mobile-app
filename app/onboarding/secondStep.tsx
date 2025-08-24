import { router } from 'expo-router';
import React from 'react';
import {
  Dimensions,
  Image,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { IconSymbol } from '../../components/ui/IconSymbol';
import { Colors } from '../../constants/Colors';
import I18n from '../../i18n';

const { width, height } = Dimensions.get('window');

export default function SecondStepScreen() {
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
          <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
            <Image
              source={require('../../assets/images/step3.png')}
              style={styles.illustration}
            />
          </View>

          <View style={{ flex: 1, width: '100%', justifyContent: 'flex-end', gap: 16, marginBottom: 30 }}>
            {/* <Text style={{}}>Propulsé par CookEat AI</Text> */}

            <View style={{}}>
              <View style={{ marginBottom: 16 }}>
                <Text style={styles.title}>{I18n.t('onboarding.secondStep.title')}</Text>
              </View>
              <View>
                <Text style={styles.description}>{I18n.t('onboarding.secondStep.description')}</Text>
              </View>

              <TouchableOpacity style={styles.continueButton} onPress={() => router.replace('/onboarding/thirdStep')}>
                <Text style={styles.buttonText}>{I18n.t('onboarding.secondStep.continue')}</Text>
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
    width: width * 0.7,
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
    marginTop: 50,
  },
  buttonText: {
    color: 'white',
    fontSize: width * 0.05,
    fontFamily: 'Degular',
  },
}); 