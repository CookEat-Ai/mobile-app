import { router } from "expo-router";
import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, ScrollView, StyleSheet, Text, View, Dimensions, TouchableOpacity, FlatList, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Wave } from 'react-native-animated-spinkit';
import Micro from '../../components/Micro';
import RecordDisplay from '../../components/RecordDisplay';
import UserHeader from '../../components/UserHeader';
import { Colors } from '../../constants/Colors';
import { generateRecipesFromText } from '../../services/chatgpt';
import { useRecipeContext } from '../../contexts/RecipeContext';
import '../../i18n';
import { IconSymbol } from "../../components/ui/IconSymbol";

const { width } = Dimensions.get('window');

// Données des catégories d'ingrédients
const ingredientCategories = [
  {
    id: 'legumes',
    title: 'Légumes',
    icon: '🥬',
    ingredients: [
      { id: 'carotte', name: 'Carotte', icon: '🥕' },
      { id: 'tomate', name: 'Tomate', icon: '🍅' },
      { id: 'oignon', name: 'Oignon', icon: '🧅' },
      { id: 'poivron', name: 'Poivron', icon: '🫑' },
      { id: 'courgette', name: 'Courgette', icon: '🥒' },
      { id: 'brocoli', name: 'Brocoli', icon: '🥦' },
      { id: 'epinard', name: 'Épinard', icon: '🥬' },
      { id: 'poireau', name: 'Poireau', icon: '🧄' },
      { id: 'ail', name: 'Ail', icon: '🧄' },
      { id: 'champignon', name: 'Champignon', icon: '🍄' },
      { id: 'concombre', name: 'Concombre', icon: '🥒' },
      { id: 'chou-fleur', name: 'Chou-fleur', icon: '🥬' },
    ]
  },
  {
    id: 'viandes',
    title: 'Viandes',
    icon: '🍖',
    ingredients: [
      { id: 'poulet', name: 'Poulet', icon: '🍗' },
      { id: 'boeuf', name: 'Bœuf', icon: '🥩' },
      { id: 'porc', name: 'Porc', icon: '🥓' },
      { id: 'agneau', name: 'Agneau', icon: '🐑' },
      { id: 'dinde', name: 'Dinde', icon: '🦃' },
      { id: 'veau', name: 'Veau', icon: '🐄' },
    ]
  },
  {
    id: 'poissons',
    title: 'Poissons',
    icon: '🐟',
    ingredients: [
      { id: 'saumon', name: 'Saumon', icon: '🐟' },
      { id: 'thon', name: 'Thon', icon: '🐠' },
      { id: 'cabillaud', name: 'Cabillaud', icon: '🐡' },
      { id: 'sardine', name: 'Sardine', icon: '🐟' },
      { id: 'maquereau', name: 'Maquereau', icon: '🐠' },
      { id: 'bar', name: 'Bar', icon: '🐡' },
    ]
  },
  {
    id: 'necessites',
    title: 'Les essentiels',
    icon: '🍚',
    ingredients: [
      { id: 'pates', name: 'Pâtes', icon: '🍝' },
      { id: 'riz', name: 'Riz', icon: '🍚' },
      { id: 'semoule', name: 'Semoule', icon: '🍚' },
      { id: 'creme', name: 'Crème fraîche', icon: '🥛' },
      { id: 'lait', name: 'Lait', icon: '🥛' },
      { id: 'huile', name: 'Huile d\'olive', icon: '🫒' },
      { id: 'beurre', name: 'Beurre', icon: '🧈' },
      { id: 'oeufs', name: 'Œufs', icon: '🥚' },
      { id: 'farine', name: 'Farine', icon: '🌾' },
    ]
  },
  {
    id: 'fromages',
    title: 'Fromages',
    icon: '🧀',
    ingredients: [
      { id: 'emmental', name: 'Emmental', icon: '🧀' },
      { id: 'cheddar', name: 'Cheddar', icon: '🧀' },
      { id: 'mozzarella', name: 'Mozzarella', icon: '🧀' },
      { id: 'parmesan', name: 'Parmesan', icon: '🧀' },
      { id: 'brie', name: 'Brie', icon: '🧀' },
      { id: 'camembert', name: 'Camembert', icon: '🧀' },
      { id: 'roquefort', name: 'Roquefort', icon: '🧀' },
      { id: 'feta', name: 'Feta', icon: '🧀' },
    ]
  },
  {
    id: 'fruits',
    title: 'Fruits',
    icon: '🍎',
    ingredients: [
      { id: 'pomme', name: 'Pomme', icon: '🍎' },
      { id: 'banane', name: 'Banane', icon: '🍌' },
      { id: 'orange', name: 'Orange', icon: '🍊' },
      { id: 'fraise', name: 'Fraise', icon: '🍓' },
      { id: 'raisin', name: 'Raisin', icon: '🍇' },
      { id: 'kiwi', name: 'Kiwi', icon: '🥝' },
      { id: 'ananas', name: 'Ananas', icon: '🍍' },
      { id: 'mangue', name: 'Mangue', icon: '🥭' },
    ]
  }
];

