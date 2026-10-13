# College Event Management Website — Master Build Plan

Working name: **CampusConnect** (placeholder; final name TBD). The name lives in ONE place: `src/config/app.ts` (`APP_NAME`). Never hardcode it elsewhere.

This file is the single source of truth. The coding agent (Gemini) executes it phase by phase. The human mediator pastes results/errors back to the planner (Claude), who reviews and issues fixes.

---

## 0. Agent operating rules (read first, obey always)

1. Work on ONE phase at a time. Do not start the next phase until the human says so.
2. After every phase run the quality gate: `npm run typecheck && npm run lint && npm run build`. All three must pass. Paste the full output of any failure; never hide or skip errors.
3. TypeScript strict. No `any`, no `@ts-ignore`, no `as any`. Use `unknown` + narrowing or Zod.
4. Do NOT invent files, env vars, Prisma fields, routes, or package APIs. If unsure about a library API, run `npm view <pkg> version`, read `node_modules/<pkg>/README` or the official docs before coding.
5. Follow the layered architecture: UI → server actions/route handlers → services → repositories → Prisma. UI never imports Prisma. Repositories hold queries only. Services hold business rules. Validation (Zod) before business logic. Auth/authorization enforced server-side on every mutation.
6. Smallest correct change. No unrelated refactors. No new folders outside the structure in section 4.
7. Never commit secrets. `.env` is git-ignored. Only `NEXT_PUBLIC_*` may reach the browser.
8. At the end of each phase output a **Phase Report** (template in section 13).

---

## 1. Locked technology decisions (researched Oct 2026)

| Concern | Decision | Why |
|---|---|---|
| Framework | **Next.js 16** (App Router, TypeScript, `src/` dir, import alias `@/*`) | Current stable major. |
| Styling | **Tailwind CSS v4** (CSS-first config via `@theme` in `globals.css`) | Default in create-next-app. |
| Animation | **`motion`** package (`import { motion } from "motion/react"`) | Successor of framer-motion. |
| ORM | **Prisma 7** | Current major; see gotchas in section 2. |
| Database | **Supabase Postgres** (free tier) | Chosen by team. |
| File storage | **Supabase Storage** (public bucket `event-media`) | Fixes Vercel read-only filesystem problem. |
| Auth | **Better Auth** (Prisma adapter, email+password and Google) | Auth.js/NextAuth is now in security-patch-only mode and its own guidance points new projects to Better Auth. |
| Validation | **Zod** | Per architecture standard. |
| Forms | `react-hook-form` + `@hookform/resolvers` | Reliable with Zod. |
| Icons / toasts | `lucide-react`, `sonner` | Small, stable. |
| Hosting | **Vercel** (Hobby) for the Next.js app | Works fine because no files are written to disk; all uploads go to Supabase Storage. |
| Containers | Dockerfile + docker-compose (optional, local dev) | Requested by team. Not needed for Vercel deploy. |
| Package manager | **npm** | Fewest surprises. |

Pin exact versions after install (`npm i --save-exact` for core packages) so the build is reproducible overnight.

---

## 2. Known gotchas (these cause most errors — avoid them up front)

### Prisma 7
- Generator must be `provider = "prisma-client"` (NOT `prisma-client-js`) with a required `output`, e.g. `output = "../src/generated/prisma"`.
- Import the client from the generated path: `import { PrismaClient } from "@/generated/prisma/client"` (note the `/client`). Never import from `@prisma/client`.
- A **driver adapter is required**: `@prisma/adapter-pg` + `pg`. `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })`.
- The datasource block in `schema.prisma` has only `provider = "postgresql"`. The connection URL for CLI commands lives in **`prisma.config.ts`** at project root (`defineConfig`, `env` from `prisma/config`, `import "dotenv/config"`), pointing to `DIRECT_URL`.
- Node 20.19+ required. Add `src/generated/` to `.gitignore`; run `npx prisma generate` in `postinstall` and before build (`"postinstall": "prisma generate"`).
- If Turbopack cannot resolve Prisma/pg at runtime, add `serverExternalPackages: ["pg"]` to `next.config.ts`.

