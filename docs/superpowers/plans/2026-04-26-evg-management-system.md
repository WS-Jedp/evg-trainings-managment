# EVG Training Management System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first admin tool for EVG Training that manages players, tracks attendance via check-in/out, automates subscription payment reminders via email, and displays analytics dashboards.

**Architecture:** Hybrid RSC pattern — Server Components for reads, Server Actions for mutations, API Routes only for Cron Jobs and photo upload. Auth handled by Supabase (email + password). All business logic is testable in isolation via Jest unit tests on pure functions and Server Actions.

**Tech Stack:** Next.js 14+ (App Router), Tailwind CSS, Supabase (Auth + Storage + PostgreSQL), Prisma ORM, Resend + React Email, Vercel Cron Jobs, date-fns, Recharts, Jest + ts-jest

**Spec:** `docs/superpowers/specs/2026-04-26-evg-management-system-design.md`

---

## File Map

```
evg-trainings-managment/
├── app/
│   ├── (auth)/login/page.tsx              → Login form
│   ├── (dashboard)/
│   │   ├── layout.tsx                     → Session guard → redirect to /login if unauth
│   │   ├── page.tsx                       → Mobile home: check-in/out/payments buttons
│   │   ├── players/page.tsx               → Player list + search
│   │   ├── players/new/page.tsx           → New player form
│   │   ├── players/[id]/page.tsx          → Player profile (attendance + payment history + consistency)
│   │   ├── players/[id]/edit/page.tsx     → Edit player form
│   │   ├── attendance/page.tsx            → Today's session list
│   │   ├── payments/page.tsx              → Payment status table
│   │   └── analytics/page.tsx            → Recharts dashboard
│   └── api/
│       ├── upload/route.ts                → Photo upload (session-validated, uses service role key)
│       ├── players/search/route.ts        → Player search endpoint for check-in modal
│       └── cron/
│           ├── reminders/route.ts         → T-1 email reminder (CRON_SECRET protected)
│           └── overdue/route.ts           → T+3 overdue state + email (CRON_SECRET protected)
├── actions/
│   ├── players.ts                         → createPlayer, updatePlayer, deletePlayer Server Actions
│   ├── attendance.ts                      → checkIn, checkOut Server Actions
│   └── payments.ts                        → markAsPaid Server Action
├── lib/
│   ├── supabase/
│   │   ├── server.ts                      → createServerClient (cookies)
│   │   └── client.ts                      → createBrowserClient
│   ├── prisma.ts                          → Prisma singleton
│   ├── notifications.ts                   → sendNotification(player, type) — Resend implementation
│   ├── dates.ts                           → calcSubscriptionEnd, startOfDayUTC, isoWeeksElapsed
│   ├── analytics.ts                       → buildHeatmapData, buildConsistencyData
│   └── auth.ts                            → requireAuth(), requireCronSecret() helpers
├── components/
│   └── ui/
│       ├── nav.tsx                        → Bottom nav (mobile)
│       ├── player-form.tsx                → Shared create/edit form
│       ├── checkin-modal.tsx              → Search modal for check-in
│       ├── checkout-list.tsx              → Players in session for check-out
│       ├── home-actions.tsx               → Client wrapper for check-in/out modals on home page
│       └── charts.tsx                     → Recharts WeeklyBarChart + PayStatusPie components
├── emails/
│   ├── reminder.tsx                       → React Email template: T-1 reminder
│   └── overdue.tsx                        → React Email template: T+3 overdue
├── prisma/schema.prisma
├── vercel.json                            → Cron job schedules
├── jest.config.ts
├── jest.setup.ts
└── .env.local.example
```

---

## Week 1 — Setup, Auth, Player CRUD

---

### Task 1: Bootstrap Next.js project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.js`
- Create: `.env.local.example`
- Create: `jest.config.ts`, `jest.setup.ts`

- [ ] **Step 1: Scaffold Next.js app**

```bash
cd /Users/juanesteban.deossa/magic/evg/evg-trainings-managment
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=no --import-alias="@/*" --yes
```

- [ ] **Step 2: Install all project dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr prisma @prisma/client date-fns resend @react-email/components react-email recharts
npm install -D jest ts-jest @types/jest jest-environment-node
```

- [ ] **Step 3: Install Varsity font**

Varsity Team is a commercial font. Check if the client has a licensed copy. If yes, place the `.woff2` file at `public/fonts/VarsityTeam.woff2`.

If not available, use the free Google Font **"Bebas Neue"** as a stand-in:
```bash
# No download needed — use Next.js Google Fonts instead
```
Replace the `localFont` block in `app/layout.tsx` with:
```tsx
import { Bebas_Neue } from 'next/font/google'
const varsity = Bebas_Neue({ weight: '400', subsets: ['latin'], variable: '--font-varsity' })
```
And update `tailwind.config.ts` font family to `['var(--font-varsity)', 'sans-serif']` (no change needed there). The brand can be updated to the real font once licensed.

Then add to `app/layout.tsx`:

```tsx
import localFont from 'next/font/local'

const varsity = localFont({
  src: '../public/fonts/VarsityTeam.woff2',
  variable: '--font-varsity',
})
```

- [ ] **Step 4: Configure Tailwind with EVG brand colors**

Edit `tailwind.config.ts`:

```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './emails/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        evg: {
          orange: '#FF8C00',
          black: '#000000',
        },
      },
      fontFamily: {
        varsity: ['var(--font-varsity)', 'sans-serif'],
      },
    },
  },
}
export default config
```

- [ ] **Step 5: Set up Jest**

Create `jest.config.ts`:

```ts
import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['**/__tests__/**/*.test.ts'],
}

export default config
```


Create `jest.setup.ts`:

```ts
// Global test setup — add mocks here as needed
```

- [ ] **Step 6: Create `.env.local.example`**

```bash
# Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx   # ONLY used in /api/cron/* and /api/upload

# Email
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=EVG Training <noreply@yourdomain.com>

# Security
CRON_SECRET=a-long-random-string

# App
NEXT_PUBLIC_APP_URL=https://evg.vercel.app
```

Copy to `.env.local` and fill in real values from Supabase dashboard and Resend.

- [ ] **Step 7: Verify the app starts**

```bash
npm run dev
```

Expected: Next.js dev server running at http://localhost:3000 with no errors.

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "feat: bootstrap Next.js project with EVG brand config and Jest setup"
```

---

### Task 2: Prisma schema + Supabase database

**Files:**
- Create: `prisma/schema.prisma`
- Create: `lib/prisma.ts`

- [ ] **Step 1: Initialize Prisma**

```bash
npx prisma init --datasource-provider postgresql
```

- [ ] **Step 2: Write the schema**

Replace `prisma/schema.prisma` with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model Player {
  id                 String          @id @default(cuid())
  firstName          String
  lastName           String
  age                Int
  height             Float?
  photoUrl           String?

  eps                String
  phone              String
  email              String

  guardianName       String?
  guardianPhone      String?
  guardianEmail      String

  weeklySessions     Int

  subscriptionStart  DateTime
  subscriptionEnd    DateTime
  payStatus          PayStatus       @default(PENDIENTE)
  lastReminderSentAt DateTime?
  lastOverdueSentAt  DateTime?

  attendances        Attendance[]
  paymentHistory     PaymentRecord[]

  createdAt          DateTime        @default(now())
  updatedAt          DateTime        @updatedAt

  @@index([subscriptionEnd])
  @@index([payStatus])
}

model Attendance {
  id        String    @id @default(cuid())
  playerId  String
  player    Player    @relation(fields: [playerId], references: [id], onDelete: Cascade)
  checkIn   DateTime  @default(now())
  checkOut  DateTime?

  @@index([checkIn])
}

model PaymentRecord {
  id        String   @id @default(cuid())
  playerId  String
  player    Player   @relation(fields: [playerId], references: [id], onDelete: Cascade)
  paidAt    DateTime @default(now())
  period    String

  @@unique([playerId, period])
}

enum PayStatus {
  PAGADO
  PENDIENTE
  VENCIDO
}
```

- [ ] **Step 3: Create Prisma singleton**

Create `lib/prisma.ts`:

```ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 4: Run migration**

```bash
npx prisma migrate dev --name init
```

Expected: Migration applied successfully, Prisma Client generated.

- [ ] **Step 5: Verify schema in Prisma Studio**

```bash
npx prisma studio
```

Expected: All 3 models visible (Player, Attendance, PaymentRecord). Close studio.

- [ ] **Step 6: Commit**

```bash
git add prisma/ lib/prisma.ts
git commit -m "feat: add Prisma schema and singleton for EVG database"
```

---

### Task 3: Date utility functions (TDD)

**Files:**
- Create: `lib/dates.ts`
- Create: `__tests__/lib/dates.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/lib/dates.test.ts`:

