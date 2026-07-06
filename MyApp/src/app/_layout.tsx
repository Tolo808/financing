import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { AppQueryProvider } from '@/lib/query-client';
import { initI18n } from '@/i18n';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { driver, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  return (
    <Stack>
      <Stack.Protected guard={!!driver}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!driver}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    initI18n().then(() => setI18nReady(true));
  }, []);

  return (
    <ThemeProvider value={DarkTheme}>
      <StatusBar style="light" />
      <AnimatedSplashOverlay />
      {i18nReady && (
        <AppQueryProvider>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </AppQueryProvider>
      )}
    </ThemeProvider>
  );
}
