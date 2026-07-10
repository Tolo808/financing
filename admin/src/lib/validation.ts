import { z } from "zod";
import { normalizeEthiopianPhone } from "./phone";

export const cadenceEnum = z.enum(["DAILY", "WEEKLY", "MONTHLY"]);
export const languageEnum = z.enum(["en", "am"]);

// Accepts any common way of typing an Ethiopian phone number and canonicalizes it to E.164 —
// see normalizeEthiopianPhone for why this matters (Supabase's Admin API rejects non-E.164
// numbers, and the driver's synthetic auth email must be derived consistently).
const ethiopianPhone = z.string().transform((value, ctx) => {
  const normalized = normalizeEthiopianPhone(value);
  if (!normalized) {
    ctx.addIssue({
      code: "custom",
      message: "Enter a valid Ethiopian phone number, e.g. 0911234567 or +251911234567",
    });
    return z.NEVER;
  }
  return normalized;
});

export const createDriverSchema = z.object({
  name: z.string().min(1),
  phone: ethiopianPhone,
  pin: z.string().min(4).max(12),
  saccoMonthlyPayment: z.number().positive(),
  termMonths: z.number().int().positive(),
  cadence: cadenceEnum.default("MONTHLY"),
  toloTargetBirrOverride: z.number().positive().nullish(),
  toloRatePercentOverride: z.number().positive().max(100).nullish(),
  language: languageEnum.default("en"),
  lenderId: z.string().min(1),
});

export const updateDriverSchema = z.object({
  name: z.string().min(1).optional(),
  phone: ethiopianPhone.optional(),
  pin: z.string().min(4).max(12).optional(),
  saccoMonthlyPayment: z.number().positive().optional(),
  termMonths: z.number().int().positive().optional(),
  cadence: cadenceEnum.optional(),
  toloTargetBirrOverride: z.number().positive().nullish(),
  toloRatePercentOverride: z.number().positive().max(100).nullish(),
  language: languageEnum.optional(),
  active: z.boolean().optional(),
  lenderId: z.string().min(1).optional(),
});

export const createLenderSchema = z.object({
  name: z.string().min(1),
  contactEmail: z.string().email().nullish(),
});

export const createMfiUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  lenderId: z.string().min(1),
});

export const recordSettlementSchema = z.object({
  driverId: z.string().min(1),
  periodIndex: z.number().int().positive(),
  periodStart: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "invalid date"),
  periodEnd: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "invalid date"),
  earnings: z.number().nonnegative(),
});

export const updateGlobalSettingsSchema = z.object({
  toloTargetBirr: z.number().positive().optional(),
  toloRatePercent: z.number().positive().max(100).optional(),
  priceTiers: z.array(z.number().positive()).min(1).optional(),
});

export const depositStatusEnum = z.enum(["PENDING", "DEPOSITED"]);

export const recordCashCollectionSchema = z.object({
  driverId: z.string().min(1),
  date: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "invalid date"),
  tierCounts: z.record(z.string(), z.number().int().nonnegative()),
  collectedBirr: z.number().nonnegative(),
  depositStatus: depositStatusEnum,
});