### Supabase connection strings (IMPORTANT)
- Supabase's **direct** host (`db.<ref>.supabase.co:5432`) is IPv6-only on the free plan. Many home/college networks have no IPv6, so migrations fail with a timeout/`ENOTFOUND`.
- **Use the pooler strings** from Supabase Dashboard → Connect:
  - `DIRECT_URL` (migrations / Prisma CLI) = **Session pooler**, port **5432**, host `aws-0-<region>.pooler.supabase.com`, user `postgres.<project-ref>` (IPv4-compatible).
  - `DATABASE_URL` (runtime on Vercel) = **Transaction pooler**, port **6543**, add `?pgbouncer=true`.
  - If runtime queries throw prepared-statement errors, switch `DATABASE_URL` to the Session pooler string too. Keep the pg pool small (`max: 5`).
- Password with special characters must be URL-encoded.
- After the first migration, run the RLS migration (section 5.3) so the public Supabase Data API cannot read your tables with the anon key.
- Free Supabase projects **pause after about a week of inactivity**. Open the dashboard and confirm the project is Active the day of the presentation.

### Next.js 16
- `middleware.ts` is renamed **`proxy.ts`** with `export function proxy(...)` (or `export const proxy`). Edge runtime is NOT supported in proxy. Keep proxy checks light (cookie presence); do real authorization in server code.
- `params`, `searchParams`, `cookies()`, `headers()` are async: `const { slug } = await params;`, `await headers()`.
- Server Components by default; add `"use client"` only for state, effects, handlers, motion.
- `next.config.ts`: allow Supabase image host in `images.remotePatterns`.

### Vercel
- Filesystem is read-only: NEVER write uploads to `public/` or disk. All uploads go to Supabase Storage; save the returned public URL in the DB.
- Serverless request body limit is about 4.5 MB: restrict image uploads to **≤ 4 MB**, JPEG/PNG/WebP only, validate on the server.

### Better Auth
- Files: `src/lib/auth.ts` (server), `src/lib/auth-client.ts` (client), `src/app/api/auth/[...all]/route.ts` using `toNextJsHandler(auth.handler)`. Add the `nextCookies()` plugin last so server actions can set cookies.
- Generate its tables with `npx @better-auth/cli generate`, merge into `schema.prisma`, then migrate. Do not hand-write the auth tables from memory.
- Google OAuth redirect URI must match the Google console exactly: `http://localhost:3000/api/auth/callback/google` and `https://<vercel-domain>/api/auth/callback/google`.
- Roles: add `role` (enum) as an additional user field with `input: false` so users cannot self-assign it.

---

## 3. Accounts and credentials the human must create (Phase 0)

1. **GitHub** repo (private), push the project there.
2. **Supabase** account → new project. Save: database password, project ref, region.
   - Dashboard → Connect: copy Session pooler + Transaction pooler strings.
   - Project Settings → API: copy Project URL, `anon` key, and `service_role` key (secret!).
   - Storage → create bucket `event-media`, **public**.
3. **Google Cloud Console** (optional but recommended for the demo): create OAuth client (Web), add redirect URIs (section 2), copy Client ID/Secret. If time is short, ship email+password first and add Google last.
4. **Vercel** account → import GitHub repo → add env vars (section 3.1).

### 3.1 Environment variables

`.env.example` (committed, empty values) and `.env` (local, ignored):

```
# Database (Supabase pooler strings)
DATABASE_URL=
DIRECT_URL=

# Better Auth
BETTER_AUTH_SECRET=        # openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Google OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Supabase (server-only except the URL)
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=event-media

# App
ORGANIZER_EMAILS=          # comma-separated; these emails become ORGANIZER on sign-up
APP_TIMEZONE=Asia/Karachi
```

`src/config/env.ts` validates all of the above with Zod at startup (server vars must never be read in client code).

---

## 4. Folder structure (follow exactly)

