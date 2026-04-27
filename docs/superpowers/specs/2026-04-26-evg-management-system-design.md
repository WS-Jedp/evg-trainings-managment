# EVG Training Management System — Design Spec
**Date:** 2026-04-26  
**Status:** Approved

---

## Context

EVG Training is a basketball performance academy that needs an internal admin tool to manage players, track daily attendance, and automate subscription payment reminders. The system is used exclusively by one Administrator. There is no player-facing portal.

The primary pain point is manual tracking: attendance is unrecorded, payment due dates are managed informally, and reminders to guardians are sent manually. This system eliminates that friction.

---

## Scope (MVP)

Four modules:
1. **Player Management** — CRUD with photo upload, guardian contact, training plan
2. **Attendance Control** — Check-in / Check-out with timestamps
3. **Payment Tracking** — Manual status updates + automated email reminders
4. **Analytics Dashboard** — Attendance heatmap, payment distribution, consistency metrics

Out of scope for MVP: WhatsApp Business API (slot prepared), payment gateway, player-facing portal.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Styles | Tailwind CSS (dark mode, responsive) |
| Database | PostgreSQL via Supabase |
| ORM | Prisma |
| Auth | Supabase Auth (email + password) |
| Storage | Supabase Storage (player photos) |
| Email | Resend + React Email |
| Automation | Vercel Cron Jobs |
| Deployment | Vercel |

---

## Architecture

### Pattern: Hybrid RSC

- **Server Components** for all data reads (player lists, dashboards, attendance views)
- **Server Actions** for all mutations (create player, check-in, mark payment, check-out)
- **API Routes** only for Cron Job endpoints (`/api/cron/reminders`, `/api/cron/overdue`)

**Security rule:** Every Server Action must call `createServerClient` and validate the active Supabase session as the **first step** before any database read or write. An invalid or missing session must throw an error immediately — never proceed to the database.

### Directory Structure

```
evg-trainings-managment/
├── app/
│   ├── (auth)/
│   │   └── login/              → Login page
│   ├── (dashboard)/
│   │   ├── layout.tsx          → Protected layout (Supabase session check)
│   │   ├── page.tsx            → Mobile home: quick actions
│   │   ├── players/            → Player CRUD
│   │   ├── players/[id]/       → Player profile + history
│   │   ├── attendance/         → Today's session view
│   │   ├── payments/           → Payment status management
│   │   └── analytics/          → Recharts dashboards
│   └── api/
│       ├── upload/             → Photo upload (validates session, uses service role key)
│       └── cron/
│           ├── reminders/      → T-1 reminder cron
│           └── overdue/        → T+3 overdue cron
├── lib/
│   ├── supabase/               → Server + client Supabase instances
│   ├── prisma.ts               → Prisma singleton
│   └── notifications.ts        → sendNotification(player, type) — swap impl for WhatsApp later
├── prisma/
│   └── schema.prisma
└── components/
    └── ui/                     → EVG-branded reusable components
```

### Auth Flow

`(dashboard)/layout.tsx` calls `createServerClient` on every request. If no valid Supabase session, redirects to `/login`. Login page calls Supabase Auth → on success, session cookie is set → redirect to `/`.

### Supabase Key Usage

- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: used in client components and Server Components acting on behalf of the authenticated admin session.
- `SUPABASE_SERVICE_ROLE_KEY`: used **exclusively** in Cron Job API routes (`/api/cron/*`), which run without a user session context. Must **never** be used in Server Actions or client-side code.

---

## Data Model

