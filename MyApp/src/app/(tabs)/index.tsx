import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LanguageToggle } from '@/components/language-toggle';
import { ProgressBar } from '@/components/progress-bar';
import { StatBlock } from '@/components/stat-block';
import { TermJar } from '@/components/term-jar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useDashboard } from '@/hooks/use-dashboard';
import { useAuth } from '@/lib/auth-context';
import { formatBirr, formatDate } from '@/lib/format';

export default function DashboardScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { driver, logout } = useAuth();
  const { data, loading, error, reload } = useDashboard();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}>
          <View style={styles.header}>
            <View style={styles.headerTopRow}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.eyebrow}>
                {t('login.title')}
              </ThemedText>
              <Pressable onPress={logout} hitSlop={8}>
                <ThemedText type="link" themeColor="textSecondary">
                  {t('common.signOut')}
                </ThemedText>
              </Pressable>
            </View>
            <View style={styles.headerBottomRow}>
              <ThemedText type="subtitle" style={styles.driverName} numberOfLines={1}>
                {driver?.name}
              </ThemedText>
              <LanguageToggle />
            </View>
          </View>

          {loading && !data && <ActivityIndicator style={styles.spinner} color={theme.primary} />}
          {error && !data && (
            <ThemedText type="small" style={{ color: theme.danger }}>
              {error}
            </ThemedText>
          )}

          {data && (
            <>
              <ThemedView type="backgroundElement" style={styles.card}>
                <ThemedText type="smallBold">{t('dashboard.recoveryProgress')}</ThemedText>
                <ThemedText type="title" style={styles.percent}>
                  {data.recovery.percent.toFixed(0)}%
                </ThemedText>
                <ProgressBar percent={data.recovery.percent} />

                <View style={styles.statsRow}>
                  <StatBlock label={t('dashboard.recovered')} value={formatBirr(data.recovery.recoveredBirr)} />
                  <StatBlock label={t('dashboard.remaining')} value={formatBirr(data.recovery.remainingBirr)} />
                </View>

                {data.recovery.estimatedCompletionDate && data.recovery.percent < 100 && (
                  <ThemedText type="small" themeColor="textSecondary">
                    {t('dashboard.estimatedCompletion')}: {formatDate(data.recovery.estimatedCompletionDate)}
                  </ThemedText>
                )}
                {data.recovery.percent >= 100 && (
                  <View style={[styles.badge, { backgroundColor: theme.success + '1A' }]}>
                    <ThemedText type="smallBold" style={{ color: theme.success }}>
                      {t('dashboard.targetReached')}
                    </ThemedText>
                  </View>
                )}
              </ThemedView>

              <ThemedView type="backgroundElement" style={styles.card}>
                <View style={styles.mfiHeaderRow}>
                  <ThemedText type="smallBold" style={styles.mfiHeaderLabel} numberOfLines={1}>
                    {t('dashboard.mfiRemaining')}
                  </ThemedText>
                  <View style={[styles.pill, { backgroundColor: theme.backgroundSelected }]}>
                    <ThemedText type="small" style={{ color: theme.primary }} numberOfLines={1}>
                      {t('dashboard.monthsPaidOf', { paid: data.mfi.monthsPaid, term: data.mfi.termMonths })}
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.jarRow}>
                  <TermJar termMonths={data.mfi.termMonths} monthsPaid={data.mfi.monthsPaid} />

                  <View style={styles.jarSideInfo}>
                    <ThemedText
                      type="title"
                      style={styles.monthsNumber}
                      numberOfLines={1}
                      adjustsFontSizeToFit>
                      {data.mfi.monthsRemaining}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                      {t('dashboard.monthsRemaining')}
                    </ThemedText>

                    {data.mfi.percentPaid >= 100 && (
                      <View style={[styles.badge, { backgroundColor: theme.success + '1A' }]}>
                        <ThemedText type="small" style={{ color: theme.success }} numberOfLines={1}>
                          {t('dashboard.mfiCleared')}
                        </ThemedText>
                      </View>
                    )}
                  </View>
                </View>
              </ThemedView>

              <ThemedView type="backgroundElement" style={styles.card}>
                <ThemedText type="smallBold">{t('dashboard.currentPeriod')}</ThemedText>
                {data.currentPeriod ? (
                  <View style={styles.periodRows}>
                    <StatRow label={t('dashboard.earnings')} value={formatBirr(data.currentPeriod.earnings)} />
                    <StatRow label={t('dashboard.toloCut')} value={formatBirr(data.currentPeriod.toloCut)} />
                    <StatRow
                      label={t('dashboard.saccoPayment')}
                      value={formatBirr(data.currentPeriod.saccoPaymentPaid)}
                    />
                    <View style={[styles.divider, { backgroundColor: theme.border }]} />
                    <StatRow
                      label={t('dashboard.takeHome')}
                      value={formatBirr(data.currentPeriod.takeHome)}
                      emphasize
                    />
                    {Number(data.currentPeriod.arrearsCarriedOut) > 0 && (
                      <ThemedText type="small" themeColor="textSecondary">
                        {t('dashboard.arrears')}: {formatBirr(data.currentPeriod.arrearsCarriedOut)}
                      </ThemedText>
                    )}
                  </View>
                ) : (
                  <ThemedText type="small" themeColor="textSecondary">
                    {t('dashboard.noPeriod')}
                  </ThemedText>
                )}
              </ThemedView>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function StatRow({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <View style={styles.statRow}>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
        {label}
      </ThemedText>
      <ThemedText type={emphasize ? 'smallBold' : 'small'} numberOfLines={1}>
        {value}
      </ThemedText>
    </View>
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
  scrollContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  header: {
    paddingTop: Spacing.three,
    paddingBottom: Spacing.one,
    gap: Spacing.one,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  headerBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  driverName: {
    flexShrink: 1,
    minWidth: 0,
    fontSize: 24,
    lineHeight: 28,
  },
  spinner: {
    marginTop: Spacing.six,
  },
  card: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.two,
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
  percent: {
    fontSize: 36,
    lineHeight: 40,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.one,
  },
  periodRows: {
    gap: Spacing.two,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  divider: {
    height: 1,
    marginVertical: Spacing.half,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    marginTop: Spacing.one,
  },
  mfiHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  mfiHeaderLabel: {
    flexShrink: 1,
    minWidth: 0,
  },
  jarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
    marginTop: Spacing.one,
  },
  jarSideInfo: {
    flex: 1,
    minWidth: 90,
    gap: Spacing.one,
  },
  monthsNumber: {
    fontSize: 40,
    lineHeight: 44,
  },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
});
