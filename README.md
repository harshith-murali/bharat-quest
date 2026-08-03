# Bharat Quest AI — Phase 1 & 2

An educational quiz game for classroom smartboards. Students take turns answering India geography and history questions. Tracks XP, missions, and weekly leaderboard. Works fully **offline** — syncs to backend when network is restored.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| Backend | Node.js + Fastify + TypeScript |
| Database | PostgreSQL |
| Offline | IndexedDB via `idb` library |
| Content | Static JSON (no CMS in Phase 1-2) |

---

## Prerequisites

- **Node.js** v18+ (with npm)
- **PostgreSQL** running locally (default port 5432)

> **No Docker required.** If you use Docker for Postgres, just ensure port 5432 is exposed.

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
```

Copy the env file and fill in your database credentials:

```bash
cp .env.example .env
# Edit .env — set DATABASE_URL to your Postgres connection string
# Example: postgresql://postgres:yourpassword@localhost:5432/bharat_quest
```

Create the database (first time only):

```bash
psql -U postgres -c "CREATE DATABASE bharat_quest;"
```

Seed the database (creates tables + 1 section + 6 students):

```bash
npm run seed
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
# Runs on http://localhost:5173
```

Open **http://localhost:5173** in your browser.

---

## Running a Full Session (End-to-End)

1. **Select section** — click "Grade 4 - A" on the home screen
2. **Spin** — press the "🎰 Spin!" button to pick the first student
3. **Answer** — tap one of the 4 large answer buttons
4. **Continue** — after answering, spin again for the next student
5. **Advance mission** — once all 5 questions in a mission are answered at least once, the "🚀 Advance" button lights up — tap it to move to the next mission
6. **Leaderboard** — click the "🏆 Leaderboard" button to see weekly XP rankings

### Testing Offline Mode

1. Open DevTools → Network tab → set throttle to "Offline"
2. Keep playing — quiz, XP, and turns all work locally
3. The orange banner confirms offline mode
4. Re-enable network → watch the sync indicator flash as data syncs automatically
5. Leaderboard will update with the synced results

---

## Project Structure

```
bharat-quest/
├── backend/
│   ├── src/
│   │   ├── server.ts          # Fastify entry point
│   │   ├── db.ts              # PostgreSQL pool
│   │   ├── seed.ts            # Schema creation + seed data
│   │   └── routes/
│   │       ├── sections.ts    # GET /sections, GET /sections/:id
│   │       └── sync.ts        # POST sync-attempts, GET leaderboard
│   └── .env.example
└── frontend/
    └── src/
        ├── content/
        │   ├── missions.json  # 3 missions
        │   └── questions.json # 15 questions (5 per mission)
        ├── db/
        │   └── idb.ts         # IndexedDB (session_state, pending_sync_queue)
        ├── store/
        │   └── sessionStore.tsx  # React Context + useReducer (core state)
        ├── api/
        │   └── client.ts      # Typed fetch wrappers
        ├── components/
        │   ├── Spinner.tsx    # Turn queue + spin animation
        │   ├── QuizCard.tsx   # 4-option question card
        │   ├── StudentRow.tsx # Student tile with XP, turns, absent toggle
        │   └── OfflineBanner.tsx
        └── pages/
            ├── SectionSelectPage.tsx
            ├── GamePage.tsx
            └── LeaderboardPage.tsx
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/sections` | List all sections |
| GET | `/sections/:id` | Section + students with XP/level |
| POST | `/sections/:id/sync-attempts` | Deduped insert of quiz attempts, returns updated students |
| GET | `/sections/:id/leaderboard?week=current` | Weekly XP leaderboard (SQL-computed) |
| GET | `/health` | Health check |

### Sync Endpoint — Deduplication

The `POST /sync-attempts` endpoint is idempotent — if you POST the same attempt UUID twice, the second insert is silently ignored (`ON CONFLICT DO NOTHING`). Safe to retry from the client.

---

## Data Model

### Postgres Tables

```sql
sections     -- id, name, current_mission_id, map_position
students     -- id, section_id, name, avatar, level, total_xp, coins, gems, badges, last_turn_at
quiz_attempts -- id (client UUID), student_id, question_id, correct, xp_awarded, answered_at, synced_at
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

## Content

15 NCERT EVS-aligned questions (Grade 1–5 appropriate):

- **Mission 1 — Delhi → Agra**: Taj Mahal, national bird/animal, Yamuna river
- **Mission 2 — Agra → Varanasi**: River Ganga, Kashi, Dev Deepawali, Bay of Bengal
- **Mission 3 — Varanasi → Kerala**: Kerala spices, state animal, Kathakali, Black Gold (pepper)

---

## Development Notes

- Backend proxied via Vite (`/api` → `localhost:3001`) — no CORS issues in dev
- The seed script is **idempotent** — safe to run multiple times
- XP level formula: `level = floor(total_xp / 100) + 1` (same on server and client)
- Optimistic UI: XP updates locally on answer, then authoritative server values overwrite on sync

---

## What's NOT in Phase 1-2

- No 3D map or Three.js
- No mascot or AI/LLM calls
- No individual student login
- No CMS — content is static JSON
- No multi-school support
