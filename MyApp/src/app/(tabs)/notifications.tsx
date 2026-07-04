import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useNotifications } from '@/hooks/use-notifications';
import { formatDate } from '@/lib/format';
import type { AppNotification } from '@/types/api';

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const { notifications, loading, reload, markRead } = useNotifications();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
          ListHeaderComponent={
            <ThemedText type="subtitle" style={styles.title}>
              {t('notifications.title')}
            </ThemedText>
          }
          ListEmptyComponent={
            !loading ? (
              <ThemedText type="small" themeColor="textSecondary">
                {t('notifications.empty')}
              </ThemedText>
            ) : null
          }
          renderItem={({ item }) => <NotificationRow notification={item} onPress={() => markRead(item.id)} />}
          ItemSeparatorComponent={() => <ThemedView style={styles.separator} />}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

function NotificationRow({ notification, onPress }: { notification: AppNotification; onPress: () => void }) {
  const theme = useTheme();
  const isUnread = !notification.readAt;

  return (
    <Pressable onPress={onPress}>
      <ThemedView type={isUnread ? 'backgroundSelected' : 'backgroundElement'} style={styles.card}>
        <View style={styles.row}>
          {isUnread && <View style={[styles.dot, { backgroundColor: theme.primary }]} />}
          <View style={styles.textCol}>
            <ThemedText type={isUnread ? 'smallBold' : 'small'}>{notification.message}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {formatDate(notification.createdAt)}
            </ThemedText>
          </View>
        </View>
      </ThemedView>
    </Pressable>
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
  card: {
    borderRadius: Spacing.four,
    padding: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'flex-start',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  textCol: {
    flex: 1,
    gap: Spacing.half,
  },
  separator: {
    height: Spacing.two,
    backgroundColor: 'transparent',
  },
});
