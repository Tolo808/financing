import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { setLanguage, type SupportedLanguage } from '@/i18n';

const LANGUAGES: SupportedLanguage[] = ['en', 'am'];

export function LanguageToggle() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();

  return (
    <View style={styles.row}>
      {LANGUAGES.map((lang) => {
        const active = i18n.language === lang;
        return (
          <Pressable key={lang} onPress={() => setLanguage(lang)} hitSlop={4}>
            <View
              style={[
                styles.pill,
                { backgroundColor: active ? theme.primary : theme.backgroundElement },
              ]}>
              <ThemedText type="small" style={{ color: active ? theme.onPrimary : theme.textSecondary }}>
                {t(`language.${lang}`)}
              </ThemedText>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  pill: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.four,
  },
});
