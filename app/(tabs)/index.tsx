import { router, useFocusEffect } from "expo-router";
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View, TouchableOpacity, Platform, Image, ActivityIndicator, Alert, RefreshControl, Animated } from 'react-native';
import Reanimated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/Colors';
import { font as fontSize, getTabBarHeight, space } from '../../constants/Layout';
import { contentColumn, useResponsive } from '../../hooks/useResponsive';
import { Ionicons } from '@expo/vector-icons';
import { IconSymbol } from "../../components/ui/IconSymbol";
import revenueCatService from '../../config/revenuecat';
import { useNotifications } from '../../hooks/useNotifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../../services/api';
import { getUniqueDeviceId } from '../../services/deviceStorage';
import { RecipeCard } from "../../components/RecipeCard";
import recipeStorage from "../../services/recipeStorage";
import { hasShownWheelInSession, markWheelShownInSession } from '../../services/sessionFlags';
import analytics from '../../services/analytics';
import { ImportLinkSheet } from '../../components/ImportLinkSheet';
import { LUCKY_WHEEL_ENABLED } from '../../config/features';
import { loadOrCreateStarterPantry } from '../../services/pantryDefaults';

const STORAGE_KEY = 'pantry_ingredients';
const HISTORY_BATCH_SIZE = 30;

/**
 * L'accueil ne listait que les recettes générées (`isImported: false`), ce qui
 * masquait l'import à l'utilisateur une fois l'onboarding passé. Le feed est
 * désormais unifié, avec un filtre explicite.
 */
type HistoryFilter = 'all' | 'generated' | 'imported';

const HISTORY_FILTERS: HistoryFilter[] = ['all', 'generated', 'imported'];

function filterToQuery(filter: HistoryFilter): { isImported?: boolean } {
  if (filter === 'generated') return { isImported: false };
  if (filter === 'imported') return { isImported: true };
  return {};
}

