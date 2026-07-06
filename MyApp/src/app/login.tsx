import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { LanguageToggle } from '@/components/language-toggle';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';

export default function LoginScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { login } = useAuth();

  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      await login(phone.trim(), pin.trim());
    } catch {
      setError(t('login.error'));
    } finally {
      setLoading(false);
    }
  }

  const disabled = loading || !phone || !pin;

  return (
    <ThemedView style={[styles.container, { experimental_backgroundImage: `radial-gradient(circle at 50% -10%, ${theme.backgroundSelected}, ${theme.background} 60%)` } as object]}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.languageRow}>
          <LanguageToggle />
        </View>

        <View style={styles.content}>
          <View style={styles.logoGlowWrap}>
            <View style={[styles.logoGlow, { backgroundColor: theme.primary }]} />
            <View style={[styles.logoMark, { backgroundColor: theme.primary }]}>
              <ThemedText type="title" style={[styles.logoText, { color: theme.onPrimary }]}>
                T
              </ThemedText>
            </View>
          </View>

          <View style={styles.form}>
            <ThemedText type="title" style={styles.title}>
              {t('login.title')}
            </ThemedText>

            {error && (
              <View style={[styles.errorBox, { backgroundColor: theme.danger + '14' }]}>
                <ThemedText type="small" style={{ color: theme.danger }}>
                  {error}
                </ThemedText>
              </View>
            )}

            <View style={styles.field}>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.fieldLabel}>
                {t('login.phone')}
              </ThemedText>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="+2519XXXXXXXX"
                placeholderTextColor={theme.textSecondary}
                style={[
                  styles.input,
                  { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border },
                ]}
              />
            </View>

            <View style={styles.field}>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.fieldLabel}>
                {t('login.pin')}
              </ThemedText>
              <TextInput
                value={pin}
                onChangeText={setPin}
                keyboardType="number-pad"
                secureTextEntry
                style={[
                  styles.input,
                  { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border },
                ]}
              />
            </View>

            <Pressable
              onPress={handleSubmit}
              disabled={disabled}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: theme.primary, opacity: pressed || disabled ? 0.6 : 1 },
              ]}>
              {loading ? (
                <ActivityIndicator color={theme.onPrimary} />
              ) : (
                <ThemedText type="smallBold" style={[styles.buttonText, { color: theme.onPrimary }]}>
                  {t('login.signIn')}
                </ThemedText>
              )}
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  languageRow: {
    position: 'absolute',
    top: Spacing.five,
    right: Spacing.four,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth * 0.5,
    gap: Spacing.five,
  },
  logoGlowWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoGlow: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    opacity: 0.18,
  },
  logoMark: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 26,
    lineHeight: 30,
  },
  form: {
    gap: Spacing.three,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    marginBottom: Spacing.one,
  },
  field: {
    gap: Spacing.one,
  },
  fieldLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
    fontWeight: '600',
  },
  errorBox: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  button: {
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  buttonText: {
    fontSize: 16,
  },
});
