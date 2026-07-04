# Tolo Financing Platform

A two-part system for Tolo, an Ethiopian electric-motorcycle financing company:

- **`admin/`** — Next.js admin portal + the shared backend API (PostgreSQL via Prisma). Staff manage drivers, record/correct settlements, and view the audit trail here.
- **`MyApp/`** — Expo/React Native driver app. Drivers log in with phone + PIN to see their Tolo-recovery progress, payment history, and notifications.

Both apps talk to the same Supabase Postgres database. All writes (settlements, driver records, admin actions) go through `admin`'s backend, which connects as the table-owning Postgres role. `MyApp` reads its computed dashboard stats from `admin`'s JSON API, but reads settlements and notifications directly from Supabase — Row Level Security restricts each driver to their own rows.

## Architecture

```
admin/
  prisma/schema.prisma       Driver, Settlement, GlobalSettings, AuditLog, Notification, AdminUser
  src/server/finance/        Pure calculation engine (no DB) — the financing math, heavily unit-tested
  src/server/services/       DB orchestration: driver/settlement/notification/audit services
  src/app/api/admin/*        Staff-only endpoints (Supabase Auth session, protected by src/proxy.ts)
  src/app/api/driver/dashboard  Driver's computed stats (Supabase access token, CORS-enabled for the Expo web target)
  src/app/(dashboard)/*      Admin portal pages (drivers, settlements, settings, audit log)
  src/server/supabase/       Supabase clients (server/browser/service-role)

MyApp/
  src/app/login.tsx          Phone + PIN login (Supabase Auth under a synthetic email — see below)
  src/app/(tabs)/            Dashboard, History, Notifications (native tab bar + web fallback)
  src/lib/                   Supabase client, TanStack Query setup, auth context
  src/i18n/                  English + Amharic dictionaries
```

## Financing logic (implemented exactly as specified)

Every settlement period, from a driver's total earnings:

