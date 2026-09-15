# Career Next Step — "From Graduate to Hire"

A professional networking mobile application for the Richfield/AAA community, built for the **2026 Richfield Hackathon**. Students and alumni build digital-portfolio profiles, grow professional networks, and get matched to verified opportunities. Business users discover talent and manage pipelines. Administrators keep the ecosystem trusted, verified, and healthy.

---

## 1. Project Overview

### The problem
Graduate employability is increasingly competitive. Students lack visible professional presence before graduation, and recruiters have no dedicated channel to discover Richfield talent.

### The solution
One trusted ecosystem with **four user types**, connecting the entire community:

| User type | Authentication | Capabilities |
|---|---|---|
| **Student** | Richfield/AAA institutional email only (`@my.richfield.ac.za`, `@richfield.ac.za`, `@my.aaa.ac.za`, `@aaa.ac.za`) — enforced in the app **and** by a database trigger | Digital-portfolio profile, CV analysis, smart job matching, feed, connections, messaging, events, analytics |
| **Alumni** | Alternative identity-verification flow: programme + graduation year + alumni number → `alumni_verifications` table → admin review | Full student capabilities once verified |
| **Business** | Separate registration + **admin approval** before access | Company profile, post opportunities (admin approval gate), candidate pipeline, business analytics |
| **Administrator** | **Never self-registerable** — provisioned via the `create-admin` Supabase Edge Function | User management, content moderation, opportunity approval, event publishing, platform-wide analytics, announcements |

### Feature highlights
- **AI assistant "Nexi"** — OpenAI-powered via a server-side Supabase Edge Function (API key never ships in the app bundle). Conversational career guide + NLP CV extraction (summary, skills, experience, suggestions) that merges into the user profile.
- **AI-narrated interactive tutorial** — first-login walkthrough, personalised by the AI.
- **Smart job matching** — when an admin approves an opportunity, a database trigger notifies only students whose profile skills intersect the listing. Never a broadcast.
- **Real-time everything** — Supabase Realtime WebSockets (no polling) for feed posts, comments, reactions, direct messages, and notifications.
- **Video/photo posts** — images compressed on pick; videos get generated thumbnails (expo-video-thumbnails) before storage; media stored per-owner in a storage bucket with RLS.
- **Three analytics dashboards** — student, business, and admin (visual charts, not raw numbers).
- **Connections-based feed** — the activity feed ranks posts from your accepted connections first (role-adaptive, live — not static dummy content).
- **Admin announcements** — admins broadcast targeted announcements (all / students / alumni / businesses / admins); a DB trigger notifies every targeted user in real time and each dashboard shows the relevant updates.
- **Events with RSVPs**, career pathway explorer, endorsements, POPIA consent + privacy policy, profile visibility controls.

## 2. Technology Choices (and why)

### Mobile framework — React Native + Expo (JavaScript/TypeScript)
- **Why:** one codebase producing native iOS and Android apps (guideline-compliant); the team's existing web/JS skills made React Native the fastest, highest-quality path in a hackathon timeline.
- **Stack:** Expo SDK 57 · React Native 0.86 · Expo Router (file-based navigation) · Reanimated, Gifted Charts, Safe Area Context.
- **Alternatives considered:** Flutter (Dart would have been a new language for the whole team — slower iteration), .NET MAUI (weaker fit with our JS ecosystem).

### Database — Supabase (PostgreSQL)
- **Why relational (deliberate choice):** our data is deeply relational — profiles ↔ applications ↔ opportunities ↔ connections ↔ endorsements. Foreign keys, joins and aggregate queries (e.g. applicant pipeline with candidate profiles) are a natural fit for PostgreSQL.
- **Why Supabase specifically:** one platform bundles PostgreSQL + Auth (GoTrue) + Realtime WebSockets + Storage + Edge Functions (Deno) — exactly the services this app needs, with Row Level Security for backend-enforced RBAC.
- **NoSQL alternatives considered:** Firestore/MongoDB — document stores would complicate our relational queries and lack the integrated auth/realtime/RLS model.

