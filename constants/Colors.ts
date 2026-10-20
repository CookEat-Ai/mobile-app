import { AppTheme } from './AppTheme';

/** Compatibility names for older screens; AppTheme owns every visual role. */
export const Colors = {
  light: {
    text: AppTheme.ink,
    textSecondary: AppTheme.muted,
    background: AppTheme.background,
    tint: AppTheme.yellow,
    icon: AppTheme.muted,
    tabIconDefault: AppTheme.muted,
    tabIconSelected: AppTheme.yellow,
    accent: AppTheme.yellowSoft,
    surface: AppTheme.surface,
    card: AppTheme.surface,
    button: AppTheme.yellow,
    border: AppTheme.line,
  },
};
