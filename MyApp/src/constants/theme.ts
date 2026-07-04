/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

// Royal blue palette — matches the admin portal exactly (royal-50 through royal-900)
// so the driver app and admin portal read as one product.
export const Royal = {
  50: '#eef2ff',
  100: '#e0e7ff',
  200: '#c7d2fe',
  300: '#a5b4fc',
  400: '#818cf8',
  500: '#4f5fe0',
  600: '#3548d4',
  700: '#2337b8',
  800: '#1d2e93',
  900: '#1a2875',
} as const;

export const Colors = {
  light: {
    text: '#0F1222',
    background: '#ffffff',
    backgroundElement: '#F4F5FB',
    backgroundSelected: Royal[50],
    textSecondary: '#6B7080',
    primary: Royal[700],
    onPrimary: '#ffffff',
    accent: Royal[500],
    success: '#0E8A3E',
    danger: '#D1293D',
    border: '#E7E8F2',
  },
  dark: {
    text: '#F5F6FF',
    background: '#0B0E1A',
    backgroundElement: '#151A2E',
    backgroundSelected: Royal[900],
    textSecondary: '#9AA0B8',
    primary: Royal[400],
    onPrimary: '#0F1222',
    accent: Royal[300],
    success: '#3DD46B',
    danger: '#FF6B6B',
    border: '#232A45',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80, web: 96 }) ?? 0;
export const MaxContentWidth = 800;