```prisma
model Player {
  id                String          @id @default(cuid())
  firstName         String
  lastName          String
  age               Int
  height            Float?
  photoUrl          String?         // Supabase Storage bucket "players" (private, signed URLs)

  eps               String
  phone             String
  email             String          // Player's own email

  // Guardian (required when age < 18; guardianName enforced in form validation)
  guardianName      String?
  guardianPhone     String?         // Optional for adults (age >= 18); future WhatsApp destination
  guardianEmail     String          // Current MVP email destination
                                    // For age >= 18 with no guardian, copy player.email here

  // Training plan
  weeklySessions    Int             // Allowed values: 3 or 5 — enforce in form + DB check constraint

  // Subscription
  subscriptionStart DateTime
  subscriptionEnd   DateTime        // Stored as midnight UTC on the due date
                                    // Calculated with date-fns addMonths (clamps to end of month)
                                    // e.g. Jan 31 → Feb 28; Mar 31 → Apr 30
  payStatus         PayStatus       @default(PENDIENTE)
  lastReminderSentAt DateTime?      // Set when T-1 reminder is sent; reset on new cycle
  lastOverdueSentAt  DateTime?      // Set when T+3 overdue email is sent; reset on new cycle

  attendances       Attendance[]
  paymentHistory    PaymentRecord[]

  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt

  @@index([subscriptionEnd])        // Required for efficient Cron Job queries
  @@index([payStatus])
}

model Attendance {
  id        String    @id @default(cuid())
  playerId  String
  player    Player    @relation(fields: [playerId], references: [id], onDelete: Cascade)
  checkIn   DateTime  @default(now())   // Stored as UTC timestamp; used as date proxy
  checkOut  DateTime?                   // null = undefined; excluded from session duration metrics

  @@index([checkIn])                // Required for "today's session" and weekly analytics queries
}

model PaymentRecord {
  id        String   @id @default(cuid())
  playerId  String
  player    Player   @relation(fields: [playerId], references: [id], onDelete: Cascade)
  paidAt    DateTime @default(now())
  period    String   // Format: "YYYY-MM" (e.g. "2026-04") — enforced in Server Action before insert

  @@unique([playerId, period])      // Prevents duplicate records for the same player + month
}

enum PayStatus { PAGADO PENDIENTE VENCIDO }
```

### Subscription Date Arithmetic

Use `date-fns addMonths` for all date calculations:
- `subscriptionEnd = addMonths(subscriptionStart, 1)`
- If the resulting date is invalid (e.g., Feb 30), `date-fns` automatically clamps to the last valid day (Feb 28/29).
- All `subscriptionEnd` values are stored at **midnight UTC** (00:00:00.000Z) for consistent Cron Job comparisons.

### Payment Cycle State Machine

When Admin marks a player as PAGADO:
1. Set `payStatus → PAGADO`
2. Set `subscriptionEnd = addMonths(subscriptionEnd, 1)` (stored at midnight UTC)
3. Create `PaymentRecord` for current period (`YYYY-MM`)
4. Reset `lastReminderSentAt = null`
5. Reset `lastOverdueSentAt = null`

The next Cron run will naturally re-evaluate the new `subscriptionEnd`.

### Guardian Rule

If `age < 18`: `guardianName` is required (enforced in the New Player form with client-side and Server Action validation). For players with `age >= 18` who have no guardian, the `guardianEmail` field should default to `player.email` so notification logic can always send to `guardianEmail` without branching.

---

## Pages & UI Flows

### Brand
- Background: `#000000`
- Accent: `#FF8C00`
- Headers: Varsity font
- Fully responsive, mobile-first

### `/login`
Email + password form. Supabase Auth signIn. Error state shown inline.

### `/` — Mobile Home (Quick Actions)
Three prominent action buttons:
- **[+] Registrar Entrada** → Search modal → click player → check-in with timestamp
- **[-] Registrar Salida** → List of players with active check-in → click → check-out
- **🔔 Pagos Pendientes** → Redirect to `/payments?filter=pendiente`

Below buttons: live list of players currently in session (checkIn today, no checkOut).

**Check-in search:** Full-text search by `firstName` and `lastName` (combined). Server-side query with `ILIKE`. Before creating the Attendance record, verify no open check-in exists today (`WHERE playerId = ? AND checkIn::date = today AND checkOut IS NULL`). If a duplicate is detected, show an error: "Este jugador ya está en sesión."

**Check-out:** Lists only players with an open check-in today (same query). Selecting a player sets `checkOut = now()`.

### `/players`
Searchable table. "Nuevo Jugador" opens full form:
- Personal: firstName, lastName, age, height (optional), eps, phone, email
- Guardian: guardianName (required if age < 18), guardianPhone, guardianEmail
- Plan: weeklySessions (select: 3 or 5)
- Subscription: subscriptionStart (date picker); `subscriptionEnd` is calculated automatically on save

Row actions: view profile, edit, delete.

