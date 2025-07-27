import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from 'react';
import {
  Dimensions,
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

type Question = {
  question: string; // Question
  options: Option[];
}

type Option = {
  label: string;
  value: string;
}

const questions: Question[] = [
  {
    question: 'Quel est votre sexe ?',
    options: [
      { label: 'Homme', value: 'homme' },
      { label: 'Femme', value: 'femme' }
    ]
  },
  {
    question: 'Quel âge avez-vous ?',
    options: [
      { label: 'Moins de 25 ans', value: 'moins_de_25_ans' },
      { label: 'Entre 25 et 40 ans', value: 'entre_25_et_40_ans' },
      { label: 'Plus de 40 ans', value: 'plus_de_40_ans' }
    ]
  },
  {
    question: 'Quel est votre niveau de cuisine ?',
    options: [
      { label: 'Débutant', value: 'débutant' },
      { label: 'Moyen', value: 'moyen' },
      { label: 'Avancé', value: 'avancé' }
    ]
  },
  {
    question: 'À quelle fréquence cuisinez-vous ?',
    options: [
      { label: 'Rarement', value: 'rarement' },
      { label: 'Occasionnellement', value: 'occasionnellement' },
      { label: 'Fréquemment', value: 'fréquemment' }
    ]
  },
  {
    question: 'Pour qui faites-vous cuisiner ?',
    options: [
      { label: 'Moi-même', value: 'moi_meme' },
      { label: 'Moi et une autre personne', value: 'moi_et_une_autre_personne' },
      { label: 'Ma famille', value: 'ma_famille' }
    ]
  },
  {
    question: 'Combien de temps avez-vous pour cuisiner ?',
    options: [
      { label: 'Moins de 30 minutes', value: 'moins_de_30_minutes' },
      { label: 'Entre 30 minutes et 1 heure', value: 'entre_30_minutes_et_1_heure' },
      { label: 'Plus de 1 heure', value: 'plus_de_1_heure' }
    ]
  },
  {
    question: 'Avez-vous un régime alimentaire spécifique ?',
    options: [
      { label: 'Aucun', value: 'aucun' },
      { label: 'Halal', value: 'halal' },
      { label: 'Végétarien', value: 'végétarien' },
      { label: 'Végétalien', value: 'végétalien' }
    ]
  },
  {
    question: 'Comment vous nous avez connu ?',
    options: [
      { label: 'Ami', value: 'ami' },
      { label: 'Réseaux social', value: 'social_media' },
      { label: Platform.OS === 'ios' ? 'App Store' : 'Google Play', value: 'store' },
      { label: 'Autre', value: 'autre' },
    ]
  }
]

export default function FormQuestionScreen() {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);

  const handleOptionSelect = (value: string) => {
    setSelectedOption(value);
    setAnswers([...answers, value]);
  };

  const handleContinue = async () => {
    if (!selectedOption) return;

    try {
      // Sauvegarder le niveau de cuisine
      // await AsyncStorage.setItem(selectedOption, selectedOption);

      if (index === questions.length - 1) {
        router.push('/onboarding/try');
        // await AsyncStorage.setItem('onboarding_completed', 'true');
      }
      else
        setIndex(index + 1);
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde du niveau de cuisine:', error);
    }
  };

  const handleBackPress = () => {
    if (index > 0)
      setIndex(index - 1);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 20, paddingLeft: 20 }}>
        {index > 0 && <TouchableOpacity
          style={{
            padding: 8,
            borderRadius: 20,
            backgroundColor: '#F1F2F5',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={handleBackPress}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>}

        <Text style={{
          fontSize: 30,
          fontFamily: 'Degular',
          color: Colors.light.text,
          textAlign: 'right',
          marginRight: 20
        }}
        >
          CookEat AI
        </Text>
      </View>

      <View style={styles.content}>
        {/* Section principale */}
        <View style={styles.mainSection}>
          <View style={{ flex: 1 }}>
            <View style={{ marginBottom: 40 }}>
              <Text style={styles.title}>{questions[index].question}</Text>
            </View>

            <View style={styles.cardsContainer}>
              {questions[index].options.map((item) => (
                <TouchableOpacity
                  key={item.value}
                  style={[
                    styles.card,
                    selectedOption === item.value && styles.cardSelected
                  ]}
                  onPress={() => handleOptionSelect(item.value)}
                >
                  <View style={styles.cardContent}>
                    <View style={styles.radioContainer}>
                      <View style={[
                        styles.radioButton,
                        selectedOption === item.value && styles.radioButtonSelected
                      ]}>
                        {selectedOption === item.value && (
                          <View style={styles.radioButtonInner} />
                        )}
                      </View>
                    </View>
                    <View style={styles.cardTextContainer}>
                      <Text style={[
                        styles.cardTitle,
                        selectedOption === item.value && styles.cardTitleSelected
                      ]}>
                        {item.label}
                      </Text>
                      <Text style={[
                        styles.cardDescription,
                        selectedOption === item.value && styles.cardDescriptionSelected
                      ]}>
                        {item.label}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.continueButton,
                !selectedOption && styles.continueButtonDisabled
              ]}
              onPress={handleContinue}
              disabled={!selectedOption}
            >
              <Text style={styles.buttonText}>Continuer</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    // justifyContent: 'space-between',
  },
  mainSection: {
    flex: 1,
    // justifyContent: 'space-between',
    // alignItems: 'center',
    paddingTop: height * 0.05,
    paddingBottom: 40,
  },
  title: {
    textAlign: 'left',
    fontSize: width * 0.08,
    fontFamily: 'Degular',
    color: Colors.light.text,
    lineHeight: 36,
  },
  cardsContainer: {
    width: '100%',
    gap: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: Colors.light.border,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardSelected: {
    borderColor: '#FEB50A',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioContainer: {
    marginRight: 16,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: '#FEB50A',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FEB50A',
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'Degular',
    color: Colors.light.text,
    marginBottom: 4,
  },
  cardTitleSelected: {
    color: '#FEB50A',
  },
  cardDescription: {
    fontSize: 14,
    fontFamily: 'Cronos Pro',
    color: Colors.light.textSecondary,
  },
  cardDescriptionSelected: {
    color: '#FEB50A',
  },
  buttonContainer: {
    width: '100%',
    paddingTop: 20,
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
  },
  continueButtonDisabled: {
    backgroundColor: Colors.light.border,
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 20,
    fontFamily: 'Degular',
  },
}); 