```
project-root/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── prisma.config.ts
├── public/
│   └── brand/            # forte-logo.png (transparent), favicon, og-image
├── src/
│   ├── app/
│   │   ├── (public)/
│   │   │   ├── page.tsx                      # Home
│   │   │   ├── events/page.tsx               # Events list + filters
│   │   │   ├── events/[slug]/page.tsx        # Event details
│   │   │   ├── results/page.tsx              # All published results
│   │   │   ├── results/[slug]/page.tsx       # Results of one event
│   │   │   └── about/page.tsx
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── (student)/
│   │   │   ├── events/[slug]/register/page.tsx
│   │   │   ├── dashboard/page.tsx            # My registrations + status
│   │   │   ├── dashboard/[registrationId]/page.tsx   # detail + feedback
│   │   │   └── profile/page.tsx
│   │   ├── (admin)/admin/
│   │   │   ├── page.tsx                      # overview/stats
│   │   │   ├── events/page.tsx
│   │   │   ├── events/new/page.tsx
│   │   │   ├── events/[id]/edit/page.tsx
│   │   │   ├── events/[id]/registrations/page.tsx
│   │   │   ├── events/[id]/results/page.tsx
│   │   │   └── announcements/page.tsx
│   │   ├── api/
│   │   │   ├── auth/[...all]/route.ts
│   │   │   └── admin/events/[id]/export/route.ts   # CSV download
│   │   ├── layout.tsx  globals.css  loading.tsx  error.tsx  not-found.tsx
│   ├── proxy.ts                              # light route gating
│   ├── components/
│   │   ├── ui/        # Button, Card, Badge, Input, Textarea, Select, Modal, Skeleton, Tabs, EmptyState
│   │   ├── layout/    # SiteHeader, SiteFooter, AdminTopNav, PageShell
│   │   ├── motion/    # Reveal, Stagger, CountUp, FloatingShapes (client components)
│   │   └── shared/    # Logo, StatusBadge, CountdownChip, ImageUpload
│   ├── features/
│   │   ├── events/        {components, schemas, services, repositories, types, constants.ts}
│   │   ├── registrations/ {components, schemas, services, repositories, types, constants.ts}
│   │   ├── teams/         {schemas, repositories, types}
│   │   ├── results/       {components, schemas, services, repositories, types}
│   │   ├── feedback/      {components, schemas, services, repositories, types}
│   │   ├── announcements/ {components, schemas, services, repositories, types}
│   │   └── users/         {schemas, services, repositories, types}
│   ├── server/actions/    # thin server actions that call services
│   ├── lib/               # prisma.ts, auth.ts, auth-client.ts, session.ts, permissions.ts,
│   │                      # errors.ts, logger.ts, storage.ts, dates.ts, csv.ts, utils.ts
│   ├── hooks/
│   ├── generated/prisma/  # generated, git-ignored
│   └── config/            # env.ts, app.ts
├── tests/{unit,integration,e2e}/
├── Dockerfile  docker-compose.yml  .dockerignore
├── .env.example  .gitignore  eslint.config.mjs  next.config.ts  tsconfig.json  package.json  README.md
```

Rules: feature code stays inside its feature; `components/ui` stays generic; no `helpers.ts`/`misc.ts`.

---

## 5. Database design (Prisma 7 + PostgreSQL)

### 5.1 Schema (authoritative; Better Auth tables are generated by its CLI and merged)

Enums: `Role { STUDENT ORGANIZER ADMIN }`, `EventStatus { DRAFT PUBLISHED CLOSED COMPLETED CANCELLED }`, `ParticipationType { INDIVIDUAL TEAM }`, `RegistrationStatus { PENDING APPROVED REJECTED WITHDRAWN }`, `EventCategory { TECHNICAL SPORTS CULTURAL ACADEMIC GAMING OTHER }`.

Models (fields in brief; use `@id @default(cuid())` ids, `createdAt`/`updatedAt` everywhere, `@@map` snake_case table names):

