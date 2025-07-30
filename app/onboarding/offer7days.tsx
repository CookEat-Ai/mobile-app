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

const { width, height } = Dimensions.get('window');

export default function Offer7DaysScreen() {
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
              <Text style={styles.title}>
                On vous offre{"\n"}
                <Text style={{ fontFamily: 'Degular', color: Colors.light.button }}>7 jours</Text> d&apos;essai gratuit pour tester notre IA !
              </Text>
            </View>

            {/* <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
              <Image
                source={require('../../assets/images/step4.png')}
                style={styles.illustration}
              />
            </View> */}

            <TouchableOpacity style={styles.continueButton} onPress={() => router.replace('/onboarding/reminder')}>
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
    fontSize: 20,
    fontFamily: 'Degular',
  },
}); 