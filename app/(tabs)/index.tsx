import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, ScrollView, StyleSheet, Text, View, Dimensions, TouchableOpacity, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Micro from '../../components/Micro';
import RecordDisplay from '../../components/RecordDisplay';
import UserHeader from '../../components/UserHeader';
import { Colors } from '../../constants/Colors';
import { IconSymbol } from '../../components/ui/IconSymbol';
import '../../i18n';

const { width } = Dimensions.get('window');

// Données des catégories d'ingrédients
const ingredientCategories = [
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
    title: 'Nécessités',
    icon: '🧈',
    ingredients: [
      { id: 'beurre', name: 'Beurre', icon: '🧈' },
      { id: 'creme', name: 'Crème fraîche', icon: '🥛' },
      { id: 'huile', name: 'Huile d\'olive', icon: '🫒' },
      { id: 'sel', name: 'Sel', icon: '🧂' },
      { id: 'poivre', name: 'Poivre', icon: '🌶️' },
      { id: 'ail', name: 'Ail', icon: '🧄' },
      { id: 'farine', name: 'Farine', icon: '🌾' },
      { id: 'oeufs', name: 'Œufs', icon: '🥚' },
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
  const [recognizedText, setRecognizedText] = useState('');
  const [liveText, setLiveText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);

  // Référence pour le FlatList du carrousel
  const carouselRef = useRef<FlatList>(null);

  // Animations pour masquer/afficher le contenu
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const titleOpacity = useRef(new Animated.Value(1)).current;
  const introOpacity = useRef(new Animated.Value(1)).current;

  const handleTextReceived = (text: string) => {
    setRecognizedText(text);
    console.log('Texte reçu:', text);
  };

  const handleLiveTextChange = (text: string) => {
    setLiveText(text);
  };

  const handleRecordingStateChange = (recording: boolean) => {
    setIsRecording(recording);

    if (recording) {
      // Effacer le texte précédent quand l'enregistrement commence
      setLiveText('');
      setRecognizedText('');
      hideContent();
    } else {
      showContent();
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
        scrollEnabled={false}
      />
    </View>
  );

  return (
    <View style={[styles.container, {
      paddingTop: insets.top
    }]}>
      <ScrollView showsVerticalScrollIndicator={false} style={{ overflow: 'visible' }}>
        {/* Header avec profil utilisateur */}
        <Animated.View
          style={[
            styles.headerContainer,
            {
              opacity: headerOpacity,
              transform: [{
                translateY: headerOpacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-50, 0], // Déplace le header vers le haut
                })
              }]
            }
          ]}
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

        {/* Composant Micro réutilisable */}
        <View style={{ ...styles.cardContainer, marginTop: 30 }}>
          <Text style={styles.cardTitle}>{t('home.micro')}</Text>
          <Text style={styles.cardDescription}>{t('home.microDescription')}</Text>

          <Micro
            style={{ marginTop: 20 }}
            onTextReceived={handleTextReceived}
            onRecordingStateChange={handleRecordingStateChange}
            onLiveTextChange={handleLiveTextChange}
          />
        </View>

        <View style={{ ...styles.cardContainer, marginTop: 20, paddingRight: 0 }}>
          <Text style={styles.cardTitle}>{t('home.manual')}</Text>
          <Text style={styles.cardDescription}>{t('home.manualDescription')}</Text>

          {/* Sélection manuelle des ingrédients */}
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
            {selectedIngredients.length > 0 && (
              <TouchableOpacity style={styles.validateButton}>
                <Text style={styles.validateButtonText}>
                  Valider ({selectedIngredients.length} ingrédients)
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Espace en bas pour la barre de navigation */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: Colors.light.background,
    marginBottom: 50,
  },
  headerContainer: {
    // Pas de position absolue pour rester dans le flux normal
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
    maxHeight: 230, // Augmenté pour accommoder 3 lignes complètes
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
});
