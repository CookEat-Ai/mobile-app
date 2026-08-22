import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  ScrollView,
  Alert,
  Switch,
  Animated,
  Platform,
  Modal,
  TextInput,
  Pressable,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons, FontAwesome6 } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '../constants/Colors';
import { IconSymbol } from '../components/ui/IconSymbol';
import { LinearGradient } from 'expo-linear-gradient';
import apiService from '../services/api';
import analytics from '../services/analytics';
import recipeStorageService from '../services/recipeStorage';
import revenueCatService from '../config/revenuecat';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSubscription } from '../hooks/useSubscription';

import { useVoice } from '../hooks/useVoice';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { font } from '../constants/Layout';
import { contentColumn, useResponsive } from '../hooks/useResponsive';
import {
  loadRecipePreferences,
  saveRecipePreferences,
} from '../services/recipePreferences';
import {
  DEFAULT_RECIPE_PREFERENCES,
  type RecipePreferences,
} from '../services/recipePreferencesMapping';
import { loadOrCreateStarterPantry } from '../services/pantryDefaults';

interface Ingredient {
  id: string;
  name: string;
  category?: string;
}

const STORAGE_KEY = 'pantry_ingredients';
const MIN_INGREDIENTS = 5;

export default function RecipeSummaryScreen() {
  const { t } = useTranslation();
  const ingredientCategories = useMemo(() => [
    {
      id: 'legumes',
      title: t('home.categories.vegetables.title'),
      icon: '🥬',
      ingredients: [
        { id: 'carotte', name: t('home.categories.vegetables.carrot'), icon: '🥕' },
        { id: 'tomate', name: t('home.categories.vegetables.tomato'), icon: '🍅' },
        { id: 'oignon', name: t('home.categories.vegetables.onion'), icon: '🧅' },
        { id: 'poivron', name: t('home.categories.vegetables.pepper'), icon: '🫑' },
        { id: 'courgette', name: t('home.categories.vegetables.courgette'), icon: '🥒' },
        { id: 'brocoli', name: t('home.categories.vegetables.broccoli'), icon: '🥦' },
        { id: 'epinard', name: t('home.categories.vegetables.spinach'), icon: '🥬' },
        { id: 'poireau', name: t('home.categories.vegetables.leek'), icon: '🧄' },
        { id: 'ail', name: t('home.categories.vegetables.garlic'), icon: '🧄' },
        { id: 'champignon', name: t('home.categories.vegetables.mushroom'), icon: '🍄' },
        { id: 'concombre', name: t('home.categories.vegetables.cucumber'), icon: '🥒' },
        { id: 'chou-fleur', name: t('home.categories.vegetables.cauliflower'), icon: '🥬' },
        { id: 'pomme-de-terre', name: t('home.categories.vegetables.potato'), icon: '🥔' },
        { id: 'patate-douce', name: t('home.categories.vegetables.sweetPotato'), icon: '🍠' },
        { id: 'aubergine', name: t('home.categories.vegetables.eggplant'), icon: '🍆' },
        { id: 'salade', name: t('home.categories.vegetables.lettuce'), icon: '🥗' },
        { id: 'haricot-vert', name: t('home.categories.vegetables.greenBeans'), icon: '🫛' },
        { id: 'petits-pois', name: t('home.categories.vegetables.peas'), icon: '🫛' },
        { id: 'mais', name: t('home.categories.vegetables.corn'), icon: '🌽' },
        { id: 'potiron', name: t('home.categories.vegetables.pumpkin'), icon: '🎃' },
        { id: 'butternut', name: t('home.categories.vegetables.butternut'), icon: '🎃' },
        { id: 'chou', name: t('home.categories.vegetables.cabbage'), icon: '🥬' },
        { id: 'chou-de-bruxelles', name: t('home.categories.vegetables.brusselsSprouts'), icon: '🥬' },
        { id: 'radis', name: t('home.categories.vegetables.radish'), icon: '🥬' },
        { id: 'betterave', name: t('home.categories.vegetables.beetroot'), icon: '🥬' },
        { id: 'navet', name: t('home.categories.vegetables.turnip'), icon: '🥬' },
        { id: 'celeri', name: t('home.categories.vegetables.celery'), icon: '🥬' },
        { id: 'fenouil', name: t('home.categories.vegetables.fennel'), icon: '🥬' },
        { id: 'asperge', name: t('home.categories.vegetables.asparagus'), icon: '🥬' },
        { id: 'artichaut', name: t('home.categories.vegetables.artichoke'), icon: '🥬' },
        { id: 'avocat', name: t('home.categories.vegetables.avocado'), icon: '🥑' },
        { id: 'echalote', name: t('home.categories.vegetables.shallot'), icon: '🧅' },
        { id: 'endive', name: t('home.categories.vegetables.endive'), icon: '🥬' },
        { id: 'olive', name: t('home.categories.vegetables.olive'), icon: '🫒' },
      ]
    },
    {
      id: 'viandes',
      title: t('home.categories.meats.title'),
      icon: '🍖',
      ingredients: [
        { id: 'poulet', name: t('home.categories.meats.chicken'), icon: '🍗' },
        { id: 'boeuf', name: t('home.categories.meats.beef'), icon: '🥩' },
        { id: 'porc', name: t('home.categories.meats.pork'), icon: '🥓' },
        { id: 'agneau', name: t('home.categories.meats.lamb'), icon: '🐑' },
        { id: 'dinde', name: t('home.categories.meats.turkey'), icon: '🦃' },
        { id: 'veau', name: t('home.categories.meats.veal'), icon: '🐄' },
        { id: 'canard', name: t('home.categories.meats.duck'), icon: '🦆' },
        { id: 'lapin', name: t('home.categories.meats.rabbit'), icon: '🐇' },
        { id: 'jambon', name: t('home.categories.meats.ham'), icon: '🍖' },
        { id: 'lardon', name: t('home.categories.meats.bacon'), icon: '🥓' },
        { id: 'saucisse', name: t('home.categories.meats.sausage'), icon: '🌭' },
        { id: 'chorizo', name: t('home.categories.meats.chorizo'), icon: '🌭' },
        { id: 'merguez', name: t('home.categories.meats.merguez'), icon: '🌭' },
        { id: 'steak-hache', name: t('home.categories.meats.mincedBeef'), icon: '🥩' },
        { id: 'blanc-de-poulet', name: t('home.categories.meats.chickenBreast'), icon: '🍗' },
        { id: 'cuisse-de-poulet', name: t('home.categories.meats.chickenThigh'), icon: '🍗' },
        { id: 'cote-de-porc', name: t('home.categories.meats.porkChop'), icon: '🍖' },
        { id: 'boulette', name: t('home.categories.meats.meatballs'), icon: '🍖' },
      ]
    },
    {
      id: 'poissons',
      title: t('home.categories.fish.title'),
      icon: '🐟',
      ingredients: [
        { id: 'saumon', name: t('home.categories.fish.salmon'), icon: '🐟' },
        { id: 'thon', name: t('home.categories.fish.tuna'), icon: '🐠' },
        { id: 'cabillaud', name: t('home.categories.fish.cod'), icon: '🐡' },
        { id: 'sardine', name: t('home.categories.fish.sardine'), icon: '🐟' },
        { id: 'maquereau', name: t('home.categories.fish.maquereau'), icon: '🐠' },
        { id: 'bar', name: t('home.categories.fish.bar'), icon: '🐡' },
        { id: 'truite', name: t('home.categories.fish.trout'), icon: '🐟' },
        { id: 'colin', name: t('home.categories.fish.hake'), icon: '🐟' },
        { id: 'sole', name: t('home.categories.fish.sole'), icon: '🐟' },
        { id: 'dorade', name: t('home.categories.fish.seabream'), icon: '🐠' },
        { id: 'haddock', name: t('home.categories.fish.haddock'), icon: '🐟' },
        { id: 'anchois', name: t('home.categories.fish.anchovy'), icon: '🐟' },
        { id: 'crevette', name: t('home.categories.fish.shrimp'), icon: '🍤' },
        { id: 'moule', name: t('home.categories.fish.mussels'), icon: '🦪' },
        { id: 'calamar', name: t('home.categories.fish.squid'), icon: '🦑' },
        { id: 'crabe', name: t('home.categories.fish.crab'), icon: '🦀' },
        { id: 'homard', name: t('home.categories.fish.lobster'), icon: '🦞' },
        { id: 'saint-jacques', name: t('home.categories.fish.scallop'), icon: '🦪' },
        { id: 'surimi', name: t('home.categories.fish.surimi'), icon: '🍥' },
      ]
    },
    {
      id: 'necessites',
      title: t('home.categories.essentials.title'),
      icon: '🍚',
      ingredients: [
        { id: 'pates', name: t('home.categories.essentials.pasta'), icon: '🍝' },
        { id: 'riz', name: t('home.categories.essentials.rice'), icon: '🍚' },
        { id: 'semoule', name: t('home.categories.essentials.semolina'), icon: '🍚' },
        { id: 'creme', name: t('home.categories.essentials.cream'), icon: '🥛' },
        { id: 'lait', name: t('home.categories.essentials.milk'), icon: '🥛' },
        { id: 'huile', name: t('home.categories.essentials.oil'), icon: '🫒' },
        { id: 'beurre', name: t('home.categories.essentials.butter'), icon: '🧈' },
        { id: 'oeufs', name: t('home.categories.essentials.eggs'), icon: '🥚' },
        { id: 'farine', name: t('home.categories.essentials.flour'), icon: '🌾' },
        { id: 'pain', name: t('home.categories.essentials.bread'), icon: '🍞' },
        { id: 'chapelure', name: t('home.categories.essentials.breadcrumbs'), icon: '🍞' },
        { id: 'quinoa', name: t('home.categories.essentials.quinoa'), icon: '🌾' },
        { id: 'boulgour', name: t('home.categories.essentials.bulgur'), icon: '🌾' },
        { id: 'avoine', name: t('home.categories.essentials.oats'), icon: '🌾' },
        { id: 'lentille', name: t('home.categories.essentials.lentils'), icon: '🫘' },
        { id: 'pois-chiche', name: t('home.categories.essentials.chickpeas'), icon: '🫛' },
        { id: 'haricot-rouge', name: t('home.categories.essentials.redBeans'), icon: '🫘' },
        { id: 'haricot-blanc', name: t('home.categories.essentials.whiteBeans'), icon: '🫘' },
        { id: 'sucre', name: t('home.categories.essentials.sugar'), icon: '🍬' },
        { id: 'levure', name: t('home.categories.essentials.yeast'), icon: '🫙' },
        { id: 'yaourt', name: t('home.categories.essentials.yogurt'), icon: '🥛' },
        { id: 'lait-de-coco', name: t('home.categories.essentials.coconutMilk'), icon: '🥥' },
        { id: 'sauce-tomate', name: t('home.categories.essentials.tomatoSauce'), icon: '🥫' },
        { id: 'tomate-concassee', name: t('home.categories.essentials.cannedTomatoes'), icon: '🥫' },
        { id: 'pate-feuilletee', name: t('home.categories.essentials.puffPastry'), icon: '🥐' },
        { id: 'pate-brisee', name: t('home.categories.essentials.shortcrustPastry'), icon: '🥧' },
        { id: 'bouillon', name: t('home.categories.essentials.stock'), icon: '🫙' },
        { id: 'huile-tournesol', name: t('home.categories.essentials.sunflowerOil'), icon: '🌻' },
        { id: 'tofu', name: t('home.categories.essentials.tofu'), icon: '🍢' },
        { id: 'noix', name: t('home.categories.essentials.walnut'), icon: '🌰' },
        { id: 'amande', name: t('home.categories.essentials.almond'), icon: '🌰' },
        { id: 'noisette', name: t('home.categories.essentials.hazelnut'), icon: '🌰' },
        { id: 'pignon', name: t('home.categories.essentials.pineNuts'), icon: '🌰' },
      ]
    },
    {
      id: 'fromages',
      title: t('home.categories.cheeses.title'),
      icon: '🧀',
      ingredients: [
        { id: 'emmental', name: t('home.categories.cheeses.emmental'), icon: '🧀' },
        { id: 'cheddar', name: t('home.categories.cheeses.cheddar'), icon: '🧀' },
        { id: 'mozzarella', name: t('home.categories.cheeses.mozzarella'), icon: '🧀' },
        { id: 'parmesan', name: t('home.categories.cheeses.parmesan'), icon: '🧀' },
        { id: 'brie', name: t('home.categories.cheeses.brie'), icon: '🧀' },
        { id: 'camembert', name: t('home.categories.cheeses.camembert'), icon: '🧀' },
        { id: 'roquefort', name: t('home.categories.cheeses.roquefort'), icon: '🧀' },
        { id: 'feta', name: t('home.categories.cheeses.feta'), icon: '🧀' },
        { id: 'chevre', name: t('home.categories.cheeses.goat'), icon: '🧀' },
        { id: 'gruyere', name: t('home.categories.cheeses.gruyere'), icon: '🧀' },
        { id: 'comte', name: t('home.categories.cheeses.comte'), icon: '🧀' },
        { id: 'raclette', name: t('home.categories.cheeses.raclette'), icon: '🧀' },
        { id: 'reblochon', name: t('home.categories.cheeses.reblochon'), icon: '🧀' },
        { id: 'ricotta', name: t('home.categories.cheeses.ricotta'), icon: '🧀' },
        { id: 'mascarpone', name: t('home.categories.cheeses.mascarpone'), icon: '🧀' },
        { id: 'burrata', name: t('home.categories.cheeses.burrata'), icon: '🧀' },
        { id: 'bleu', name: t('home.categories.cheeses.blueCheese'), icon: '🧀' },
        { id: 'gorgonzola', name: t('home.categories.cheeses.gorgonzola'), icon: '🧀' },
        { id: 'fromage-frais', name: t('home.categories.cheeses.creamCheese'), icon: '🧀' },
        { id: 'halloumi', name: t('home.categories.cheeses.halloumi'), icon: '🧀' },
      ]
    },
    {
      id: 'epices',
      title: t('home.categories.spices.title'),
      icon: '🌶️',
      ingredients: [
        { id: 'sel', name: t('home.categories.spices.salt'), icon: '🧂' },
        { id: 'poivre', name: t('home.categories.spices.pepper'), icon: '🫙' },
        { id: 'paprika', name: t('home.categories.spices.paprika'), icon: '🌶️' },
        { id: 'cumin', name: t('home.categories.spices.cumin'), icon: '🌿' },
        { id: 'curry', name: t('home.categories.spices.curry'), icon: '🫙' },
        { id: 'herbes', name: t('home.categories.spices.herbes'), icon: '🌿' },
        { id: 'basilic', name: t('home.categories.spices.basil'), icon: '🌿' },
        { id: 'persil', name: t('home.categories.spices.parsley'), icon: '🌿' },
        { id: 'coriandre', name: t('home.categories.spices.coriander'), icon: '🌿' },
        { id: 'cannelle', name: t('home.categories.spices.cinnamon'), icon: '🫙' },
        { id: 'gingembre', name: t('home.categories.spices.ginger'), icon: '🫚' },
        { id: 'moutarde', name: t('home.categories.spices.mustard'), icon: '🫙' },
        { id: 'vinaigre', name: t('home.categories.spices.vinegar'), icon: '🫙' },
        { id: 'miel', name: t('home.categories.spices.honey'), icon: '🍯' },
        { id: 'citron', name: t('home.categories.spices.lemon'), icon: '🍋' },
        { id: 'origan', name: t('home.categories.spices.oregano'), icon: '🌿' },
        { id: 'thym', name: t('home.categories.spices.thyme'), icon: '🌿' },
        { id: 'piment', name: t('home.categories.spices.chili'), icon: '🌶️' },
        { id: 'curcuma', name: t('home.categories.spices.turmeric'), icon: '🌿' },
        { id: 'muscade', name: t('home.categories.spices.nutmeg'), icon: '🫙' },
        { id: 'romarin', name: t('home.categories.spices.rosemary'), icon: '🌿' },
        { id: 'laurier', name: t('home.categories.spices.bayLeaf'), icon: '🌿' },
        { id: 'menthe', name: t('home.categories.spices.mint'), icon: '🌿' },
        { id: 'ciboulette', name: t('home.categories.spices.chives'), icon: '🌿' },
        { id: 'aneth', name: t('home.categories.spices.dill'), icon: '🌿' },
        { id: 'estragon', name: t('home.categories.spices.tarragon'), icon: '🌿' },
        { id: 'sesame', name: t('home.categories.spices.sesame'), icon: '🌰' },
        { id: 'sauce-soja', name: t('home.categories.spices.soySauce'), icon: '🫙' },
        { id: 'ketchup', name: t('home.categories.spices.ketchup'), icon: '🍅' },
        { id: 'mayonnaise', name: t('home.categories.spices.mayonnaise'), icon: '🥫' },
        { id: 'harissa', name: t('home.categories.spices.harissa'), icon: '🌶️' },
        { id: 'ras-el-hanout', name: t('home.categories.spices.rasElHanout'), icon: '🫙' },
        { id: 'garam-masala', name: t('home.categories.spices.garamMasala'), icon: '🫙' },
        { id: 'cayenne', name: t('home.categories.spices.cayenne'), icon: '🌶️' },
        { id: 'vanille', name: t('home.categories.spices.vanilla'), icon: '🫙' },
        { id: 'cacao', name: t('home.categories.spices.cocoa'), icon: '🍫' },
        { id: 'capre', name: t('home.categories.spices.capers'), icon: '🫒' },
        { id: 'cornichon', name: t('home.categories.spices.pickles'), icon: '🥒' },
        { id: 'balsamique', name: t('home.categories.spices.balsamic'), icon: '🫙' },
      ]
    },
    {
      id: 'fruits',
      title: t('home.categories.fruits.title'),
      icon: '🍎',
      ingredients: [
        { id: 'pomme', name: t('home.categories.fruits.apple'), icon: '🍎' },
        { id: 'banane', name: t('home.categories.fruits.banana'), icon: '🍌' },
        { id: 'orange', name: t('home.categories.fruits.orange'), icon: '🍊' },
        { id: 'fraise', name: t('home.categories.fruits.strawberry'), icon: '🍓' },
        { id: 'raisin', name: t('home.categories.fruits.raisin'), icon: '🍇' },
        { id: 'kiwi', name: t('home.categories.fruits.kiwi'), icon: '🥝' },
        { id: 'ananas', name: t('home.categories.fruits.pineapple'), icon: '🍍' },
        { id: 'mangue', name: t('home.categories.fruits.mango'), icon: '🥭' },
        { id: 'poire', name: t('home.categories.fruits.pear'), icon: '🍐' },
        { id: 'peche', name: t('home.categories.fruits.peach'), icon: '🍑' },
        { id: 'abricot', name: t('home.categories.fruits.apricot'), icon: '🍑' },
        { id: 'prune', name: t('home.categories.fruits.plum'), icon: '🍑' },
        { id: 'cerise', name: t('home.categories.fruits.cherry'), icon: '🍒' },
        { id: 'framboise', name: t('home.categories.fruits.raspberry'), icon: '🫐' },
        { id: 'myrtille', name: t('home.categories.fruits.blueberry'), icon: '🫐' },
        { id: 'mure', name: t('home.categories.fruits.blackberry'), icon: '🫐' },
        { id: 'pasteque', name: t('home.categories.fruits.watermelon'), icon: '🍉' },
        { id: 'melon', name: t('home.categories.fruits.melon'), icon: '🍈' },
        { id: 'citron-vert', name: t('home.categories.fruits.lime'), icon: '🍋' },
        { id: 'pamplemousse', name: t('home.categories.fruits.grapefruit'), icon: '🍊' },
        { id: 'noix-de-coco', name: t('home.categories.fruits.coconut'), icon: '🥥' },
        { id: 'figue', name: t('home.categories.fruits.fig'), icon: '🍈' },
        { id: 'datte', name: t('home.categories.fruits.date'), icon: '🌴' },
        { id: 'clementine', name: t('home.categories.fruits.clementine'), icon: '🍊' },
      ]
    }
  ], []);

  const DISH_TYPES = useMemo(() => [
    { id: 'all', label: t('recipeSummary.any') },
    { id: 'dinner', label: t('search.categories.dinner') },
    { id: 'gratin', label: t('recipeSummary.gratin') },
    { id: 'soup', label: t('recipeSummary.soup') },
    { id: 'brunch', label: t('recipeSummary.brunch') },
    { id: 'salad', label: t('recipeSummary.salad') },
    { id: 'oven', label: t('onboarding.formQuestions.dish_oven') },
    { id: 'street_food', label: t('onboarding.formQuestions.dish_street') },
    { id: 'dessert', label: t('search.categories.dessert') },
  ], []);

  const DURATIONS = useMemo(() => [
    { id: 'all', label: t('recipeSummary.any') },
    { id: 'fast', label: t('recipeSummary.quick') },
    { id: 'medium', label: t('recipeSummary.medium') },
    { id: 'long', label: t('recipeSummary.long') },
  ], []);

  const DIETS = useMemo(() => [
    { id: 'vegan', label: t('recipeSummary.vegan') },
    { id: 'vegetarian', label: t('recipeSummary.vegetarian') },
    { id: 'halal', label: t('recipeSummary.halal') },
    { id: 'keto', label: t('recipeSummary.keto') },
    { id: 'paleo', label: t('recipeSummary.paleo') }
  ], []);

  const CUISINE_STYLES = useMemo(() => [
    { id: 'all', label: t('recipeSummary.allCuisines') },
    { id: 'french', label: t('recipeSummary.french') },
    { id: 'italian', label: t('recipeSummary.italian') },
    { id: 'mediterranean', label: t('recipeSummary.mediterranean') },
    { id: 'middle_eastern', label: t('onboarding.formQuestions.cuisine_middle_eastern') },
    { id: 'asian', label: t('recipeSummary.asian') },
    { id: 'spicy', label: t('recipeSummary.spicy') },
    { id: 'mexican', label: t('recipeSummary.mexican') },
    { id: 'indian', label: t('recipeSummary.indian') },
    { id: 'american', label: t('onboarding.formQuestions.cuisine_american') },
  ], []);

  const GOALS = useMemo(() => [
    { id: 'neutral', label: t('recipeSummary.neutral') },
    { id: 'weight_loss', label: t('recipeSummary.weight_loss') },
    { id: 'mass_gain', label: t('recipeSummary.mass_gain') },
  ], []);

  const EQUIPMENTS = useMemo(() => [
    { id: 'oven', label: t('recipeSummary.equipment_oven') },
    { id: 'airfryer', label: t('recipeSummary.equipment_airfryer') },
    { id: 'microwave', label: t('recipeSummary.equipment_microwave') },
    { id: 'blender', label: t('recipeSummary.equipment_blender') },
    { id: 'robot', label: t('recipeSummary.equipment_robot') },
  ], []);

  const ALLERGIES = useMemo(() => [
    { id: 'pork', label: t('onboarding.formQuestions.avoid_pork') },
    { id: 'alcohol', label: t('onboarding.formQuestions.avoid_alcohol') },
    { id: 'beef', label: t('onboarding.formQuestions.avoid_beef') },
    { id: 'gluten', label: t('recipeSummary.avoid_gluten') },
    { id: 'dairy', label: t('recipeSummary.avoid_dairy') },
    { id: 'egg', label: t('recipeSummary.avoid_egg') },
    { id: 'fish', label: t('recipeSummary.avoid_fish') },
    { id: 'peanut', label: t('recipeSummary.avoid_peanut') },
  ], []);

  const colors = Colors.light;

  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    ingredients?: string;
    isOnboarding?: string;
    mode?: string;
    onboardingDemoRole?: 'primary' | 'secondary';
    onboardingNext?: string;
  }>();
  const { subscriptionStatus } = useSubscription();

  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [liveText, setLiveText] = useState('');
  const liveTextRef = useRef('');
  const isProcessingVoiceRef = useRef(false);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [isFirstGeneration, setIsFirstGeneration] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [isAddingIngredient, setIsAddingIngredient] = useState(false);
  const [categoryAddModalCategoryId, setCategoryAddModalCategoryId] = useState<string | null>(null);
  const [isCategoryAddModalVisible, setIsCategoryAddModalVisible] = useState(false);
  const [selectedIngredientsForCategoryModal, setSelectedIngredientsForCategoryModal] = useState<string[]>([]);
  const [categoryAddModalSearch, setCategoryAddModalSearch] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  // `useResponsive` suit la rotation et le Split View, contrairement à l'ancien
  // `Dimensions.get('window')` figé à l'import.
  const { width: windowWidth, height: screenHeight } = useResponsive();
  // La grille garde exactement 3 colonnes sur téléphone ; au-delà de 480pt la
  // pastille cesse de grandir et la grille passe simplement à plus de colonnes.
  const chipWidth = (Math.min(windowWidth, 480) - 125) / 3;
  const filterSlideAnim = useRef(new Animated.Value(screenHeight)).current;
  const categoryAddSlideAnim = useRef(new Animated.Value(screenHeight)).current;

  const [preferences, setPreferences] = useState<RecipePreferences>({
    ...DEFAULT_RECIPE_PREFERENCES,
  });

  useEffect(() => {
    const initData = async () => {
      // 1. Check if first generation
      const history = await recipeStorageService.getStoredRecipes();
      const isFirst = history.length === 0;
      setIsFirstGeneration(isFirst);

      // 2. Load ingredients from params if present, else from storage
      if (params.ingredients) {
        let ingredientsList: Ingredient[];
        try {
          const parsed = JSON.parse(params.ingredients);
          if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
            ingredientsList = parsed.map((ing: { name: string; category?: string }, index: number) => ({
              id: (Date.now() + index).toString(),
              name: ing.name.trim().charAt(0).toUpperCase() + ing.name.trim().slice(1).toLowerCase(),
              category: ing.category || 'other',
            }));
          } else {
            throw new Error('fallback to CSV');
          }
        } catch {
          ingredientsList = params.ingredients.split(',').map((ingredient, index) => ({
            id: (Date.now() + index).toString(),
            name: ingredient.trim().charAt(0).toUpperCase() + ingredient.trim().slice(1).toLowerCase(),
          }));
        }

        if (params.mode === 'append') {
          setIngredients(prev => {
            const filtered = ingredientsList.filter(newIng =>
              !prev.some(existing => normalizeIngredientName(existing.name) === normalizeIngredientName(newIng.name))
            );
            const updated = [...prev, ...filtered];
            saveIngredientsToPantry(updated);
            return updated;
          });
        } else {
          setIngredients(ingredientsList);
          saveIngredientsToPantry(ingredientsList);
        }
      } else {
        const { ingredients: storedIngredients } = await loadOrCreateStarterPantry(t);
        setIngredients(storedIngredients);
      }

      // 3. Les réponses d'onboarding initialisent les vrais filtres de recette.
      // Les modifications ultérieures faites ici restent ensuite prioritaires.
      const resolvedPreferences = await loadRecipePreferences({
        preferCurrentOnboarding: params.isOnboarding === 'true',
      });
      setPreferences(resolvedPreferences);
    };

    initData();
  }, [params.ingredients, params.isOnboarding, params.mode]);

  useFocusEffect(
    useCallback(() => {
      const applyPendingCameraIngredients = async () => {
        try {
          const raw = await AsyncStorage.getItem('cookeat_camera_ingredients_append');
          if (!raw) return;
          await AsyncStorage.removeItem('cookeat_camera_ingredients_append');
          let ingredientsList: Ingredient[];
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
              ingredientsList = parsed.map((ing: { name: string; category?: string }, index: number) => ({
                id: (Date.now() + index).toString(),
                name: ing.name.trim().charAt(0).toUpperCase() + ing.name.trim().slice(1).toLowerCase(),
                category: ing.category || 'other',
              }));
            } else {
              ingredientsList = raw.split(',').map((ingredient, index) => ({
                id: (Date.now() + index).toString(),
                name: ingredient.trim().charAt(0).toUpperCase() + ingredient.trim().slice(1).toLowerCase(),
              }));
            }
          } catch {
            ingredientsList = raw.split(',').map((ingredient, index) => ({
              id: (Date.now() + index).toString(),
              name: ingredient.trim().charAt(0).toUpperCase() + ingredient.trim().slice(1).toLowerCase(),
            }));
          }
          setIngredients(prev => {
            const filtered = ingredientsList.filter(newIng =>
              !prev.some(existing => normalizeIngredientName(existing.name) === normalizeIngredientName(newIng.name))
            );
            const updated = [...prev, ...filtered];
            saveIngredientsToPantry(updated);
            return updated;
          });
        } catch (e) {
          console.error('Erreur application ingrédients caméra:', e);
        }
      };
      applyPendingCameraIngredients();
    }, [])
  );

  const closeFilterModal = () => {
    Animated.timing(filterSlideAnim, {
      toValue: screenHeight,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      setIsFilterModalVisible(false);
    });
  };

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const openCategoryAddModal = (categoryId: string) => {
    Keyboard.dismiss();
    setCategoryAddModalCategoryId(categoryId);
    setSelectedIngredientsForCategoryModal([]);
    setCategoryAddModalSearch('');
    setIsCategoryAddModalVisible(true);
  };

  const closeCategoryAddModal = () => {
    Keyboard.dismiss();
    Animated.timing(categoryAddSlideAnim, {
      toValue: screenHeight,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      setIsCategoryAddModalVisible(false);
      setCategoryAddModalCategoryId(null);
      setSelectedIngredientsForCategoryModal([]);
      setCategoryAddModalSearch('');
    });
  };

  const toggleCategoryModalIngredient = (ingredientName: string) => {
    setSelectedIngredientsForCategoryModal(prev => {
      const normalized = normalizeIngredientName(ingredientName);
      const isSelected = prev.some(n => normalizeIngredientName(n) === normalized);
      if (isSelected) return prev.filter(n => normalizeIngredientName(n) !== normalized);
      return [...prev, ingredientName];
    });
  };

  const confirmCategoryAddModal = () => {
    if (!categoryAddModalCategoryId) return;
    const toAdd: Ingredient[] = [];
    for (const name of selectedIngredientsForCategoryModal) {
      const normalized = normalizeIngredientName(name);
      const alreadyThere = ingredients.some(i => normalizeIngredientName(i.name) === normalized);
      if (!alreadyThere) {
        toAdd.push({
          id: Date.now().toString() + Math.random(),
          name: name.charAt(0).toUpperCase() + name.slice(1).toLowerCase(),
          category: categoryAddModalCategoryId,
        });
      }
    }
    if (toAdd.length > 0) {
      setIngredients(prev => {
        const updated = [...prev, ...toAdd];
        saveIngredientsToPantry(updated);
        return updated;
      });
    }
    closeCategoryAddModal();
  };

  useEffect(() => {
    if (isFilterModalVisible) {
      Animated.spring(filterSlideAnim, {
        toValue: 0,
        useNativeDriver: false,
        tension: 50,
        friction: 8
      }).start();
    } else {
      filterSlideAnim.setValue(screenHeight);
    }
  }, [isFilterModalVisible, filterSlideAnim, screenHeight]);

  useEffect(() => {
    if (isCategoryAddModalVisible) {
      categoryAddSlideAnim.setValue(screenHeight);
      Animated.spring(categoryAddSlideAnim, {
        toValue: 0,
        useNativeDriver: false,
        tension: 50,
        friction: 8,
      }).start();
    } else {
      categoryAddSlideAnim.setValue(screenHeight);
    }
  }, [isCategoryAddModalVisible]);

  const saveIngredientsToPantry = async (items: Ingredient[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des ingrédients:', error);
    }
  };

  const handleLiveTextChange = (text: string) => {
    setLiveText(text);
    liveTextRef.current = text;
  };

  const handleRecordingStateChange = async (recording: boolean) => {
    if (recording) {
      setLiveText('');
      liveTextRef.current = '';
      isProcessingVoiceRef.current = false;
    } else {
      // Éviter les traitements multiples si l'événement d'arrêt est déclenché plusieurs fois
      if (isProcessingVoiceRef.current) return;

      const finalActiveText = liveTextRef.current;
      if (finalActiveText.length > 3) {
        isProcessingVoiceRef.current = true;
        setIsAddingIngredient(true);
        try {
          const response = await apiService.processVoiceIngredients(finalActiveText);
          const voiceIngredients = response.data?.ingredients || [];

          if (voiceIngredients.length > 0) {
            setIngredients(prev => {
              const newIngredients = voiceIngredients.map((ing: any, index: number) => ({
                id: (Date.now() + index + Math.random()).toString(),
                name: ing.name.trim().charAt(0).toUpperCase() + ing.name.trim().slice(1).toLowerCase(),
                category: ing.category || 'other',
              })).filter((newIng: Ingredient) =>
                !prev.some(existing => normalizeIngredientName(existing.name) === normalizeIngredientName(newIng.name))
              );

              if (newIngredients.length === 0) return prev;

              const updated = [...prev, ...newIngredients];
              saveIngredientsToPantry(updated);
              return updated;
            });
          }
        } catch (error) {
          console.error('Erreur lors du traitement des ingrédients vocaux:', error);
          Alert.alert(t('common.error'), t('home.voice.errorTitle'));
        } finally {
          setIsAddingIngredient(false);
          setLiveText('');
          liveTextRef.current = '';
        }
      } else {
        // Clear even if text was too short
        setLiveText('');
        liveTextRef.current = '';
      }
    }
  };

  const { isRecording, startRecording, stopRecording } = useVoice({
    onRecordingStateChange: (state) => handleRecordingStateChange(state),
    onLiveTextChange: (text) => handleLiveTextChange(text)
  });

  const savePreferencesToStorage = async (items: RecipePreferences) => {
    try {
      await saveRecipePreferences(items);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des préférences:', error);
    }
  };

  const removeIngredient = (id: string) => {
    const updatedIngredients = ingredients.filter(i => i.id !== id);
    setIngredients(updatedIngredients);
    saveIngredientsToPantry(updatedIngredients);
  };

  const updateIngredientName = (id: string, newName: string) => {
    const updatedIngredients = ingredients.map(ing =>
      ing.id === id ? { ...ing, name: newName } : ing
    );
    setIngredients(updatedIngredients);
    saveIngredientsToPantry(updatedIngredients);
  };

  // Recherche insensible à la casse et aux accents : "creme" doit trouver "Crème fraîche".
  // Les ligatures sont dépliées car NFD ne les décompose pas et peu de claviers les
  // proposent : "oeuf" doit trouver "Œufs", "boeuf" doit trouver "Bœuf".
  // Repli silencieux sur une simple minuscule si normalize() n'est pas disponible.
  const deburr = (value: string) => {
    const decomposed = typeof value.normalize === 'function' ? value.normalize('NFD') : value;
    return decomposed
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/œ/g, 'oe')
      .replace(/æ/g, 'ae')
      .trim();
  };

  const normalizeIngredientName = (name: string) => {
    let n = name.toLowerCase().trim();
    if (n.endsWith('s') || n.endsWith('x')) {
      // Éviter de tronquer des mots courts comme "noix" ou "ail" (cas particuliers)
      if (n.length > 3) return n.slice(0, -1);
    }
    return n;
  };

  const isDuplicateIngredient = (newName: string, existingIngredients: Ingredient[]) => {
    const normalizedNew = normalizeIngredientName(newName);
    return existingIngredients.some(ing =>
      normalizeIngredientName(ing.name) === normalizedNew
    );
  };

  const addManualIngredient = async () => {
    const input = manualInput?.trim();
    if (!input) return;
    if (isDuplicateIngredient(input, ingredients)) {
      setManualInput('');
      return;
    }

    setIsAddingIngredient(true);
    const name = input.charAt(0).toUpperCase() + input.slice(1).toLowerCase();
    setManualInput('');

    try {
      const response = await apiService.processVoiceIngredients(name);
      const aiIngredient = response.data?.ingredients?.[0];
      const newIngredient: Ingredient = {
        id: Date.now().toString(),
        name: aiIngredient?.name || name,
        category: aiIngredient?.category || 'other',
      };
      const updatedIngredients = [...ingredients, newIngredient];
      setIngredients(updatedIngredients);
      saveIngredientsToPantry(updatedIngredients);
    } catch {
      const newIngredient: Ingredient = {
        id: Date.now().toString(),
        name,
        category: 'other',
      };
      const updatedIngredients = [...ingredients, newIngredient];
      setIngredients(updatedIngredients);
      saveIngredientsToPantry(updatedIngredients);
    } finally {
      setIsAddingIngredient(false);
    }
  };

  const updatePreference = (key: keyof RecipePreferences, value: any) => {
    setPreferences(prev => {
      const updated = { ...prev, [key]: value };
      savePreferencesToStorage(updated);
      return updated;
    });
  };

  const toggleDiet = (id: string) => {
    if (preferences.diet === id) {
      updatePreference('diet', 'none');
    } else {
      updatePreference('diet', id);
    }
  };

  const toggleAllergy = (id: string) => {
    const currentAllergies = [...preferences.allergies];
    if (currentAllergies.includes(id)) {
      updatePreference('allergies', currentAllergies.filter(a => a !== id));
    } else {
      updatePreference('allergies', [...currentAllergies, id]);
    }
  };

  const toggleEquipment = (id: string) => {
    const currentEquipments = [...preferences.equipments];
    if (currentEquipments.includes(id)) {
      updatePreference('equipments', currentEquipments.filter(e => e !== id));
    } else {
      updatePreference('equipments', [...currentEquipments, id]);
    }
  };

  const toggleCuisineStyle = (id: string) => {
    // « Tout » est une absence de filtre et reste donc exclusif des cuisines
    // précises. Cela évite d'envoyer simultanément « all, asian » à l'API.
    if (id === 'all') {
      updatePreference('cuisineStyle', ['all']);
      return;
    }

    let currentStyles = [...preferences.cuisineStyle];

    if (currentStyles.includes(id)) {
      currentStyles = currentStyles.filter(s => s !== id);
    } else {
      // Retirer 'all' si présent lors de l'ajout d'un style spécifique
      currentStyles = currentStyles.filter(s => s !== 'all').concat(id);
    }

    // Si tout est décoché, on remet 'all' par défaut en interne
    if (currentStyles.length === 0) {
      currentStyles = ['all'];
    }

    updatePreference('cuisineStyle', currentStyles);
  };

  const renderChip = (label: string, isSelected: boolean, onPress: () => void, key?: string, isPremium?: boolean) => (
    <Pressable
      key={key}
      style={({ pressed }) => [
        styles.chip,
        isSelected && styles.chipSelected,
        isPremium && !subscriptionStatus.isSubscribed && !isFirstGeneration && params.isOnboarding !== 'true' && styles.chipPremium,
        pressed && { opacity: 0.7 }
      ]}
      onPress={() => {
        if (isPremium && !subscriptionStatus.isSubscribed && !isFirstGeneration && params.isOnboarding !== 'true') {
          router.push({ pathname: '/paywall', params: { source: `filter_${key || label}` } });
          return;
        }
        onPress();
      }}
      hitSlop={4}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text style={isSelected ? styles.chipTextSelected : styles.chipText}>
          {label}
        </Text>
        {isPremium && !subscriptionStatus.isSubscribed && !isFirstGeneration && params.isOnboarding !== 'true' && (
          <Ionicons name="lock-closed" size={12} color="#666" />
        )}
      </View>
    </Pressable>
  );

  const handleIngredientToggle = (ingredientName: string, categoryId?: string) => {
    const normalizedTarget = normalizeIngredientName(ingredientName);
    const existingIndex = ingredients.findIndex(i => normalizeIngredientName(i.name) === normalizedTarget);

    if (existingIndex !== -1) {
      const updatedIngredients = ingredients.filter((_, index) => index !== existingIndex);
      setIngredients(updatedIngredients);
      saveIngredientsToPantry(updatedIngredients);
    } else {
      const newIngredient: Ingredient = {
        id: Date.now().toString(),
        name: ingredientName.charAt(0).toUpperCase() + ingredientName.slice(1).toLowerCase(),
        category: categoryId,
      };
      const updatedIngredients = [...ingredients, newIngredient];
      setIngredients(updatedIngredients);
      saveIngredientsToPantry(updatedIngredients);
    }
  };

  const handleGenerateRecipe = async () => {
    if (ingredients.length < MIN_INGREDIENTS) {
      Alert.alert(t('recipeSummary.error'), t('recipeSummary.pleaseAddAtLeastFiveIngredients'));
      return;
    }

    const ingredientsWithCategories = JSON.stringify(
      ingredients.map(i => ({ name: i.name, category: i.category || 'other' }))
    );

    setIsLoading(true);
    try {
      // Le pré-check précède le quota : une combinaison impossible ne consomme
      // jamais la génération gratuite de l'utilisateur.
      const feasibilityResponse = await apiService.checkRecipeFeasibility(
        ingredientsWithCategories,
        preferences,
      );
      const feasibility = feasibilityResponse.data;

      analytics.track('recipe_feasibility_checked', {
        can_generate: feasibility?.canGenerate ?? true,
        status: feasibility?.status || 'request_failed_open',
        confidence: feasibility?.confidence ?? 0,
        checked_by: feasibility?.checkedBy || 'client_fail_open',
        dish_type: preferences.dishType,
        ingredient_count: ingredients.length,
        allow_other_ingredients: preferences.allowOtherIngredients,
      });

      if (feasibility && !feasibility.canGenerate) {
        analytics.track('recipe_generation_blocked_impossible', {
          dish_type: preferences.dishType,
          ingredient_count: ingredients.length,
          confidence: feasibility.confidence,
        });

        const suggestions = feasibility.suggestions
          .filter(Boolean)
          .map((suggestion) => `• ${suggestion}`)
          .join('\n');
        const message = [
          feasibility.reason || t('recipeSummary.feasibilityFallback'),
          suggestions,
        ].filter(Boolean).join('\n\n');

        Alert.alert(
          t('recipeSummary.feasibilityTitle'),
          message,
          [
            {
              text: t('recipeSummary.changePreferences'),
              onPress: () => setIsFilterModalVisible(true),
            },
            {
              text: t('recipeSummary.editIngredients'),
              style: 'cancel',
            },
          ],
        );
        return;
      }

      if (feasibilityResponse.error) {
        analytics.track('recipe_feasibility_check_failed_open', {
          dish_type: preferences.dishType,
          ingredient_count: ingredients.length,
        });
      }

      // Consommer la génération offerte à vie uniquement après validation.
      if (!subscriptionStatus.isSubscribed && params.isOnboarding !== 'true') {
        const canGenerate = await revenueCatService.useFreeGeneration();
        if (!canGenerate) {
          router.push({ pathname: '/paywall', params: { source: 'free_generation_used_summary' } });
          return;
        }
      }

      const nextParams = JSON.stringify({
        streaming: 'true',
        ingredients: ingredientsWithCategories,
        preferences: JSON.stringify(preferences),
        isOnboarding: params.isOnboarding,
        onboardingNext: params.onboardingNext,
        onboardingDemoRole: params.onboardingDemoRole,
      });

      if (params.isOnboarding === 'true') {
        analytics.track('onboarding_generation_demo_generate_pressed', {
          demo_role: params.onboardingDemoRole || 'primary',
          ingredient_count: ingredients.length,
        });
      }

      router.push({
        pathname: '/recipe-loading',
        params: {
          durationMs: '10000',
          startGeneration: 'true',
          nextPath: '/recipe-detail',
          nextParams,
        },
      });
    } catch (error) {
      console.error('Erreur avant génération:', error);
      Alert.alert(t('recipeSummary.error'), t('recipeSummary.unableToGenerateRecipe'));
    } finally {
      setIsLoading(false);
    }
  };

  const CATEGORY_META: Record<string, { title: string; icon: string }> = useMemo(() => {
    const meta: Record<string, { title: string; icon: string }> = {
      epices: { title: t('home.categories.spices.title', { defaultValue: 'Épices & Condiments' }), icon: '🌶️' },
      other: { title: t('recipeSummary.other', { defaultValue: 'Autres' }), icon: '📦' },
    };
    for (const cat of ingredientCategories) {
      meta[cat.id] = { title: cat.title, icon: cat.icon };
    }
    return meta;
  }, [ingredientCategories]);

  // Même ordre que la sélection manuelle, fruits toujours avant-dernière, other en dernier
  const CATEGORY_ORDER = useMemo(() => {
    const order = ingredientCategories.map(c => c.id).filter(id => id !== 'fruits');
    if (!order.includes('epices')) order.push('epices');
    order.push('fruits');
    order.push('other');
    return order;
  }, [ingredientCategories]);

  const groupedIngredients = useMemo(() => {
    const catalogLookup = new Map<string, string>();
    for (const cat of ingredientCategories) {
      for (const ing of cat.ingredients) {
        catalogLookup.set(normalizeIngredientName(ing.name), cat.id);
      }
    }

    const groupMap = new Map<string, Ingredient[]>();
    for (const ing of ingredients) {
      const catId = ing.category || catalogLookup.get(normalizeIngredientName(ing.name)) || 'other';
      if (!groupMap.has(catId)) groupMap.set(catId, []);
      groupMap.get(catId)!.push(ing);
    }

    // Afficher toutes les catégories dans l'ordre de la sélection manuelle, avec "Aucun" si vide
    const groups: { id: string; title: string; icon: string; items: Ingredient[] }[] = [];
    for (const catId of CATEGORY_ORDER) {
      const items = groupMap.get(catId) || [];
      const meta = CATEGORY_META[catId] || CATEGORY_META['other'];
      groups.push({ id: catId, title: meta.title, icon: meta.icon, items });
    }
    return groups;
  }, [ingredients, ingredientCategories, CATEGORY_META, CATEGORY_ORDER]);

  const handleBack = async () => {
    if (params.isOnboarding === 'true' && params.onboardingDemoRole === 'secondary') {
      router.replace('/onboarding/generationDemo');
      return;
    }
    if (params.isOnboarding === 'true' && params.onboardingDemoRole === 'primary') {
      router.replace('/onboarding/onboardingProfileReady');
      return;
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }

    // Sécurité : si on ne peut pas revenir en arrière (ex: après un replace),
    // on redirige vers l'accueil ou l'onboarding selon le contexte
    if (params.isOnboarding !== 'true') {
      router.replace('/(tabs)');
      return;
    }

    const variant = await analytics.getOnboardingVariant();
    if (variant === 'E' || variant === 'F') {
      // E/F n'ont pas d'écran ahaMoment dédié : on revient dans le flux mono-écran
      router.replace({ pathname: '/onboarding/fastOnboarding', params: { initialStep: '0' } });
    } else {
      router.replace('/onboarding/ahaMoment');
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#F6EEE9', '#FFFFFF']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        locations={[0, 0.3]}
        style={StyleSheet.absoluteFill}
      />

      {/* Floating Back Button */}
      <TouchableOpacity
        style={[styles.floatingCircleButton, { left: 20, top: insets.top + 10 }]}
        onPress={handleBack}
      >
        <FontAwesome6 name="arrow-left" size={18} color={Colors.light.textSecondary} />
      </TouchableOpacity>

      {/* Floating Filter Button */}
      <TouchableOpacity
        style={[styles.floatingCircleButton, { right: 20, top: insets.top + 10 }]}
        onPress={() => setIsFilterModalVisible(true)}
      >
        <IconSymbol name="slider.horizontal.3" size={22} color={colors.text} weight="bold" />
      </TouchableOpacity>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{
          paddingBottom: 150,
          paddingTop: insets.top + 80,
          paddingHorizontal: 24,
          ...contentColumn(),
        }}
        showsVerticalScrollIndicator={false}
      >
        {params.isOnboarding === 'true' && (
          <View style={styles.onboardingDemoBanner}>
            <View style={styles.onboardingDemoBadge}>
              <Ionicons name="sparkles" size={14} color={Colors.light.button} />
              <Text style={styles.onboardingDemoBadgeText}>
                {t(
                  params.onboardingDemoRole === 'secondary'
                    ? 'onboarding.generationDemo.secondaryBanner'
                    : 'onboarding.generationDemo.primaryBanner',
                )}
              </Text>
            </View>
            <Text style={styles.onboardingDemoTitle}>
              {t('onboarding.generationDemo.readyTitle')}
            </Text>
            <Text style={styles.onboardingDemoSubtitle}>
              {t('onboarding.generationDemo.readySubtitle')}
            </Text>
          </View>
        )}

        {/* Section ingrédients */}
        <View style={styles.section}>
          <View style={styles.ingredientsHeader}>
            <Text style={styles.sectionTitle}>{t('recipeSummary.ingredients')}</Text>
            <TouchableOpacity
              style={styles.roundAddButton}
              onPress={() => {
                router.push({
                  pathname: '/camera',
                  params: { mode: 'append', initialMode: 'photo', isOnboarding: params.isOnboarding }
                });
              }}
            >
              <IconSymbol name="camera.fill" size={22} color="white" weight="bold" />
            </TouchableOpacity>
          </View>

          {/* Barre de saisie : input + micro à droite + bouton Ajouter */}
          <View style={styles.searchBarContainer}>
            <TextInput
              style={styles.manualTextInput}
              placeholder={t('recipeSummary.ingredientName')}
              value={manualInput}
              onChangeText={setManualInput}
              onSubmitEditing={addManualIngredient}
              returnKeyType="done"
              editable={!isAddingIngredient}
            />
            <TouchableOpacity
              style={[styles.microInlineButton, isRecording && styles.microInlineButtonActive]}
              onPress={() => isRecording ? stopRecording() : startRecording()}
            >
              <FontAwesome name="microphone" size={20} color={isRecording ? "white" : Colors.light.button} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.manualAddButton,
                (!manualInput.trim() || isAddingIngredient) && styles.manualAddButtonDisabled
              ]}
              onPress={addManualIngredient}
              disabled={!manualInput.trim() || isAddingIngredient}
            >
              {isAddingIngredient ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.manualAddButtonText}>{t('recipeSummary.add')}</Text>
              )}
            </TouchableOpacity>
          </View>

          {liveText.length > 0 && (
            <View style={styles.liveTextContainer}>
              <Text style={styles.liveText}>{liveText}</Text>
              {isAddingIngredient && (
                <ActivityIndicator size="small" color={Colors.light.button} style={{ marginLeft: 10 }} />
              )}
            </View>
          )}

          {groupedIngredients.map(group => {
            const categoryForAdd = ingredientCategories.find(c => c.id === group.id);
            return (
              <View key={group.id} style={styles.ingredientGroup}>
                <View style={styles.groupHeader}>
                  <Text style={styles.groupIcon}>{group.icon}</Text>
                  <View style={styles.groupTitleRow}>
                    <Text style={styles.groupTitle}>{group.title}</Text>
                    <Text style={styles.groupCount}>{group.items.length}</Text>
                  </View>
                  {categoryForAdd ? (
                    <TouchableOpacity
                      style={styles.categoryAddButton}
                      onPress={() => openCategoryAddModal(group.id)}
                    >
                      <IconSymbol name="plus" size={16} color="white" weight="bold" />
                    </TouchableOpacity>
                  ) : null}
                </View>
                {group.items.length === 0 ? (
                  <Text style={styles.categoryEmptyText}>{t('recipeSummary.none')}</Text>
                ) : (
                  group.items.map(ingredient => (
                    <View style={styles.ingredientItem} key={ingredient.id}>
                      <TextInput
                        style={styles.ingredientName}
                        value={ingredient.name}
                        onChangeText={(text) => updateIngredientName(ingredient.id, text)}
                        returnKeyType="done"
                        blurOnSubmit={true}
                      />
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => removeIngredient(ingredient.id)}
                      >
                        <IconSymbol name="trash" size={20} color={Colors.light.textSecondary} weight="medium" />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Modal ajout par catégorie (ouverture type modale abonnement) */}
      <Modal
        visible={isCategoryAddModalVisible}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={closeCategoryAddModal}
      >
        <View
          style={styles.modalOverlay}
          onTouchEnd={(e) => {
            if (e.target === e.currentTarget) closeCategoryAddModal();
          }}
        >
          <Animated.View
            style={[
              styles.modalContent,
              styles.categoryAddModalContent,
              {
                // Le clavier de la recherche recouvrirait le bouton "Ajouter" : on
                // remonte la carte et on réduit sa hauteur max de la même quantité.
                maxHeight: (screenHeight - keyboardHeight) * 0.85,
                marginBottom: keyboardHeight,
                transform: [{ translateY: categoryAddSlideAnim }],
                paddingBottom: 0,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {categoryAddModalCategoryId ? (CATEGORY_META[categoryAddModalCategoryId]?.title ?? categoryAddModalCategoryId) : ''}
              </Text>
              <TouchableOpacity onPress={closeCategoryAddModal} style={styles.modalCloseButton}>
                <IconSymbol name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <View style={styles.categoryAddModalSearchBar}>
              <IconSymbol name="search" size={18} color="#9A9A9A" />
              <TextInput
                style={styles.categoryAddModalSearchInput}
                placeholder={t('recipeSummary.searchIngredientPlaceholder')}
                placeholderTextColor="#9A9A9A"
                value={categoryAddModalSearch}
                onChangeText={setCategoryAddModalSearch}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
                onSubmitEditing={Keyboard.dismiss}
              />
              {categoryAddModalSearch.length > 0 && (
                <TouchableOpacity onPress={() => setCategoryAddModalSearch('')} hitSlop={10}>
                  <IconSymbol name="close" size={18} color="#9A9A9A" />
                </TouchableOpacity>
              )}
            </View>
            <ScrollView
              style={styles.categoryAddModalBody}
              contentContainerStyle={styles.categoryAddModalBodyContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="always"
              keyboardDismissMode="on-drag"
            >
              {categoryAddModalCategoryId && (() => {
                const category = ingredientCategories.find(c => c.id === categoryAddModalCategoryId);
                if (!category) return null;
                const search = deburr(categoryAddModalSearch);
                const availableIngredients = category.ingredients.filter(
                  (ing: { name: string }) => !ingredients.some(i => normalizeIngredientName(i.name) === normalizeIngredientName(ing.name))
                    && (!search || deburr(ing.name).includes(search))
                );
                if (availableIngredients.length === 0) {
                  return (
                    <Text style={styles.categoryAddModalEmptyText}>
                      {search ? t('recipeSummary.noIngredientFound') : t('recipeSummary.allIngredientsAdded')}
                    </Text>
                  );
                }
                return (
                  <View style={styles.categoryAddModalGrid}>
                    {availableIngredients.map((ingredient: { id: string; name: string; icon: string }) => {
                      const isSelected = selectedIngredientsForCategoryModal.some(
                        n => normalizeIngredientName(n) === normalizeIngredientName(ingredient.name)
                      );
                      return (
                        <Pressable
                          key={ingredient.id}
                          style={({ pressed }) => [
                            styles.manualIngredientItem,
                            { width: chipWidth },
                            isSelected && styles.ingredientItemSelected,
                            pressed && { opacity: 0.7 }
                          ]}
                          onPress={() => toggleCategoryModalIngredient(ingredient.name)}
                          hitSlop={8}
                        >
                          <Text style={styles.ingredientIcon}>{ingredient.icon}</Text>
                          <Text style={[styles.manualIngredientName, isSelected && styles.ingredientNameSelected]}>
                            {ingredient.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                );
              })()}
            </ScrollView>
            <View style={[styles.categoryAddModalFooter, { paddingBottom: keyboardHeight > 0 ? 16 : Math.max(insets.bottom, 16) + 8 }]}>
              <TouchableOpacity
                style={[styles.categoryAddModalButton, selectedIngredientsForCategoryModal.length === 0 && styles.categoryAddModalButtonDisabled]}
                onPress={confirmCategoryAddModal}
                disabled={selectedIngredientsForCategoryModal.length === 0}
              >
                <Text style={styles.categoryAddModalButtonText}>{t('recipeSummary.add')}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Modal des filtres */}
      <Modal
        visible={isFilterModalVisible}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={closeFilterModal}
      >
        <View
          style={styles.modalOverlay}
          onTouchEnd={(e) => {
            if (e.target === e.currentTarget) closeFilterModal();
          }}
        >
          <Animated.View
            style={[
              styles.modalContent,
              {
                transform: [{ translateY: filterSlideAnim }],
                maxHeight: screenHeight * 0.85,
                paddingBottom: Math.max(insets.bottom, 16) + 8
              }
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('recipeSummary.recipePreferences')}</Text>
              <TouchableOpacity onPress={closeFilterModal} style={styles.modalCloseButton}>
                <IconSymbol name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.filterModalBody}
              showsVerticalScrollIndicator={false}
              bounces={false}
              keyboardShouldPersistTaps="always"
            >
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>{t('recipeSummary.dishType')}</Text>
                <View style={styles.chipsContainer}>
                  {DISH_TYPES.map(dt => renderChip(dt.label, preferences.dishType === dt.id, () => updatePreference('dishType', dt.id), dt.id))}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>{t('recipeSummary.time')}</Text>
                <View style={styles.chipsContainer}>
                  {DURATIONS.map(d => renderChip(d.label, preferences.duration === d.id, () => updatePreference('duration', d.id), d.id))}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>{t('recipeSummary.goal')}</Text>
                <View style={styles.chipsContainer}>
                  {GOALS.map(g => renderChip(g.label, preferences.goal === g.id, () => updatePreference('goal', g.id), g.id, g.id !== 'neutral'))}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>{t('recipeSummary.equipments')}</Text>
                <View style={styles.chipsContainer}>
                  {EQUIPMENTS.map(e => renderChip(e.label, preferences.equipments.includes(e.id), () => toggleEquipment(e.id), e.id, false))}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>{t('recipeSummary.cuisine')}</Text>
                <View style={styles.chipsContainer}>
                  {CUISINE_STYLES.map(c => renderChip(c.label, preferences.cuisineStyle.includes(c.id), () => toggleCuisineStyle(c.id), c.id, false))}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>{t('recipeSummary.servings')}</Text>
                <View style={styles.chipsContainer}>
                  {[1, 2, 3, 4, 5, 6].map(s => renderChip(s.toString(), preferences.servings === s, () => updatePreference('servings', s), s.toString(), false))}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>{t('recipeSummary.avoidIngredients')}</Text>
                <View style={styles.chipsContainer}>
                  {ALLERGIES.map(a => renderChip(a.label, preferences.allergies.includes(a.id), () => toggleAllergy(a.id), a.id, false))}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>{t('recipeSummary.diet')}</Text>
                <View style={styles.chipsContainer}>
                  {DIETS.map(d => renderChip(d.label, preferences.diet === d.id, () => toggleDiet(d.id), d.id, false))}
                </View>
              </View>

              <View style={[styles.filterSection, { borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 20 }]}>
                <TouchableOpacity
                  style={styles.switchContainer}
                  activeOpacity={subscriptionStatus.isSubscribed || isFirstGeneration || params.isOnboarding === 'true' ? 1 : 0.7}
                  onPress={() => {
                    if (!subscriptionStatus.isSubscribed && !isFirstGeneration && params.isOnboarding !== 'true') {
                      router.push({ pathname: '/paywall', params: { source: 'filter_allow_other_ingredients' } });
                    }
                  }}
                >
                  <View style={styles.switchTextContainer}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.switchLabel}>{t('recipeSummary.allowOtherIngredients')}</Text>
                      {!subscriptionStatus.isSubscribed && !isFirstGeneration && params.isOnboarding !== 'true' && (
                        <Ionicons name="lock-closed" size={16} color={Colors.light.button} />
                      )}
                    </View>
                    <Text style={styles.switchDescription}>
                      {t('recipeSummary.allowOtherIngredientsDescription')}
                    </Text>
                  </View>
                  <Switch
                    value={preferences.allowOtherIngredients}
                    onValueChange={(value) => {
                      if (!subscriptionStatus.isSubscribed && !isFirstGeneration && params.isOnboarding !== 'true') {
                        router.push({ pathname: '/paywall', params: { source: 'filter_allow_other_ingredients' } });
                        return;
                      }
                      updatePreference('allowOtherIngredients', value);
                    }}
                    disabled={!subscriptionStatus.isSubscribed && !isFirstGeneration && params.isOnboarding !== 'true'}
                    trackColor={{ false: '#E0E0E0', true: Colors.light.button }}
                    thumbColor={preferences.allowOtherIngredients ? '#FFFFFF' : '#FFFFFF'}
                    ios_backgroundColor="#E0E0E0"
                  />
                </TouchableOpacity>
              </View>

              <View style={{ height: 40 }} />
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* Bouton générer */}
      <View style={[styles.generateButtonContainer, { bottom: Math.max(insets.bottom, 45) + 15 }]}>
        <View style={styles.generateButtonInner}>
          {ingredients.length < MIN_INGREDIENTS && (
            <Text style={styles.minIngredientsText}>
              {t('recipeSummary.pleaseAddAtLeastFiveIngredients')} ({ingredients.length}/{MIN_INGREDIENTS})
            </Text>
          )}
          <TouchableOpacity
            style={[
              styles.generateButton,
              (isLoading || ingredients.length < MIN_INGREDIENTS) && styles.generateButtonDisabled
            ]}
            onPress={handleGenerateRecipe}
            disabled={isLoading || ingredients.length < MIN_INGREDIENTS}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <IconSymbol
                  name="sparkles"
                  size={20}
                  color="white"
                  weight="bold"
                />
                <Text style={styles.generateButtonText} numberOfLines={1}>
                  {t('recipeSummary.generate')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  onboardingDemoBanner: {
    backgroundColor: '#FFF8E7',
    borderRadius: 22,
    padding: 17,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F4D999',
  },
  onboardingDemoBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'white',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  onboardingDemoBadgeText: {
    fontFamily: 'CronosProBold',
    fontSize: font(12),
    color: Colors.light.button,
  },
  onboardingDemoTitle: {
    fontFamily: 'Degular',
    fontSize: font(24),
    lineHeight: font(28),
    color: Colors.light.text,
  },
  onboardingDemoSubtitle: {
    fontFamily: 'CronosPro',
    fontSize: font(14),
    lineHeight: font(20),
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  floatingCircleButton: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContainer: {
    backgroundColor: 'white',
  },
  cardTitle: {
    fontFamily: 'Degular'
  },
  filterTrigger: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 15,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  filterTriggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterTriggerText: {
    fontSize: 16,
    color: Colors.light.text,
    fontFamily: 'Degular'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    // Sur tablette la feuille est recentrée au lieu de traverser tout l'écran.
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    width: '100%',
    maxWidth: 640,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: font(24),
    color: '#000',
    fontFamily: 'Degular'
  },
  modalCloseButton: {
    padding: 5,
  },
  filterModalBody: {
    width: '100%',
  },
  filterSection: {
    marginBottom: 25,
  },
  filterSectionTitle: {
    fontSize: 18,
    color: Colors.light.button,
    marginBottom: 12,
    fontFamily: 'Degular'
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F8F5F0',
    borderWidth: 1,
    borderColor: '#E8E0D5',
  },
  chipSelected: {
    backgroundColor: Colors.light.button,
    borderColor: Colors.light.button,
  },
  chipPremium: {
    opacity: 0.8,
  },
  chipText: {
    fontSize: 14,
    fontFamily: 'CronosPro',
    color: Colors.light.textSecondary
  },
  chipTextSelected: {
    fontSize: 14,
    fontFamily: 'CronosProBold',
    color: 'white'
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontFamily: 'CronosProBold',
    fontSize: 16,
    color: Colors.light.text,
    marginBottom: 4,
  },
  switchDescription: {
    fontFamily: 'CronosPro',
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  content: {
    flex: 1,
  },
  filtersContainer: {
    marginBottom: 30,
  },
  filtersRow: {
    flexDirection: 'row',
    marginBottom: 15,
    gap: 10,
  },
  filterCard: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterCardContent: {
    alignItems: 'center',
    padding: 20,
  },
  filterCardText: {
    flex: 1,
    marginLeft: 15,
    alignItems: 'center',
  },
  filterCardLabel: {
    marginTop: 5,
    fontSize: 14,
    fontFamily: 'CronosPro',
    color: Colors.light.textSecondary,
    marginBottom: 2,
    textAlign: 'center',
  },
  filterCardValue: {
    fontSize: 16,
    color: Colors.light.text,
    textAlign: 'center',
    fontFamily: 'Degular'
  },
  section: {
    marginBottom: 30,
  },
  ingredientsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 32,
    color: Colors.light.text,
    fontFamily: 'Degular'
  },
  roundAddButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.light.button,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.light.button,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  ingredientGroup: {
    marginBottom: 20,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  groupIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  groupTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  groupTitle: {
    fontSize: 18,
    color: Colors.light.text,
    fontFamily: 'Degular'
  },
  groupCount: {
    fontSize: 14,
    fontFamily: 'CronosPro',
    color: Colors.light.textSecondary,
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    overflow: 'hidden',
  },
  categoryAddButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#B0B0B0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryEmptyText: {
    fontSize: 15,
    fontFamily: 'CronosPro',
    color: Colors.light.textSecondary,
    fontStyle: 'italic',
    paddingVertical: 8,
    paddingLeft: 4,
  },
  ingredientItem: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  ingredientName: {
    flex: 1,
    fontSize: 17,
    fontFamily: 'CronosPro',
    color: Colors.light.text,
    paddingVertical: 4,
  },
  removeButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyState: {
    backgroundColor: 'white',
    padding: 40,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: 'CronosPro',
    color: Colors.light.textSecondary,
  },
  generateButtonContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  generateButtonInner: {
    ...contentColumn(),
    alignItems: 'center',
  },
  minIngredientsText: {
    color: Colors.light.textSecondary,
    fontSize: font(14),
    fontFamily: 'CronosPro',
    marginBottom: 8,
    textAlign: 'center',
    // Ce texte flotte au-dessus de la liste qui défile dessous : sans fond opaque
    // il se superposait aux noms de catégories et devenait illisible.
    backgroundColor: 'rgba(255,255,255,0.94)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  generateButton: {
    width: '100%',
    backgroundColor: Colors.light.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 100,
    shadowColor: Colors.light.button,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  generateButtonText: {
    color: 'white',
    fontSize: 19,
    marginLeft: 10,
    fontFamily: 'Degular'
  },
  generateButtonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  manualSelectionContainer: {
    marginBottom: 30,
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
  inputSection: {
    marginBottom: 0,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 15,
    paddingHorizontal: 15,
    minHeight: 50,
    marginBottom: 20,
  },
  manualTextInput: {
    flex: 1,
    fontFamily: 'CronosPro',
    fontSize: 16,
    color: '#000',
    paddingRight: 10,
    minWidth: 0,
  },
  microInlineButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    marginRight: 8,
  },
  microInlineButtonActive: {
    backgroundColor: '#DB5244',
  },
  manualAddButton: {
    backgroundColor: Colors.light.button,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 10,
  },
  manualAddButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  manualAddButtonText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Degular'
  },
  liveTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9EB',
    padding: 12,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#FFE4B5',
  },
  liveText: {
    flex: 1,
    fontFamily: 'CronosPro',
    fontSize: 15,
    color: '#856404',
    fontStyle: 'italic',
  },
  voiceSectionInModal: {
    alignItems: 'flex-start',
    paddingTop: 0,
    paddingBottom: 0,
    width: '100%',
  },
  microWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraSectionInModal: {
    marginBottom: 20,
    alignItems: 'flex-start',
    width: '100%',
  },
  cameraWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    height: 100,
  },
  cameraCircleOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraCircleButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.light.button,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.light.button,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginTop: 10,
    marginBottom: 20,
  },
  modalSubtitle: {
    fontSize: 20,
    color: Colors.light.button,
    marginBottom: 15,
    fontFamily: 'Degular'
  },
  manualSelectionInModal: {
    paddingBottom: 20,
  },
  addModalBody: {
    width: '100%',
  },
  tagsWrapper: {
    marginBottom: 15,
  },
  tagsContainer: {
    flexDirection: 'row',
  },
  tagsInnerContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  seeMoreButton: {
    alignSelf: 'flex-end',
    marginTop: 5,
    paddingHorizontal: 5,
  },
  seeMoreText: {
    fontFamily: 'CronosProBold',
    fontSize: 14,
    color: Colors.light.button,
    textDecorationLine: 'underline',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  tagText: {
    fontFamily: 'CronosPro',
    fontSize: 13,
    color: Colors.light.text,
    marginRight: 4,
  },
  tagRemoveButton: {
    padding: 2,
  },
  categoryAddModalContent: {
    width: '100%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  categoryAddModalSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 15,
    paddingHorizontal: 15,
    minHeight: 48,
    marginBottom: 16,
  },
  categoryAddModalSearchInput: {
    flex: 1,
    fontFamily: 'CronosPro',
    fontSize: 16,
    color: '#000',
    minWidth: 0,
    paddingVertical: 0,
  },
  categoryAddModalEmptyText: {
    fontFamily: 'CronosPro',
    fontSize: 15,
    color: '#9A9A9A',
    textAlign: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  categoryAddModalBody: {
    maxHeight: '70%',
    // La barre de recherche prend de la hauteur : sans flexShrink, la liste pousse
    // le footer (bouton Ajouter) hors de la modale sur les petits écrans.
    flexShrink: 1,
  },
  categoryAddModalBodyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 20,
  },
  categoryAddModalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  categoryAddModalFooter: {
    padding: 24,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    marginHorizontal: -24, // Pour toucher les bords de la modale
  },
  categoryAddModalButton: {
    backgroundColor: Colors.light.button,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryAddModalButtonDisabled: {
    opacity: 0.5,
  },
  categoryAddModalButtonText: {
    fontSize: 18,
    color: 'white',
    fontFamily: 'Degular'
  },
  manualIngredientItem: {
    // width fourni à l'usage (dérivé de la largeur de fenêtre courante).
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#F8F8F8',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 80,
    justifyContent: 'center',
  },
  ingredientItemSelected: {
    backgroundColor: Colors.light.button,
    borderColor: Colors.light.button,
  },
  ingredientIcon: {
    fontSize: 20,
    marginBottom: 3,
  },
  manualIngredientName: {
    fontSize: 12,
    fontFamily: 'CronosPro',
    color: Colors.light.text,
    textAlign: 'center'
  },
  ingredientNameSelected: {
    fontSize: 12,
    fontFamily: 'CronosProBold',
    color: 'white',
    textAlign: 'center'
  },
  loadingOverlay: {
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
