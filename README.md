# Bharat Quest AI

An educational quiz game for classroom smartboards. Students take turns exploring a 3D map of India, answering geography/history/civics questions state-by-state, guided by a lion mascot. Tracks XP, quest progression, and a weekly leaderboard. Works fully **offline** — syncs to the backend when the network is restored.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| 3D | react-three-fiber + drei + Three.js (India map, car animation, lion mascot) |
| Backend | Node.js + Fastify + TypeScript |
| Database | PostgreSQL |
| Auth | JWT in an httpOnly cookie + bcrypt, role-based (admin / teacher) |
| AI Chat | Any OpenAI-compatible Hugging Face inference model, with an offline fact-based fallback |
| Offline | IndexedDB via `idb` (client cache; Postgres is the source of truth) |
| Testing | Vitest (backend + frontend), Testing Library |
| Deployment | Docker Compose (nginx + Fastify + Postgres), designed for ECS/Fargate + RDS |

---

## Prerequisites

- **Node.js** v20+ (with npm)
- **PostgreSQL** running locally (default port 5432) — or use Docker (see below)

---

## Setup Instructions

### 1. Clone & enter project

```bash
cd bharat-quest
```

### 2. Set up the backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env — set DATABASE_URL to your Postgres connection string
# Example: postgresql://postgres:yourpassword@localhost:5432/bharat_quest
```

Create the database (first time only):

```bash
psql -U postgres -c "CREATE DATABASE bharat_quest;"
```

Run migrations, then seed demo data:

```bash
npm run migrate         # creates/updates all tables (idempotent)
npm run seed             # 1 demo section + 6 students
npm run seed:classrooms  # Class 3-7 × Section A-D classroom rows
npm run seed:facts       # state facts used by the Facts panel + chat fallback

# Create the first admin account (required to sign in to the admin panel)
ADMIN_EMAIL=head@school.test ADMIN_PASSWORD='choose-a-strong-password' npm run seed:admin
```

Start the backend dev server:

```bash
npm run dev
# Runs on http://localhost:3001
```

### 3. Set up the frontend

```bash
cd ../frontend
npm install
npm run dev
# Runs on http://localhost:5173 (proxies /api → localhost:3001)
```

Open **http://localhost:5173** in your browser.

---

## Running with Docker (production-parity stack)

```bash
cp .env.docker.example .env
# Edit .env — set JWT_SECRET (openssl rand -base64 48) and POSTGRES_PASSWORD

