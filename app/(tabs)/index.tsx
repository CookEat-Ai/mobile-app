import { router, useFocusEffect } from "expo-router";
import React, { useEffect, useState, useCallback, useRef } from 'react';
import I18n from '../../i18n';
import { ScrollView, StyleSheet, Text, View, TouchableOpacity, Platform, Image, ActivityIndicator, Alert, RefreshControl, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/Colors';
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

const STORAGE_KEY = 'pantry_ingredients';
const HISTORY_BATCH_SIZE = 30;

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
  const colors = Colors.light;
  const insets = useSafeAreaInsets();
  const [pantryCount, setPantryCount] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(__DEV__ ? false : true); // Par défaut true pour éviter le flash de l'upsell, false en dev pour tester
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [isLoadingMoreHistory, setIsLoadingMoreHistory] = useState(false);
  const [streakCount, setStreakCount] = useState(0);
  const [weekActivity, setWeekActivity] = useState<boolean[]>(Array(7).fill(false));
  const [refreshing, setRefreshing] = useState(false);

  const animatedValues = useRef<Map<string, Animated.Value>>(new Map());

  const getAnimatedValue = (id: string) => {
    if (!animatedValues.current.has(id)) {
      animatedValues.current.set(id, new Animated.Value(1));
    }
    return animatedValues.current.get(id)!;
  };

  const { updateActivity } = useNotifications();

  const maybeShowLaunchWheel = useCallback(async () => {
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

  useFocusEffect(
    useCallback(() => {
      loadPantryCount();
      checkSubscription();
      loadHistory(1, false); // On ne reset plus pour préserver la position du scroll
      applyCachedImages();
      maybeShowLaunchWheel();
    }, [])
  );

  useEffect(() => {
    calculateStreak();
  }, [history]);

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

      const response = await apiService.getRecipeHistory(userId, page, HISTORY_BATCH_SIZE, { isImported: false });
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
      const status = await revenueCatService.getSubscriptionStatus();
      setIsSubscribed(status.isSubscribed);
    } catch (e) {
      console.error(e);
    }
  };

  const loadPantryCount = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const items = JSON.parse(stored);
        setPantryCount(items.length);
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
      I18n.t('home.deleteRecipe.title'),
      I18n.t('home.deleteRecipe.message', { title: item.title }),
      [
        { text: I18n.t('common.cancel'), style: 'cancel' },
        {
          text: I18n.t('common.delete'),
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
    if (item.id.startsWith('mock-')) {
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
          paddingTop: insets.top + 20,
          paddingBottom: 100,
          paddingHorizontal: 20
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
        <View style={styles.titleContainer}>
          <View style={styles.mainTitleRow}>
            <Text style={styles.mainTitle}>CookEat Ai</Text>
            <Image
              source={require('../../assets/images/mascot.png')}
              style={styles.mainTitleMascot}
            />
          </View>
          <View style={styles.streakCard}>
            <View style={styles.streakLeft}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.streakNumber, { color: colors.button }]}>{streakCount}</Text>
                <Text style={{ fontSize: Platform.OS === 'android' ? 24 : 32, marginLeft: 5 }}>🔥</Text>
              </View>
              <Text style={[styles.streakLabel, { color: colors.button }]}>
                {streakCount > 1 ? I18n.t('home.streak.days') : I18n.t('home.streak.day')}
              </Text>
            </View>
            <View style={styles.streakRight}>
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
                  const dayName = date.toLocaleDateString(I18n.locale.startsWith('fr') ? 'fr-FR' : 'en-US', { weekday: 'short' }).slice(0, 2);
                  const isToday = date.getTime() === today.getTime();
                  const isActive = weekActivity[i];

                  return (
                    <View key={i} style={styles.dayContainer}>
                      <Text style={isToday ? styles.todayName : styles.dayName}>{dayName}</Text>
                      <View style={[
                        styles.dayCircle,
                        isActive ? { backgroundColor: colors.button } : styles.dayCircleInactive
                      ]}>
                        {isActive && <IconSymbol name="checkmark" size={14} color="white" />}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        </View>

        {/* Upsell Premium - Affiché uniquement si non abonné, ou toujours en mode dev */}
        {(!isSubscribed || __DEV__) && (
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
                  <Text style={styles.premiumTitle}>{I18n.t('profile.premiumTitle')}</Text>
                  <Text style={styles.premiumDescription}>
                    {I18n.t('profile.premiumPrice')}
                  </Text>
                </View>
                <View style={styles.premiumIconContainer}>
                  <IconSymbol name="crown.fill" size={40} color="white" />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Garde-manger */}
        <TouchableOpacity
          style={styles.pantryCard}
          onPress={handlePantryPress}
          activeOpacity={0.9}
        >
          <View style={styles.pantryCardHeader}>
            <View style={styles.pantryCardTitleContainer}>
              <IconSymbol name="archivebox" size={24} color={colors.button} />
              <Text style={styles.pantryCardTitle}>{I18n.t('pantry.title')}</Text>
            </View>
            <Text style={[styles.pantryCardLink, { color: colors.button }]}>{I18n.t('common.seeAll')}</Text>
          </View>

          <View style={styles.pantryCardContent}>
            <View style={styles.pantryStatItem}>
              <View style={[styles.dot, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.pantryStatText}>
                {pantryCount} {pantryCount <= 1 ? 'ingrédient' : 'ingrédients'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Historique */}
        {history.length > 0 && (
          <View style={styles.historyContainer}>
            <View style={styles.historyHeader}>
              <Text style={styles.sectionTitle}>{I18n.t('home.generatedRecipes')}</Text>
              <TouchableOpacity onPress={() => router.push('/favorites-list')} activeOpacity={0.7}>
                <Ionicons name="heart-outline" size={24} color="#FFD700" />
              </TouchableOpacity>
            </View>
            {history.map((item) => {
              const anim = getAnimatedValue(item.id);
              return (
                <Animated.View
                  key={item.id}
                  style={{
                    opacity: anim,
                    transform: [{
                      scale: anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                    }],
                    maxHeight: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 250],
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
              );
            })}
            {isLoadingMoreHistory && (
              <ActivityIndicator style={{ marginTop: 12 }} size="small" color={colors.button} />
            )}
          </View>
        )}
      </ScrollView>
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
    fontSize: 32,
    color: Colors.light.text,
    marginBottom: 8,
    fontFamily: 'Degular'
  },
  mainTitleMascot: {
    width: 40,
    height: 40,
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
    padding: Platform.OS === 'android' ? 12 : 20,
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
    alignItems: 'center',
    paddingRight: Platform.OS === 'android' ? 12 : 20,
    borderRightWidth: 1,
    borderRightColor: '#F0F0F0',
  },
  streakNumber: {
    fontSize: Platform.OS === 'android' ? 40 : 48,
    lineHeight: Platform.OS === 'android' ? 44 : 52,
    fontFamily: 'Degular'
  },
  streakLabel: {
    fontSize: Platform.OS === 'android' ? 14 : 18,
    fontFamily: 'CronosProBold'
  },
  streakRight: {
    flex: 1,
    paddingLeft: Platform.OS === 'android' ? 10 : 15,
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayContainer: {
    alignItems: 'center',
    gap: Platform.OS === 'android' ? 4 : 8,
  },
  dayName: {
    fontSize: Platform.OS === 'android' ? 11 : 14,
    fontFamily: 'CronosPro',
    color: '#AEAEB2'
  },
  todayName: {
    fontSize: Platform.OS === 'android' ? 11 : 14,
    fontFamily: 'CronosProBold',
    color: '#1C1C1E',
  },
  dayCircle: {
    width: Platform.OS === 'android' ? 24 : 32,
    height: Platform.OS === 'android' ? 24 : 32,
    borderRadius: Platform.OS === 'android' ? 12 : 16,
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
    fontSize: 22,
    color: 'white',
    marginBottom: 4,
    width: '90%',
    fontFamily: 'Degular'
  },
  premiumDescription: {
    fontFamily: 'CronosPro',
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  premiumIconContainer: {
    width: 60,
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: 20,
    color: Colors.light.text,
    fontFamily: 'Degular'
  },
  pantryCardLink: {
    fontSize: 16,
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
    fontSize: 18,
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
    fontSize: 24,
    color: Colors.light.text,
    fontFamily: 'Degular'
  },
});
