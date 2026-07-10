import { MD3LightTheme } from 'react-native-paper';

import { colors } from '../core/theme/colors';

export const paperTheme = {
  ...MD3LightTheme,
  roundness: 3,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    secondary: colors.secondary,
    tertiary: colors.accent,
    background: colors.background,
    surface: colors.surface,
    error: colors.danger,
    outline: colors.line,
    onSurface: colors.text,
    onSurfaceVariant: colors.muted,
  },
};

export type AppTheme = typeof paperTheme;