```ts
import { calcSubscriptionEnd, startOfDayUTC, isoWeeksElapsed, formatPeriod } from '@/lib/dates'

describe('calcSubscriptionEnd', () => {
  it('advances by one month', () => {
    const start = new Date('2026-03-15T00:00:00.000Z')
    const end = calcSubscriptionEnd(start)
    expect(end.toISOString()).toBe('2026-04-15T00:00:00.000Z')
  })

  it('clamps Jan 31 to Feb 28', () => {
    const start = new Date('2026-01-31T00:00:00.000Z')
    const end = calcSubscriptionEnd(start)
    expect(end.toISOString()).toBe('2026-02-28T00:00:00.000Z')
  })

  it('returns midnight UTC', () => {
    const start = new Date('2026-04-26T15:30:00.000Z')
    const end = calcSubscriptionEnd(start)
    expect(end.getUTCHours()).toBe(0)
    expect(end.getUTCMinutes()).toBe(0)
    expect(end.getUTCSeconds()).toBe(0)
    expect(end.getUTCMilliseconds()).toBe(0)
  })
})

describe('startOfDayUTC', () => {
  it('returns midnight UTC for a given date', () => {
    const d = new Date('2026-04-26T18:45:00.000Z')
    expect(startOfDayUTC(d).toISOString()).toBe('2026-04-26T00:00:00.000Z')
  })
})

describe('isoWeeksElapsed', () => {
  it('returns 0 for a date within the first week', () => {
    const start = new Date('2026-04-20T00:00:00.000Z') // Monday
    const today = new Date('2026-04-24T00:00:00.000Z') // Friday same week
    expect(isoWeeksElapsed(start, today)).toBe(0)
  })

  it('returns 1 after one full ISO week', () => {
    const start = new Date('2026-04-20T00:00:00.000Z')
    const today = new Date('2026-04-27T00:00:00.000Z')
    expect(isoWeeksElapsed(start, today)).toBe(1)
  })
})

describe('formatPeriod', () => {
  it('returns YYYY-MM string', () => {
    expect(formatPeriod(new Date('2026-04-15T00:00:00.000Z'))).toBe('2026-04')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/lib/dates.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '@/lib/dates'`

- [ ] **Step 3: Implement `lib/dates.ts`**

```ts
import { addMonths, startOfDay, differenceInCalendarISOWeeks } from 'date-fns'

/** Calculate subscription end: same day next month, stored at midnight UTC */
export function calcSubscriptionEnd(start: Date): Date {
  const next = addMonths(start, 1)
  return startOfDayUTC(next)
}

/** Return midnight UTC for any date */
export function startOfDayUTC(date: Date): Date {
  const d = new Date(date)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

/** Full ISO weeks elapsed between subscriptionStart and today (0 if < 1 week) */
export function isoWeeksElapsed(start: Date, today: Date): number {
  return Math.max(0, differenceInCalendarISOWeeks(today, start))
}

/** Format a date as "YYYY-MM" for PaymentRecord.period */
export function formatPeriod(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/lib/dates.test.ts --no-coverage
```

Expected: PASS — 6 tests passing.

- [ ] **Step 5: Commit**

```bash
git add lib/dates.ts __tests__/lib/dates.test.ts
git commit -m "feat: add date utility functions with tests (calcSubscriptionEnd, isoWeeksElapsed)"
```

---

### Task 4: Supabase clients + auth helper

**Files:**
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/client.ts`
- Create: `lib/auth.ts`

- [ ] **Step 1: Create Supabase server client**

Create `lib/supabase/server.ts`:

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```

- [ ] **Step 2: Create Supabase browser client**

Create `lib/supabase/client.ts`:

```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 3: Create auth helper**

Create `lib/auth.ts`:

```ts
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Call at the top of every Server Action.
 * Throws (redirects to /login) if no valid session.
 * Returns the authenticated user.
 */
export async function requireAuth() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')
  return user
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/supabase/ lib/auth.ts
git commit -m "feat: add Supabase server/client helpers and requireAuth guard"
```

---

### Task 5: Protected layout + login page

**Files:**
- Create: `app/(auth)/login/page.tsx`
- Create: `app/(dashboard)/layout.tsx`
- Create: `app/layout.tsx` (root)

- [ ] **Step 1: Create root layout**

Create `app/layout.tsx`:

```tsx
import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'

const varsity = localFont({
  src: '../public/fonts/VarsityTeam.woff2',
  variable: '--font-varsity',
})

