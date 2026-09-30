import { API_BASE_URL } from '../config/api';

export const GENERIC_RECIPE_IMAGE = require('../assets/images/recipe-fallback.jpg');

export const GENERIC_RECIPE_IMAGE_MARKER = 'cookeat://generic-recipe-image';

export const isGenericRecipeImage = (image?: string | null) =>
  !image?.trim() || image === GENERIC_RECIPE_IMAGE_MARKER;

export const resolveRecipeImageUrl = (image?: string | null): string | null => {
  const value = image?.trim();
  if (!value || value === GENERIC_RECIPE_IMAGE_MARKER) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/api/')) return `${API_BASE_URL.replace(/\/api\/?$/, '')}${value}`;
  return value;
};

export const getRecipeImageSource = (image?: string | null) => {
  const uri = resolveRecipeImageUrl(image);
  return uri ? { uri } : GENERIC_RECIPE_IMAGE;
};