### Security architecture
- **Row Level Security** policies on every table — role-based access control is enforced **in the database**, not by hiding screens.
- Database **triggers** enforce business rules: student email-domain restriction, opportunity approval gate, role-change freeze (nobody can self-promote to admin), auto-notifications (connection requests, applications, opportunity matches, comments).
- Edge Functions hold all secrets (OpenAI key, service-role key) **server-side only**.

---

## 3. Architecture

```
┌────────────────────────────────┐
│   Expo / React Native app      │  iOS · Android · Web
│   src/app (routes)             │
│   src/components (screens)     │
│   src/lib (supabase, social)   │
└───────────────┬────────────────┘
                │ HTTPS + WebSocket
┌───────────────▼────────────────┐
│            SUPABASE            │
│  Auth · PostgreSQL + RLS       │
│  Realtime (WebSockets)         │
│  Storage (`media` bucket)      │
│  Edge Functions (Deno):        │
│   • ai-assistant (OpenAI)      │
│   • create-admin               │
│   • delete-user (admin removal)│
└────────────────────────────────┘
```

**Database schema (14 tables):** `profiles`, `posts`, `comments`, `reactions`, `connections`, `messages`, `notifications`, `opportunities`, `applications`, `events`, `event_rsvps`, `endorsements`, `alumni_verifications`, `announcements`

**Migrations:** `supabase/migrations/0001_init.sql` → `0006_admin_deletes.sql` (run in order)

## 4. Setup Instructions

### Prerequisites
- Node.js 18+
- A free [Supabase](https://supabase.com) project
- Expo Go app on a physical device (or an Android emulator / iOS simulator)

### 1. Install dependencies
```bash
npm install
```

### 2. Configure Supabase
Follow **`supabase/SETUP.md`**. Summary — apply the migrations in order:
```bash
supabase/migrations/0001_init.sql
supabase/migrations/0002_realtime_social.sql
supabase/migrations/0003_events_video.sql
supabase/migrations/0004_alumni_verification.sql
supabase/migrations/0005_announcements.sql
supabase/migrations/0006_admin_deletes.sql
```
Copy `.env.example` to `.env` and fill in your project values:
```
EXPO_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your publishable anon key>
```

### 3. Deploy the AI Edge Function
```bash
supabase functions deploy ai-assistant
supabase secrets set OPENAI_API_KEY=sk-...
```
*(Without the key, Nexi degrades gracefully to a built-in knowledge base — the app stays fully functional.)*

### 4. Run the app
```bash
npx expo start
```
Scan the QR code with **Expo Go** (Android/iOS), or press `w` for web, `a` for Android emulator.

### 5. Create the first administrator
Admins cannot self-register. Use the `create-admin` Edge Function (service-role protected) to provision the admin account, then log in through the app.

---

## 5. Project Structure

```
src/
  app/            Expo Router entry + layout
  components/     All screens (Landing, Login, Register, Dashboard,
                  BusinessDashboard, AdminDashboard, Jobs, Feed, Messages,
                  Network, Events, CV, ChatBot, Tutorial, Analytics…)
  lib/            Supabase client, realtime helpers, notifications
  theme/          Design system (brand tokens)
supabase/
  migrations/     SQL schema, RLS policies, triggers (4 files)
  functions/      Deno Edge Functions (ai-assistant, create-admin)
```

---

## 6. Team

| Member | Role / contribution |
|---|---|
| *(add each team member + student number)* | *(feature ownership — keep in sync with commit history)* |

---

## 7. Demo Accounts (for the live presentation)

| Role | Email | Notes |
|---|---|---|
| Student | `student@my.richfield.ac.za` | seeded skills + CV text |
| Alumni | *(pending verification demo)* | show admin approval flow |
| Business | `business@example.com` | approved, has a posted opportunity |
| Admin | *(provisioned via create-admin)* | approval + analytics demo |

---

## 8. POPIA & Privacy

POPIA consent is mandatory at registration. The in-app Privacy Policy documents data collection and usage. Profile visibility controls let users choose which sections are visible to business users, fellow students, alumni, and the public. Row Level Security guarantees data isolation between roles — business users only ever see what a student has explicitly made visible.



