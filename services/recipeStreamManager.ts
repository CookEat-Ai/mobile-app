import { Image } from 'expo-image';
import apiService, { type RecipeIdentity } from './api';
import analytics from './analytics';
import { searchImage } from './image';
import recipeStorageService from './recipeStorage';
import type { RecipePreferences } from './recipePreferencesMapping';

/** Nombre de recettes récentes consultées pour éviter de réutiliser la même image. */
const IMAGE_HISTORY_LOOKBACK = 20;

export type RecipeStreamSnapshot = {
  recipe: Record<string, any>;
  steps: any[];
  isFirstGeneration?: boolean;
  isDone: boolean;
  error?: string;
  /** Passe à true quand la recherche d'image est terminée, avec ou sans résultat. */
  imageResolved?: boolean;
  /** Le titre et les caractéristiques structurantes ne changeront plus. */
  identityLocked?: boolean;
};

type StreamState = {
  id: string;
  close?: () => void;
  snapshot: RecipeStreamSnapshot;
  listeners: Set<(snapshot: RecipeStreamSnapshot) => void>;
  /** Évite de relancer la recherche à chaque chunk. */
  imageRequested?: boolean;
  lockedIdentity?: RecipeIdentity;
  startedAt: number;
  identityReadyAt?: number;
  imageReadyAt?: number;
};

class RecipeStreamManager {
  private streams = new Map<string, StreamState>();

  private emit(state: StreamState) {
    state.listeners.forEach((listener) => listener(state.snapshot));
  }