export default function HomeScreen() {
  const colors = Colors.light;
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { addRecipe, clearRecipes } = useRecipeContext();
  const [liveText, setLiveText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(false);

  // Référence pour le FlatList du carrousel
  const carouselRef = useRef<FlatList>(null);

  // Animations pour masquer/afficher le contenu
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const titleOpacity = useRef(new Animated.Value(1)).current;
  const introOpacity = useRef(new Animated.Value(1)).current;
  const microCardOpacity = useRef(new Animated.Value(1)).current;
  const manualCardOpacity = useRef(new Animated.Value(1)).current;

  const generateRecipes = async (ingredients: string) => {
    setIsLoadingRecipes(true);
    try {
      const recipes = await generateRecipesFromText(ingredients);
      console.log('Recettes générées:', recipes);

      // Ajouter chaque recette au contexte
      recipes.forEach((recipe: any) => {
        const recipeId = Math.random().toString(36).substr(2, 9);
        addRecipe({
          id: recipeId,
          title: recipe.title,
          difficulty: recipe.difficulty,
          cookingTime: recipe.cooking_time,
          icon: recipe.icon,
          image: '',
          calories: Number(recipe.calories) || 0,
          lipids: Number(recipe.lipides) || 0,
          proteins: Number(recipe.proteines) || 0,
        });
      });

      // Naviguer vers la page des résultats avec les ingrédients
      router.push({
        pathname: '/results',
        params: { ingredients }
      });
    } catch (error) {
      console.error('Erreur lors de la génération des recettes:', error);
      Alert.alert('Erreur', 'Impossible de générer les recettes. Veuillez réessayer.');
    } finally {
      setIsLoadingRecipes(false);
    }
  };

  const handleLiveTextChange = (text: string) => {
    setLiveText(text);
  };

  const handleRecordingStateChange = (recording: boolean) => {
    setIsRecording(recording);

    if (recording) {
      // Effacer le texte précédent et les anciens résultats quand l'enregistrement commence
      setLiveText('');
      clearRecipes(); // Supprimer les anciens résultats
      hideContent();
    } else {
      showContent();
      // Naviguer vers la page récapitulative quand le texte est reçu
      if (liveText.length > 20) {
        router.push({
          pathname: '/recipe-summary',
          params: { ingredients: liveText }
        });
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
      Animated.timing(introOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(microCardOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(manualCardOpacity, {
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
      Animated.timing(introOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(microCardOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(manualCardOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleNotificationPress = () => {
    console.log('Notifications pressed');
  };

  const handleProfilePress = () => {
    console.log('Profile pressed');
  };

  const scrollToCategory = (index: number) => {
    setCurrentCategoryIndex(index);
    carouselRef.current?.scrollToIndex({
      index,
      animated: true,
    });
  };

  const toggleIngredient = (ingredientId: string) => {
    setSelectedIngredients(prev =>
      prev.includes(ingredientId)
        ? prev.filter(id => id !== ingredientId)
        : [...prev, ingredientId]
    );
  };

  const renderIngredientItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.ingredientItem,
        selectedIngredients.includes(item.id) && styles.ingredientItemSelected
      ]}
      onPress={() => toggleIngredient(item.id)}
    >
      <Text style={styles.ingredientIcon}>{item.icon}</Text>
      <Text style={[
        styles.ingredientName,
        selectedIngredients.includes(item.id) && styles.ingredientNameSelected
      ]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderCategoryPage = ({ item }: { item: any }) => (
    <View style={styles.categoryPage}>
      <View style={styles.categoryHeader}>
        <Text style={styles.categoryIcon}>{item.icon}</Text>
        <Text style={styles.categoryTitle}>{item.title}</Text>
      </View>
      <FlatList
        data={item.ingredients}
        renderItem={renderIngredientItem}
        keyExtractor={(ingredient) => ingredient.id}
        numColumns={3}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.ingredientsGrid}
      />
    </View>
  );

  return (
    <View style={[styles.container, {
      paddingTop: insets.top
    }]}>
      {isRecording && <View style={{
        position: 'absolute', top: insets.top, left: 0, right: 0, zIndex: 1000
      }}>
        <RecordDisplay liveText={liveText} isRecording={isRecording} />
      </View>}

      {/* Loading overlay avec flou */}
      {isLoadingRecipes && (
        <View style={styles.modalOverlay}>
          <Wave color={Colors.light.button} size={100} />
          <Text style={styles.loadingText}>Génération des recettes en cours...</Text>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} style={{ overflow: 'visible' }}>
        {/* Header avec profil utilisateur */}
        <Animated.View
          style={{
            paddingBottom: 8,
            opacity: headerOpacity,
            transform: [{
              translateY: headerOpacity.interpolate({
                inputRange: [0, 1],
                outputRange: [-50, 0], // Déplace le header vers le haut
              })
            }]
          }}
        >
          <UserHeader
            userName="Samantha"
            onNotificationPress={handleNotificationPress}
            onProfilePress={handleProfilePress}
          />
        </Animated.View>

        {/* Titre principal */}
        <Animated.View
          style={[
            styles.titleContainer,
            {
              opacity: titleOpacity,
              transform: [{
                translateY: titleOpacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-50, 0], // Déplace le titre vers le haut
                })
              }]
            }
          ]}
        >
          <Text style={[styles.mainTitle, { color: colors.text }]}>
            {t('home.title')}
          </Text>
        </Animated.View>

        {/* Texte d'introduction */}
        <Animated.View
          style={[
            styles.introContainer,
            {
              opacity: introOpacity,
              transform: [{
                translateY: introOpacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-50, 0], // Déplace l'intro vers le haut
                })
              }]
            }
          ]}
        >
          <Text style={[styles.introText, { color: colors.textSecondary }]}>
            {t('home.intro')}
          </Text>
        </Animated.View>

        {/* Mode manuel */}
        <Animated.View
          style={[
            { ...styles.cardContainer, marginTop: 20, padding: 0 },
            {
              opacity: manualCardOpacity,
              transform: [{
                translateY: manualCardOpacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-50, 0],
                })
              }]
            }
          ]}
        >
          <TouchableOpacity
            style={{ ...styles.cardContainer, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            onPress={() => {
              router.push('/pantry');
            }}
          >
            <View>
              <Text style={styles.cardTitle}>Gérer votre garde-manger</Text>
              <Text style={styles.cardDescription}>Ajoutez, retirez, modifiez vos ingrédients</Text>
            </View>
            <IconSymbol name={Platform.OS === 'ios' ? "chevron.right" : "chevron-forward"} size={20} color={colors.button} weight="bold" />
          </TouchableOpacity>
        </Animated.View>

        {/* Mode vocal */}
        <View
          style={[
            { ...styles.cardContainer, marginTop: 30 },
            {
              backgroundColor: isRecording ? Colors.light.background : 'white',
              borderWidth: isRecording ? 1 : 0,
              borderColor: isRecording ? Colors.light.background : '#E9E9E9',
              shadowColor: isRecording ? 'transparent' : 'grey',
              shadowOffset: isRecording ? { width: 0, height: 0 } : { width: 2, height: 10 },
              shadowOpacity: isRecording ? 0 : 0.1,
              shadowRadius: isRecording ? 0 : 10,
              elevation: isRecording ? 0 : 1
            }
          ]}
        >
          <Animated.View
            style={{
              marginBottom: 20,
              opacity: microCardOpacity,
              transform: [{
                translateY: microCardOpacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0],
                })
              }]
            }}
          >
            <Text style={styles.cardTitle}>{t('home.micro')}</Text>
            <Text style={styles.cardDescription}>{t('home.microDescription')}</Text>
          </Animated.View>
          <Micro
            onRecordingStateChange={handleRecordingStateChange}
            onLiveTextChange={handleLiveTextChange}
          />
        </View>

        {/* Mode manuel */}
        <Animated.View
          style={[
            { ...styles.cardContainer, marginTop: 20, paddingRight: 0 },
            {
              opacity: manualCardOpacity,
              transform: [{
                translateY: manualCardOpacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-50, 0],
                })
              }]
            }
          ]}
        >
          <Text style={styles.cardTitle}>{t('home.manual')}</Text>
          <Text style={styles.cardDescription}>{t('home.manualDescription')}</Text>

          <View style={styles.manualSelectionContainer}>
            {/* Indicateurs de catégories */}
            <View style={styles.categoryIndicators}>
              {ingredientCategories.map((category, index) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryIndicator,
                    currentCategoryIndex === index && styles.categoryIndicatorActive
                  ]}
                  onPress={() => scrollToCategory(index)}
                >
                  <Text style={styles.categoryIndicatorIcon}>{category.icon}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Carrousel des catégories */}
            <FlatList
              ref={carouselRef}
              data={ingredientCategories}
              renderItem={renderCategoryPage}
              keyExtractor={(category) => category.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={width - 40}
              snapToAlignment="center"
              onMomentumScrollEnd={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / (width - 40));
                setCurrentCategoryIndex(index);
              }}
              getItemLayout={(data, index) => ({
                length: width - 40,
                offset: (width - 40) * index,
                index,
              })}
            />

            {/* Bouton de validation */}
            <TouchableOpacity
              disabled={selectedIngredients.length === 0}
              style={{
                ...styles.validateButton,
                backgroundColor: selectedIngredients.length === 0 ? '#E9E9E9' : Colors.light.button
              }}
              onPress={() => {
                console.log('Validation des ingrédients:', selectedIngredients);

                // Convertir les IDs en noms d'ingrédients
                const ingredientNames = selectedIngredients.map(id => {
                  const category = ingredientCategories.find(cat =>
                    cat.ingredients.some(ing => ing.id === id)
                  );
                  const ingredient = category?.ingredients.find(ing => ing.id === id);
                  return ingredient?.name || id;
                });

                const ingredientsText = ingredientNames.join(', ');

                // Naviguer vers la page récapitulative
                router.push({
                  pathname: '/recipe-summary',
                  params: { ingredients: ingredientsText }
                });
              }}
            >
              <Text style={styles.validateButtonText}>
                Continuer ({selectedIngredients.length} ingrédients)
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Espace en bas pour la barre de navigation */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: Colors.light.background,
    marginBottom: 50,
  },
  titleContainer: {
    paddingBottom: 20,
  },
  mainTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontFamily: 'Degular',
  },
  introContainer: {
    paddingBottom: 20,
  },
  introText: {
    fontSize: 18,
    lineHeight: 24,
    fontFamily: 'Cronos Pro',
  },
  bottomSpacer: {
    height: 100, // Espace pour la barre de navigation
  },
  cardContainer: {
    padding: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E9E9E9',
    backgroundColor: 'white',
    shadowColor: 'grey',
    shadowOffset: { width: 2, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 1,
  },
  cardTitle: {
    fontFamily: 'Degular',
    textAlign: 'left',
    fontSize: 22,
    fontWeight: 'bold',
    lineHeight: 20,
    color: Colors.light.text,
    marginBottom: 10,
  },
  cardDescription: {
    fontFamily: 'Cronos Pro',
    textAlign: 'left',
    fontSize: 18,
    lineHeight: 18,
    color: Colors.light.textSecondary,
  },
  manualSelectionContainer: {
    marginTop: 20,
  },
  categoryIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 10,
  },
  categoryIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryIndicatorActive: {
    backgroundColor: Colors.light.button,
    borderColor: Colors.light.button,
  },
  categoryIndicatorIcon: {
    fontSize: 20,
  },
  categoryPage: {
    width: width - 40, // Largeur de l'écran moins les paddings
    paddingHorizontal: 10,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  categoryIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  categoryTitle: {
    fontSize: 20,
    fontFamily: 'Degular',
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  ingredientsGrid: {
    paddingBottom: 20,
  },
  ingredientItem: {
    flex: 1,
    margin: 4,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F8F8F8',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 60, // Augmenté pour mieux accommoder le contenu
  },
  ingredientItemSelected: {
    backgroundColor: Colors.light.button,
    borderColor: Colors.light.button,
  },
  ingredientIcon: {
    fontSize: 20,
    marginBottom: 3,
  },
  ingredientName: {
    fontSize: 12,
    fontFamily: 'Cronos Pro',
    color: Colors.light.text,
    textAlign: 'center',
    lineHeight: 14,
  },
  ingredientNameSelected: {
    color: 'white',
    fontWeight: 'bold',
  },
  validateButton: {
    marginRight: 20,
    backgroundColor: Colors.light.button,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  validateButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Degular',
    fontWeight: 'bold',
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
});
