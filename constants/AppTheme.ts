import { StyleSheet } from 'react-native';

/** Everyday surfaces inherit the onboarding's cream, ink and yellow. */
export const AppTheme = {
  background: '#FDF9E2',
  surface: '#FFFFFF',
  onPrimary: '#FFFFFF',
  ink: '#081A10',
  muted: '#687076',
  line: '#EFE8CF',
  yellow: '#FEB50A',
  yellowSoft: '#FFF4CF',
  soft: '#F3F4F3',
  danger: '#963F32',
  dangerSoft: '#FFF1EE',
  dangerBorder: '#F1C7C2',
  success: '#315E41',
  successSoft: '#EFF7F1',
  overlay: 'rgba(8,26,16,0.38)',
  mediaControl: 'rgba(0,0,0,0.65)',
  mediaControlBorder: 'rgba(255,255,255,0.24)',
  radius: 23,
  bottomSpace: 32,
} as const;

export const AppRadii = { small: 8, chip: 12, control: 16, card: 23, sheet: 32, pill: 999 } as const;
export const AppControl = { size: 44, icon: 24, border: 1, disabledOpacity: .45 } as const;

export const NutritionColors = { calories: '#FEB50A', proteins: '#E96C5D', carbs: '#75B878', fats: '#5DA9E9' } as const;

export const appStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AppTheme.background },
  card: { backgroundColor: AppTheme.surface, borderRadius: AppRadii.card, borderWidth: 1, borderColor: AppTheme.line, padding: 18 },
  brand: { fontFamily: 'Degular', fontSize: 26, lineHeight: 30, color: AppTheme.ink },
  textAction: { fontFamily: 'Degular', fontSize: 18, lineHeight: 23, color: AppTheme.ink, flexShrink: 1 },
  title: { fontFamily: 'Degular', fontSize: 31, lineHeight: 34, color: AppTheme.ink },
  subtitle: { fontFamily: 'CronosPro', fontSize: 17, lineHeight: 23, color: AppTheme.muted },
  eyebrow: { fontFamily: 'CronosProBold', fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: AppTheme.muted },
  section: { fontFamily: 'Degular', fontSize: 23, lineHeight: 28, color: AppTheme.ink },
  headerTitle: { fontFamily: 'Degular', fontSize: 29, color: AppTheme.ink },
  backHeader: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  backHeaderTitle: { flex: 1, textAlign: 'center' },
  backHeaderLeadingTitle: { flex: 1, textAlign: 'left' },
  button: { minHeight: 56, borderRadius: AppRadii.pill, paddingHorizontal: 20, paddingVertical: 14, backgroundColor: AppTheme.yellow, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  secondaryButton: { minHeight: 52, borderRadius: AppRadii.control, borderWidth: 1, borderColor: AppTheme.line, backgroundColor: AppTheme.surface, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  secondaryButtonText: { fontFamily: 'Degular', fontSize: 18, lineHeight: 23, color: AppTheme.ink },
  buttonText: { fontFamily: 'Degular', fontSize: 20, color: AppTheme.onPrimary },
  iconButton: { width: AppControl.size, height: AppControl.size, borderRadius: AppRadii.control, borderWidth: AppControl.border, borderColor: AppTheme.line, backgroundColor: AppTheme.surface, alignItems: 'center', justifyContent: 'center' },
  input: { minHeight: 52, borderRadius: AppRadii.control, borderWidth: 1, borderColor: AppTheme.line, backgroundColor: AppTheme.surface, paddingHorizontal: 16, fontFamily: 'CronosPro', fontSize: 17, color: AppTheme.ink },
  sheet: { backgroundColor: AppTheme.background, borderTopLeftRadius: AppRadii.sheet, borderTopRightRadius: AppRadii.sheet, overflow: 'hidden' },
  error: { fontFamily: 'CronosPro', fontSize: 16, lineHeight: 22, color: AppTheme.danger, marginVertical: 12 },
});