docker compose up --build
# Frontend: http://localhost:8080 (nginx, proxies /api to the backend)
# Backend:  internal only, reachable via the frontend's /api proxy
```

Seed the freshly created database from inside the running backend container:

```bash
docker compose exec backend npm run seed
docker compose exec backend npm run seed:classrooms
docker compose exec backend npm run seed:facts
docker compose exec backend env ADMIN_EMAIL=head@school.test ADMIN_PASSWORD='choose-a-strong-password' npm run seed:admin
```

`docker-compose.prod.yml` is the single-host production variant — no bundled Postgres (points `DATABASE_URL` at RDS or another managed instance instead):

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

See `backend/.env.example` and `.env.docker.example` for every configuration option (CORS origin, cookie security, chat rate limits, HF model settings, etc.).

---

## Core Flows

### Sign-in

1. From the home screen, pick a classroom (Class 3-7 × Section A-D)
2. Staff (teachers/admins) sign in via **Staff Login** to reach the Dashboard and Admin panel; students never authenticate — they're chosen via the turn spinner on a shared smartboard

### Quest Mode (primary experience)

1. From the Dashboard, select **Quest** to open the 3D map of India
2. The mascot (lion guide) drives a car between states as the class progresses
3. At each state: view **Facts**, **Talk** to the mascot (AI chat, topic-guarded to Indian geography/history/culture), or take the state's quiz
4. Answering questions correctly unlocks the next state and awards XP; a monument-reveal modal celebrates milestones
5. Completing all quest states triggers the Game Victory modal

### Admin Panel

Signed-in teachers manage students in their assigned classroom(s); admins manage every classroom and staff account, from `/session/:sectionId/admin`.

### Testing Offline Mode

1. Open DevTools → Network tab → set throttling to "Offline"
2. Keep playing — quiz, XP, and turns all work locally (IndexedDB)
3. The orange banner confirms offline mode
4. Re-enable network → the sync indicator flashes as data syncs automatically
5. Leaderboard and quest progress update with the synced results

---

## Project Structure

```
bharat-quest/
├── backend/
│   └── src/
│       ├── server.ts           # Fastify entry point (CORS, helmet, rate limit, JWT cookie)
│       ├── db.ts                # PostgreSQL pool
│       ├── auth.ts              # Session verification + RBAC helpers
│       ├── migrate.ts           # Idempotent schema migration
│       ├── seed.ts / seedClassrooms.ts / seedFacts.ts / seedAdmin.ts
│       ├── data/stateFacts.ts   # Seeded facts (chat fallback + Facts panel)
│       └── routes/
│           ├── auth.ts          # login/logout/me + staff account management
│           ├── sections.ts      # GET /sections, GET /sections/:id
│           ├── sync.ts          # POST sync-attempts, GET leaderboard
│           ├── progress.ts      # Server-authoritative quest progression
│           ├── facts.ts         # Per-state facts
│           ├── chat.ts          # AI "Talk" endpoint + offline fallback
│           └── admin.ts         # Student CRUD, classroom lookup (RBAC-scoped)
└── frontend/
    └── src/
        ├── App.tsx              # Routes
        ├── content/             # Quest state landmarks, mascot dialogue
        ├── db/idb.ts             # IndexedDB (session_state, pending_sync_queue)
        ├── store/sessionStore.tsx  # React Context + useReducer (core state)
        ├── api/client.ts        # Typed fetch wrappers
        ├── loaders/             # Quest/question content loaders
        ├── utils/               # Coordinate scaling, route engine
        ├── components/
        │   ├── 3d/              # India map scene, car, lion mascot, route spline
        │   ├── FactsPanel.tsx / TalkPanel.tsx
        │   ├── QuizCard.tsx / GenericQuizCard.tsx / Spinner.tsx / RosterDrawer.tsx
        │   └── *Modal.tsx       # Monument reveal, state arrival, game victory
        └── pages/
            ├── SectionSelectPage.tsx / StaffLoginPage.tsx
            ├── DashboardPage.tsx / MapScreen.tsx / QuestStatePage.tsx
            ├── QuizScreen.tsx / LeaderboardPage.tsx / AdminPage.tsx
            └── NotFoundPage.tsx
```

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/sections` | — | List all sections |
| GET | `/sections/:id` | — | Section + students with XP/level |
| POST | `/sections/:id/sync-attempts` | — | Deduped insert of quiz attempts, returns updated students |
| GET | `/sections/:id/leaderboard?week=current` | — | Weekly XP leaderboard (SQL-computed) |
| GET | `/progress/:sectionId` | — | Quest progression (unlocked/completed states) |
| PUT | `/progress/:sectionId` | — | Upsert quest progression |
| GET | `/facts/:stateName` | — | Facts for one state |
| GET | `/facts` | — | All facts, grouped by state |
| POST | `/chat` | — | Send a message to the mascot; persists transcript, rate-limited per section |
| GET | `/chat/:sectionId` | — | Chat transcript for a section |
| POST | `/auth/login` / `/auth/logout` | — | Staff sign-in / sign-out |
| GET | `/auth/me` | staff | Current signed-in user |
| GET/POST/PATCH/DELETE | `/auth/users*` | admin | Manage staff accounts |
| GET/POST/PATCH/DELETE | `/admin/students*` | staff (RBAC-scoped) | Manage students |
| GET | `/admin/sections` / `/admin/sections/lookup` | staff | Classroom lookup |
| GET | `/health` | — | Liveness check |
| GET | `/ready` | — | Readiness check (verifies DB connectivity) |

### Sync Endpoint — Deduplication

`POST /sync-attempts` is idempotent — if you POST the same attempt UUID twice, the second insert is silently ignored (`ON CONFLICT DO NOTHING`). Safe to retry from the client.

