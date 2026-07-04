import { useTranslation } from 'react-i18next';
import { FlatList, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PeriodCard } from '@/components/period-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useSettlements } from '@/hooks/use-settlements';

export default function HistoryScreen() {
  const { t } = useTranslation();
  const { settlements, loading, reload } = useSettlements();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <FlatList
          data={settlements}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
          ListHeaderComponent={
            <ThemedText type="subtitle" style={styles.title}>
              {t('history.title')}
            </ThemedText>
          }
          ListEmptyComponent={
            !loading ? (
              <ThemedText type="small" themeColor="textSecondary">
                {t('history.empty')}
              </ThemedText>
            ) : null
          }
          renderItem={({ item }) => <PeriodCard settlement={item} />}
          ItemSeparatorComponent={() => <ThemedView style={styles.separator} />}
        />
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
  },
  listContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  title: {
    fontSize: 28,
    lineHeight: 32,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
  },
  separator: {
    height: Spacing.three,
    backgroundColor: 'transparent',
  },
});
