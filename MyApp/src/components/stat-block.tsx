import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.container}>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
        {label}
      </ThemedText>
      <ThemedText type="subtitle" style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.half,
  },
  value: {
    fontSize: 22,
    lineHeight: 26,
  },
});