- **User** (Better Auth core fields: id, name, email, emailVerified, image, createdAt, updatedAt) + `role Role @default(STUDENT)`, `rollNumber String?`, `department String?`, `phone String?`. Relations: sessions, accounts, registrations, feedback, createdEvents.
- **Session / Account / Verification**: exactly as generated by Better Auth CLI.
- **Event**: `slug @unique`, `title`, `summary` (short), `description` (Text), `rules` (Text), `eligibility` (Text), `prizes` (Text), `venue`, `category EventCategory`, `status EventStatus @default(DRAFT)`, `participationType`, `minTeamSize Int @default(1)`, `maxTeamSize Int @default(1)`, `maxParticipants Int?`, `startsAt DateTime`, `endsAt DateTime?`, `registrationDeadline DateTime`, `posterUrl String?`, `resultsPublished Boolean @default(false)`, `createdById` → User. Indexes: `[status, startsAt]`, `[category]`.
- **Registration**: `eventId`, `userId`, `teamId String?`, `status RegistrationStatus @default(PENDING)`, `notes String?`, `rejectionReason String?`, `reviewedById String?`, `reviewedAt DateTime?`. `@@unique([eventId, userId])`. Indexes `[eventId, status]`, `[userId]`.
- **Team**: `eventId`, `name`, `leaderId` → User. `@@unique([eventId, name])`. Has many TeamMember and Registration.
- **TeamMember**: `teamId`, `fullName`, `rollNumber`, `email String?`, `phone String?`. (Members need no account.)
- **Result**: `eventId`, `registrationId`, `position Int` (1 = winner), `award String?` (e.g. "Winner", "Best Design"), `certificateUrl String?`, `remarks String?`. `@@unique([eventId, registrationId])`, index `[eventId, position]`.
- **Feedback**: `eventId`, `userId`, `rating Int` (1–5, enforce in Zod), `comment String?`. `@@unique([eventId, userId])`.
- **Announcement**: `title`, `body` (Text), `pinned Boolean @default(false)`, `publishedAt DateTime @default(now())`, `createdById`.

### 5.2 Migration workflow
1. `npx prisma migrate dev --name init` (uses `DIRECT_URL` via `prisma.config.ts`).
2. Commit `prisma/migrations/`. Never edit applied migrations. Never reset a database that holds real data.
3. Production/Vercel: run `npx prisma migrate deploy` from the developer machine against Supabase (do NOT run migrations inside the Vercel build).

### 5.3 RLS hardening migration (second migration, `npx prisma migrate dev --create-only --name enable_rls`)
Add `ALTER TABLE "<table>" ENABLE ROW LEVEL SECURITY;` for every table, with no policies. Prisma connects as the table owner so the app is unaffected, while the anon key becomes unable to read data. Do this once all tables exist.

### 5.4 Seed (`prisma/seed.ts`, run with `npx prisma db seed`)
Deterministic demo data, clearly marked development-only and guarded: refuse to run when `NODE_ENV === "production"` unless `ALLOW_SEED=true`. Seed: 1 organizer (email from `ORGANIZER_EMAILS` first value; create via Better Auth API or document the manual sign-up step), 6 events across categories and statuses (2 upcoming featured, 1 team event, 1 closed, 1 completed with results), sample registrations in each status, 2 announcements.

---

## 6. Authentication and authorization

- Methods: email + password, plus Google. Students sign up themselves; extra profile fields (rollNumber, department, phone) collected on `/profile` after first login (profile completion required before registering for an event).
- Organizer promotion: in Better Auth `databaseHooks.user.create.before`, if the email is in `ORGANIZER_EMAILS`, set `role = "ORGANIZER"`; otherwise `STUDENT`. Role is never taken from client input.
- `src/lib/session.ts`: `getSession()`, `requireUser()`, `requireRole(["ORGANIZER","ADMIN"])` (redirect or throw `ForbiddenError`). Call these at the top of every protected page, server action and route handler.
- `src/proxy.ts`: only gate by session cookie presence for `/dashboard`, `/profile`, `/admin`, `/events/*/register` (redirect to `/login?next=...`). Real role checks happen server-side in code.
- `src/lib/permissions.ts`: pure functions such as `canManageEvent(user)`, `canViewRegistration(user, registration)`.

