import { PUBLIC_ENV } from '../config/env';

export const TRY_FREE_QUICK_ACTION_ID = 'try-for-free';
export const TRY_FREE_OFFERING_ID = PUBLIC_ENV.revenueCatDiscountOfferingId;
export const TRY_FREE_IOS_PRODUCT_ID = PUBLIC_ENV.revenueCatDiscountIosProductId;
export const TRY_FREE_ANDROID_PRODUCT_ID = PUBLIC_ENV.revenueCatDiscountAndroidProductId;
export const TRY_FREE_IOS_SOURCE = 'ios_quick_action_try_free';
export const TRY_FREE_ANDROID_SOURCE = 'android_quick_action_try_free';
export const QUICK_ACTION_ANALYTICS_SOURCE = 'quick_action';
export const QUICK_ACTION_ENTRY_POINT = 'app_icon_long_press';

export const isTryFreeQuickActionSource = (source?: string): boolean =>
  source === TRY_FREE_IOS_SOURCE || source === TRY_FREE_ANDROID_SOURCE;
