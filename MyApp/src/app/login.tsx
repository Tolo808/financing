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
  const [focusedField, setFocusedField] = useState<'phone' | 'pin' | null>(null);

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
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.languageRow}>
          <LanguageToggle />
        </View>

        <View style={styles.content}>
          <View style={[styles.logoMark, { shadowColor: theme.text }]}>
            <ThemedText type="title" style={[styles.logoText, { color: theme.accent }]}>
              T
            </ThemedText>
          </View>

          <ThemedText type="title" style={styles.title}>
            {t('login.title')}
          </ThemedText>
          <ThemedText type="default" themeColor="textSecondary" style={styles.subtitle}>
            {t('login.subtitle')}
          </ThemedText>

          {error && (
            <View style={[styles.errorBox, { backgroundColor: theme.danger + '14' }]}>
              <ThemedText type="small" style={{ color: theme.danger }}>
                {error}
              </ThemedText>
            </View>
          )}

          <View style={[styles.card, { backgroundColor: theme.backgroundElement, shadowColor: theme.text }]}>
            <View style={styles.field}>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.fieldLabel}>
                {t('login.phone')}
              </ThemedText>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                onFocus={() => setFocusedField('phone')}
                onBlur={() => setFocusedField(null)}
                keyboardType="phone-pad"
                placeholder="+2519XXXXXXXX"
                placeholderTextColor={theme.textSecondary}
                style={[
                  styles.input,
                  {
                    color: theme.text,
                    backgroundColor: theme.background,
                    borderColor: focusedField === 'phone' ? theme.accent : theme.border,
                  },
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
                onFocus={() => setFocusedField('pin')}
                onBlur={() => setFocusedField(null)}
                keyboardType="number-pad"
                secureTextEntry
                style={[
                  styles.input,
                  {
                    color: theme.text,
                    backgroundColor: theme.background,
                    borderColor: focusedField === 'pin' ? theme.accent : theme.border,
                  },
                ]}
              />
            </View>

            <Pressable
              onPress={handleSubmit}
              disabled={disabled}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: theme.primary, opacity: pressed || disabled ? 0.7 : 1 },
              ]}>
              {loading ? (
                <ActivityIndicator color={theme.onPrimary} />
              ) : (
                <>
                  <ThemedText type="smallBold" style={[styles.buttonText, { color: theme.onPrimary }]}>
                    {t('login.signIn')}
                  </ThemedText>
                  <ThemedText type="smallBold" style={[styles.buttonArrow, { color: theme.onPrimary }]}>
                    →
                  </ThemedText>
                </>
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
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.six,
  },
  languageRow: {
    position: 'absolute',
    top: Spacing.five,
    right: Spacing.four,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth - Spacing.four * 2,
    alignItems: 'center',
  },
  logoMark: {
    width: 76,
    height: 76,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    marginBottom: Spacing.four,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 3,
  },
  logoText: {
    fontSize: 32,
    lineHeight: 36,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginTop: Spacing.one,
    marginBottom: Spacing.five,
  },
  card: {
    width: '100%',
    borderRadius: Spacing.five,
    padding: Spacing.four,
    gap: Spacing.three,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 2,
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
    borderWidth: 1.5,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
    fontWeight: '600',
  },
  errorBox: {
    width: '100%',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    marginBottom: Spacing.three,
  },
  button: {
    flexDirection: 'row',
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  buttonText: {
    fontSize: 16,
  },
  buttonArrow: {
    fontSize: 18,
  },
});