---

## 7. Business rules (put in services, not in UI/repositories)

**Events**
- Slug auto-generated from title, unique (append short suffix on collision).
- Only PUBLISHED events appear publicly. DRAFT only for organizers.
- Registration open iff status = PUBLISHED, now < registrationDeadline, and (maxParticipants null or approved+pending count < maxParticipants).
- Auto-derived display state: Upcoming / Registration Open / Closing Soon (< 48h) / Closed / Completed.

**Registrations**
- One registration per user per event (DB unique + friendly error).
- INDIVIDUAL event: create Registration only.
- TEAM event: in ONE transaction create Team + TeamMembers + the leader's Registration (status PENDING). Validate `minTeamSize ≤ members+leader ≤ maxTeamSize`, unique team name per event, no duplicate roll numbers inside the team.
- Student may WITHDRAW while PENDING/APPROVED before the deadline.
- Organizer may APPROVE or REJECT (rejection requires a reason ≥ 5 chars). Record `reviewedById`, `reviewedAt`. Bulk approve/reject supported.

**Results**
- Only for events with at least one APPROVED registration; only APPROVED registrations can be ranked. Organizer enters positions/awards and optional certificate URLs, then toggles `resultsPublished`. Publishing sets event status COMPLETED. Public results page only shows published results.

**Feedback**
- Only a user with an APPROVED registration, only after the event `startsAt` has passed (or event COMPLETED); one per user per event; rating 1–5.

**Uploads**
- `src/lib/storage.ts` uses `@supabase/supabase-js` with `SUPABASE_SERVICE_ROLE_KEY` **on the server only**. Server action `uploadEventPoster(formData)`: `requireRole`, validate type (jpeg/png/webp) and size ≤ 4 MB, path `posters/<eventId-or-temp>/<uuid>.<ext>`, upload, return `getPublicUrl`. Save URL in `Event.posterUrl`. Optional: delete the old object when replaced.

**Dates**
- Store UTC. Format via `src/lib/dates.ts` using `Intl.DateTimeFormat` with `APP_TIMEZONE`. No date logic scattered in components.

---

## 8. Routes and API surface

Mutations are **server actions** in `src/server/actions/*.ts` (each: `requireUser/Role` → Zod parse → service → `revalidatePath`). Return a typed result `{ ok: true, data } | { ok: false, error }`; never throw raw DB errors to the client.

| Route | Access | Purpose |
|---|---|---|
| `/` | public | Hero, featured events, stats, announcements, how-it-works |
| `/events` | public | Grid with search, category chips, status filter, pagination (page size 9, max 24) |
| `/events/[slug]` | public | Details: tabs Overview / Rules / Prizes, sticky Register card, countdown |
| `/events/[slug]/register` | student | Individual or team form |
| `/results`, `/results/[slug]` | public | Winners podium + full ranking + certificate links |
| `/about` | public | College/organizer info |
| `/login`, `/signup` | guest | Auth |
| `/dashboard` | student | My registrations with status timeline |
| `/dashboard/[registrationId]` | owner | Detail, withdraw, feedback after event |
| `/profile` | student | Roll number, department, phone |
| `/admin` | organizer | Stats cards + recent registrations |
| `/admin/events` (+ `/new`, `/[id]/edit`) | organizer | CRUD, poster upload, publish/unpublish |
| `/admin/events/[id]/registrations` | organizer | Table, filters, approve/reject, bulk, CSV export |
| `/admin/events/[id]/results` | organizer | Rank entry, certificate links, publish |
| `/admin/announcements` | organizer | CRUD, pin |
| `GET /api/admin/events/[id]/export` | organizer | CSV of registrations (server-checked) |
| `/api/auth/[...all]` | — | Better Auth handler |

Pagination/filtering/search happen in Prisma (`where`, `skip`, `take`, clamp `pageSize` ≤ 24). Use `select` to return only needed fields. Avoid N+1 (use `include`/`_count` deliberately).