### Auth Model

- **Students are never authenticated.** The app runs on a shared classroom smartboard; students are chosen by the turn spinner.
- **Staff accounts** (`admin` / `teacher`) sign in via `/auth/login`; the session is a JWT in an httpOnly cookie (`bq_session`, 12h expiry — a school day).
- **admin** manages every classroom and all staff accounts. **teacher** manages students only within classrooms they're assigned to (`user_sections`).
- Every request re-checks `is_active` so a deactivated or role-changed account loses access immediately, not at token expiry.

### Talk / Chat Guardrails

- System prompt scoped to Indian geography/history/culture/civics for the active quest state; off-topic questions are steered back.
- Per-section rate limit (`CHAT_RATE_LIMIT`, default 20/min).
- Full transcript persisted to Postgres for teacher review.
- Student names/identifiers are never included in the outbound model payload.
- With no `HF_API_KEY` configured, the endpoint still answers — it falls back to the seeded `state_facts` by keyword match — so Talk never hard-fails on a missing key or lost network.

---

## Data Model

### Postgres Tables

```sql
sections        -- id, name, grade, section_letter, current_mission_id, map_position
students        -- id, section_id, name, avatar, level, total_xp, coins, gems, badges, last_turn_at
quiz_attempts   -- id (client UUID), student_id, question_id, correct, xp_awarded, answered_at, synced_at
quest_progress  -- section_id, unlocked_states, completed_states, current_state, state_quiz_progress
state_facts     -- id, state_name, fact, category, sort_order
chat_messages   -- id, section_id, state_name, role (user/assistant), content, created_at
users           -- id, email, password_hash, name, role (admin/teacher), is_active, last_login_at
user_sections   -- user_id, section_id (which classrooms a teacher may manage)
```

### IndexedDB Stores (browser)

```
session_state      -- keyed by section_id; holds turn queue, mission state, cached students
pending_sync_queue -- keyed by attempt UUID; cleared after successful sync
```

---

## Turn Fairness Logic

- Students with `last_turn_at = NULL` (never had a turn) are **highest priority**
- Then sorted by `last_turn_at` **ascending** (longest time since last turn = earlier in queue)
- Small random jitter breaks ties among students with equal recency
- After all present students complete a round, the queue rebuilds using the updated `last_turn_at` values
- **Absent students**: `last_turn_at` is never updated while absent → they gain natural priority on return
- **Skip**: moves student to end of current round without changing their `last_turn_at`

---

## Testing

```bash
# Backend
cd backend
npm test              # run once
npm run test:watch    # watch mode
npm run test:coverage

# Frontend
cd frontend
npm test
npm run test:watch
npm run test:coverage
```

3D scenes (`components/3d/**`, `components/map/**`) are excluded from automated coverage — jsdom has no WebGL context — and are verified visually instead.

---

## Development Notes

- Backend proxied via Vite (`/api` → `localhost:3001`) in dev, and via nginx (`/api` → `backend:3001`) in the Docker stack — no CORS issues in either.
- All seed scripts (`seed`, `seed:classrooms`, `seed:facts`, `seed:admin`) and `migrate` are **idempotent** — safe to run multiple times.
- XP level formula: `level = floor(total_xp / 100) + 1` (same on server and client).
- Optimistic UI: XP updates locally on answer, then authoritative server values overwrite on sync.
- Postgres is the source of truth for quest progression; IndexedDB is purely an offline cache that pushes to `/progress/:sectionId` when online.
- `JWT_SECRET` and `DATABASE_URL` are required at boot in production (`NODE_ENV=production`) — the server fails fast rather than serving requests it can't secure.

---

## Content

Quest mode covers the 30 canonical states/UTs on the map (see `frontend/src/loaders/questLoader.ts`), each with:
- A set of NCERT-aligned quiz questions (Grade 1-7 appropriate)
- Seeded facts (`state_facts`, via `npm run seed:facts`) used by the Facts panel and the Talk chat fallback
- Mascot dialogue and a monument to reveal on completion (`frontend/src/content/`)

