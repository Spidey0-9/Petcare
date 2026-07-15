export const colors = {
  primary: '#10B981',
  primaryDark: '#047857',
  primarySoft: '#D1FAE5',
  secondary: '#14B8A6',
  secondaryDark: '#0F766E',
  secondarySoft: '#CCFBF1',
  accent: '#F97316',
  accentSoft: '#FFEDD5',
  background: '#F6FBF8',
  backgroundAlt: '#ECFDF5',
  surface: '#FFFFFF',
  surfaceGlass: 'rgba(255,255,255,0.78)',
  text: '#0F172A',
  muted: '#64748B',
  line: '#DDEAE4',
  danger: '#EF4444',
  dangerSoft: '#FEE2E2',
  warning: '#F59E0B',
  success: '#22C55E',
  navy: '#071426',
  navySoft: '#102033',
  teal: '#14B8A6',
  emerald: '#10B981',
  orange: '#F97316',
};

export const gradients = {
  app: ['#F6FBF8', '#ECFDF5', '#F8FAFC'] as const,
  premium: ['#10B981', '#14B8A6'] as const,
  warm: ['#F97316', '#FDBA74'] as const,
  dark: ['#071426', '#102033'] as const,
  glass: ['rgba(255,255,255,0.92)', 'rgba(255,255,255,0.62)'] as const,
};

export const radii = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 30,
};

export const shadows = {
  soft: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 5,
  },
  premium: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 26,
    elevation: 6,
  },
};
