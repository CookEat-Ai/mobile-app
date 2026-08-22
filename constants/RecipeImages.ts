export const GENERIC_RECIPE_IMAGE = require('../assets/images/recipe-fallback.jpg');

export const GENERIC_RECIPE_IMAGE_MARKER = 'cookeat://generic-recipe-image';

export const isGenericRecipeImage = (image?: string | null) =>
  !image?.trim() || image === GENERIC_RECIPE_IMAGE_MARKER;

export const getRecipeImageSource = (image?: string | null) =>
  isGenericRecipeImage(image) ? GENERIC_RECIPE_IMAGE : { uri: image };