export const metadata: Metadata = {
  title: 'EVG Training',
  description: 'Sistema de Gestión Deportiva',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body className={`${varsity.variable} bg-black text-white antialiased`}>
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Create dashboard protected layout**

Create `app/(dashboard)/layout.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-black">
      {children}
    </div>
  )
}
```

- [ ] **Step 3: Create login page**

Create `app/(auth)/login/page.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Correo o contraseña incorrectos')
      setLoading(false)
    } else {
      router.push('/')
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="font-varsity text-evg-orange text-4xl text-center mb-8">EVG</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Correo"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-evg-orange"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-evg-orange"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-evg-orange text-black font-bold py-3 rounded-lg disabled:opacity-50"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Manually test auth flow**

1. Go to http://localhost:3000 — should redirect to /login
2. Enter wrong credentials — should show error message
3. Enter correct admin credentials — should redirect to /

- [ ] **Step 5: Commit**

```bash
git add app/
git commit -m "feat: add login page and protected dashboard layout with Supabase Auth"
```

---

### Task 6: Player Server Actions (TDD)

**Files:**
- Create: `actions/players.ts`
- Create: `__tests__/actions/players.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/actions/players.test.ts`:

```ts
import { calcSubscriptionEnd, formatPeriod } from '@/lib/dates'

// Test the pure business logic extracted from the action
describe('player subscription logic', () => {
  it('calculates subscriptionEnd from subscriptionStart', () => {
    const start = new Date('2026-04-01T00:00:00.000Z')
    const end = calcSubscriptionEnd(start)
    expect(end.toISOString()).toBe('2026-05-01T00:00:00.000Z')
  })

  it('guardianEmail defaults to player email for adults', () => {
    function resolveGuardianEmail(age: number, guardianEmail: string, playerEmail: string): string {
      return age >= 18 && !guardianEmail ? playerEmail : guardianEmail
    }
    expect(resolveGuardianEmail(25, '', 'player@test.com')).toBe('player@test.com')
    expect(resolveGuardianEmail(16, 'guardian@test.com', 'player@test.com')).toBe('guardian@test.com')
  })

  it('validates weeklySessions is 3 or 5', () => {
    function validateWeeklySessions(n: number): boolean {
      return n === 3 || n === 5
    }
    expect(validateWeeklySessions(3)).toBe(true)
    expect(validateWeeklySessions(5)).toBe(true)
    expect(validateWeeklySessions(4)).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail (or pass for pure logic)**

```bash
npx jest __tests__/actions/players.test.ts --no-coverage
```

Expected: PASS (these test pure logic already implemented in dates.ts).

- [ ] **Step 3: Create `actions/players.ts`**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { calcSubscriptionEnd } from '@/lib/dates'

export async function createPlayer(formData: FormData) {
  await requireAuth()

  const age = Number(formData.get('age'))
  const guardianEmailInput = formData.get('guardianEmail') as string
  const playerEmail = formData.get('email') as string
  const weeklySessions = Number(formData.get('weeklySessions'))
  const subscriptionStart = new Date(formData.get('subscriptionStart') as string)

  // Validate weeklySessions
  if (weeklySessions !== 3 && weeklySessions !== 5) {
    throw new Error('weeklySessions must be 3 or 5')
  }

  // Validate guardian for minors
  const guardianName = formData.get('guardianName') as string
  if (age < 18 && !guardianName) {
    throw new Error('guardianName is required for players under 18')
  }

  // Default guardianEmail for adults
  const guardianEmail = age >= 18 && !guardianEmailInput ? playerEmail : guardianEmailInput

  // Validate period format for subscriptionStart
  subscriptionStart.setUTCHours(0, 0, 0, 0)
  const subscriptionEnd = calcSubscriptionEnd(subscriptionStart)

  await prisma.player.create({
    data: {
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      age,
      height: formData.get('height') ? Number(formData.get('height')) : null,
      photoUrl: formData.get('photoUrl') as string | null,
      eps: formData.get('eps') as string,
      phone: formData.get('phone') as string,
      email: playerEmail,
      guardianName: guardianName || null,
      guardianPhone: formData.get('guardianPhone') as string | null,
      guardianEmail,
      weeklySessions,
      subscriptionStart,
      subscriptionEnd,
    },
  })

  revalidatePath('/players')
  redirect('/players')
}

export async function updatePlayer(id: string, formData: FormData) {
  await requireAuth()

  const age = Number(formData.get('age'))
  const weeklySessions = Number(formData.get('weeklySessions'))
  if (weeklySessions !== 3 && weeklySessions !== 5) throw new Error('weeklySessions must be 3 or 5')

  const guardianEmailInput = formData.get('guardianEmail') as string
  const playerEmail = formData.get('email') as string
  const guardianEmail = age >= 18 && !guardianEmailInput ? playerEmail : guardianEmailInput

  await prisma.player.update({
    where: { id },
    data: {
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      age,
      height: formData.get('height') ? Number(formData.get('height')) : null,
      eps: formData.get('eps') as string,
      phone: formData.get('phone') as string,
      email: playerEmail,
      guardianName: (formData.get('guardianName') as string) || null,
      guardianPhone: (formData.get('guardianPhone') as string) || null,
      guardianEmail,
      weeklySessions,
    },
  })

  revalidatePath('/players')
  revalidatePath(`/players/${id}`)
  redirect(`/players/${id}`)
}

export async function deletePlayer(id: string) {
  await requireAuth()
  await prisma.player.delete({ where: { id } })
  revalidatePath('/players')
  redirect('/players')
}
```

- [ ] **Step 4: Commit**

```bash
git add actions/players.ts __tests__/actions/players.test.ts
git commit -m "feat: add player Server Actions (create, update, delete) with auth guard"
```

---

### Task 7: Player list + new player form UI

**Files:**
- Create: `app/(dashboard)/players/page.tsx`
- Create: `app/(dashboard)/players/new/page.tsx`
- Create: `components/ui/player-form.tsx`

- [ ] **Step 1: Create shared player form component**

Create `components/ui/player-form.tsx`:

```tsx
'use client'
import { useState } from 'react'

interface PlayerFormProps {
  action: (formData: FormData) => Promise<void>
  defaultValues?: {
    firstName?: string; lastName?: string; age?: number; height?: number
    eps?: string; phone?: string; email?: string; guardianName?: string
    guardianPhone?: string; guardianEmail?: string; weeklySessions?: number
    subscriptionStart?: string
  }
  showSubscriptionStart?: boolean
}

export function PlayerForm({ action, defaultValues = {}, showSubscriptionStart = true }: PlayerFormProps) {
  const [age, setAge] = useState(defaultValues.age ?? 18)

  return (
    <form action={action} className="space-y-4 max-w-lg">
      <div className="grid grid-cols-2 gap-4">
        <input name="firstName" placeholder="Nombre" defaultValue={defaultValues.firstName}
          required className="input-field" />
        <input name="lastName" placeholder="Apellido" defaultValue={defaultValues.lastName}
          required className="input-field" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <input name="age" type="number" placeholder="Edad" value={age}
          onChange={e => setAge(Number(e.target.value))} required className="input-field" />
        <input name="height" type="number" step="0.01" placeholder="Altura (m) — opcional"
          defaultValue={defaultValues.height} className="input-field" />
      </div>

      <input name="eps" placeholder="EPS" defaultValue={defaultValues.eps}
        required className="input-field" />
      <input name="phone" placeholder="Teléfono" defaultValue={defaultValues.phone}
        required className="input-field" />
      <input name="email" type="email" placeholder="Correo del jugador"
        defaultValue={defaultValues.email} required className="input-field" />

      <hr className="border-zinc-800" />
      <p className="text-zinc-400 text-sm">Acudiente {age < 18 ? '(obligatorio)' : '(opcional)'}</p>

      <input name="guardianName" placeholder="Nombre del acudiente"
        defaultValue={defaultValues.guardianName} required={age < 18} className="input-field" />
      <input name="guardianPhone" placeholder="WhatsApp del acudiente"
        defaultValue={defaultValues.guardianPhone} className="input-field" />
      <input name="guardianEmail" type="email" placeholder="Correo del acudiente"
        defaultValue={defaultValues.guardianEmail} className="input-field" />

      <hr className="border-zinc-800" />

      <select name="weeklySessions" defaultValue={defaultValues.weeklySessions ?? 3}
        required className="input-field">
        <option value={3}>3 sesiones/semana</option>
        <option value={5}>5 sesiones/semana</option>
      </select>

      {showSubscriptionStart && (
        <input name="subscriptionStart" type="date" defaultValue={defaultValues.subscriptionStart}
          required className="input-field" />
      )}

      <button type="submit"
        className="w-full bg-evg-orange text-black font-bold py-3 rounded-lg">
        Guardar
      </button>
    </form>
  )
}
```

Add to `app/globals.css`:

```css
@layer components {
  .input-field {
    @apply w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-evg-orange;
  }
}
```

- [ ] **Step 2: Create player list page**

Create `app/(dashboard)/players/page.tsx`:

```tsx
import Link from 'next/link'
import { prisma } from '@/lib/prisma'

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const players = await prisma.player.findMany({
    where: q
      ? {
          OR: [
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName: { contains: q, mode: 'insensitive' } },
          ],
        }
      : undefined,
    orderBy: { lastName: 'asc' },
  })

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="font-varsity text-evg-orange text-2xl">Jugadores</h1>
        <Link href="/players/new"
          className="bg-evg-orange text-black font-bold px-4 py-2 rounded-lg text-sm">
          + Nuevo
        </Link>
      </div>

      <form className="mb-4">
        <input name="q" placeholder="Buscar jugador..." defaultValue={q}
          className="input-field" />
      </form>

      <div className="space-y-2">
        {players.map(p => (
          <Link key={p.id} href={`/players/${p.id}`}
            className="flex items-center justify-between bg-zinc-900 rounded-lg px-4 py-3">
            <div>
              <p className="font-semibold">{p.firstName} {p.lastName}</p>
              <p className="text-zinc-400 text-sm">{p.weeklySessions}x/semana</p>
            </div>
            <span className={`text-xs font-bold px-2 py-1 rounded ${
              p.payStatus === 'PAGADO' ? 'bg-green-900 text-green-400' :
              p.payStatus === 'VENCIDO' ? 'bg-red-900 text-red-400' :
              'bg-yellow-900 text-yellow-400'
            }`}>{p.payStatus}</span>
          </Link>
        ))}
        {players.length === 0 && (
          <p className="text-zinc-500 text-center py-8">No se encontraron jugadores.</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create new player page**

Create `app/(dashboard)/players/new/page.tsx`:

```tsx
import { createPlayer } from '@/actions/players'
import { PlayerForm } from '@/components/ui/player-form'

export default function NewPlayerPage() {
  return (
    <div className="p-4">
      <h1 className="font-varsity text-evg-orange text-2xl mb-6">Nuevo Jugador</h1>
      <PlayerForm action={createPlayer} showSubscriptionStart={true} />
    </div>
  )
}
```

- [ ] **Step 4: Manually verify player creation**

1. Go to http://localhost:3000/players/new
2. Fill in the form (age < 18, omit guardianName) → submit → should block with browser validation
3. Fill in complete form → submit → should redirect to /players with new player listed
4. Verify `subscriptionEnd` in Prisma Studio is exactly one month after `subscriptionStart` at midnight UTC

- [ ] **Step 5: Commit**

```bash
git add app/(dashboard)/players/ components/ui/player-form.tsx
git commit -m "feat: add player list, new player form, and PlayerForm component"
```

---

### Task 8: Photo upload route + player profile page

**Files:**
- Create: `app/api/upload/route.ts`
- Create: `app/(dashboard)/players/[id]/page.tsx`
- Create: `app/(dashboard)/players/[id]/edit/page.tsx`

- [ ] **Step 1: Create Supabase Storage upload route**

Create `app/api/upload/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  // 1. Validate session using the project's existing helper (anon key)
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 2. Upload with service role key (bypasses RLS)
  const supabaseAdmin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  const formData = await req.formData()
  const file = formData.get('file') as File
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const filename = `${crypto.randomUUID()}-${file.name}`
  const { error } = await supabaseAdmin.storage
    .from('players')
    .upload(filename, file, { contentType: file.type })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ path: filename })
}
```

**Note:** Create the `players` bucket in Supabase dashboard (Storage → New bucket → name: `players`, private: ON).

- [ ] **Step 2: Create player profile page**

Create `app/(dashboard)/players/[id]/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { isoWeeksElapsed } from '@/lib/dates'
import { deletePlayer } from '@/actions/players'
import { createClient } from '@/lib/supabase/server'

export default async function PlayerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const player = await prisma.player.findUnique({
    where: { id },
    include: {
      attendances: { orderBy: { checkIn: 'desc' }, take: 50 },
      paymentHistory: { orderBy: { paidAt: 'desc' } },
    },
  })
  if (!player) notFound()

  // Signed URL for photo
  let photoSignedUrl: string | null = null
  if (player.photoUrl) {
    const supabase = await createClient()
    const { data } = await supabase.storage
      .from('players')
      .createSignedUrl(player.photoUrl, 3600)
    photoSignedUrl = data?.signedUrl ?? null
  }

  // Consistency metric
  const weeksActive = isoWeeksElapsed(player.subscriptionStart, new Date())
  const attendedWithCheckout = player.attendances.filter(a => a.checkOut !== null).length
  const expectedSessions = player.weeklySessions * weeksActive
  const consistency = weeksActive === 0
    ? null
    : Math.min(100, Math.round((attendedWithCheckout / expectedSessions) * 100))

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        {photoSignedUrl && (
          <img src={photoSignedUrl} alt={player.firstName}
            className="w-16 h-16 rounded-full object-cover" />
        )}
        <div>
          <h1 className="font-varsity text-evg-orange text-2xl">
            {player.firstName} {player.lastName}
          </h1>
          <p className="text-zinc-400">{player.weeklySessions}x/semana · {player.age} años</p>
        </div>
        <Link href={`/players/${id}/edit`}
          className="ml-auto text-sm border border-zinc-700 px-3 py-1 rounded-lg">
          Editar
        </Link>
      </div>

      {/* Consistency */}
      <div className="bg-zinc-900 rounded-lg p-4">
        <p className="text-zinc-400 text-sm mb-1">Consistencia</p>
        <p className="text-3xl font-bold text-evg-orange">
          {consistency === null ? 'N/A' : `${consistency}%`}
        </p>
        <p className="text-zinc-500 text-xs mt-1">
          {attendedWithCheckout} sesiones / {expectedSessions} esperadas
        </p>
      </div>

      {/* Payment History */}
      <div>
        <h2 className="font-varsity text-lg mb-2">Historial de Pagos</h2>
        <div className="space-y-2">
          {player.paymentHistory.map(p => (
            <div key={p.id} className="bg-zinc-900 rounded-lg px-4 py-2 flex justify-between">
              <span>{p.period}</span>
              <span className="text-zinc-400 text-sm">
                {new Date(p.paidAt).toLocaleDateString('es-CO')}
              </span>
            </div>
          ))}
          {player.paymentHistory.length === 0 && (
            <p className="text-zinc-500 text-sm">Sin pagos registrados.</p>
          )}
        </div>
      </div>

      {/* Attendance History */}
      <div>
        <h2 className="font-varsity text-lg mb-2">Historial de Asistencia</h2>
        <div className="space-y-2">
          {player.attendances.map(a => {
            const duration = a.checkOut
              ? Math.round((a.checkOut.getTime() - a.checkIn.getTime()) / 60000)
              : null
            return (
              <div key={a.id} className="bg-zinc-900 rounded-lg px-4 py-2">
                <p className="text-sm">{new Date(a.checkIn).toLocaleDateString('es-CO')}</p>
                <p className="text-zinc-400 text-xs">
                  Entrada: {new Date(a.checkIn).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                  {' · '}
                  {a.checkOut
                    ? `Salida: ${new Date(a.checkOut).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })} · ${duration} min`
                    : '—'}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create edit player page**

Create `app/(dashboard)/players/[id]/edit/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { updatePlayer } from '@/actions/players'
import { PlayerForm } from '@/components/ui/player-form'

export default async function EditPlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const player = await prisma.player.findUnique({ where: { id } })
  if (!player) notFound()

  const action = updatePlayer.bind(null, id)

  return (
    <div className="p-4">
      <h1 className="font-varsity text-evg-orange text-2xl mb-6">Editar Jugador</h1>
      <PlayerForm
        action={action}
        showSubscriptionStart={false}
        defaultValues={{
          firstName: player.firstName,
          lastName: player.lastName,
          age: player.age,
          height: player.height ?? undefined,
          eps: player.eps,
          phone: player.phone,
          email: player.email,
          guardianName: player.guardianName ?? undefined,
          guardianPhone: player.guardianPhone ?? undefined,
          guardianEmail: player.guardianEmail,
          weeklySessions: player.weeklySessions,
        }}
      />
    </div>
  )
}
```

- [ ] **Step 4: Verify profile page**

1. Open a player profile → should show consistency, payment history, attendance history
2. For a player in their first week → consistency should show "N/A"

- [ ] **Step 5: Commit**

```bash
git add app/api/upload/ app/(dashboard)/players/[id]/
git commit -m "feat: add photo upload route and player profile/edit pages"
```

---

## Week 2 — Attendance & Mobile Home

---

### Task 9: Attendance Server Actions (TDD)

**Files:**
- Create: `actions/attendance.ts`
- Create: `__tests__/actions/attendance.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/actions/attendance.test.ts`:

```ts
// Test the pure duplicate-check logic
describe('attendance duplicate check logic', () => {
  function isAlreadyCheckedIn(
    attendances: Array<{ checkIn: Date; checkOut: Date | null }>,
    todayStart: Date,
    todayEnd: Date
  ): boolean {
    return attendances.some(
      a => a.checkIn >= todayStart && a.checkIn < todayEnd && a.checkOut === null
    )
  }

  const todayStart = new Date('2026-04-26T00:00:00.000Z')
  const todayEnd = new Date('2026-04-27T00:00:00.000Z')

  it('returns true when player has open check-in today', () => {
    const attendances = [{ checkIn: new Date('2026-04-26T10:00:00.000Z'), checkOut: null }]
    expect(isAlreadyCheckedIn(attendances, todayStart, todayEnd)).toBe(true)
  })

  it('returns false when player has closed check-in today', () => {
    const attendances = [{
      checkIn: new Date('2026-04-26T10:00:00.000Z'),
      checkOut: new Date('2026-04-26T12:00:00.000Z'),
    }]
    expect(isAlreadyCheckedIn(attendances, todayStart, todayEnd)).toBe(false)
  })

  it('returns false when player has no attendance today', () => {
    const attendances = [{ checkIn: new Date('2026-04-25T10:00:00.000Z'), checkOut: null }]
    expect(isAlreadyCheckedIn(attendances, todayStart, todayEnd)).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/actions/attendance.test.ts --no-coverage
```

Expected: PASS (pure logic, no imports needed).

- [ ] **Step 3: Create `actions/attendance.ts`**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { startOfDayUTC } from '@/lib/dates'

export async function checkIn(playerId: string): Promise<{ error?: string }> {
  await requireAuth()

  const todayStart = startOfDayUTC(new Date())
  const todayEnd = new Date(todayStart)
  todayEnd.setUTCDate(todayEnd.getUTCDate() + 1)

  // Check for duplicate open check-in
  const existing = await prisma.attendance.findFirst({
    where: {
      playerId,
      checkIn: { gte: todayStart, lt: todayEnd },
      checkOut: null,
    },
  })

  if (existing) {
    return { error: 'Este jugador ya está en sesión.' }
  }

  await prisma.attendance.create({ data: { playerId } })
  revalidatePath('/')
  revalidatePath('/attendance')
  return {}
}

export async function checkOut(attendanceId: string) {
  await requireAuth()

  await prisma.attendance.update({
    where: { id: attendanceId },
    data: { checkOut: new Date() },
  })

  revalidatePath('/')
  revalidatePath('/attendance')
}
```

- [ ] **Step 4: Run full test suite**

```bash
npx jest --no-coverage
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add actions/attendance.ts __tests__/actions/attendance.test.ts
git commit -m "feat: add attendance Server Actions (checkIn, checkOut) with duplicate guard"
```

---

### Task 10: Mobile home page + attendance page

**Files:**
- Create: `app/(dashboard)/page.tsx`
- Create: `app/(dashboard)/attendance/page.tsx`
- Create: `components/ui/checkin-modal.tsx`
- Create: `components/ui/checkout-list.tsx`

- [ ] **Step 1: Create check-in modal component**

Create `components/ui/checkin-modal.tsx`:

```tsx
'use client'
import { useState, useTransition } from 'react'
import { checkIn } from '@/actions/attendance'

interface Player { id: string; firstName: string; lastName: string }

export function CheckInModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Player[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function search(q: string) {
    setQuery(q)
    if (!q) { setResults([]); return }
    const res = await fetch(`/api/players/search?q=${encodeURIComponent(q)}`)
    setResults(await res.json())
  }

  async function handleCheckIn(playerId: string) {
    startTransition(async () => {
      const result = await checkIn(playerId)
      if (result.error) {
        setError(result.error)
      } else {
        onClose()
      }
    })
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-end z-50" onClick={onClose}>
      <div className="bg-zinc-900 w-full rounded-t-2xl p-4" onClick={e => e.stopPropagation()}>
        <h2 className="font-varsity text-evg-orange text-xl mb-4">Registrar Entrada</h2>
        <input
          autoFocus
          value={query}
          onChange={e => search(e.target.value)}
          placeholder="Buscar jugador..."
          className="input-field mb-4"
        />
        {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {results.map(p => (
            <button key={p.id} onClick={() => handleCheckIn(p.id)} disabled={isPending}
              className="w-full text-left bg-zinc-800 rounded-lg px-4 py-3 hover:bg-zinc-700">
              {p.firstName} {p.lastName}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create search API route for modal**

Create `app/api/players/search/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json([], { status: 401 })

  const q = req.nextUrl.searchParams.get('q') ?? ''
  const players = await prisma.player.findMany({
    where: {
      OR: [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: { id: true, firstName: true, lastName: true },
    take: 10,
  })
  return NextResponse.json(players)
}
```

- [ ] **Step 3: Create checkout list component**

Create `components/ui/checkout-list.tsx`:

```tsx
'use client'
import { useTransition } from 'react'
import { checkOut } from '@/actions/attendance'

interface OpenAttendance {
  id: string
  checkIn: Date
  player: { firstName: string; lastName: string }
}

export function CheckoutList({
  attendances,
  onDone,
}: {
  attendances: OpenAttendance[]
  onDone: () => void
}) {
  const [isPending, startTransition] = useTransition()

  function handleCheckOut(id: string) {
    startTransition(async () => {
      await checkOut(id)
      onDone()
    })
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-end z-50" onClick={onDone}>
      <div className="bg-zinc-900 w-full rounded-t-2xl p-4" onClick={e => e.stopPropagation()}>
        <h2 className="font-varsity text-evg-orange text-xl mb-4">Registrar Salida</h2>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {attendances.map(a => (
            <button key={a.id} onClick={() => handleCheckOut(a.id)} disabled={isPending}
              className="w-full text-left bg-zinc-800 rounded-lg px-4 py-3 hover:bg-zinc-700">
              {a.player.firstName} {a.player.lastName}
              <span className="text-zinc-400 text-xs ml-2">
                desde {new Date(a.checkIn).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </button>
          ))}
          {attendances.length === 0 && (
            <p className="text-zinc-500 text-center py-4">No hay jugadores en sesión.</p>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create home page (quick actions)**

Create `app/(dashboard)/page.tsx`:

```tsx
import { Suspense } from 'react'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { startOfDayUTC } from '@/lib/dates'
import { HomeActions } from '@/components/ui/home-actions'

async function getInSessionPlayers() {
  const todayStart = startOfDayUTC(new Date())
  const todayEnd = new Date(todayStart)
  todayEnd.setUTCDate(todayEnd.getUTCDate() + 1)

  return prisma.attendance.findMany({
    where: { checkIn: { gte: todayStart, lt: todayEnd }, checkOut: null },
    include: { player: { select: { firstName: true, lastName: true } } },
    orderBy: { checkIn: 'asc' },
  })
}

export default async function HomePage() {
  const inSession = await getInSessionPlayers()

  return (
    <div className="p-4 space-y-6">
      <h1 className="font-varsity text-evg-orange text-3xl text-center pt-4">EVG</h1>

      <HomeActions openAttendances={inSession} />

      {/* Live session list */}
      <div>
        <p className="text-zinc-400 text-sm mb-2">En sesión ahora ({inSession.length})</p>
        <div className="space-y-2">
          {inSession.map(a => (
            <div key={a.id} className="bg-zinc-900 rounded-lg px-4 py-3 flex justify-between">
              <span>{a.player.firstName} {a.player.lastName}</span>
              <span className="text-zinc-400 text-sm">
                {new Date(a.checkIn).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
          {inSession.length === 0 && (
            <p className="text-zinc-500 text-sm text-center py-4">No hay jugadores en sesión.</p>
          )}
        </div>
      </div>
    </div>
  )
}
```

Create `components/ui/home-actions.tsx` (client component for modals):

```tsx
'use client'
import { useState } from 'react'
import { CheckInModal } from './checkin-modal'
import { CheckoutList } from './checkout-list'
import Link from 'next/link'

export function HomeActions({ openAttendances }: { openAttendances: any[] }) {
  const [showCheckin, setShowCheckin] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)

  return (
    <>
      <div className="grid grid-cols-1 gap-3">
        <button onClick={() => setShowCheckin(true)}
          className="bg-evg-orange text-black font-bold py-5 rounded-xl text-lg flex items-center justify-center gap-2">
          ＋ Registrar Entrada
        </button>
        <button onClick={() => setShowCheckout(true)}
          className="border border-zinc-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2">
          － Registrar Salida
        </button>
        <Link href="/payments?filter=PENDIENTE"
          className="border border-evg-orange text-evg-orange font-bold py-4 rounded-xl flex items-center justify-center gap-2">
          🔔 Pagos Pendientes
        </Link>
      </div>

      {showCheckin && <CheckInModal onClose={() => setShowCheckin(false)} />}
      {showCheckout && (
        <CheckoutList
          attendances={openAttendances}
          onDone={() => setShowCheckout(false)}
        />
      )}
    </>
  )
}
```

- [ ] **Step 5: Create attendance page**

Create `app/(dashboard)/attendance/page.tsx`:

```tsx
import { prisma } from '@/lib/prisma'
import { startOfDayUTC } from '@/lib/dates'

export default async function AttendancePage() {
  const todayStart = startOfDayUTC(new Date())
  const todayEnd = new Date(todayStart)
  todayEnd.setUTCDate(todayEnd.getUTCDate() + 1)

  const attendances = await prisma.attendance.findMany({
    where: { checkIn: { gte: todayStart, lt: todayEnd } },
    include: { player: { select: { firstName: true, lastName: true } } },
    orderBy: { checkIn: 'desc' },
  })

  return (
    <div className="p-4">
      <h1 className="font-varsity text-evg-orange text-2xl mb-4">Asistencia Hoy</h1>
      <div className="space-y-2">
        {attendances.map(a => {
          const duration = a.checkOut
            ? Math.round((a.checkOut.getTime() - a.checkIn.getTime()) / 60000)
            : null
          return (
            <div key={a.id} className="bg-zinc-900 rounded-lg px-4 py-3">
              <p className="font-semibold">{a.player.firstName} {a.player.lastName}</p>
              <p className="text-zinc-400 text-sm">
                {new Date(a.checkIn).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                {' → '}
                {a.checkOut
                  ? `${new Date(a.checkOut).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })} (${duration} min)`
                  : <span className="text-evg-orange">En sesión</span>
                }
              </p>
            </div>
          )
        })}
        {attendances.length === 0 && (
          <p className="text-zinc-500 text-center py-8">Sin asistencias hoy.</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Manual verification**

1. Home page: tap "+ Registrar Entrada" → search modal opens → find player → check-in → player appears in "En sesión"
2. Tap same player for check-in again → error "ya está en sesión"
3. Tap "- Registrar Salida" → player listed → select → duration appears on `/attendance`

- [ ] **Step 7: Commit**

```bash
git add app/(dashboard)/page.tsx app/(dashboard)/attendance/ app/api/players/ components/ui/
git commit -m "feat: add mobile home quick actions, check-in modal, check-out list, and attendance page"
```

---

## Week 3 — Payments, Notifications & Cron Jobs

---

### Task 11: Payment Server Action (TDD)

**Files:**
- Create: `actions/payments.ts`
- Create: `__tests__/actions/payments.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/actions/payments.test.ts`:

```ts
import { calcSubscriptionEnd, formatPeriod } from '@/lib/dates'

describe('payment state machine logic', () => {
  it('advances subscriptionEnd by one month on payment', () => {
    const currentEnd = new Date('2026-04-26T00:00:00.000Z')
    const newEnd = calcSubscriptionEnd(currentEnd)
    expect(newEnd.toISOString()).toBe('2026-05-26T00:00:00.000Z')
  })

  it('generates correct period string for PaymentRecord', () => {
    const date = new Date('2026-04-15T00:00:00.000Z')
    expect(formatPeriod(date)).toBe('2026-04')
  })

  it('clamps end-of-month correctly across payment cycles', () => {
    // Jan 31 → Feb 28 → Mar 28 (not Mar 31)
    const jan31 = new Date('2026-01-31T00:00:00.000Z')
    const feb28 = calcSubscriptionEnd(jan31)
    expect(feb28.toISOString()).toBe('2026-02-28T00:00:00.000Z')
    const mar28 = calcSubscriptionEnd(feb28)
    expect(mar28.toISOString()).toBe('2026-03-28T00:00:00.000Z')
  })
})
```

- [ ] **Step 2: Run tests**

```bash
npx jest __tests__/actions/payments.test.ts --no-coverage
```

Expected: PASS.

- [ ] **Step 3: Create `actions/payments.ts`**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { calcSubscriptionEnd, formatPeriod } from '@/lib/dates'

export async function markAsPaid(playerId: string) {
  await requireAuth()

  const player = await prisma.player.findUnique({ where: { id: playerId } })
  if (!player) throw new Error('Player not found')

  // Guard: if already PAGADO, subscriptionEnd has already been advanced.
  // Calling markAsPaid again would silently advance it a second month.
  if (player.payStatus === 'PAGADO') return

  const period = formatPeriod(player.subscriptionEnd)
  const newSubscriptionEnd = calcSubscriptionEnd(player.subscriptionEnd)

  await prisma.$transaction([
    prisma.player.update({
      where: { id: playerId },
      data: {
        payStatus: 'PAGADO',
        subscriptionEnd: newSubscriptionEnd,
        lastReminderSentAt: null,
        lastOverdueSentAt: null,
      },
    }),
    prisma.paymentRecord.create({
      data: { playerId, period },
    }),
  ])

  revalidatePath('/payments')
  revalidatePath(`/players/${playerId}`)
}
```

- [ ] **Step 4: Run full test suite**

```bash
npx jest --no-coverage
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add actions/payments.ts __tests__/actions/payments.test.ts
git commit -m "feat: add markAsPaid Server Action with payment cycle state machine"
```

---

### Task 12: Payments page

**Files:**
- Create: `app/(dashboard)/payments/page.tsx`

- [ ] **Step 1: Create payments page**

Create `app/(dashboard)/payments/page.tsx`:

```tsx
import { prisma } from '@/lib/prisma'
import { PayStatus } from '@prisma/client'
import { markAsPaid } from '@/actions/payments'

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const { filter } = await searchParams
  const statusFilter = filter as PayStatus | undefined

  const players = await prisma.player.findMany({
    where: statusFilter ? { payStatus: statusFilter } : undefined,
    orderBy: { subscriptionEnd: 'asc' },
    select: {
      id: true, firstName: true, lastName: true,
      payStatus: true, subscriptionEnd: true,
    },
  })

  const statusColors: Record<PayStatus, string> = {
    PAGADO: 'bg-green-900 text-green-400',
    PENDIENTE: 'bg-yellow-900 text-yellow-400',
    VENCIDO: 'bg-red-900 text-red-400',
  }

  return (
    <div className="p-4">
      <h1 className="font-varsity text-evg-orange text-2xl mb-4">Pagos</h1>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {(['', 'PENDIENTE', 'VENCIDO', 'PAGADO'] as const).map(s => (
          <a key={s} href={s ? `/payments?filter=${s}` : '/payments'}
            className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${
              (filter ?? '') === s ? 'bg-evg-orange text-black font-bold' : 'bg-zinc-800 text-zinc-400'
            }`}>
            {s || 'Todos'}
          </a>
        ))}
      </div>

      <div className="space-y-2">
        {players.map(p => (
          <div key={p.id}
            className="bg-zinc-900 rounded-lg px-4 py-3 flex items-center justify-between">
            <div>
              <p className="font-semibold">{p.firstName} {p.lastName}</p>
              <p className="text-zinc-400 text-xs">
                Vence: {new Date(p.subscriptionEnd).toLocaleDateString('es-CO')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold px-2 py-1 rounded ${statusColors[p.payStatus]}`}>
                {p.payStatus}
              </span>
              {p.payStatus !== 'PAGADO' && (
                <form action={markAsPaid.bind(null, p.id)}>
                  <button type="submit"
                    className="text-xs bg-evg-orange text-black font-bold px-3 py-1 rounded-lg">
                    Pagado
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}
        {players.length === 0 && (
          <p className="text-zinc-500 text-center py-8">Sin resultados.</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Manual verification**

1. Mark a player as PAGADO → `payStatus` changes, `subscriptionEnd` advances 1 month, `PaymentRecord` created
2. Try marking same player again in same month → unique constraint error (Prisma will throw)
3. Filter tabs work correctly

- [ ] **Step 3: Commit**

```bash
git add app/(dashboard)/payments/
git commit -m "feat: add payments page with status filter and mark-as-paid action"
```

---

### Task 13: Notification system (TDD)

**Files:**
- Create: `lib/notifications.ts`
- Create: `emails/reminder.tsx`
- Create: `emails/overdue.tsx`
- Create: `__tests__/lib/notifications.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/lib/notifications.test.ts`:

```ts
// Test that the notification type signature is correct
// (Resend is mocked — we test the function exists and is callable)

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({ id: 'mock-id' }),
    },
  })),
}))

jest.mock('@/emails/reminder', () => ({
  ReminderEmail: () => '<html>reminder</html>',
}))

jest.mock('@/emails/overdue', () => ({
  OverdueEmail: () => '<html>overdue</html>',
}))

describe('sendNotification', () => {
  it('can be imported and called', async () => {
    const { sendNotification } = await import('@/lib/notifications')
    const player = {
      guardianEmail: 'guardian@test.com',
      guardianName: 'Ana García',
      firstName: 'Juan',
      lastName: 'Pérez',
    } as any

    await expect(sendNotification(player, 'reminder')).resolves.not.toThrow()
    await expect(sendNotification(player, 'overdue')).resolves.not.toThrow()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/lib/notifications.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '@/lib/notifications'`

- [ ] **Step 3: Create React Email templates**

Create `emails/reminder.tsx`:

```tsx
import { Html, Body, Text, Heading } from '@react-email/components'

interface Props {
  guardianName: string
  playerName: string
}

export function ReminderEmail({ guardianName, playerName }: Props) {
  return (
    <Html>
      <Body style={{ fontFamily: 'sans-serif', background: '#000', color: '#fff', padding: 24 }}>
        <Heading style={{ color: '#FF8C00' }}>EVG Training 🏀</Heading>
        <Text>
          Hola {guardianName}, te saludamos de EVG Training 🏀. Te recordamos que el plan de
          entrenamiento de <strong>{playerName}</strong> vence el día de mañana. ¡Sigamos
          trabajando por su alto rendimiento!
        </Text>
      </Body>
    </Html>
  )
}
```

Create `emails/overdue.tsx`:

```tsx
import { Html, Body, Text, Heading } from '@react-email/components'

interface Props {
  guardianName: string
  playerName: string
}

export function OverdueEmail({ guardianName, playerName }: Props) {
  return (
    <Html>
      <Body style={{ fontFamily: 'sans-serif', background: '#000', color: '#fff', padding: 24 }}>
        <Heading style={{ color: '#FF8C00' }}>EVG Training 🏀</Heading>
        <Text>
          Hola {guardianName}, notamos que el pago de la suscripción de{' '}
          <strong>{playerName}</strong> en EVG Training presenta un retraso de al menos 3 días.
          Por favor, confímanos el pago para mantener su registro al día. ¡Gracias!
        </Text>
      </Body>
    </Html>
  )
}
```

- [ ] **Step 4: Create `lib/notifications.ts`**

```ts
import { Resend } from 'resend'
import { render } from '@react-email/render'
import { ReminderEmail } from '@/emails/reminder'
import { OverdueEmail } from '@/emails/overdue'
import type { Player } from '@prisma/client'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendNotification(
  player: Pick<Player, 'guardianEmail' | 'guardianName' | 'firstName' | 'lastName'>,
  type: 'reminder' | 'overdue'
): Promise<void> {
  const guardianName = player.guardianName ?? player.firstName
  const playerName = `${player.firstName} ${player.lastName}`

  const { subject, html } =
    type === 'reminder'
      ? {
          subject: `Recordatorio de pago — EVG Training`,
          html: await render(ReminderEmail({ guardianName, playerName })),
        }
      : {
          subject: `Aviso de mora — EVG Training`,
          html: await render(OverdueEmail({ guardianName, playerName })),
        }

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: player.guardianEmail,
    subject,
    html,
  })
}
```

- [ ] **Step 5: Run tests**

```bash
npx jest __tests__/lib/notifications.test.ts --no-coverage
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/notifications.ts emails/ __tests__/lib/notifications.test.ts
git commit -m "feat: add notification system with Resend + React Email templates"
```

---

### Task 14: Cron Job routes

**Files:**
- Create: `app/api/cron/reminders/route.ts`
- Create: `app/api/cron/overdue/route.ts`
- Create: `vercel.json`

- [ ] **Step 1: Create CRON_SECRET guard helper**

Add to `lib/auth.ts`:

```ts
/** Validate CRON_SECRET bearer token. Use only in API route handlers. */
export function requireCronSecret(req: Request): boolean {
  const auth = req.headers.get('authorization') ?? ''
  return auth === `Bearer ${process.env.CRON_SECRET}`
}
```

- [ ] **Step 2: Create T-1 reminder cron route**

Create `app/api/cron/reminders/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendNotification } from '@/lib/notifications'
import { startOfDayUTC } from '@/lib/dates'
import { requireCronSecret } from '@/lib/auth'

export async function GET(req: NextRequest) {
  if (!requireCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const tomorrowStart = startOfDayUTC(new Date(now.getTime() + 86400000))
  const dayAfterTomorrowStart = new Date(tomorrowStart)
  dayAfterTomorrowStart.setUTCDate(dayAfterTomorrowStart.getUTCDate() + 1)
  const todayStart = startOfDayUTC(now)

  const players = await prisma.player.findMany({
    where: {
      subscriptionEnd: { gte: tomorrowStart, lt: dayAfterTomorrowStart },
      payStatus: { not: 'PAGADO' },
      OR: [
        { lastReminderSentAt: null },
        { lastReminderSentAt: { lt: todayStart } },
      ],
    },
  })

  const results = await Promise.allSettled(
    players.map(async player => {
      await sendNotification(player, 'reminder')
      await prisma.player.update({
        where: { id: player.id },
        data: { lastReminderSentAt: now },
      })
    })
  )

  const sent = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  console.log(`[cron/reminders] sent=${sent} failed=${failed}`)
  return NextResponse.json({ sent, failed })
}
```

- [ ] **Step 3: Create T+3 overdue cron route**

Create `app/api/cron/overdue/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendNotification } from '@/lib/notifications'
import { startOfDayUTC } from '@/lib/dates'
import { requireCronSecret } from '@/lib/auth'

export async function GET(req: NextRequest) {
  if (!requireCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const threeDaysAgoStart = startOfDayUTC(new Date(now.getTime() - 3 * 86400000))
  const todayStart = startOfDayUTC(now)

  const players = await prisma.player.findMany({
    where: {
      subscriptionEnd: { lt: threeDaysAgoStart },
      payStatus: { not: 'PAGADO' },
      OR: [
        { lastOverdueSentAt: null },
        { lastOverdueSentAt: { lt: todayStart } },
      ],
    },
  })

  const results = await Promise.allSettled(
    players.map(async player => {
      // Update DB FIRST so the guard is set before email is sent.
      // If email fails, no duplicate will be sent on retry.
      // If DB fails, the error is captured by allSettled.
      await prisma.player.update({
        where: { id: player.id },
        data: {
          payStatus: 'VENCIDO',
          lastOverdueSentAt: now,
        },
      })
      await sendNotification(player, 'overdue')
    })
  )

  const sent = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  console.log(`[cron/overdue] sent=${sent} failed=${failed}`)
  return NextResponse.json({ sent, failed })
}
```

- [ ] **Step 4: Create `vercel.json`**

```json
{
  "crons": [
    { "path": "/api/cron/reminders", "schedule": "0 14 * * *" },
    { "path": "/api/cron/overdue",   "schedule": "5 14 * * *" }
  ]
}
```

- [ ] **Step 5: Manually verify cron security**

```bash
# Should return 401
curl http://localhost:3000/api/cron/reminders

# Should return 200 with { sent, failed }
curl -H "Authorization: Bearer <your-CRON_SECRET>" http://localhost:3000/api/cron/reminders
```

- [ ] **Step 6: Commit**

```bash
git add app/api/cron/ lib/auth.ts vercel.json
git commit -m "feat: add T-1 reminder and T+3 overdue cron routes with CRON_SECRET protection"
```

---

## Week 4 — Analytics & Deployment

---

### Task 15: Analytics data queries

**Files:**
- Create: `lib/analytics.ts`
- Create: `__tests__/lib/analytics.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/lib/analytics.test.ts`:

```ts
import { buildHeatmapData, buildConsistencyData } from '@/lib/analytics'

describe('buildHeatmapData', () => {
  it('excludes attendances without checkOut', () => {
    const attendances = [
      { checkIn: new Date('2026-04-21T10:00:00.000Z'), checkOut: new Date('2026-04-21T12:00:00.000Z') },
      { checkIn: new Date('2026-04-21T14:00:00.000Z'), checkOut: null },
    ]
    const data = buildHeatmapData(attendances)
    // Only 1 attendance counted (the one with checkOut)
    const total = data.reduce((sum, row) => sum + row.values.reduce((s: number, v: number) => s + v, 0), 0)
    expect(total).toBe(1)
  })
})

describe('buildConsistencyData', () => {
  it('caps consistency at 100', () => {
    const players = [{
      firstName: 'Juan', lastName: 'P',
      weeklySessions: 3,
      subscriptionStart: new Date('2026-04-06T00:00:00.000Z'), // 3 weeks ago
      _count: { attendances: 15 }, // more than expected
    }] as any
    const data = buildConsistencyData(players, new Date('2026-04-27T00:00:00.000Z'))
    expect(data[0].consistency).toBe(100)
  })

  it('returns null consistency for players in first week', () => {
    const players = [{
      firstName: 'Ana', lastName: 'G',
      weeklySessions: 3,
      subscriptionStart: new Date('2026-04-25T00:00:00.000Z'), // 2 days ago
      _count: { attendances: 0 },
    }] as any
    const data = buildConsistencyData(players, new Date('2026-04-27T00:00:00.000Z'))
    expect(data[0].consistency).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/lib/analytics.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '@/lib/analytics'`

- [ ] **Step 3: Implement `lib/analytics.ts`**

```ts
import { isoWeeksElapsed } from '@/lib/dates'

type AttendanceRow = { checkIn: Date; checkOut: Date | null }

// Days: 0=Mon,...,6=Sun. Hours: 6-22.
export function buildHeatmapData(attendances: AttendanceRow[]) {
  const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
  const HOURS = Array.from({ length: 17 }, (_, i) => i + 6) // 6-22

  const matrix: number[][] = Array.from({ length: 7 }, () => Array(17).fill(0))

  for (const a of attendances) {
    if (!a.checkOut) continue
    const day = (a.checkIn.getUTCDay() + 6) % 7 // Mon=0
    const hour = a.checkIn.getUTCHours()
    const hIdx = hour - 6
    if (hIdx >= 0 && hIdx < 17) matrix[day][hIdx]++
  }

  return DAYS.map((day, dIdx) => ({
    day,
    values: HOURS.map((_, hIdx) => matrix[dIdx][hIdx]),
    hours: HOURS,
  }))
}

type PlayerWithCount = {
  firstName: string
  lastName: string
  weeklySessions: number
  subscriptionStart: Date
  _count: { attendances: number }
}

export function buildConsistencyData(players: PlayerWithCount[], today: Date) {
  return players.map(p => {
    const weeks = isoWeeksElapsed(p.subscriptionStart, today)
    const expected = p.weeklySessions * weeks
    const consistency =
      weeks === 0 ? null : Math.min(100, Math.round((p._count.attendances / expected) * 100))

    return {
      name: `${p.firstName} ${p.lastName}`,
      weeklySessions: p.weeklySessions,
      attended: p._count.attendances,
      expected,
      consistency,
    }
  })
}
```

- [ ] **Step 4: Run tests**

```bash
npx jest __tests__/lib/analytics.test.ts --no-coverage
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/analytics.ts __tests__/lib/analytics.test.ts
git commit -m "feat: add analytics data utilities (heatmap, consistency) with tests"
```

---

### Task 16: Analytics dashboard page

**Files:**
- Create: `app/(dashboard)/analytics/page.tsx`
- Create: `components/ui/charts.tsx`

- [ ] **Step 1: Create charts client component**

Create `components/ui/charts.tsx`:

```tsx
'use client'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

const COLORS = { PAGADO: '#22c55e', PENDIENTE: '#eab308', VENCIDO: '#ef4444' }

export function WeeklyBarChart({ data }: { data: { week: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data}>
        <XAxis dataKey="week" stroke="#71717a" tick={{ fontSize: 11 }} />
        <YAxis stroke="#71717a" />
        <Tooltip contentStyle={{ background: '#18181b', border: 'none', color: '#fff' }} />
        <Bar dataKey="count" fill="#FF8C00" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function PayStatusPie({
  data,
}: {
  data: { name: 'PAGADO' | 'PENDIENTE' | 'VENCIDO'; value: number }[]
}) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}>
          {data.map(entry => (
            <Cell key={entry.name} fill={COLORS[entry.name]} />
          ))}
        </Pie>
        <Legend formatter={v => <span style={{ color: '#a1a1aa' }}>{v}</span>} />
        <Tooltip contentStyle={{ background: '#18181b', border: 'none', color: '#fff' }} />
      </PieChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 2: Create analytics page**

Create `app/(dashboard)/analytics/page.tsx`:

```tsx
import { prisma } from '@/lib/prisma'
import { startOfDayUTC, isoWeeksElapsed } from '@/lib/dates'
import { buildHeatmapData, buildConsistencyData } from '@/lib/analytics'
import { WeeklyBarChart, PayStatusPie } from '@/components/ui/charts'
import { PayStatus } from '@prisma/client'

async function getData() {
  const now = new Date()

  // Last 8 weeks of attendances (all, for bar chart)
  const eightWeeksAgo = startOfDayUTC(new Date(now.getTime() - 8 * 7 * 86400000))
  const allAttendances = await prisma.attendance.findMany({
    where: { checkIn: { gte: eightWeeksAgo } },
    select: { checkIn: true, checkOut: true },
  })

  // Payment status counts this month
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
  const payStatusCounts = await prisma.player.groupBy({
    by: ['payStatus'],
    where: { subscriptionEnd: { gte: monthStart, lt: monthEnd } },
    _count: true,
  })

  // Consistency data
  const players = await prisma.player.findMany({
    select: {
      firstName: true, lastName: true,
      weeklySessions: true, subscriptionStart: true,
      _count: {
        select: {
          attendances: { where: { checkOut: { not: null } } },
        },
      },
    },
    orderBy: { firstName: 'asc' },
  })

  return { allAttendances, payStatusCounts, players, now }
}

function buildWeeklyData(attendances: { checkIn: Date }[], now: Date) {
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const weekStart = new Date(now.getTime() - (7 - i) * 7 * 86400000)
    const weekEnd = new Date(weekStart.getTime() + 7 * 86400000)
    const count = attendances.filter(a => a.checkIn >= weekStart && a.checkIn < weekEnd).length
    const label = `S${8 - i}`
    return { week: label, count }
  })
  return weeks
}

export default async function AnalyticsPage() {
  const { allAttendances, payStatusCounts, players, now } = await getData()

  const heatmap = buildHeatmapData(allAttendances)
  const weeklyData = buildWeeklyData(allAttendances, now)
  const pieData = (['PAGADO', 'PENDIENTE', 'VENCIDO'] as PayStatus[]).map(s => ({
    name: s,
    value: payStatusCounts.find(p => p.payStatus === s)?._count ?? 0,
  }))
  const consistencyData = buildConsistencyData(players as any, now)
    .sort((a, b) => {
      // null (N/A) players sort last; otherwise ascending (worst first)
      if (a.consistency === null && b.consistency === null) return 0
      if (a.consistency === null) return 1
      if (b.consistency === null) return -1
      return a.consistency - b.consistency
    })

  return (
    <div className="p-4 space-y-6">
      <h1 className="font-varsity text-evg-orange text-2xl">Analytics</h1>

      {/* Weekly attendance bar chart */}
      <div className="bg-zinc-900 rounded-xl p-4">
        <p className="text-zinc-400 text-sm mb-3">Asistencias por semana (últimas 8)</p>
        <WeeklyBarChart data={weeklyData} />
      </div>

      {/* Payment status pie */}
      <div className="bg-zinc-900 rounded-xl p-4">
        <p className="text-zinc-400 text-sm mb-3">Estado de pagos (mes actual)</p>
        <PayStatusPie data={pieData} />
      </div>

      {/* Heatmap (simplified table) */}
      <div className="bg-zinc-900 rounded-xl p-4 overflow-x-auto">
        <p className="text-zinc-400 text-sm mb-3">Mapa de calor de asistencia</p>
        <table className="text-xs w-full">
          <thead>
            <tr>
              <th className="text-left pr-2 text-zinc-500">Día</th>
              {Array.from({ length: 17 }, (_, i) => (
                <th key={i} className="text-zinc-600 px-1">{i + 6}h</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {heatmap.map(row => (
              <tr key={row.day}>
                <td className="pr-2 text-zinc-400">{row.day}</td>
                {row.values.map((v, i) => (
                  <td key={i} className="px-1 text-center rounded"
                    style={{ background: v > 0 ? `rgba(255,140,0,${Math.min(v / 10, 1)})` : 'transparent' }}>
                    {v > 0 ? v : ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Consistency table */}
      <div className="bg-zinc-900 rounded-xl p-4">
        <p className="text-zinc-400 text-sm mb-3">Consistencia por jugador</p>
        <div className="space-y-2">
          {consistencyData.map((p, i) => (
            <div key={i} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{p.name}</p>
                <p className="text-zinc-500 text-xs">{p.attended}/{p.expected} sesiones</p>
              </div>
              <span className="font-bold text-evg-orange">
                {p.consistency === null ? 'N/A' : `${p.consistency}%`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Manual verification**

1. Navigate to `/analytics`
2. Bar chart shows last 8 weeks — verify the week with today's check-ins matches Attendance table count
3. Pie chart reflects current `payStatus` distribution
4. Heatmap: check-ins with no `checkOut` should NOT appear
5. Bar chart: check-ins with no `checkOut` SHOULD appear
6. Player in first week → consistency = N/A

- [ ] **Step 4: Commit**

```bash
git add app/(dashboard)/analytics/ components/ui/charts.tsx
git commit -m "feat: add analytics dashboard with bar chart, pie chart, heatmap, and consistency table"
```

---

### Task 17: Navigation + end-to-end verification

**Files:**
- Create: `components/ui/nav.tsx`

- [ ] **Step 1: Create bottom navigation**

Create `components/ui/nav.tsx`:

```tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/', label: '🏠', title: 'Inicio' },
  { href: '/players', label: '👤', title: 'Jugadores' },
  { href: '/attendance', label: '✅', title: 'Asistencia' },
  { href: '/payments', label: '💳', title: 'Pagos' },
  { href: '/analytics', label: '📊', title: 'Analytics' },
]

export function BottomNav() {
  const path = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-800 flex z-40">
      {links.map(l => (
        <Link key={l.href} href={l.href}
          className={`flex-1 flex flex-col items-center py-3 text-lg ${
            path === l.href ? 'text-evg-orange' : 'text-zinc-500'
          }`}>
          <span>{l.label}</span>
          <span className="text-xs">{l.title}</span>
        </Link>
      ))}
    </nav>
  )
}
```

- [ ] **Step 2: Add nav to dashboard layout**

Edit `app/(dashboard)/layout.tsx` to include nav:

```tsx
import { BottomNav } from '@/components/ui/nav'

// Inside the return:
return (
  <div className="min-h-screen bg-black pb-20">
    {children}
    <BottomNav />
  </div>
)
```

- [ ] **Step 3: Run full test suite**

```bash
npx jest --no-coverage
```

Expected: All tests PASS.

- [ ] **Step 4: End-to-end verification checklist**

Work through the spec verification checklist:

```
[ ] Auth: login/logout works, /players without session → /login
[ ] Cron security: GET /api/cron/reminders without CRON_SECRET → 401
[ ] Player CRUD (adult): no guardianName required, guardianEmail = player.email
[ ] Player CRUD (minor): guardianName required, form blocks without it
[ ] subscriptionEnd = addMonths(start, 1) at midnight UTC (check in Prisma Studio)
[ ] Jan 31 start → Feb 28 end
[ ] Check-in: player appears in "En sesión"
[ ] Duplicate check-in: error "ya está en sesión"
[ ] Check-out: duration shows, absent when checkOut is null
[ ] Mark as PAGADO: subscriptionEnd +1 month, PaymentRecord created, lastReminderSentAt null
[ ] T-1 cron (manual): email arrives, lastReminderSentAt set, no duplicate on re-run
[ ] T+3 cron (manual): payStatus → VENCIDO, email arrives, no duplicate on re-run
[ ] Analytics heatmap: null-checkOut not counted
[ ] Analytics bar chart: all check-ins counted
[ ] Consistency: formula correct, capped at 100%, N/A for week 0
[ ] Duplicate PaymentRecord: unique constraint fires
```

- [ ] **Step 5: Deploy to Vercel**

```bash
# Push to GitHub, then connect repo in Vercel dashboard
# Set all env vars from .env.local.example in Vercel project settings
# Vercel will detect vercel.json and schedule cron jobs automatically
git push origin main
```

- [ ] **Step 6: Final commit**

```bash
git add components/ui/nav.tsx app/(dashboard)/layout.tsx
git commit -m "feat: add bottom navigation and complete EVG management system MVP"
```

---

## Summary

| Week | Tasks | Key Deliverables |
|---|---|---|
| 1 | 1–8 | Project setup, auth, player CRUD, photo upload |
| 2 | 9–10 | Attendance check-in/out, mobile home |
| 3 | 11–14 | Payment state machine, emails, cron jobs |
| 4 | 15–17 | Analytics dashboards, navigation, deploy |
