import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatBirr, formatDateRange } from '@/lib/format';
import type { Settlement } from '@/types/api';

export function PeriodCard({ settlement }: { settlement: Settlement }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const hasArrears = Number(settlement.arrearsCarriedOut) > 0;

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.headerRow}>
        <ThemedText type="smallBold">
          {t('history.period')} {settlement.periodIndex}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {formatDateRange(settlement.periodStart, settlement.periodEnd)}
        </ThemedText>
      </View>

      <View style={styles.rows}>
        <Row label={t('dashboard.earnings')} value={formatBirr(settlement.earnings)} />
        <Row label={t('dashboard.toloCut')} value={formatBirr(settlement.toloCut)} />
        <Row label={t('dashboard.saccoPayment')} value={formatBirr(settlement.saccoPaymentPaid)} />
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <Row label={t('dashboard.takeHome')} value={formatBirr(settlement.takeHome)} emphasize />
      </View>

      {hasArrears && (
        <View style={[styles.badge, { backgroundColor: theme.danger + '14' }]}>
          <ThemedText type="small" style={{ color: theme.danger }}>
            {t('dashboard.arrears')}: {formatBirr(settlement.arrearsCarriedOut)}
          </ThemedText>
        </View>
      )}
    </ThemedView>
  );
}

function Row({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <View style={styles.row}>
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
  card: {
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.two,
    shadowColor: '#0F1222',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rows: {
    gap: Spacing.one,
  },
  row: {
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
  },
});
