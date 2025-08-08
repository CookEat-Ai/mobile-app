import { router } from "expo-router";
import React, { useMemo, useRef, useState } from 'react';
import I18n from '../../i18n';
import { Animated, ScrollView, StyleSheet, Text, View, Dimensions, TouchableOpacity, FlatList, Alert, Platform, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Wave } from 'react-native-animated-spinkit';
import * as Notifications from 'expo-notifications';
import Micro from '../../components/Micro';
import RecordDisplay from '../../components/RecordDisplay';
import UserHeader from '../../components/UserHeader';
import { Colors } from '../../constants/Colors';
import { useRecipeContext } from '../../contexts/RecipeContext';
import '../../i18n';
import { IconSymbol } from "../../components/ui/IconSymbol";
import revenueCatService from '../../config/revenuecat';
import { processVoiceIngredients } from '../../services/chatgpt';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const ingredientCategories = useMemo(() => [
    {
      id: 'legumes',
      title: I18n.t('home.categories.vegetables.title'),
      icon: '🥬',
      ingredients: [
        { id: 'carotte', name: I18n.t('home.categories.vegetables.carrot'), icon: '🥕' },
        { id: 'tomate', name: I18n.t('home.categories.vegetables.tomato'), icon: '🍅' },
        { id: 'oignon', name: I18n.t('home.categories.vegetables.onion'), icon: '🧅' },
        { id: 'poivron', name: I18n.t('home.categories.vegetables.pepper'), icon: '🫑' },
        { id: 'courgette', name: I18n.t('home.categories.vegetables.courgette'), icon: '🥒' },
        { id: 'brocoli', name: I18n.t('home.categories.vegetables.broccoli'), icon: '🥦' },
        { id: 'epinard', name: I18n.t('home.categories.vegetables.spinach'), icon: '🥬' },
        { id: 'poireau', name: I18n.t('home.categories.vegetables.leek'), icon: '🧄' },
        { id: 'ail', name: I18n.t('home.categories.vegetables.garlic'), icon: '🧄' },
        { id: 'champignon', name: I18n.t('home.categories.vegetables.mushroom'), icon: '🍄' },
        { id: 'concombre', name: I18n.t('home.categories.vegetables.cucumber'), icon: '🥒' },
        { id: 'chou-fleur', name: I18n.t('home.categories.vegetables.cauliflower'), icon: '🥬' },
      ]
    },
    {
      id: 'viandes',
      title: I18n.t('home.categories.meats.title'),
      icon: '🍖',
      ingredients: [
        { id: 'poulet', name: I18n.t('home.categories.meats.chicken'), icon: '🍗' },
        { id: 'boeuf', name: I18n.t('home.categories.meats.beef'), icon: '🥩' },
        { id: 'porc', name: I18n.t('home.categories.meats.pork'), icon: '🥓' },
        { id: 'agneau', name: I18n.t('home.categories.meats.lamb'), icon: '🐑' },
        { id: 'dinde', name: I18n.t('home.categories.meats.turkey'), icon: '🦃' },
        { id: 'veau', name: I18n.t('home.categories.meats.veal'), icon: '🐄' },
      ]
    },
    {
      id: 'poissons',
      title: I18n.t('home.categories.fish.title'),
      icon: '🐟',
      ingredients: [
        { id: 'saumon', name: I18n.t('home.categories.fish.salmon'), icon: '🐟' },
        { id: 'thon', name: I18n.t('home.categories.fish.tuna'), icon: '🐠' },
        { id: 'cabillaud', name: I18n.t('home.categories.fish.cod'), icon: '🐡' },
        { id: 'sardine', name: I18n.t('home.categories.fish.sardine'), icon: '🐟' },
        { id: 'maquereau', name: I18n.t('home.categories.fish.maquereau'), icon: '🐠' },
        { id: 'bar', name: I18n.t('home.categories.fish.bar'), icon: '🐡' },
      ]
    },
    {
      id: 'necessites',
      title: I18n.t('home.categories.essentials.title'),
      icon: '🍚',
      ingredients: [
        { id: 'pates', name: I18n.t('home.categories.essentials.pasta'), icon: '🍝' },
        { id: 'riz', name: I18n.t('home.categories.essentials.rice'), icon: '🍚' },
        { id: 'semoule', name: I18n.t('home.categories.essentials.semolina'), icon: '🍚' },
        { id: 'creme', name: I18n.t('home.categories.essentials.cream'), icon: '🥛' },
        { id: 'lait', name: I18n.t('home.categories.essentials.milk'), icon: '🥛' },
        { id: 'huile', name: I18n.t('home.categories.essentials.oil'), icon: '🫒' },
        { id: 'beurre', name: I18n.t('home.categories.essentials.butter'), icon: '🧈' },
        { id: 'oeufs', name: I18n.t('home.categories.essentials.eggs'), icon: '🥚' },
        { id: 'farine', name: I18n.t('home.categories.essentials.flour'), icon: '🌾' },
      ]
    },
    {
      id: 'fromages',
      title: I18n.t('home.categories.cheeses.title'),
      icon: '🧀',
      ingredients: [
        { id: 'emmental', name: I18n.t('home.categories.cheeses.emmental'), icon: '🧀' },
        { id: 'cheddar', name: I18n.t('home.categories.cheeses.cheddar'), icon: '🧀' },
        { id: 'mozzarella', name: I18n.t('home.categories.cheeses.mozzarella'), icon: '🧀' },
        { id: 'parmesan', name: I18n.t('home.categories.cheeses.parmesan'), icon: '🧀' },
        { id: 'brie', name: I18n.t('home.categories.cheeses.brie'), icon: '🧀' },
        { id: 'camembert', name: I18n.t('home.categories.cheeses.camembert'), icon: '🧀' },
        { id: 'roquefort', name: I18n.t('home.categories.cheeses.roquefort'), icon: '🧀' },
        { id: 'feta', name: I18n.t('home.categories.cheeses.feta'), icon: '🧀' },
      ]
    },
    {
      id: 'fruits',
      title: I18n.t('home.categories.fruits.title'),
      icon: '🍎',
      ingredients: [
        { id: 'pomme', name: I18n.t('home.categories.fruits.apple'), icon: '🍎' },
        { id: 'banane', name: I18n.t('home.categories.fruits.banana'), icon: '🍌' },
        { id: 'orange', name: I18n.t('home.categories.fruits.orange'), icon: '🍊' },
        { id: 'fraise', name: I18n.t('home.categories.fruits.strawberry'), icon: '🍓' },
        { id: 'raisin', name: I18n.t('home.categories.fruits.raisin'), icon: '🍇' },
        { id: 'kiwi', name: I18n.t('home.categories.fruits.kiwi'), icon: '🥝' },
        { id: 'ananas', name: I18n.t('home.categories.fruits.pineapple'), icon: '🍍' },
        { id: 'mangue', name: I18n.t('home.categories.fruits.mango'), icon: '🥭' },
      ]
    }
  ], []);

  const colors = Colors.light;

  const insets = useSafeAreaInsets();
  const { clearRecipes } = useRecipeContext();
  const [liveText, setLiveText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(false);

  const firstTime = useRef(true);
  const [isLoadingIngredients, setIsLoadingIngredients] = useState(false);

  // Référence pour le FlatList du carrousel
  const carouselRef = useRef<FlatList>(null);

  // Animations pour masquer/afficher le contenu
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const titleOpacity = useRef(new Animated.Value(1)).current;
  const introOpacity = useRef(new Animated.Value(1)).current;
  const microCardOpacity = useRef(new Animated.Value(1)).current;
  const manualCardOpacity = useRef(new Animated.Value(1)).current;

  const handleLiveTextChange = (text: string) => {
    setLiveText(text);
  };

  const handleRecordingStateChange = async (recording: boolean) => {
    setIsRecording(recording);

    if (recording) {
      firstTime.current = true;
      // Effacer le texte précédent et les anciens résultats quand l'enregistrement commence
      setLiveText('');
      clearRecipes(); // Supprimer les anciens résultats
      hideContent();
    } else if (firstTime.current) {
      firstTime.current = false;
      showContent();
      // Naviguer vers la page récapitulative quand le texte est reçu
      if (liveText.length > 20) {
        try {
          setIsLoadingIngredients(true);
          // Appeler processVoiceIngredients pour extraire les ingrédients du texte vocal
          const ingredients = await processVoiceIngredients(liveText);
          const processedIngredients = ingredients.join(', ');
          setIsLoadingIngredients(false);

          router.push({
            pathname: '/recipe-summary',
            params: { ingredients: processedIngredients }
          });
        } catch (error) {
          console.error('Erreur lors du traitement des ingrédients vocaux:', error);
          Alert.alert(
            I18n.t('home.notifications.error'),
            I18n.t('home.notifications.errorDescription'),
            [{ text: 'OK' }]
          );
        } finally {
          setIsLoadingRecipes(false);
        }
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

  const handleNotificationPress = async () => {
    try {
      // Vérifier le statut actuel des permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();

      let finalStatus = existingStatus;

      // Si les permissions ne sont pas accordées, les demander
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      // Si les permissions sont toujours refusées, rediriger vers les paramètres système
      if (finalStatus !== 'granted') {
        Alert.alert(
          I18n.t('home.notifications.error'),
          I18n.t('home.notifications.errorDescription'),
          [
            {
              text: 'Annuler',
              style: 'cancel',
            },
            {
              text: 'Paramètres',
              onPress: () => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openSettings();
                }
              },
            },
          ]
        );
        return;
      }

      // Si les permissions sont accordées, afficher un message de confirmation
      Alert.alert(
        I18n.t('home.notifications.enabled'),
        I18n.t('home.notifications.description'),
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.error('Erreur lors de la gestion des permissions de notification:', error);
      Alert.alert(
        I18n.t('home.notifications.error'),
        I18n.t('home.notifications.errorDescription'),
        [{ text: 'OK' }]
      );
    }
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

  const handlePantryPress = async () => {
    if (!(await revenueCatService.getSubscriptionStatus()).isSubscribed) {
      router.push('/paywall')
      return;
    }

    router.push('/pantry');
  };

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
      {(isLoadingRecipes || isLoadingIngredients) && (
        <View style={styles.modalOverlay}>
          <Wave color={Colors.light.button} size={100} />
          <Text style={styles.loadingText}>{isLoadingIngredients ? I18n.t('home.extractingIngredients') : I18n.t('home.generatingRecipes')}</Text>
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
          />
        </Animated.View>

        {/* Titre principal */}
        {/* <Animated.View
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
            {I18n.t('home.title')}
          </Text>
        </Animated.View> */}

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
            {I18n.t('home.intro')}
          </Text>
        </Animated.View>

        {/* Garde-manger */}
        <Animated.View
          style={[
            { marginTop: 20 },
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
            onPress={handlePantryPress}
          >
            <View>
              <Text style={styles.cardTitle}>{I18n.t('home.pantry.title')}</Text>
              <Text style={styles.cardDescription}>{I18n.t('home.pantry.description')}</Text>
            </View>
            <IconSymbol name={Platform.OS === 'ios' ? "chevron.right" : "chevron-forward"} size={20} color={colors.button} weight="bold" />
          </TouchableOpacity>
        </Animated.View>

        {/* Mode vocal */}
        <View
          style={[
            { ...styles.cardContainer, marginTop: 20 },
            {
              backgroundColor: isRecording ? Colors.light.background : 'white',
              borderWidth: isRecording ? 0 : 1,
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
            <Text style={styles.cardTitle}>{I18n.t('home.micro')}</Text>
            <Text style={styles.cardDescription}>{I18n.t('home.microDescription')}</Text>
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
          <Text style={styles.cardTitle}>{I18n.t('home.manual')}</Text>
          <Text style={styles.cardDescription}>{I18n.t('home.manualDescription')}</Text>

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
              showsVerticalScrollIndicator={false}
              scrollEventThrottle={16}
              directionalLockEnabled={true}
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
                {I18n.t('home.continue')} ({selectedIngredients.length} {I18n.t('home.ingredients')})
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
    height: 150, // Espace pour la barre de navigation
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
