> ## ✅ SETUP STATUS — COMPLETE (as of 2026-09-12)
> The steps below have **already been applied** to the live Supabase project
> `gqecykdimbyqeegbjepz` (URL: https://gqecykdimbyqeegbjepz.supabase.co).
> Migration `0001_init.sql` ran successfully: **11 tables, 39 RLS policies,
> 10 functions, all triggers**. Email confirmation is **OFF** (demo mode).
> `.env` is filled in and `Login.js`/`Register.js` are wired to Supabase.
>
> ### Provisioned demo accounts (password for all: `DemoPass2026!`)
> | Account | Role | Status |
> |---|---|---|
> | `admin@careernextstep.app` | admin | active |
> | `test.student@my.richfield.ac.za` | student | active |
> | `demo.business@careernextstep.app` | business | **pending** (admin must approve — demonstrates the verification flow) |
>
> Verified working: real password login for admin + student; a `student@gmail.com`
> registration attempt was **rejected backend-side** with the Richfield-domain error.
>
> ### Security reminders before submission
> - Revoke the Personal Access Token used during setup: https://supabase.com/dashboard/account/tokens
> - Never commit `.env` or any `sb_secret_` / `service_role` key (the setup scripts that used them were deleted).

---


# Supabase setup for Career Next Step

This folder contains everything the team needs to connect the Expo app to a real
backend (database + auth + realtime + edge functions). The app still runs in a
**local-only mode** until `EXPO_PUBLIC_SUPABASE_URL` and
`EXPO_PUBLIC_SUPABASE_ANON_KEY` are set, so you can develop safely in parallel.

---

## 1. Create the project (5 minutes, one person)

1. Go to https://supabase.com → **Start your project** (free tier is enough).
2. Pick a region near you and a secure database password (save it).
3. Open **Project Settings → API** and copy:
   - **Project URL** → `EXPO_PUBLIC_SUPABASE_URL`
   - **anon / publishable key** → `EXPO_PUBLIC_SUPABASE_ANON_KEY`
4. Optional but recommended for the demo:
   **Authentication → Providers → Email**: switch **"Confirm email" OFF**
   (turn it back on before a real production release). Also, enable the
   **Google / LinkedIn** providers later if you want social logins.
5. Optional for push feedback: **Project Settings → API** enable **Realtime**
   for the `notifications` table (Dashboard → Database → Replication).

## 2. Connect the app to Supabase

Copy `.env.example` to `.env` (already done in this repo) and fill in the values:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

Then restart the dev server (`npx expo start --clear`). The login and register
screens now use Supabase Auth; if you delete the `.env` values the app falls
back to the old local accounts so nothing breaks.

> The anon key is a **public** key by design - security comes from Row Level
> Security in the database, not from this key.

## 3. Apply the database schema

`migrations/0001_init.sql` creates every table, trigger and RLS policy.

**Option A - Dashboard (easiest):**
1. Open your Supabase project → **SQL Editor** → **New query**
2. Paste the entire contents of `supabase/migrations/0001_init.sql` → **Run**

**Option B - CLI (repeatable):**
```bash
npm install -g supabase
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

You will see these objects afterwards:
`profiles`, `connections`, `posts`, `comments`, `reactions`, `messages`,
`endorsements`, `opportunities`, `applications`, `events`, `notifications`
+ 39 RLS policies + 11 triggers (student-domain lock, RBAC role freeze,
opportunity approval gate, smart job matching, notification triggers).

## 4. Provision the administrator (never self-registerable)

```bash
# from the supabase/ folder
supabase functions deploy create-admin

curl -X POST https://<project-ref>.supabase.co/functions/v1/create-admin \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{ "email": "admin@richfield.ac.za", "password": "ChangeMe!2026", "full_name": "Richfield Admin" }'
```

The `/functions/create-admin/index.ts` source is in this repo - read it before
deploying. Only this path (or the Dashboard's **Authentication → Users** +
direct `profiles` update) can create admins.

## 5. Test the flows

| Flow | Expected behaviour |
|---|---|
| Student signup | Blocked unless email ends with `@my.richfield.ac.za`, `@richfield.ac.za`, `@my.aaa.ac.za` or `@aaa.ac.za` |
| Business signup | Profile created with `status = 'pending'`; cannot post until admin approves |
| Jobs | Every business listing is created `pending`; invisible until admin approves → then **smart matching** notifies matching students |
| Admin login | `admin@...` + password created in step 4; role read from `profiles` |
| Notifications | Created server-side by triggers; subscribe with Realtime in the app |

## 6. Next milestones (map to the hackathon brief)

- [ ] Social: feed, connections, messages UI (tables ready)
- [ ] Video upload → Storage bucket + transcoding edge function (+ thumbnail)
- [ ] Chatbot / profile assistant edge function (OpenAI/Anthropic)
- [ ] NLP skill extraction from uploaded CVs (same function)
- [ ] Three chart-based dashboards (student / business / admin)
- [ ] Admin panels: user mgmt, content moderation, events, announcements
- [ ] POPIA: consent flags + privacy page

## Troubleshooting

- `Database error saving new user` on student signup → the domain trigger
  refused - use an `@...richfield.ac.za` / `@...aaa.ac.za` address.
- Login works but features say "permission denied" → check the user's
  `profiles.status` (pending/suspended) and that RLS policies were created.
- Web preview + realtime: React Native Web does not include a WebSocket
  transport - use an Android/iOS emulator or device for live notification demos.