/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

// Royal blue palette — kept for reference/back-compat, no longer the driver app's primary
// palette (see Navy below). Still matches the admin portal's royal-50 through royal-900.
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

// Navy palette — the driver app's own premium identity: a deep navy surface, a bright
// "blueLight" accent for actions/highlights, and a slate text scale for readable contrast on
// dark. Distinct from the admin portal's royal-blue-on-white by deliberate choice.
export const Navy = {
  50: '#7FB8FF', // blueLight, soft/secondary accent
  100: '#4F9CF9', // blueLight, primary accent
  200: '#8B98AF', // slate, secondary text
  300: '#E7ECF3', // slate, primary text
  700: '#26395C', // navy, border/divider — visible against both bg and card
  800: '#13213A', // navy, elevated surface (cards)
  850: '#1B2E4D', // navy, selected/pressed state — clearly lighter than a card
  900: '#0A1120', // navy, base background — darkest
} as const;

export const Colors = {
  light: {
    text: Navy[300],
    background: Navy[900],
    backgroundElement: Navy[800],
    backgroundSelected: Navy[850],
    textSecondary: Navy[200],
    primary: Navy[100],
    onPrimary: Navy[900],
    accent: Navy[50],
    success: '#34D399',
    danger: '#F87171',
    border: Navy[700],
  },
  dark: {
    text: Navy[300],
    background: Navy[900],
    backgroundElement: Navy[800],
    backgroundSelected: Navy[850],
    textSecondary: Navy[200],
    primary: Navy[100],
    onPrimary: Navy[900],
    accent: Navy[50],
    success: '#34D399',
    danger: '#F87171',
    border: Navy[700],
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