### `/players/[id]`
Player profile sections:
1. Photo, personal data, plan, subscription status
2. **Historial de Asistencia** — Table: date, checkIn time, checkOut time (or "—"), duration (only when checkOut defined)
3. **Historial de Pagos** — Table of `PaymentRecord` rows: period (e.g. "Abril 2026"), paidAt date. Sorted descending.
4. **Consistencia** — Percentage: `min(100, (attendances with checkOut / (weeklySessions × calendar weeks since subscriptionStart)) × 100)`. "Calendar weeks since subscriptionStart" = full ISO weeks elapsed from subscriptionStart to today. If weeks elapsed = 0, display "N/A" instead of a percentage.

### `/attendance`
Today's session list: player name, checkIn time, checkOut time (or "En sesión" badge), duration (only when checkOut defined). Date = Colombia local date (`America/Bogota` timezone) used to define "today."

### `/payments`
Table with all players: name, payStatus badge (green/yellow/red), subscriptionEnd date, "Marcar como Pagado" button. Filterable by payStatus.

On mark as paid: executes the Payment Cycle State Machine described in the Data Model section.

**Payment history per player** is accessible from the player profile at `/players/[id]`, not inline on this table. This page is for quick status overview only.

### `/analytics`

Four Recharts widgets:

1. **Heatmap** — attendance count by day-of-week × hour slot. Counts only `Attendance` rows where `checkOut IS NOT NULL`. X-axis: hours (6am–10pm). Y-axis: Mon–Sun.

2. **Pie chart** — PAGADO / PENDIENTE / VENCIDO player counts for the **current calendar month** (based on `subscriptionEnd` month).

3. **Bar chart** — Total check-ins per week for the last 8 ISO weeks. Counts ALL `Attendance` rows regardless of `checkOut` (every check-in counts as a visit).

4. **Consistency table** — Per player: name, weeklySessions plan, sessions attended (with checkOut defined), expected sessions (`weeklySessions × weeks active`), consistency percentage. Sorted by consistency ascending (worst first).

---

## Notification System

### Provider
**Resend** with React Email templates. Free tier: 3,000 emails/month. Sender address configured via `RESEND_FROM_EMAIL`.

### `lib/notifications.ts`
```ts
export async function sendNotification(
  player: Player,
  type: 'reminder' | 'overdue'
): Promise<void>
```
Sends to `player.guardianEmail` (which for adult players without a guardian defaults to `player.email`).

Today: sends email via Resend. When WhatsApp is ready: swap implementation, same interface.

### Cron Jobs (`vercel.json`)
```json
{
  "crons": [
    { "path": "/api/cron/reminders", "schedule": "0 14 * * *" },
    { "path": "/api/cron/overdue",   "schedule": "5 14 * * *" }
  ]
}
```
*(14:00 UTC = 9:00 AM Colombia time. Overdue runs 5 minutes after reminders to avoid race conditions.)*

Both endpoints are protected: request must include `Authorization: Bearer CRON_SECRET`. Missing or invalid header returns HTTP 401 immediately.

### T-1 Reminder (`/api/cron/reminders`)

```sql
-- Players whose subscription expires tomorrow (midnight UTC boundaries)
WHERE subscriptionEnd >= start_of_tomorrow_UTC
  AND subscriptionEnd <  start_of_day_after_tomorrow_UTC
  AND payStatus != 'PAGADO'
  AND (lastReminderSentAt IS NULL OR lastReminderSentAt < start_of_today_UTC)
```

Action: `sendNotification(player, 'reminder')`, then set `lastReminderSentAt = now()`.

The `lastReminderSentAt` guard prevents duplicate emails on Vercel retries.

### T+3 Overdue (`/api/cron/overdue`)

```sql
-- Players whose subscription expired before the start of 3 days ago (midnight UTC)
WHERE subscriptionEnd < start_of_day(today - 3 days)_UTC
  AND payStatus != 'PAGADO'
  AND (lastOverdueSentAt IS NULL OR lastOverdueSentAt < start_of_today_UTC)
```

Action: set `payStatus → VENCIDO`, then `sendNotification(player, 'overdue')`, then set `lastOverdueSentAt = now()`.

The `lastOverdueSentAt` guard prevents duplicate emails on Vercel retries.

### Email Templates (Spanish)

**Reminder:**
> "Hola [Nombre Acudiente], te saludamos de EVG Training 🏀. Te recordamos que el plan de entrenamiento de [Nombre Jugador] vence el día de mañana. ¡Sigamos trabajando por su alto rendimiento!"

