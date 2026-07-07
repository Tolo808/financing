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

// Light lavender palette — soft page background with white elevated cards, a deep-navy CTA
// button, and an indigo accent, matching the reference design directly.
export const Lavender = {
  bg: '#EEF0F7', // page background
  card: '#FFFFFF', // elevated surfaces (cards, inputs)
  text: '#12141C', // primary text
  textSecondary: '#6B7280', // secondary/muted text
  accent: '#3B5BDB', // indigo accent — icon glyphs, focused input border, links
  accentSoft: '#E7EAFB', // soft accent tint — selected pills, badges
  buttonNavy: '#10163D', // solid CTA button background
  border: '#E3E6EF', // card/input borders
} as const;

export const Colors = {
  light: {
    text: Lavender.text,
    background: Lavender.bg,
    backgroundElement: Lavender.card,
    backgroundSelected: Lavender.accentSoft,
    textSecondary: Lavender.textSecondary,
    primary: Lavender.buttonNavy,
    onPrimary: '#FFFFFF',
    accent: Lavender.accent,
    success: '#0E8A3E',
    danger: '#D1293D',
    border: Lavender.border,
  },
  dark: {
    text: Lavender.text,
    background: Lavender.bg,
    backgroundElement: Lavender.card,
    backgroundSelected: Lavender.accentSoft,
    textSecondary: Lavender.textSecondary,
    primary: Lavender.buttonNavy,
    onPrimary: '#FFFFFF',
    accent: Lavender.accent,
    success: '#0E8A3E',
    danger: '#D1293D',
    border: Lavender.border,
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
// Caps the web layout at a real phone width — on native this has no effect (the screen itself
// is already phone-sized), but on a wide desktop browser it keeps the app reading as a phone
// app rather than stretching into a tablet/webpage-width column.
export const MaxContentWidth = 430;