---

## 9. UI / UX design system (original, custom, attractive)

Goal: warm, confident, premium, college-festival energy. NOT a dashboard-template look. Rules from the team: no generic sidebar layout, no heavy abstract border lines, rich animation, mobile-first (most users are on phones), laptop layout equally polished.

### 9.1 Brand and logo
- Palette is derived from the Forte logo (navy circle, mustard/gold). Agent must sample exact hex values from the logo file; the values below are the starting tokens.
- **Logo handling:** use a transparent-background PNG/SVG of only the navy circle (`public/brand/forte-logo.png`). If only the mustard-square image is available, crop it with CSS: wrap in a circular container (`rounded-full overflow-hidden`), image scaled ≈ 1.36× and centered (the circle spans roughly 73% of the image width, centered), so no mustard corners show. Replace with the clean transparent file as soon as available.
- Logo component `components/shared/Logo.tsx` renders the circle + `APP_NAME`.

### 9.2 Color tokens (Tailwind v4 `@theme` in `globals.css`)
```
--color-navy-950: #070F33   /* deep text/footers */
--color-navy-900: #0B1B5E   /* brand navy (sample from logo) */
--color-navy-700: #1E3A9E
--color-navy-100: #E6EBFB
--color-gold-500: #F5B800   /* brand gold (sample from logo) */
--color-gold-400: #FFCB3D
--color-gold-100: #FFF3CC
--color-ivory:    #FBF8EF   /* page background */
--color-ink:      #0E1633   /* body text, softer than pure black */
--color-mist:     #6B7394   /* secondary text */
--color-success:  #12805C   --color-success-bg: #DDF5EA   /* APPROVED */
--color-warning:  #B26A00   --color-warning-bg: #FFF0D1   /* PENDING */
--color-danger:   #C62F3B   --color-danger-bg: #FDE3E5    /* REJECTED / errors */
--color-info:     #2D6CDF   --color-info-bg:  #E3EEFF
```
Supporting accents for illustrations/categories (use sparingly): teal `#14B8A6`, coral `#FF6B5E`, violet `#7C5CFF`. Contrast: text on navy must be ivory/gold; text on gold must be navy-950 (check WCAG AA).

### 9.3 Typography
`next/font/google`: **Sora** (headings, 600/700) + **Inter** (body, 400/500/600). Fluid sizes with `clamp()`. Headings tight tracking; generous line height in body.

### 9.4 Shape, depth, spacing
Large radii (`rounded-2xl`/`3xl`), soft layered shadows instead of 1px borders, generous whitespace, cards that lift on hover, gradient navy hero surfaces with subtle gold glow, optional faint dotted/grain texture. Max content width 1200px; 4/8 spacing scale.

### 9.5 Motion (all in client components under `components/motion/`)
- **Reveal**: fade + 24px rise on scroll into view (once). **Stagger** for card grids.
- Hero: staggered headline words, floating gold/navy shapes drifting slowly, logo gently pulsing ring (WiFi-wave motif from the logo as animated arcs).
- **CountUp** for stats; **Countdown** chip on event cards (hydration-safe: render after mount).
- Hover: card lift + image zoom 1.04, button press scale 0.97, link underline sweep.
- Page transitions: subtle fade between routes (keep light to avoid jank).
- Status changes: badge cross-fade; success toast with check animation after registration.
- Skeleton shimmer for loading; animated empty states.
- **Respect `prefers-reduced-motion`** (disable non-essential motion). Keep animations transform/opacity only for 60fps on cheap phones.

### 9.6 Navigation
- Public header: floating, translucent, rounded pill bar (logo left, links, Login/Register CTA right). Mobile: bottom-sheet style full-screen menu with large tap targets; consider a sticky bottom action bar on event details ("Register now").
- **Admin: no sidebar.** Use a top pill tab-bar (Overview · Events · Registrations · Results · Announcements) that scrolls horizontally on mobile, large cards and roomy tables with row hover instead of grid lines.

