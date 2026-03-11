import apiService from './api';

type Preferences = {
  dishType: string;
  duration: string;
  servings: number;
  cuisineStyle: string[] | string;
  diet: string;
  goal: string;
  equipments: string[];
  allergies: string[];
  allowOtherIngredients: boolean;
};

export type RecipeStreamSnapshot = {
  recipe: Record<string, any>;
  steps: any[];
  isFirstGeneration?: boolean;
  isDone: boolean;
  error?: string;
};

type StreamState = {
  id: string;
  close?: () => void;
  snapshot: RecipeStreamSnapshot;
  listeners: Set<(snapshot: RecipeStreamSnapshot) => void>;
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

  start(params: { ingredients: string; preferences: Preferences; isSubscribed?: boolean }) {
    const id = this.createStreamId();
    const state: StreamState = {
      id,
      snapshot: {
        recipe: {},
        steps: [],
        isDone: false,
      },
      listeners: new Set(),
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
        onRecipeChunk: (partial) => {
          const current = this.streams.get(id);
          if (!current) return;
          const recipe = partial?.recipe || partial;
          if (recipe && typeof recipe === 'object') {
            current.snapshot = {
              ...current.snapshot,
              recipe: { ...current.snapshot.recipe, ...recipe },
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
            recipe: { ...current.snapshot.recipe, ...(data?.recipe || {}) },
            isFirstGeneration: data?.isFirstGeneration,
          };
          this.emit(current);
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
      if (current.listeners.size === 0 && current.snapshot.isDone) {
        this.streams.delete(streamId);
      }
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