1. **Tolo** takes 35% of earnings (configurable, default `toloRatePercent`) until it has recovered a cumulative 70,000 Birr (configurable, default `toloTargetBirr`) — both defaults live in `GlobalSettings` and can be overridden per driver.
2. **SACCo** takes a fixed installment = driver's `saccoFinancedTotal` ÷ `termMonths`.
3. If earnings can't cover both: Tolo's cut is taken first (capped at what's left of the 70,000 target), then as much of the SACCo payment as remains; the shortfall becomes arrears carried into the next period.
4. Once Tolo's target is reached, Tolo takes nothing further — SACCo and the driver split the rest as before.
5. **Corrections** to a past period's earnings never overwrite history — a new `Settlement` row supersedes the old one, and every subsequent period is recalculated and re-superseded in the same transaction. Nothing is deleted; `status: SUPERSEDED` rows remain queryable for audit.

The engine lives in `admin/src/server/finance/` and is pure (no Prisma/DB imports) so it's directly unit-tested — see `calculate-period.test.ts` and `recalculate-sequence.test.ts` for the 35%/fixed-split example, the 70,000 cap boundary, arrears carry-forward, post-recovery behavior, the take-home-never-negative invariant (fuzzed), and the correction-cascade behavior.

## Quickstart (local dev)

**Prerequisites:** Node.js 20+, a Supabase project (Project Settings → API for the URL/keys; Connect → ORMs → Prisma for the pooler connection strings).

### 1. Backend + admin portal

```bash
cd admin
npm install
cp ../.env.example .env        # fill in DATABASE_URL/DIRECT_URL and the Supabase keys
npx prisma migrate deploy      # applies the schema to Supabase (see the note on migrate dev below)
psql "$DIRECT_URL" -f prisma/rls-policies.sql   # applies Row Level Security policies
npx tsx prisma/seed.ts         # loads the demo admin + 2 demo drivers, incl. their Supabase Auth accounts
npx vitest run                 # finance engine tests should all pass
npm run dev                    # http://localhost:3000
```

`prisma migrate dev` tends to hang non-interactively against a remote pooler when there are schema warnings — if that happens, hand-write the migration SQL and apply it with `prisma migrate deploy` (or `psql`) instead, then `prisma migrate resolve --applied <name>`.

Seed output prints the demo admin login (`admin@tolo.et` / `ChangeMe123!` — **change this immediately**, it's a placeholder) and two demo drivers' phone/PIN combos.

### 2. Driver app

```bash
cd MyApp
npm install
cp .env.example .env           # fill in EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY
npx expo start
```

Press `w` for the web target (fastest way to click around without a device/emulator), or scan the QR code with Expo Go on a phone on the same network. The app auto-detects the API host from Metro's LAN address, so no config is needed for local dev — override via `expo.extra.apiBaseUrl` in `app.json` for production builds.

### How to add a driver

Admin portal → **Drivers** → **Add Driver**. You'll set their phone number, an initial PIN (drivers can't self-register), SACCo-financed total, and term. Per-driver Tolo target/rate overrides are optional — leave blank to use the global defaults on the **Settings** page.

### Recording a settlement

Admin portal → pick a driver → **Record / Correct Settlement**. Enter the period's total delivery earnings; the split is computed and posted server-side. To correct a past period, re-submit the same period number with the corrected earnings — every later period recalculates automatically and the old rows are preserved (superseded, not deleted) for audit.

## Supabase (database, auth, RLS, caching)

The project runs entirely on Supabase (hosted Postgres + Supabase Auth + Row Level Security), with TanStack Query in the Expo app for a cache-first, snappy feel. The old NextAuth/custom-JWT system has been fully removed.

- **Database**: `admin/.env`'s `DATABASE_URL`/`DIRECT_URL` point at the project's shared pooler (`aws-1-eu-central-1.pooler.supabase.com`) — **not** the direct `db.*.supabase.co` host, which is IPv6-only on this project's tier and unreachable from IPv4-only networks. `DATABASE_URL` uses the transaction-mode pooler (port 6543, app runtime); `DIRECT_URL` uses the session-mode pooler (port 5432, migrations). Interactive Prisma transactions use a longer `maxWait`/`timeout` (`src/server/db.ts`'s `TX_OPTS`) than the library defaults, since the pooler's network latency can exceed Prisma's 2s/5s defaults.
- **RLS**: `admin/prisma/rls-policies.sql` is applied and active — drivers get read-only access to their own `drivers`/`settlements` rows and read+mark-read access to their own `notifications`, all keyed on `auth.uid() = "authUserId"::uuid`. No INSERT/UPDATE/DELETE policy on `drivers`/`settlements` for the `authenticated` role, so all financial writes stay server-side (the admin backend connects as the table-owning role and bypasses RLS entirely).
- **Admin auth**: email + password via Supabase Auth. `src/app/login/page.tsx` calls `supabase.auth.signInWithPassword`; `src/proxy.ts` runs the standard Supabase SSR session-refresh pattern and gates all dashboard routes + `/api/admin/*`; `src/server/auth/current-admin.ts`'s `getCurrentAdmin()` resolves the signed-in `AdminUser` via `authUserId`.
- **Driver auth — phone + PIN, no SMS, via a synthetic email**: Supabase's Phone auth provider can't be enabled without configuring a real SMS provider (Twilio/etc.), even for password-only sign-in with pre-confirmed accounts — that's a hard conflict with this project's "no SMS" requirement. The workaround (`admin/src/lib/driver-auth-email.ts`, mirrored in `MyApp/src/lib/driver-auth-email.ts`): a driver's real Supabase Auth identity is a synthetic email deterministically derived from their phone (`driver-<digits>@drivers.tolo.internal`), created via the Admin API with `email_confirm: true`. The phone + PIN login UI is unchanged — the app just computes the synthetic email under the hood before calling `signInWithPassword`.
  - Also note: Supabase's `admin.updateUserById` enforces a 6-character minimum password policy that `admin.createUser` doesn't. Since driver PINs are intentionally short (4–12 digits), a PIN reset deletes and recreates the auth account rather than updating the password in place (`driver-service.ts`'s `updateDriver`, `seed.ts`'s `getOrCreateDriverAuthUser`).