### 9.7 Page layouts

**Home** — 1) Hero: headline + subline + two CTAs (Explore Events, My Registrations), animated logo/arcs, floating shapes, live "next event" countdown card. 2) Stats strip (events, participants, categories, winners) with CountUp. 3) Featured Events: horizontal snap carousel on mobile, 3-col grid on desktop. 4) Category tiles with icons. 5) How it works: 4 animated steps (Discover → Register → Get approved → Compete & win). 6) Latest announcements ticker/cards. 7) Recent winners spotlight. 8) Footer with college name, links.

**Events list** — sticky search + category chips + status select; responsive card grid (poster image, category badge, date block, venue, deadline chip, status badge); skeletons; empty state; pagination.

**Event details** — large poster hero with gradient overlay, title, badges, date/venue/deadline row; tabbed content (Overview, Rules, Eligibility & Prizes); right-side sticky Register card (deadline countdown, seats left, team size info, CTA that adapts: Login to register / Register / Already registered (status) / Closed); share button; related events.

**Register** — stepper: 1 Confirm profile → 2 (Team only) team name + members with add/remove rows → 3 Review & submit → success screen with confetti-light animation and link to dashboard. Inline Zod errors, disabled submit while pending.

**Student dashboard** — greeting header, tabs (All / Pending / Approved / Rejected), registration cards with a vertical status timeline (Submitted → Under review → Approved/Rejected), withdraw action, feedback prompt after event.

**Results** — event selector; animated podium for top 3, then ranked list; certificate link buttons; confetti once on first view of a newly published result (optional).

**Admin overview** — greeting, 4 stat cards (Active events, Pending approvals, Total participants, Upcoming this week), "Needs attention" list of pending registrations with one-click approve/reject, quick actions.

**Admin events** — card list with status toggle, edit, view registrations; create/edit form in sections (Basics, Schedule, Participation, Rules & Prizes, Poster upload with preview and drag-drop), autosave-free simple submit with clear validation.

**Admin registrations** — filter chips by status, search by name/roll number, table on desktop and stacked cards on mobile, checkbox bulk actions, reject-reason modal, Export CSV button.

**Admin results** — list of approved participants with position/award inputs and certificate URL field, preview, Publish button with confirmation modal.

### 9.8 Accessibility and responsiveness
Mobile-first breakpoints (sm 640, md 768, lg 1024, xl 1280). Tap targets ≥ 44px, visible focus rings (gold), semantic HTML, alt text, labels on all inputs, color never the only status indicator (icon + text on badges). Test at 360px, 390px, 768px, 1280px.

### 9.9 Required states for EVERY data view
Loading (skeleton), empty (illustration + CTA), error (friendly + retry), success feedback (toast).

---

## 10. Quality, security, performance checklists

- Every mutation: authenticate → authorize → validate (Zod) → business rules → persist → revalidate. Never trust client `userId`, `role`, `status`, `price`.
- Ownership checks: students can read/modify only their own registrations (`registration.userId === session.user.id`).
- Add basic rate limiting to signup/login and registration submit (simple in-memory limiter is acceptable for the demo; note it resets per serverless instance).
- Security headers in `next.config.ts` (`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`).
- No `console.log`; use `src/lib/logger.ts` (structured, never logs secrets).
- `AppError` class with `code`, safe message, `statusCode`; map Prisma unique-constraint (`P2002`) to friendly errors.
- Performance: Server Components for data pages, `select` minimal fields, pagination, `next/image` with `sizes`, fonts via `next/font`, dynamic import for heavy client widgets, `revalidate` for public pages (e.g. 60s) with `revalidatePath` after mutations.
- Tests (minimum for tonight): unit tests for registration/team validation and deadline/seat rules (Vitest). E2E optional.

---

## 11. Docker (optional, for portability)