interface HistoryItem {
  id: string;
  title: string;
  image?: string;
  cooking_time: string;
  ingredientsCount: number;
  stepsCount?: number;
  createdAt: string;
}

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const colors = Colors.light;
  const insets = useSafeAreaInsets();
  const { width, height, isTablet, isSmallPhone, gutter, font } = useResponsive();
  // La rangée de 7 jours se mesure : la largeur restante dépend de la longueur du
  // compteur de streak et de la traduction de « jours », qui varient par locale.
  const [weekRowWidth, setWeekRowWidth] = useState(0);
  const [pantryCount, setPantryCount] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(true); // Par défaut true pour éviter le flash de l'upsell
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [isLoadingMoreHistory, setIsLoadingMoreHistory] = useState(false);
  const [streakCount, setStreakCount] = useState(0);
  const [weekActivity, setWeekActivity] = useState<boolean[]>(Array(7).fill(false));
  const [refreshing, setRefreshing] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');
  const [showImportSheet, setShowImportSheet] = useState(false);
  // Feature jamais utilisée par cet utilisateur, à mettre en avant. `null` quand
  // il a déjà essayé les deux (ou aucune) : inutile de pousser quoi que ce soit.
  const [featureToPromote, setFeatureToPromote] = useState<'import' | 'generate' | null>(null);

  // `useFocusEffect` capture la closure du premier rendu : on lit le filtre via
  // une ref pour que le chargement utilise toujours la valeur courante.
  const historyFilterRef = useRef(historyFilter);
  historyFilterRef.current = historyFilter;

  const animatedValues = useRef<Map<string, Animated.Value>>(new Map());

  const getAnimatedValue = (id: string) => {
    if (!animatedValues.current.has(id)) {
      animatedValues.current.set(id, new Animated.Value(1));
    }
    return animatedValues.current.get(id)!;
  };

  const { updateActivity } = useNotifications();

  /**
   * Roue au lancement de l'app.
   *
   * Plus appelée : la roue est désactivée (`LUCKY_WHEEL_ENABLED`) et l'app est
   * en paywall dur. Conservée telle quelle pour qu'un retour en arrière ne
   * demande que de rallumer le drapeau et de rebrancher l'appel.
   */
  const maybeShowLaunchWheel = useCallback(async () => {
    if (!LUCKY_WHEEL_ENABLED) return;
    if (hasShownWheelInSession()) return;

    try {
      const isOnboarding = await AsyncStorage.getItem('isOnboarding');
      const onboardingCompleted = await AsyncStorage.getItem('onboarding_completed');

      if (isOnboarding === 'true' || onboardingCompleted !== 'true') return;

      const status = await revenueCatService.getSubscriptionStatus();
      if (status.isSubscribed) return;

      markWheelShownInSession();
      setTimeout(() => {
        router.push({
          pathname: '/paywall',
          params: {
            source: 'app_open_last_chance',
            initialState: 'WHEEL',
          },
        });
      }, 600);
    } catch (error) {
      console.error('Erreur affichage spinning wheel au lancement:', error);
    }
  }, []);

  useEffect(() => {
    updateActivity();
    checkSubscription();
  }, []);

  const applyCachedImages = async () => {
    const cached = await recipeStorage.getCachedImages();
    if (Object.keys(cached).length === 0) return;
    setHistory(prev => {
      let changed = false;
      const updated = prev.map(item => {
        if (!item.image && cached[item.id]) {
          changed = true;
          return { ...item, image: cached[item.id] };
        }
        return item;
      });
      return changed ? updated : prev;
    });
  };

  const refreshFeatureToPromote = async () => {
    const used = await analytics.getUsedFeatures();
    if (used.length !== 1) {
      setFeatureToPromote(null);
      return;
    }
    setFeatureToPromote(used[0] === 'import' ? 'generate' : 'import');
  };

  useFocusEffect(
    useCallback(() => {
      loadPantryCount();
      checkSubscription();
      loadHistory(1, false); // On ne reset plus pour préserver la position du scroll
      applyCachedImages();
      refreshFeatureToPromote();
    }, [])
  );

  useEffect(() => {
    calculateStreak();
  }, [history]);

  // Changement de filtre : on repart de la page 1 en vidant la liste, sinon les
  // recettes du filtre précédent resteraient fusionnées avec les nouvelles.
  const isFirstFilterRender = useRef(true);
  useEffect(() => {
    if (isFirstFilterRender.current) {
      isFirstFilterRender.current = false;
      return;
    }
    setHasMoreHistory(true);
    loadHistory(1, true);
  }, [historyFilter]);

  const resolveUserId = async (): Promise<string | null> => {
    const storedUserId = await AsyncStorage.getItem('userId');
    if (storedUserId) return storedUserId;

    try {
      const mobileId = await getUniqueDeviceId();
      const response = await apiService.getCurrentUser(mobileId);
      const serverUserId = response.data?._id ? String(response.data._id) : null;
      if (serverUserId) {
        await AsyncStorage.setItem('userId', serverUserId);
        return serverUserId;
      }
    } catch (error) {
      console.error('[History] impossible de résoudre le userId:', error);
    }

    return null;
  };

  const calculateStreak = () => {
    if (history.length === 0) {
      setStreakCount(0);
      setWeekActivity(Array(7).fill(false));
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Lundi de la semaine courante (ISO: lundi = 1)
    const monday = new Date(today);
    const dayOfWeek = today.getDay(); // 0=dim, 1=lun, ...
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    monday.setDate(today.getDate() - diffToMonday);

    const currentWeekDays = Array(7).fill(0).map((_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });

    const activity = currentWeekDays.map(date => {
      return history.some(item => {
        const itemDate = new Date(item.createdAt);
        itemDate.setHours(0, 0, 0, 0);
        return itemDate.getTime() === date.getTime();
      });
    });

    setWeekActivity(activity);
    setStreakCount(activity.filter(Boolean).length);
  };

  const loadHistory = async (page: number = 1, reset: boolean = false) => {
    if (!reset && isLoadingMoreHistory) return;
    if (!reset && page > 1 && !hasMoreHistory) return;

    try {
      setIsLoadingMoreHistory(true);
      const userId = await resolveUserId();
      if (!userId) {
        if (reset) {
          setHistory([]);
          setHistoryPage(1);
          setHasMoreHistory(false);
        }
        return;
      }

      const response = await apiService.getRecipeHistory(
        userId,
        page,
        HISTORY_BATCH_SIZE,
        filterToQuery(historyFilterRef.current)
      );
      if (response.data?.history) {
        const imageById = new Map<string, string>();
        try {
          const storedRecipes = await recipeStorage.getStoredRecipes();
          storedRecipes.forEach((stored: any) => {
            if (stored?.id && stored?.recipe?.image && !imageById.has(stored.id)) {
              imageById.set(stored.id, stored.recipe.image);
            }
          });
        } catch {
          // Ignorer le fallback local si le cache est indisponible
        }

        const newItems = (response.data.history as HistoryItem[]).map((item) => ({
          ...item,
          image: item.image || imageById.get(item.id),
        }));
        setHistory((prev) => {
          if (reset) {
            return newItems;
          }
          const existingById = new Map<string, HistoryItem>();
          if (page === 1) {
            // Si on recharge la page 1 sans reset, on veut les nouveaux au début
            newItems.forEach((item) => existingById.set(item.id, item));
            prev.forEach((item) => {
              if (!existingById.has(item.id)) existingById.set(item.id, item);
            });
          } else {
            // Pour les pages suivantes, on ajoute à la fin
            prev.forEach((item) => existingById.set(item.id, item));
            newItems.forEach((item) => existingById.set(item.id, item));
          }
          return Array.from(existingById.values());
        });
        if (reset || page > 1) {
          setHistoryPage(page);
        }
        if (typeof response.data.pagination?.hasMore === 'boolean') {
          setHasMoreHistory(response.data.pagination.hasMore);
        } else {
          setHasMoreHistory(newItems.length >= HISTORY_BATCH_SIZE);
        }
      } else if (reset) {
        setHistory([]);
        setHistoryPage(1);
        setHasMoreHistory(false);
      }
    } catch (e) {
      console.error('Erreur lors du chargement de l\'historique:', e);
    } finally {
      setIsLoadingMoreHistory(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      loadHistory(1, true),
      loadPantryCount(),
      checkSubscription(),
    ]);
    setRefreshing(false);
  }, []);

  const handleHistoryScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - (layoutMeasurement.height + contentOffset.y);
    if (distanceFromBottom < 200 && hasMoreHistory && !isLoadingMoreHistory) {
      loadHistory(historyPage + 1, false);
    }
  };

  const checkSubscription = async () => {
    try {
      // 1. Tenter de charger le dernier statut caché pour un affichage immédiat
      const lastStatusRaw = await AsyncStorage.getItem('rc_last_subscription_status');
      if (lastStatusRaw) {
        const lastStatus = JSON.parse(lastStatusRaw);
        setIsSubscribed(lastStatus.isSubscribed);
      }

      // 2. Vérifier le statut réel via le service (réseau/SDK)
      const status = await revenueCatService.getSubscriptionStatus();
      setIsSubscribed(status.isSubscribed);
    } catch (e) {
      console.error(e);
    }
  };

  const loadPantryCount = async () => {
    try {
      const { ingredients, initialized } = await loadOrCreateStarterPantry(t);
      setPantryCount(ingredients.length);
      if (initialized) {
        analytics.track('starter_pantry_initialized', {
          ingredient_count: ingredients.length,
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePantryPress = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      let ingredients: string[] = [];

      if (stored) {
        const parsed = JSON.parse(stored);

        if (Array.isArray(parsed) && parsed.length > 0) {
          if (typeof parsed[0] === 'object' && parsed[0].name) {
            ingredients = [JSON.stringify(parsed.map((item: any) => ({
              name: String(item.name || '').trim(),
              ...(item.category ? { category: item.category } : {}),
            })).filter((i: any) => i.name.length > 0))];
          } else {
            ingredients = parsed
              .map((item: any) => typeof item === 'string' ? item.trim() : '')
              .filter((name: string) => name.length > 0);
          }
        }
      }

      router.push({
        pathname: '/ingredient-list',
        params: ingredients.length > 0
          ? { ingredients: ingredients.length === 1 && ingredients[0].startsWith('[') ? ingredients[0] : ingredients.join(',') }
          : {},
      });
    } catch (e) {
      console.error('Erreur lors de la lecture du garde-manger:', e);
      router.push('/ingredient-list');
    }
  };

  const handleDeleteRecipe = (item: HistoryItem) => {
    Alert.alert(
      t('home.deleteRecipe.title'),
      t('home.deleteRecipe.message', { title: item.title }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const userId = await resolveUserId();
              if (!userId) return;

              apiService.deleteRecipe(item.id, userId).catch((e) =>
                console.error('Erreur lors de la suppression de la recette:', e)
              );

              const anim = getAnimatedValue(item.id);
              Animated.timing(anim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: false,
              }).start(() => {
                setHistory((prev) => prev.filter((h) => h.id !== item.id));
                animatedValues.current.delete(item.id);
              });
            } catch (e) {
              console.error('Erreur lors de la suppression de la recette:', e);
            }
          },
        },
      ]
    );
  };

  const handleHistoryPress = async (item: HistoryItem) => {
    if (item.id?.startsWith('mock-')) {
      // Données de test : naviguer avec les données fictives
      const mockRecipe = {
        id: item.id,
        title: item.title,
        difficulty: 'MEDIUM',
        cooking_time: item.cooking_time,
        servings: 2,
        calories: '450',
        proteins: '25g',
        lipids: '15g',
        ingredients: [
          { name: 'Ingrédient test 1', quantity: '100g', icon: '🥘' },
          { name: 'Ingrédient test 2', quantity: '200g', icon: '🥗' },
        ],
        steps: Array(item.stepsCount || 5).fill(0).map((_, i) => ({
          title: `Étape ${i + 1}`,
          description: `Description détaillée de l'étape ${i + 1} pour la recette de test.`
        })),
        image: item.image,
      };

      router.push({
        pathname: '/recipe-detail',
        params: {
          recipe: JSON.stringify(mockRecipe),
          showGenerateButton: 'false',
          isHistory: 'true'
        }
      });
      return;
    }

    try {
      router.push({
        pathname: '/recipe-detail',
        params: {
          recipeId: item.id,
          showGenerateButton: 'false',
          isHistory: 'true'
        }
      });
    } catch (e) {
      console.error('Erreur lors du chargement de la recette:', e);
    }
  };

  const DAY_GAP = 4;
  // Une pastille par jour, dimensionnée d'après la place réellement disponible :
  // avant, 7 pastilles de 32pt débordaient de la carte sur les écrans étroits, d'où
  // le rustine `Platform.OS === 'android' ? 24 : 32` qui rétrécissait aussi sur les
  // grands Android.
  const dayCircleSize = weekRowWidth > 0
    ? Math.max(20, Math.min(isTablet ? 40 : 32, Math.floor((weekRowWidth - DAY_GAP * 6) / 7)))
    : 24;

  return (
    <LinearGradient
      colors={['#F6EEE9', '#FFFFFF']}
      start={{ x: 1, y: 0 }}
      end={{ x: 0, y: 1 }}
      locations={[0, 0.5]}
      style={styles.container}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ overflow: 'visible' }}
        contentContainerStyle={{
          paddingTop: insets.top,
          // La barre d'onglets et le bouton caméra flottant recouvrent le bas.
          paddingBottom: getTabBarHeight(width, height) + insets.bottom + 40,
          paddingHorizontal: gutter,
          ...contentColumn(),
        }}
        onScroll={handleHistoryScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.button}
            progressViewOffset={insets.top + 20}
          />
        }
      >
        <Reanimated.View
          entering={FadeInDown.duration(400).delay(50)}
          style={styles.titleContainer}
        >
          <View style={styles.mainTitleRow}>
            <Text style={styles.mainTitle}>CookEat Ai</Text>
            <Image
              source={require('../../assets/images/mascot.png')}
              style={styles.mainTitleMascot}
            />
          </View>
          <Reanimated.View
            entering={FadeInDown.duration(400).delay(100)}
            style={styles.streakCard}
          >
            <View style={styles.streakLeft}>
              <Text
                allowFontScaling={false}
                style={[
                  styles.streakNumber,
                  {
                    color: colors.button,
                    fontSize: font(isSmallPhone ? 38 : 46),
                    lineHeight: font(isSmallPhone ? 40 : 50),
                    textAlign: 'right',
                    maxWidth: font(isSmallPhone ? 46 : 58),
                  }
                ]}
              >
                {String(streakCount).match(/.{1,2}/g)?.join('\n')}
              </Text>
              <Text
                numberOfLines={1}
                allowFontScaling={false}
                style={[
                  styles.streakLabel,
                  {
                    color: colors.button,
                    fontSize: font(isSmallPhone ? 22 : 28),
                    marginLeft: 4,
                    alignSelf: 'flex-end',
                  },
                ]}
              >
                {streakCount > 1 ? t('home.streak.days') : t('home.streak.day')}
              </Text>
            </View>
            <View
              style={styles.streakRight}
              onLayout={(e) => setWeekRowWidth(e.nativeEvent.layout.width)}
            >
              <View style={styles.weekDaysRow}>
                {Array(7).fill(0).map((_, i) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const dayOfWeek = today.getDay();
                  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                  const monday = new Date(today);
                  monday.setDate(today.getDate() - diffToMonday);
                  const date = new Date(monday);
                  date.setDate(monday.getDate() + i);
                  const dayName = date.toLocaleDateString(i18n.language.startsWith('fr') ? 'fr-FR' : 'en-US', { weekday: 'short' }).slice(0, 2);
                  const isToday = date.getTime() === today.getTime();
                  const isActive = weekActivity[i];

                  return (
                    <View key={i} style={styles.dayContainer}>
                      <Text
                        allowFontScaling={false}
                        numberOfLines={1}
                        style={[
                          isToday ? styles.todayName : styles.dayName,
                          { fontSize: Math.max(10, Math.round(dayCircleSize * 0.42)) },
                        ]}
                      >
                        {dayName}
                      </Text>
                      <View style={[
                        styles.dayCircle,
                        {
                          width: dayCircleSize,
                          height: dayCircleSize,
                          borderRadius: dayCircleSize / 2,
                        },
                        isActive ? { backgroundColor: colors.button } : styles.dayCircleInactive
                      ]}>
                        {isActive && <IconSymbol name="checkmark" size={Math.round(dayCircleSize * 0.5)} color="white" />}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </Reanimated.View>
        </Reanimated.View>

        {/* La carte cadeau qui ouvrait la roue a été retirée : l'app est en
            paywall dur, quiconque atteint l'accueil est déjà passé par la
            souscription. La remise ne se propose plus qu'au moment du refus,
            depuis le paywall lui-même. */}

        {/* Upsell Premium - Affiché uniquement si non abonné, ou toujours en mode dev */}
        {(!isSubscribed) && (
          <Reanimated.View entering={FadeInDown.duration(400).delay(200)}>
            <TouchableOpacity
              style={[styles.premiumCard, { marginBottom: 20 }]}
              onPress={() => router.push({ pathname: '/paywall', params: { source: 'home_banner' } })}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#FFD700', '#FDB931']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.premiumGradient}
              >
                <View style={styles.premiumContent}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.proBadge}>
                      <Text style={styles.proBadgeText}>PREMIUM</Text>
                    </View>
                    <Text style={styles.premiumTitle}>{t('profile.premiumTitle')}</Text>
                    <Text style={styles.premiumDescription}>
                      {t('profile.premiumPrice')}
                    </Text>
                  </View>
                  <View style={styles.premiumIconContainer}>
                    <IconSymbol name="crown.fill" size={40} color="white" />
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Reanimated.View>
        )}

        {/* Garde-manger */}
        <Reanimated.View entering={FadeInDown.duration(400).delay(250)}>
          <TouchableOpacity
            style={styles.pantryCard}
            onPress={handlePantryPress}
            activeOpacity={0.9}
          >
            <View style={styles.pantryCardHeader}>
              <View style={styles.pantryCardTitleContainer}>
                <IconSymbol name="archivebox" size={24} color={colors.button} />
                <Text style={styles.pantryCardTitle}>{t('pantry.title')}</Text>
              </View>
              <Text style={[styles.pantryCardLink, { color: colors.button }]}>{t('common.seeAll')}</Text>
            </View>

            <View style={styles.pantryCardContent}>
              <View style={styles.pantryStatItem}>
                <View style={[styles.dot, { backgroundColor: '#4CAF50' }]} />
                <Text style={styles.pantryStatText}>
                  {pantryCount} {pantryCount <= 1 ? t('home.ingredient') : t('home.ingredients')}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </Reanimated.View>

        {/* Cross-sell : la seconde feature se découvre après le premier aha
            moment, moment où l'utilisateur est le plus réceptif. */}
        {featureToPromote && (
          <Reanimated.View entering={FadeInDown.duration(400).delay(275)}>
            <TouchableOpacity
              style={styles.crossSellCard}
              activeOpacity={0.9}
              onPress={() => {
                analytics.track('cross_sell_pressed', { promoted_feature: featureToPromote });
                if (featureToPromote === 'import') {
                  setShowImportSheet(true);
                } else {
                  router.push('/camera');
                }
              }}
            >
              <View style={styles.crossSellIcon}>
                <Ionicons
                  name={featureToPromote === 'import' ? 'link' : 'camera'}
                  size={22}
                  color={colors.button}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.crossSellTitle}>{t(`home.crossSell.${featureToPromote}.title`)}</Text>
                <Text style={styles.crossSellDescription}>
                  {t(`home.crossSell.${featureToPromote}.description`)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
            </TouchableOpacity>
          </Reanimated.View>
        )}

        {/* Historique */}
        {(history.length > 0 || historyFilter !== 'all') && (
          <View style={styles.historyContainer}>
            <Reanimated.View
              entering={FadeInDown.duration(400).delay(300)}
              style={styles.historyHeader}
            >
              <Text style={styles.sectionTitle}>{t('home.myRecipes')}</Text>
              <TouchableOpacity onPress={() => router.push('/favorites-list')} activeOpacity={0.7}>
                <Ionicons name="heart-outline" size={24} color="#FFD700" />
              </TouchableOpacity>
            </Reanimated.View>

            <View style={styles.filterRow}>
              {HISTORY_FILTERS.map((filter) => {
                const isActive = historyFilter === filter;
                return (
                  <TouchableOpacity
                    key={filter}
                    style={[styles.filterChip, isActive && styles.filterChipActive]}
                    onPress={() => {
                      if (isActive) return;
                      analytics.track('home_history_filter_changed', { filter });
                      setHistoryFilter(filter);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                      {t(`home.filters.${filter}`)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {history.length === 0 && !isLoadingMoreHistory && (
              <Text style={styles.filterEmpty}>{t(`home.filterEmpty.${historyFilter}`)}</Text>
            )}
            {history.map((item, index) => {
              const anim = getAnimatedValue(item.id);
              return (
                <Reanimated.View
                  key={item.id}
                  entering={FadeInDown.duration(400).delay(350 + index * 50)}
                >
                  <Animated.View
                    style={{
                      opacity: anim,
                      transform: [{
                        scale: anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.8, 1],
                        }),
                      }],
                      // Plafond utilisé pour l'animation de suppression : il doit
                      // rester au-dessus de la hauteur réelle de la carte, sinon
                      // celle-ci est rognée en permanence.
                      maxHeight: anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, isTablet ? 340 : 260],
                      }),
                      overflow: 'hidden',
                      marginHorizontal: -12,
                      paddingHorizontal: 12,
                    }}
                  >
                    <RecipeCard
                      item={item as any}
                      onPress={() => handleHistoryPress(item)}
                      onLongPress={() => handleDeleteRecipe(item)}
                    />
                  </Animated.View>
                </Reanimated.View>
              );
            })}
            {isLoadingMoreHistory && (
              <ActivityIndicator style={{ marginTop: 12 }} size="small" color={colors.button} />
            )}
          </View>
        )}
      </ScrollView>

      <ImportLinkSheet
        visible={showImportSheet}
        onClose={() => setShowImportSheet(false)}
        source="home_cross_sell"
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  titleContainer: {
    paddingBottom: 30,
  },
  mainTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
  },
  mainTitle: {
    fontSize: fontSize(32),
    color: Colors.light.text,
    marginBottom: 8,
    fontFamily: 'Degular'
  },
  mainTitleMascot: {
    width: fontSize(40),
    height: fontSize(40),
    marginBottom: 8,
    transform: [{ rotate: '20deg' }],
  },
  introText: {
    fontSize: 18,
    lineHeight: 24,
    fontFamily: 'CronosPro',
    color: Colors.light.textSecondary,
  },
  streakCard: {
    backgroundColor: 'white',
    borderRadius: 30,
    // Un padding par plateforme n'avait pas de sens : c'est la largeur de l'écran
    // qui contraint cette carte, pas l'OS.
    padding: space(16),
    flexDirection: 'row',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
    marginTop: 10,
  },
  streakLeft: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: '#F0F0F0',
  },
  streakNumberContainer: {
    alignItems: 'flex-end',
  },
  streakNumber: {
    // fontSize / lineHeight sont fournis à l'usage (dépendent de la largeur).
    fontFamily: 'Degular'
  },
  streakLabel: {
    paddingLeft: 1,
    paddingBottom: 4,
    fontFamily: 'CronosProBold'
  },
  streakRight: {
    flex: 1,
    minWidth: 0,
    paddingLeft: 10,
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayContainer: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  dayName: {
    fontFamily: 'CronosPro',
    color: '#AEAEB2'
  },
  todayName: {
    fontFamily: 'CronosProBold',
    color: '#1C1C1E',
  },
  dayCircle: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCircleActive: {
    // backgroundColor: '#FF5C00', // Supprimé au profit du dynamisme
  },
  dayCircleInactive: {
    backgroundColor: '#F2F2F7',
  },
  cardContainer: {
    padding: 24,
    borderRadius: 20,
    backgroundColor: 'white',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardTitle: {
    textAlign: 'left',
    fontSize: 22,
    color: Colors.light.text,
    marginBottom: 8,
    fontFamily: 'Degular'
  },
  cardDescription: {
    fontFamily: 'CronosPro',
    textAlign: 'left',
    fontSize: 16,
    color: Colors.light.textSecondary,
    lineHeight: 20,
  },
  premiumCard: {
    borderRadius: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#FDB931',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
        backgroundColor: '#FFD700',
      },
    }),
  },
  premiumGradient: {
    padding: 24,
    borderRadius: 24,
    overflow: 'hidden',
  },
  premiumContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  proBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  proBadgeText: {
    color: 'white',
    fontSize: 12,
    letterSpacing: 1,
    fontFamily: 'Degular'
  },
  premiumTitle: {
    fontSize: fontSize(22),
    color: 'white',
    marginBottom: 4,
    // `width: '90%'` réservait un vide fixe à droite ; le parent est déjà en flex:1
    // à côté de l'icône, donc laisser le texte occuper sa colonne suffit.
    fontFamily: 'Degular'
  },
  premiumDescription: {
    fontFamily: 'CronosPro',
    fontSize: fontSize(16),
    color: 'rgba(255, 255, 255, 0.9)',
  },
  premiumIconContainer: {
    width: space(60),
    height: space(60),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: space(60) / 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  pantryCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  pantryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  pantryCardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pantryCardTitle: {
    fontSize: fontSize(20),
    color: Colors.light.text,
    flexShrink: 1,
    fontFamily: 'Degular'
  },
  pantryCardLink: {
    fontSize: fontSize(16),
    fontFamily: 'CronosProBold'
  },
  pantryCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  pantryStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pantryStatText: {
    fontSize: fontSize(18),
    fontFamily: 'CronosPro',
    color: '#8E8E93',
  },
  pantrySeparator: {
    width: 1,
    height: 20,
    backgroundColor: '#E5E5EA',
    marginHorizontal: 15,
  },
  historyContainer: {
    marginTop: 30,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: fontSize(24),
    color: Colors.light.text,
    fontFamily: 'Degular'
  },
  crossSellCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 18,
    marginTop: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  crossSellIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FDF0E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  crossSellTitle: {
    fontSize: fontSize(17),
    fontFamily: 'Degular',
    color: Colors.light.text,
    marginBottom: 2,
  },
  crossSellDescription: {
    fontSize: fontSize(14),
    fontFamily: 'CronosPro',
    color: '#8E8E93',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E9E9E9',
  },
  filterChipActive: {
    backgroundColor: Colors.light.button,
    borderColor: Colors.light.button,
  },
  filterChipText: {
    fontSize: fontSize(14),
    fontFamily: 'CronosProBold',
    color: '#8E8E93',
  },
  filterChipTextActive: {
    color: 'white',
  },
  filterEmpty: {
    fontSize: fontSize(16),
    fontFamily: 'CronosPro',
    color: '#8E8E93',
    textAlign: 'center',
    paddingVertical: 24,
  },
});
