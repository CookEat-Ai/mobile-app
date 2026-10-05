import { Platform } from 'react-native';

// Apple 3.1.1: creator codes must not select prices or grant digital access.
export const CREATOR_PROMO_CODES_ENABLED = Platform.OS !== 'ios';