  private createStreamId() {
    return `recipe-stream-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  private cleanupLater(streamId: string) {
    setTimeout(() => {
      const state = this.streams.get(streamId);
      if (!state) return;
      if (state.listeners.size === 0) {
        this.streams.delete(streamId);
      }
    }, 3 * 60 * 1000);
  }

  private recipeIdentityFields(identity?: RecipeIdentity) {
    if (!identity) return {};
    return {
      title: identity.title,
      ...(identity.dish_type ? { dish_type: identity.dish_type } : {}),
      ...(identity.cuisine_style ? { cuisine_style: identity.cuisine_style } : {}),
    };
  }

  private mergeRecipe(
    state: StreamState,
    recipe: Record<string, any>,
    allowUnlockedTitle = false,
  ) {
    const incoming = { ...recipe };
    // parsePartialJSON ferme artificiellement la chaîne JSON en cours. Sans ce
    // garde, il publierait « Poulet au cit » comme un vrai titre avant le lock.
    if (!state.lockedIdentity && !allowUnlockedTitle) delete incoming.title;
    return {
      ...state.snapshot.recipe,
      ...incoming,
      ...this.recipeIdentityFields(state.lockedIdentity),
    };
  }

  /** Compare plusieurs photos à partir de l'identité culinaire désormais verrouillée. */
  private async resolveImage(state: StreamState, identity: RecipeIdentity) {
    if (state.imageRequested || !identity.title) return;
    state.imageRequested = true;
    try {
      const stored = await recipeStorageService.getStoredRecipes();
      const recent = [...stored]
        .sort((a: any, b: any) => (Date.parse(b?.createdAt ?? '') || 0) - (Date.parse(a?.createdAt ?? '') || 0))
        .slice(0, IMAGE_HISTORY_LOOKBACK)
        .map((r: any) => r?.recipe?.image)
        .filter(Boolean);
      const image = await searchImage(identity, recent);
      const current = this.streams.get(state.id);
      if (!current) return;
      const prefetched = image ? await Image.prefetch(image, 'memory-disk') : false;
      const latest = this.streams.get(state.id);
      if (!latest) return;
      latest.imageReadyAt = Date.now();
      latest.snapshot = {
        ...latest.snapshot,
        recipe: image && prefetched
          ? { ...latest.snapshot.recipe, image }
          : latest.snapshot.recipe,
        imageResolved: true,
      };
      this.emit(latest);
      void analytics.track('recipe_image_ready', {
        success: Boolean(image && prefetched),
        image_latency_ms: latest.imageReadyAt - latest.startedAt,
        search_started_from_locked_identity: true,
      });
    } catch {
      const current = this.streams.get(state.id);
      if (!current) return;
      // Une recherche infructueuse ne doit pas bloquer l'écran de chargement.
      current.snapshot = { ...current.snapshot, imageResolved: true };
      this.emit(current);
    }
  }

  start(params: { ingredients: string; preferences: RecipePreferences; isSubscribed?: boolean }) {
    const id = this.createStreamId();
    const state: StreamState = {
      id,
      snapshot: {
        recipe: {},
        steps: [],
        isDone: false,
      },
      listeners: new Set(),
      startedAt: Date.now(),
    };
    this.streams.set(id, state);

    const { preferences } = params;
    const cuisineStyle = Array.isArray(preferences.cuisineStyle)
      ? preferences.cuisineStyle.join(', ')
      : preferences.cuisineStyle;

    const { close } = apiService.generateRecipeStream(
      params.ingredients,
      preferences.dishType,
      preferences.duration,
      preferences.servings,
      cuisineStyle,
      preferences.diet,
      preferences.goal || 'neutral',
      preferences.equipments || [],
      preferences.allergies || [],
      preferences.allowOtherIngredients,
      params.isSubscribed ?? false,
      {
        onRecipeIdentity: ({ identity, locked }) => {
          const current = this.streams.get(id);
          if (!current || !identity?.title) return;
          current.lockedIdentity = identity;
          const isFirstIdentity = !current.identityReadyAt;
          current.identityReadyAt ??= Date.now();
          current.snapshot = {
            ...current.snapshot,
            recipe: this.mergeRecipe(current, {}),
            identityLocked: locked,
          };
          this.emit(current);
          if (isFirstIdentity) {
            void analytics.track('recipe_identity_ready', {
              identity_latency_ms: current.identityReadyAt - current.startedAt,
            });
          }
          this.resolveImage(current, identity);
        },
        onRecipeChunk: (partial) => {
          const current = this.streams.get(id);
          if (!current) return;
          const recipe = partial?.recipe || partial;
          if (recipe && typeof recipe === 'object') {
            current.snapshot = {
              ...current.snapshot,
              recipe: this.mergeRecipe(current, recipe),
            };
            if (Array.isArray(recipe.steps) && recipe.steps.length > 0) {
              current.snapshot.steps = recipe.steps;
            }
            this.emit(current);
          }
        },
        onRecipe: (data) => {
          const current = this.streams.get(id);
          if (!current) return;
          current.snapshot = {
            ...current.snapshot,
            recipe: this.mergeRecipe(current, data?.recipe || {}, true),
            isFirstGeneration: data?.isFirstGeneration,
          };
          if (data?.recipe?.image) current.snapshot.imageResolved = true;
          this.emit(current);
          // Compatibilité avec une ancienne API : si l'événement d'identité n'a
          // pas été reçu, la recherche démarre au plus tard sur la recette finale.
          if (current.snapshot.recipe?.title && !current.snapshot.recipe?.image) {
            this.resolveImage(current, current.lockedIdentity || {
              title: current.snapshot.recipe.title,
              dish_type: current.snapshot.recipe.dish_type,
              cuisine_style: current.snapshot.recipe.cuisine_style,
              main_ingredients: Array.isArray(current.snapshot.recipe.ingredients)
                ? current.snapshot.recipe.ingredients.map((ingredient: any) => ingredient?.name).filter(Boolean)
                : [],
            });
          }
        },
        onStepsChunk: (partial) => {
          const current = this.streams.get(id);
          if (!current) return;
          const steps = partial?.details?.steps || partial?.steps;
          if (Array.isArray(steps) && steps.length > 0) {
            current.snapshot = {
              ...current.snapshot,
              steps,
            };
            this.emit(current);
          }
        },
        onSteps: (data) => {
          const current = this.streams.get(id);
          if (!current) return;
          current.snapshot = {
            ...current.snapshot,
            steps: data?.steps || [],
          };
          this.emit(current);
        },
        onDone: () => {
          const current = this.streams.get(id);
          if (!current) return;
          current.snapshot = {
            ...current.snapshot,
            isDone: true,
          };
          this.emit(current);
          void analytics.track('recipe_stream_completed', {
            total_latency_ms: Date.now() - current.startedAt,
            identity_latency_ms: current.identityReadyAt
              ? current.identityReadyAt - current.startedAt
              : null,
            image_latency_ms: current.imageReadyAt
              ? current.imageReadyAt - current.startedAt
              : null,
          });
          this.cleanupLater(id);
        },
        onError: (message) => {
          const current = this.streams.get(id);
          if (!current) return;
          current.snapshot = {
            ...current.snapshot,
            error: message,
            isDone: true,
          };
          this.emit(current);
          this.cleanupLater(id);
        },
      }
    );

    state.close = close;
    return id;
  }

  subscribe(streamId: string, listener: (snapshot: RecipeStreamSnapshot) => void) {
    const state = this.streams.get(streamId);
    if (!state) {
      return () => undefined;
    }
    state.listeners.add(listener);
    listener(state.snapshot);
    return () => {
      const current = this.streams.get(streamId);
      if (!current) return;
      current.listeners.delete(listener);
      // Conserver le snapshot pendant le handoff loader -> fiche. Avec une
      // suppression immédiate, le loader pouvait se désabonner juste avant que
      // la fiche ne récupère la recette terminée. cleanupLater borne sa durée.
    };
  }

  getSnapshot(streamId: string) {
    return this.streams.get(streamId)?.snapshot;
  }

  stop(streamId: string) {
    const state = this.streams.get(streamId);
    if (!state) return;
    state.close?.();
    this.streams.delete(streamId);
  }
}

const recipeStreamManager = new RecipeStreamManager();
export default recipeStreamManager;
