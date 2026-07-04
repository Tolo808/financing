export interface DriverProfile {
  id: string;
  name: string;
  phone: string;
  language: 'en' | 'am';
  termMonths: number;
  cadence: 'DAILY' | 'WEEKLY' | 'MONTHLY';
}

export interface DashboardResponse {
  recovery: {
    recoveredBirr: string;
    targetBirr: string;
    remainingBirr: string;
    percent: number;
    estimatedPeriodsRemaining: number | null;
    estimatedCompletionDate: string | null;
  };
  mfi: {
    totalObligationBirr: string;
    paidSoFarBirr: string;
    remainingBirr: string;
    percentPaid: number;
    termMonths: number;
    monthsPaid: number;
    monthsRemaining: number;
  };
  currentPeriod: {
    periodIndex: number;
    periodStart: string;
    periodEnd: string;
    earnings: string;
    toloCut: string;
    saccoPaymentPaid: string;
    takeHome: string;
    arrearsCarriedOut: string;
  } | null;
}

export interface Settlement {
  id: string;
  periodIndex: number;
  periodStart: string;
  periodEnd: string;
  earnings: string;
  toloRatePercentApplied: string;
  toloCut: string;
  saccoFixedInstallment: string;
  saccoPaymentDue: string;
  saccoPaymentPaid: string;
  arrearsCarriedIn: string;
  arrearsCarriedOut: string;
  cumulativeToloRecoveredBefore: string;
  cumulativeToloRecoveredAfter: string;
  takeHome: string;
  status: 'ACTIVE' | 'SUPERSEDED';
  createdAt: string;
}

export type NotificationType =
  | 'SETTLEMENT_PROCESSED'
  | 'MILESTONE_25'
  | 'MILESTONE_50'
  | 'MILESTONE_75'
  | 'MILESTONE_100'
  | 'TOLO_TARGET_REACHED';

export interface AppNotification {
  id: string;
  type: NotificationType;
  message: string;
  createdAt: string;
  readAt: string | null;
}
