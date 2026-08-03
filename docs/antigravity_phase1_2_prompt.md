Build Phase 1 and Phase 2 of a web app called "Bharat Quest AI" — an educational quiz game for a single classroom smartboard (touch-first, shared screen, no individual student logins). Do NOT build any 3D, mascot, or AI/LLM features yet — this phase is the core data/gameplay loop and offline sync only, using placeholder flat UI.

## Tech stack to use
- Frontend: React (Vite), TypeScript
- Backend: Node.js with Fastify (or NestJS), TypeScript
- Database: PostgreSQL
- Offline storage: IndexedDB (use the `idb` npm library for a clean promise-based wrapper)
- No CMS integration yet — use a static local JSON file for questions/missions in this phase

## Data model to implement

Postgres tables:
- `schools`: id (uuid), name
- `sections`: id (uuid), school_id (fk), name, current_mission_id, map_position (integer)
- `students`: id (uuid), section_id (fk), name, avatar (string/url), level (int, default 1), total_xp (int, default 0), coins (int, default 0), gems (int, default 0), badges (jsonb array)
- `quiz_attempts`: id (uuid), student_id (fk), question_id (string, references static JSON question id), correct (boolean), xp_awarded (int), answered_at (timestamptz), synced_at (timestamptz, nullable — null means not yet confirmed by client, set on insert)

Static local JSON (frontend, `/src/content/missions.json` and `/src/content/questions.json`):
- Missions: id, title, route_from, route_to, xp_reward, coin_reward
- Questions: id, mission_id, text, options (array of 4 strings), correct_option (index), xp_value

Seed with 3 sample missions and 5 sample questions each (India geography/history trivia) so the app is testable end to end.

IndexedDB stores (frontend only):
- `session_state`: keyed by section_id — holds shuffled_queue (array of student ids), turns_taken (map of student_id to count), current_mission_id, current_question_index
- `pending_sync_queue`: array of quiz_attempt objects with a client-generated UUID, awaiting sync to backend

## Backend API endpoints to build
- `GET /sections/:id` — returns section + its students with current XP/level
- `POST /sections/:id/sync-attempts` — accepts an array of quiz attempt objects (with client UUIDs), inserts any not already present (dedupe by UUID), recomputes and returns updated student XP/level totals
- `GET /sections/:id/leaderboard?week=current` — returns students ranked by SUM(xp_awarded) from quiz_attempts where answered_at falls in the current week (Monday to now), computed via SQL query, not a stored leaderboard table
- Basic seed script to create one school, one section, and 6 sample students

## Frontend features to build

**1. Section selection screen**
Simple screen: pick a section from a list (fetched from backend if online, else load last cached state from IndexedDB).

**2. Turn queue / fair spinner logic**
- On session load, build a shuffled queue of the section's students (Fisher-Yates shuffle).
- Weight the shuffle so students with fewer `turns_taken` (tracked historically, stored per student — for this phase just track within the current session, but structure the code so a "recency weight" input can later be passed in from historical data) are more likely to appear earlier in the queue.
- Build a simple spinner UI (can be a basic animated wheel or even a simple highlight-cycling list — visuals don't need to be polished yet) that lands on the next student in the queue when triggered, not a pure random pick each time.
- Once every student in the queue has had a turn, reshuffle and start a new round.
- Include a "skip to end of round" action that moves a student to the back of the current round's queue without removing them.
- Include a way to mark a student absent for the session (removes them from the queue entirely for that session).
- Show a simple "turns this session" indicator per student (e.g. a count or filled dots) in the UI.

**3. Quiz flow**
- Display the current mission's next unanswered question.
- Show 4 options as large touch-friendly buttons (minimum 60px tap height).
- On answer: determine correct/incorrect, compute XP (fixed value per question, from the static JSON, not variable per difficulty), update the current student's local XP immediately in UI state, write the attempt to the `pending_sync_queue` in IndexedDB with a new client UUID, and also optimistically update `students.total_xp` in local state so leaderboard/UI reflect it instantly without waiting for a network round trip.

**4. Manual mission advancement**
- A clearly visible "Advance to next mission" button, only enabled once all questions in the current mission have been answered at least once.
- Tapping it updates `sections.current_mission_id` / `map_position` locally (and queues this change for sync too) — this must be an explicit teacher action, never automatic.

**5. Offline-first sync**
- On app load, check if `pending_sync_queue` in IndexedDB is non-empty from a previous session; if so, attempt to sync it before loading anything new.
- Listen for the browser's `online` event; when it fires, flush the pending sync queue to `POST /sections/:id/sync-attempts`.
- On successful sync response, clear synced items from the local queue and update local student XP/level with the authoritative values returned from the backend (server values win over local optimistic values in case of any drift).
- The whole quiz/turn-taking/advancement flow above must work with the network fully disabled — test this explicitly.

**6. Basic leaderboard view**
- Simple screen showing current week's leaderboard for the selected section, fetched from `GET /sections/:id/leaderboard?week=current` when online; show a "leaderboard requires connection" state gracefully if offline (don't break the app).

## What NOT to build in this phase
- No 3D rendering, no Three.js, no map/car animation.
- No mascot/companion character or animations.
- No LLM/AI API calls of any kind.
- No CMS integration — static JSON only.
- No individual student login/auth — students are just rows tied to a section, selected via the turn queue only.
- No multi-school admin features beyond the basic seed data.

## Deliverable
A working local dev setup (README with setup instructions), a seeded Postgres database, and a functioning React app where a full class "session" can be run end-to-end — pick a section, cycle through fair student turns, answer quiz questions, manually advance missions, go offline mid-session and keep playing, come back online and see everything sync correctly, and view a weekly leaderboard.
