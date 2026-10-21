/** One entrance direction for native modal routes and local modal surfaces. */
export const MODAL_ANIMATION = 'slide' as const;
export const MODAL_ROUTE_ANIMATION = 'slide_from_bottom' as const;

// AppModal owns this sheet's entrance. Sliding its transparent route would
// also move the full-screen dimming layer, exposing a grey rectangle above it.
export const PHOTO_CAPTURE_ROUTE_OPTIONS = {
  headerShown: false,
  presentation: 'transparentModal',
  animation: 'none',
  contentStyle: { backgroundColor: 'transparent' },
  gestureEnabled: false,
} as const;