- `Dockerfile`: multi-stage (deps → build → runner), Node 22 alpine, `npx prisma generate` before `next build`, `output: "standalone"` in `next.config.ts`, run as non-root, `EXPOSE 3000`.
- `docker-compose.yml`: services `web` (build from Dockerfile, env_file `.env`) and optional `db` (postgres:16, volume) for fully local development; production uses Supabase. Document `docker compose up --build` in README.
- Vercel deployment does NOT use Docker.

---

## 12. Build phases (overnight order, each ends with the quality gate)

| # | Phase | Deliverables | Done when |
|---|---|---|---|
| 0 | Accounts (human) | Supabase project + bucket, GitHub repo, optional Google OAuth, env values collected | `.env` filled locally |
| 1 | Scaffold | `create-next-app` (TS, Tailwind, ESLint, App Router, src dir, `@/*`), install packages, scripts (`typecheck`, `lint`, `build`, `db:migrate`, `db:seed`), `src/config/env.ts`, `app.ts`, folder skeleton, `.env.example`, `.gitignore` | gate passes on empty app |
| 2 | Database | Prisma 7 setup (`prisma.config.ts`, generator, adapter client in `lib/prisma.ts`), full schema, `migrate dev --name init`, RLS migration, seed | tables visible in Supabase; seed runs |
| 3 | Auth | Better Auth server/client, route handler, tables merged and migrated, role hook, `session.ts`, `proxy.ts`, login/signup pages (basic styling), Google optional | sign up, login, logout work; role = STUDENT; organizer email gets ORGANIZER |
| 4 | Design system + shell | tokens in `globals.css`, fonts, `components/ui`, `components/motion`, Logo, SiteHeader/Footer, AdminTopNav, loading/error/not-found | showcase renders correctly at 360px and 1280px |
| 5 | Public pages | Home, Events list, Event details, About, Results pages (data from seed via services/repositories) | all public pages polished, animated, responsive |
| 6 | Registration flow | profile completion, register page (individual + team, transaction), dashboard, withdraw | student can register and see PENDING |
| 7 | Admin | overview, events CRUD + poster upload to Supabase Storage, registrations table (approve/reject/bulk), CSV export | organizer can publish event and approve registrations |
| 8 | Results + feedback + announcements | rank entry, publish, public results, feedback form, announcements CRUD | full demo flow works end-to-end |
| 9 | Polish + deploy | responsive audit, empty/error states, a11y pass, README, Docker files, Vercel deploy, set env vars, update Google redirect URIs, run `migrate deploy` + seed against Supabase | production URL passes the demo script |

**Order of work inside every feature:** model → migration → Zod schema → repository → service → server action/route → types → UI components → page → test.

---

## 13. Phase Report template (agent pastes this back after each phase)

```
PHASE: <number and name>
FILES CREATED/CHANGED: <list>
COMMANDS RUN + RESULT: typecheck / lint / build (paste any errors verbatim)
MANUAL CHECKS DONE: <what was clicked/tested>
DEVIATIONS FROM PLAN: <none or explain>
OPEN ISSUES / QUESTIONS: <list>
```

---

## 14. Presentation demo script (rehearse on the deployed URL)

1. Open home page on laptop, then on a phone: show animations and responsiveness.
2. Organizer logs in → creates an event with poster upload → publishes.
3. Event appears instantly on the public site (no code or image change, no redeploy).
4. Student account registers (team event shows team form) → sees PENDING in dashboard.
5. Organizer approves from the admin registrations page → student's status flips to APPROVED.
6. Organizer exports CSV, enters results, publishes.
7. Public results page shows the podium and certificate links; student leaves feedback.
8. Closing slide: architecture (Next.js on Vercel, Supabase Postgres + Storage, Prisma migrations, Better Auth).

Before presenting: verify Supabase project is Active, seed data present, a demo organizer and demo student account exist, and Google redirect URI matches the live domain.

---

## 15. Naming and branding (to decide)

- Decide between college-specific (Forte branding, logo in header/footer, Forte colors) or generic. Either way keep the name in `APP_NAME` and logo in `public/brand/`.
- Candidate names (not final): CampusConnect, Forte Events, Forté Fest Hub, ArenaX.
