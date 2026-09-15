# Presentation & Live Demo Guide (30–45 minutes)

Every team member presents, and all **four user types** are demonstrated live. Rehearse the timing below — the demo slot is strict.

## Presenter split (4 presenters ≈ 10 minutes each)

| Segment | Presenter | Minutes |
|---|---|---|
| 1. Problem, tech-stack justification & architecture | Presenter 1 | 0–10 |
| 2. Student + Alumni experience | Presenter 2 | 10–20 |
| 3. Business experience | Presenter 3 | 20–28 |
| 4. Admin experience, AI assistant & wrap-up | Presenter 4 | 28–40 |
| Buffer / questions | All | 40–45 |

## Segment 1 — Foundation (slides + architecture)
- The problem: graduate employability gap; no dedicated Richfield talent channel.
- **Justify the stack** (README §2): Expo/React Native (one codebase → iOS + Android), Supabase PostgreSQL (deeply relational data: profiles ↔ applications ↔ opportunities ↔ connections), why not Flutter/Firestore.
- Walk the **architecture diagram** (README §3): app → HTTPS + WebSocket → Supabase (Auth, Postgres + RLS, Realtime, Storage, Edge Functions incl. the OpenAI-powered `ai-assistant`).
- Emphasise: RBAC enforced **in the database** (Row Level Security + triggers), secrets only server-side.

## Segment 2 — Student & Alumni (phone/demo device)
1. Register a **student** with an institutional email (show the domain restriction rejecting a Gmail address if rehearsed).
2. Register an **alumnus** → show the identity-verification request (programme + graduation year + alumni number).
3. First-login **AI-narrated tutorial**; profile completion; AI assessment → results → career **pathway explorer (Roadmap)**.
4. **Network**: send a connection request (recipient gets a real-time notification), accept it, endorse a skill.
5. **Feed**: post a short video (show the generated thumbnail), react, comment — all real-time.
6. **Jobs**: browse, filter, apply. **Messages**: live WebSocket chat. **Events**: RSVP.
7. Point out the **student analytics charts** (line/bar/donut, live data).

## Segment 3 — Business
1. Log in as a **business** (distinct dashboard layout — sidebar + stats + charts).
2. **Company profile** (separate business profile structure).
3. **Post a Job** → emphasise it goes in as **`pending` — the admin approval gate** (show it is invisible to students until approved).
4. **Candidates & Applications** pipeline with match scores; **business analytics**.

## Segment 4 — Admin + AI
1. Log in as **admin** (distinct admin panel layout).
2. **Approvals**: approve the pending business account, approve the pending job (the trigger notifies matching students — show the student's notification), verify the alumnus.
3. **User management**: suspend/remove a user; show the suspended account blocked.
4. **Events**: create one → all students notified in real time. **Announcements**: broadcast to a chosen audience → appears on every dashboard.
5. **Statistics**: platform-wide charts.
6. **Nexi AI assistant**: ask a genuine, unscripted question live (it's a real OpenAI-backed assistant, not a decision tree) — and note it persists as an ongoing helper on **all four** dashboards.

## Demo hygiene
- Seed accounts ready **before** the slot (student, alumni, business, 2 admins); admin is provisioned via the `create-admin` Edge Function — never self-registered.
- Two devices/emulators side-by-side to demo real-time (notification appears instantly on the second device).
- Keep a fallback screen-recording in case of connectivity loss; the app also degrades gracefully offline.
