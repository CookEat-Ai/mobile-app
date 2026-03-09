import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  ScrollView,
  Animated,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { FontAwesome6 } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import analytics from '../../services/analytics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import I18n from "../../i18n";

const { width } = Dimensions.get('window');

interface IngredientItem {
  id: string;
  label: string;
  emoji: string;
}

const DEFAULT_SELECTED = ['2', '4', '5', '7', '8', '10', '14', '21', '22', '24'];

const IngredientCard = ({ item, isSelected, onSelect }: { item: IngredientItem, isSelected: boolean, onSelect: () => void }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Haptics.selectionAsync();
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1.05,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    onSelect();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
    >
      <Animated.View
        style={[
          styles.ingredientCard,
          isSelected && styles.ingredientCardSelected,
          { transform: [{ scale: scaleAnim }] }
        ]}
      >
        <Text style={styles.ingredientEmoji}>{item.emoji}</Text>
        <Text 
          style={[
            styles.ingredientLabel,
            isSelected && styles.ingredientLabelSelected
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit={true}
          minimumFontScale={0.7}
        >
          {item.label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function IngredientSelectionScreen() {
  const insets = useSafeAreaInsets();
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>(DEFAULT_SELECTED);
  const isLoading = false;

  const INGREDIENTS = useMemo(() => [
    { id: '1', label: I18n.t('onboarding.ingredientSelection.ingredients.tomatoes'), emoji: '🍅' },
    { id: '2', label: I18n.t('onboarding.ingredientSelection.ingredients.chicken'), emoji: '🍗' },
    { id: '3', label: I18n.t('onboarding.ingredientSelection.ingredients.avocado'), emoji: '🥑' },
    { id: '4', label: I18n.t('onboarding.ingredientSelection.ingredients.eggs'), emoji: '🥚' },
    { id: '5', label: I18n.t('onboarding.ingredientSelection.ingredients.pasta'), emoji: '🍝' },
    { id: '6', label: I18n.t('onboarding.ingredientSelection.ingredients.cheese'), emoji: '🧀' },
    { id: '7', label: I18n.t('onboarding.ingredientSelection.ingredients.onions'), emoji: '🧅' },
    { id: '8', label: I18n.t('onboarding.ingredientSelection.ingredients.potatoes'), emoji: '🥔' },
    { id: '9', label: I18n.t('onboarding.ingredientSelection.ingredients.mushrooms'), emoji: '🍄' },
    { id: '10', label: I18n.t('onboarding.ingredientSelection.ingredients.rice'), emoji: '🍚' },
    { id: '11', label: I18n.t('onboarding.ingredientSelection.ingredients.broccoli'), emoji: '🥦' },
    { id: '12', label: I18n.t('onboarding.ingredientSelection.ingredients.salmon'), emoji: '🐟' },
    { id: '13', label: I18n.t('onboarding.ingredientSelection.ingredients.zucchini'), emoji: '🥒' },
    { id: '14', label: I18n.t('onboarding.ingredientSelection.ingredients.garlic'), emoji: '🧄' },
    { id: '15', label: I18n.t('onboarding.ingredientSelection.ingredients.shrimp'), emoji: '🍤' },
    { id: '16', label: I18n.t('onboarding.ingredientSelection.ingredients.chili'), emoji: '🌶️' },
    { id: '17', label: I18n.t('onboarding.ingredientSelection.ingredients.lemon'), emoji: '🍋' },
    { id: '18', label: I18n.t('onboarding.ingredientSelection.ingredients.basil'), emoji: '🌿' },
    { id: '19', label: I18n.t('onboarding.ingredientSelection.ingredients.beef'), emoji: '🥩' },
    { id: '20', label: I18n.t('onboarding.ingredientSelection.ingredients.carrots'), emoji: '🥕' },
    { id: '21', label: I18n.t('onboarding.ingredientSelection.ingredients.spinach'), emoji: '🍃' },
    { id: '22', label: I18n.t('onboarding.ingredientSelection.ingredients.peppers'), emoji: '🫑' },
    { id: '23', label: I18n.t('onboarding.ingredientSelection.ingredients.lentils'), emoji: '🍲' },
    { id: '24', label: I18n.t('onboarding.ingredientSelection.ingredients.cream'), emoji: '🥛' },
    { id: '25', label: I18n.t('onboarding.ingredientSelection.ingredients.flour'), emoji: '🌾' },
    { id: '26', label: I18n.t('onboarding.ingredientSelection.ingredients.butter'), emoji: '🧈' },
    { id: '27', label: I18n.t('onboarding.ingredientSelection.ingredients.tuna'), emoji: '🐟' },
    { id: '28', label: I18n.t('onboarding.ingredientSelection.ingredients.turkey'), emoji: '🦃' },
  ], []);

  React.useEffect(() => {
    analytics.track('Onboarding - Ingredient Selection View');
  }, []);

  const toggleIngredient = (id: string) => {
    if (isLoading) return;
    setSelectedIngredients(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const MIN_INGREDIENTS = 10;
  const canContinue = selectedIngredients.length >= MIN_INGREDIENTS;

  const handleGenerate = async () => {
    if (canContinue && !isLoading) {
      const ingredientsString = selectedIngredients
        .map(id => INGREDIENTS.find(i => i.id === id)?.label)
        .join(', ');

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const nextParams = {
        streaming: 'true',
        showGenerateButton: 'false',
        ingredients: ingredientsString,
        isOnboarding: 'true',
        preferences: JSON.stringify({
          dishType: 'Meal',
          duration: 'Medium',
          servings: 2,
          cuisineStyle: 'All',
          diet: 'None',
          allowOtherIngredients: true
        })
      };

      router.replace({
        pathname: '/recipe-loading',
        params: {
          nextPath: '/recipe-detail',
          nextParams: JSON.stringify(nextParams),
          startGeneration: 'true'
        }
      });
    }
  };

  const handleSkip = async () => {
    analytics.track('Onboarding - Ingredient Selection Skip');
    const variant = await analytics.getOnboardingVariant();

    if (variant === 'B') {
      router.push({ pathname: '/paywall', params: { source: 'onboarding_variant_b' } });
    } else {
      router.replace('/onboarding/personalizedRecipes');
    }
  };

  const handleBackPress = () => {
    router.back();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: Platform.OS === 'ios' ? 0 : insets.bottom }]}>
      <View style={styles.progressHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackPress}
          activeOpacity={0.7}
        >
          <FontAwesome6 name="arrow-left" size={18} color={Colors.light.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{I18n.t('onboarding.ingredientSelection.title')}</Text>
          <Text style={styles.subtitle}>
            {I18n.t('onboarding.ingredientSelection.subtitle')}
          </Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.grid}>
            {INGREDIENTS.map((item) => (
              <IngredientCard
                key={item.id}
                item={item}
                isSelected={selectedIngredients.includes(item.id)}
                onSelect={() => toggleIngredient(item.id)}
              />
            ))}
          </View>
        </ScrollView>

        <View style={styles.bottomSection}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleGenerate}
            disabled={!canContinue || isLoading}
            style={[
              styles.generateButton,
              (!canContinue || isLoading) && styles.generateButtonDisabled
            ]}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Text style={styles.buttonText}>{I18n.t('onboarding.ingredientSelection.generateRecipe')}</Text>
                {selectedIngredients.length > 0 && selectedIngredients.length < MIN_INGREDIENTS && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{selectedIngredients.length}/{MIN_INGREDIENTS}</Text>
                  </View>
                )}
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.6}
            onPress={handleSkip}
            style={styles.skipButton}
          >
            <Text style={styles.skipButtonText}>{I18n.t('onboarding.ingredientSelection.skip')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF9E2',
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 20,
    height: 60,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    marginTop: 20,
    marginBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: width * 0.08,
    fontFamily: 'Degular',
    color: Colors.light.text,
    textAlign: 'center',
    lineHeight: width * 0.1,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'CronosProBold',
    color: '#8C8C8C',
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 10,
  },
  scrollContent: {
    paddingBottom: 180,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: Platform.OS === 'android' ? 4 : 0, // Espace pour les ombres
    paddingBottom: Platform.OS === 'android' ? 12 : 0, // Évite que les ombres en bas soient coupées
  },
  ingredientCard: {
    backgroundColor: 'white',
    width: Platform.OS === 'android' ? (width - 48 - 12 - 8) / 2 : (width - 48 - 12) / 2, // Ajustement pour le paddingHorizontal
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    marginHorizontal: Platform.OS === 'android' ? 2 : 0, // Évite le clipping de l'ombre
    marginVertical: Platform.OS === 'android' ? 2 : 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  ingredientCardSelected: {
    borderColor: '#FEB50A',
    backgroundColor: '#FFFBEB',
  },
  ingredientEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  ingredientLabel: {
    fontSize: 18,
    fontFamily: 'Degular',
    color: Colors.light.text,
    lineHeight: Platform.OS === 'android' ? 22 : undefined, // Fix truncation on Android
  },
  ingredientLabelSelected: {
    color: '#FEB50A',
  },
  bottomSection: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 70,
    left: 24,
    right: 24,
    gap: 12,
  },
  generateButton: {
    backgroundColor: Colors.light.button,
    paddingVertical: 18,
    borderRadius: 100,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.light.button,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  generateButtonDisabled: {
    backgroundColor: '#E0E0E0',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: 'white',
    fontSize: 19,
    fontFamily: 'Degular',
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 10,
  },
  badgeText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Degular',
  },
  skipButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#8C8C8C',
    fontSize: 16,
    fontFamily: 'CronosPro',
    textDecorationLine: 'underline',
  },
});
