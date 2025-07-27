import { router } from "expo-router";
import React, { useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Wave } from 'react-native-animated-spinkit';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import uuid from 'react-native-uuid';
import FavoriteRecipeCard from "../../components/FavoriteRecipeCard";
import Micro from "../../components/Micro";
import RecordDisplay from "../../components/RecordDisplay";
import { IconSymbol } from "../../components/ui/IconSymbol";
import { Colors } from '../../constants/Colors';
import { generateRecipesFromText } from '../../services/chatgpt';

const { width, height } = Dimensions.get('window');

export default function TryScreen() {
  const insets = useSafeAreaInsets()
  const [isRecording, setIsRecording] = useState(false);
  const [liveText, setLiveText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recipes, setRecipes] = useState<any[]>([]);

  // Animations pour masquer/afficher le contenu
  const titleOpacity = useRef(new Animated.Value(1)).current;
  const descriptionOpacity = useRef(new Animated.Value(1)).current;
  const headerOpacity = useRef(new Animated.Value(1)).current;

  const handleContinue = async () => {

  };

  const handleGenerateRecipes = async (ingredients: string) => {
    if (!ingredients.trim()) {
      Alert.alert('Erreur', 'Aucun ingrédient fourni');
      return;
    }

    setTimeout(() => {
      setIsLoading(true);
    }, 300);
    try {
      const generatedRecipes = await generateRecipesFromText(ingredients);
      setRecipes(generatedRecipes);
    } catch (error) {
      console.error('Erreur lors de la génération:', error);
      Alert.alert('Erreur', 'Impossible de générer les recettes. Vérifiez votre connexion internet.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecordingStateChange = (recording: boolean) => {
    setIsRecording(recording);
    console.log('État d\'enregistrement:', recording);

    if (recording) {
      // Effacer le texte précédent quand l'enregistrement commence
      hideContent();
    } else {
      showContent();
      if (liveText.length > 20) {
        // Générer les recettes avec liveText
        console.log('liveText', liveText);
        handleGenerateRecipes(liveText);
      }
    }
  };

  const hideContent = () => {
    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(titleOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(descriptionOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const showContent = () => {
    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(descriptionOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <SafeAreaView style={styles.container}>
      {isRecording && <View style={{ position: 'absolute', top: insets.top, left: 0, right: 0, bottom: 0 }}>
        <RecordDisplay
          liveText={liveText}
          isRecording={isRecording}
        />
      </View>}

      {/* Loading overlay avec flou */}
      {isLoading && (
        <View style={styles.modalOverlay}>
          <Wave color={Colors.light.button} size={100} />
          <Text style={styles.loadingText}>Génération des recettes en cours...</Text>
        </View>
      )}

      <Animated.Text
        style={[
          {
            fontSize: 30,
            fontFamily: 'Degular',
            color: Colors.light.text,
            textAlign: 'right',
            marginRight: 20
          },
          {
            opacity: headerOpacity,
            transform: [{
              translateY: headerOpacity.interpolate({
                inputRange: [0, 1],
                outputRange: [-50, 0],
              })
            }]
          }
        ]}
      >
        CookEat AI
      </Animated.Text>

      {/* Contenu principal - masqué si recettes générées */}
      {recipes.length === 0 && !isLoading && (
        <>
          <ScrollView>
            <View style={styles.content}>
              {/* Section principale */}
              <View style={styles.mainSection}>
                <View style={{ width: '100%', gap: 16, marginBottom: 10 }}>
                  <View style={{}}>
                    <Animated.View
                      style={[
                        { marginBottom: 16 },
                        {
                          opacity: titleOpacity,
                          transform: [{
                            translateY: titleOpacity.interpolate({
                              inputRange: [0, 1],
                              outputRange: [-50, 0],
                            })
                          }]
                        }
                      ]}
                    >
                      <Text style={styles.title}>Faisons un petit test !</Text>
                    </Animated.View>
                    <View>
                      <Text style={styles.description}>
                        Appuyez sur le micro et lisez ce texte 👇🏼
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={{ flex: 1, justifyContent: 'flex-start', alignItems: 'center', position: 'relative' }}>
                  <Text style={{ fontSize: 16, color: Colors.light.textSecondary, textAlign: 'left', marginBottom: 10, fontStyle: 'italic' }}>
                    J&apos;ai des oeufs, de la viande haché, du poulet, un peu de percil, des pates, des tomates, de l&apos;ail, des oignons, du fromage rapé, un peu de carotte, de la bechamel, du saumon,
                    des champignons et de la pate à pizza.
                  </Text>
                  <Micro
                    onRecordingStateChange={handleRecordingStateChange}
                    onLiveTextChange={setLiveText}
                    onClick={() => setLiveText('')}
                  />
                </View>
              </View>
            </View>
          </ScrollView>
        </>
      )}

      {/* Affichage des recettes générées - visible seulement si recettes existent */}
      {recipes.length > 0 && (
        <>
          <ScrollView style={styles.recipesScrollView}>
            <View style={styles.recipesContainer}>
              <Text style={styles.recipesTitle}>Recettes générées :</Text>
              {recipes.map((recipe, index) => (
                <FavoriteRecipeCard
                  key={index}
                  title={recipe.title}
                  icon={recipe.icon}
                  cookingTime={recipe.cooking_time}
                  rating={4.5}
                  onPress={() => {
                    router.push({
                      pathname: '/recipe-detail',
                      params: {
                        id: uuid.v4(),
                        title: recipe.title,
                        difficulty: recipe.difficulty,
                        cookingTime: recipe.cooking_time,
                        calories: recipe.calories || 0,
                        lipides: recipe.lipides || 0,
                        proteines: recipe.proteines || 0,
                        icon: recipe.icon
                      }
                    });
                  }}
                />
              ))}
            </View>
          </ScrollView>

          <TouchableOpacity style={{ ...styles.continueButton, bottom: insets.bottom + 20 }} onPress={() => router.replace('/onboarding/socialProof')}>
            <Text style={styles.buttonText}>Commencer</Text>
            <IconSymbol
              style={{ position: 'absolute', right: 20 }}
              name={Platform.OS === 'ios' ? "arrow.right" : "arrow_forward"}
              size={24}
              color="white"
            />
          </TouchableOpacity>
        </>
      )}
    </SafeAreaView>
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
    width: width * 0.7,
    height: width * 0.6,
    // resizeMode: 'contain',
    marginBottom: 32,
  },
  buttonSection: {
    paddingBottom: 40,
  },
  continueButton: {
    position: 'absolute',
    left: 20,
    right: 20,
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
    //  marginTop: 50,
  },
  buttonText: {
    color: 'white',
    fontSize: 20,
    fontFamily: 'Degular',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(238, 238, 238, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 40,
    fontSize: 20,
    color: Colors.light.text,
    fontFamily: 'Degular',
    textAlign: 'center',
  },
  recipesContainer: {
    width: '100%',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  recipesTitle: {
    fontSize: 24,
    fontFamily: 'Degular',
    color: Colors.light.text,
    marginBottom: 16,
    textAlign: 'left',
  },
  recipesScrollView: {
    flex: 1,
  },
}); 