- **Driver reads**: settlements and notifications go straight to Supabase from the Expo app (`use-settlements.ts`, `use-notifications.ts`), governed by RLS — no explicit `driverId` filter is needed since RLS already scopes every query to the caller's own rows. The dashboard's computed stats (Tolo recovery %, MFI months-paid) stay behind `/api/driver/dashboard` to reuse the tested finance-aggregation logic (`computeMfiSummary`/`getEffectiveConfig`) instead of duplicating it client-side — its auth check (`src/server/auth/driver-auth.ts`) validates the caller's Supabase access token via `supabase.auth.getUser(token)` and resolves the `Driver` row by `authUserId`.
- **Caching**: TanStack Query (`MyApp/src/lib/query-client.tsx`) wraps `_layout.tsx` with AsyncStorage persistence for stale-while-revalidate, cache-first screens.
- **Verified end-to-end**: admin login/logout, proxy-gated route protection, driver login (phone+PIN), driver dashboard via bearer token, driver history/notifications via direct RLS-scoped reads, notification mark-as-read mutation, and RLS actually blocking one driver's token from reading another driver's settlements.
- `supabase init` has run (`supabase/config.toml`). The Supabase CLI itself isn't a project dependency — install it separately (e.g. `npm install -g supabase` or platform binary) if you need it; a Windows-specific CLI package was tried as a devDependency earlier but removed since it broke `npm install` on Linux (Netlify, CI, etc.) with `EBADPLATFORM`.

## Deployment

Not deployed as part of this build. To deploy:

- **Database**: already Supabase-hosted — reuse the same project or create a separate production one.
- **`admin/`**: deploys cleanly to Vercel (or any Node host) as-is. Set `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` as environment variables. Run `npx prisma migrate deploy` and apply `prisma/rls-policies.sql` against production before first boot, then run the seed script once (edit it first — see the caution below) or create drivers via the admin UI directly.
- **`MyApp/`**: set `expo.extra.apiBaseUrl` to your deployed `admin` URL, then build with [EAS Build](https://docs.expo.dev/build/introduction/) for iOS/Android, or `npx expo export --platform web` for a static web build.

## Deferred (explicitly out of scope for this build)

- **Automated earnings import** from the delivery platform — earnings are entered manually by an admin per period.
- **SMS/push delivery infrastructure** — notifications are in-app only; driver login uses phone + PIN (admin-set), not OTP, since there's no SMS provider wired up.
- **Real money movement** — the system records and displays the financing split; it does not execute any transfer, payout, or deduction. All settlement amounts are bookkeeping only.

## ⚠️ Before using this with real drivers

**1. Data protection & consent.** This build makes no decisions about legal basis for processing real driver financial/personal data, who gets database access in production, data retention/deletion policy, or how PINs get communicated to drivers securely. Confirm all of this against applicable Ethiopian data protection requirements before loading any real driver's information — even into a "staging" environment.

**2. Verify the financing terms against the real SACCo agreement.** The 70,000 Birr / 35% / fixed-installment / post-recovery-behavior logic is implemented exactly as specified in this project's requirements — but it has **not** been checked against an actual signed SACCo partnership agreement. In particular, confirm: whether the SACCo installment truly has no interest component, what happens to a driver's obligations if they exit or default mid-term, and that each driver's `saccoFinancedTotal` reflects their real contract amount. **The two demo drivers seeded by `prisma/seed.ts` use placeholder SACCo totals (60,000 / 90,000 Birr) — these are not real figures and must be replaced (or the demo drivers deleted) before any production use.**

## Notes on this build

- Node.js was not present on the target machine and was installed as part of this build (via winget). The project ran on native PostgreSQL 17 before migrating to Supabase; a `docker-compose.yml` for local Postgres is still present but unused now that the database lives on Supabase.
- The scaffolded dependencies turned out to be very recent major versions (Next.js 16, Prisma 7) with real breaking changes from what's commonly documented — notably Prisma 7 requires an explicit driver adapter (`@prisma/adapter-pg`) rather than a bare `DATABASE_URL`, and Next.js 16 renamed `middleware.ts` to `proxy.ts`. Both are accounted for in the code as it stands.
- Amharic strings in `MyApp/src/i18n/am.json` are a good-faith translation, not reviewed by a native speaker — have someone fluent check them before shipping to real drivers.
- The Expo web target requires CORS on the driver-facing API (`admin/src/proxy.ts` handles this); native iOS/Android builds aren't affected by CORS at all. It also needs a no-op storage adapter for the Supabase client during Expo Router's server-side render pass (`MyApp/src/lib/supabase.ts`) — AsyncStorage's web implementation touches `window`, which doesn't exist during SSR.