**Overdue:**
> "Hola [Nombre Acudiente], notamos que el pago de la suscripción de [Nombre Jugador] en EVG Training presenta un retraso de al menos 3 días. Por favor, confímanos el pago para mantener su registro al día. ¡Gracias!"

---

## Supabase Storage

- Bucket name: `players`
- Bucket access: **private** (not public)
- Photo display: generate signed URLs via Supabase Storage API with a short TTL (e.g., 1 hour) when rendering player photos
- Upload: handled via a dedicated `/api/upload` API route that (1) validates the Supabase session cookie, then (2) uses `SUPABASE_SERVICE_ROLE_KEY` to write to Storage. Server Actions call this route — the service role key is never imported into Server Action modules.

---

## Environment Variables

```
# Database
DATABASE_URL                    → Supabase connection string (Prisma pooler)
DIRECT_URL                      → Supabase direct URL (Prisma migrations)

# Supabase
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY       → Used ONLY in /api/cron/* and /api/upload routes

# Email
RESEND_API_KEY
RESEND_FROM_EMAIL               → Verified sender, e.g. "EVG Training <noreply@evgtraining.com>"

# Security
CRON_SECRET                     → Bearer token required by all /api/cron/* endpoints

# App
NEXT_PUBLIC_APP_URL             → Stable base URL for email template links (e.g. https://evg.vercel.app)
```

---

## Verification Checklist

1. **Auth** — Login/logout works; unauthenticated requests to any dashboard route redirect to `/login`; calling a Server Action without a session returns an error before touching the database.

2. **Cron security** — `GET /api/cron/reminders` without the `CRON_SECRET` header returns HTTP 401 and executes no queries.

3. **Player CRUD** — Create player (adult, age ≥ 18): form completes without guardianName and without guardianPhone; `guardianEmail` defaults to player email. Create player (minor, age < 18): form blocks submission without guardianName. `subscriptionEnd` = `addMonths(subscriptionStart, 1)` stored at midnight UTC. Jan 31 start → Feb 28 end.

4. **Attendance — check-in** — Check-in a player; they appear in "en sesión." Attempt to check-in the same player again → error "ya está en sesión."

5. **Attendance — check-out** — Check-out the player; duration appears on `/attendance`. Duration is absent for records with null checkOut.

6. **Payment — mark as PAGADO** — Mark player as PAGADO: `payStatus = PAGADO`, `subscriptionEnd` advances one month (midnight UTC), `PaymentRecord` created with correct `period`, `lastReminderSentAt` and `lastOverdueSentAt` reset to null.

7. **Payment — VENCIDO state** — Manually invoke `GET /api/cron/overdue` (with CRON_SECRET) for a player whose `subscriptionEnd < 3 days ago` and `payStatus = PENDIENTE`. Verify: `payStatus → VENCIDO`, overdue email received at `guardianEmail`, `lastOverdueSentAt` set. Invoking again same day sends no duplicate email.

8. **T-1 Reminder** — Manually invoke `GET /api/cron/reminders` for a player with `subscriptionEnd = tomorrow`. Verify: email arrives at `guardianEmail`, `lastReminderSentAt` set. Invoking again same day sends no duplicate.

9. **Analytics — heatmap** — Heatmap counts only Attendance rows with `checkOut IS NOT NULL`. A check-in with no check-out does not appear.

10. **Analytics — bar chart** — Bar chart counts ALL check-ins (including those with null checkOut). Verify counts match raw Attendance data.

11. **Analytics — consistency** — Verify consistency % = `min(100, (attendances with checkOut) / (weeklySessions × ISO weeks since subscriptionStart) × 100)`. Player in their first week shows "N/A". Player with extra sessions shows max 100%.

12. **Duplicate PaymentRecord** — Attempting to mark the same player as paid twice in the same period results in a unique constraint error; no second `PaymentRecord` is created.

---

## Roadmap (4 Weeks)

| Week | Deliverable |
|---|---|
| 1 | Next.js setup, Prisma + Supabase, auth, player CRUD |
| 2 | Attendance (check-in/out), mobile home quick actions |
| 3 | Payment tracking, email notifications, Cron Jobs |
| 4 | Analytics dashboards, Vercel deploy, end-to-end testing |
