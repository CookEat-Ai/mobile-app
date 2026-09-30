import { StyleSheet } from 'react-native';

/** Everyday surfaces inherit the onboarding's cream, ink and yellow. */
export const AppTheme = {
  background: '#FDF9E2',
  surface: '#FFFFFF',
  ink: '#081A10',
  muted: '#687076',
  line: '#EFE8CF',
  yellow: '#FEB50A',
  yellowSoft: '#FFF4CF',
  soft: '#F2EDDF',
  radius: 23,
  bottomSpace: 32,
} as const;

export const appStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AppTheme.background },
  card: { backgroundColor: AppTheme.surface, borderRadius: AppTheme.radius, borderWidth: 1, borderColor: AppTheme.line, padding: 18 },
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
  button: { minHeight: 56, borderRadius: 200, paddingHorizontal: 20, paddingVertical: 14, backgroundColor: AppTheme.yellow, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  buttonText: { fontFamily: 'Degular', fontSize: 20, color: 'white' },
  iconButton: { width: 44, height: 44, borderRadius: 16, borderWidth: 0, backgroundColor: AppTheme.surface, alignItems: 'center', justifyContent: 'center' },
  error: { fontFamily: 'CronosPro', fontSize: 16, lineHeight: 22, color: '#963F32', marginVertical: 12 },
});
