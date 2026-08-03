# Product Requirements Document: Bharat Quest AI

**Status:** Draft — v1
**Owner:** [your name]
**Last updated:** August 2026

## 1. Overview

Bharat Quest AI is a web-based educational game designed for display on a classroom smartboard. Students take turns driving a car along a stylized 3D map of India, unlocking cities and monuments, and answering syllabus-aligned quiz questions. An animated mascot guides the experience. Progress and a weekly leaderboard are tracked per class section, persisting across sessions.

## 2. Goals

- Make learning interactive and game-like for a shared classroom setting (one smartboard, whole class).
- Track meaningful per-student progress and engagement without requiring individual logins or devices.
- Work reliably in classrooms with unstable or no internet during class time.
- Keep factual content accurate and syllabus-aligned — no live-generated facts.

## 2.1 Scope decisions (v1)

- **Deployment**: single school only. No multi-tenancy, no school-switching UI, no cross-school leaderboard in v1.
- **Grade range**: Grade 1–5. Content should draw primarily from NCERT EVS (Environmental Studies)/General Knowledge for this age range rather than the separate Geography/History/Civics subjects that typically begin around Grade 6. Age-appropriate content choices (e.g. state animals/festivals/food rather than abstract concepts like state capitals) should be considered when scoping the pilot question bank.
- **UI implications of Grade 1–5**: larger text, more visual/less text-heavy questions, and read-aloud/TTS support are higher priority than for an older age group, since younger students may not read fluently yet.
- **Turn fairness**: every student — present or previously absent — should get an equal chance over time. Absence should not create unfairness; a returning student should be prioritized based on how long it's actually been since their last turn, not penalized or reset. See FR4/FR4a and section 8 for the mechanism (recency-based queue, not a resettable weekly counter).

## 3. Non-goals (out of scope for v1)

- Individual student devices/accounts (this is a single shared-screen experience).
- Real-time multiplayer across multiple devices.
- Fully open-ended AI conversation with the mascot (stretch goal, not core).
- Native mobile apps (web only).
- Photorealistic 3D rendering (stylized 3D is the target aesthetic).

## 4. Users

- **Students**: come up to the board in turn, drive the journey, answer quiz questions.
- **Teacher**: selects the class section at session start, controls mission advancement, manages the roster, views leaderboard/progress.
- **Content team** (may be just the developer initially): writes and reviews quiz questions, tags them to syllabus chapters.

## 5. Core user flows

### 5.1 Session start
1. Teacher opens the app, selects their section (e.g. "Grade 6 - B").
2. App loads that section's saved progress (current mission, map position) and student roster with XP/level.
3. If offline, app loads from local cache (IndexedDB); if online, refreshes from backend first.

### 5.2 Turn-taking
1. App builds a shuffled turn queue for the session, weighted toward students who haven't had a turn recently.
2. Teacher triggers the spinner; it lands on the next student in the weighted queue.
3. That student comes to the board to answer the current question.
4. Teacher can skip/reshuffle a student to the end of the round if needed (without removing them from the queue).

### 5.3 Answering a question
1. Question is displayed (from cached/local content).
2. Selected student answers on the touchscreen.
3. Correct answer awards fixed XP to that student; result is written to local state immediately and queued for sync.
4. Mascot reacts (via LLM-varied phrasing of a verified fact, not live-generated facts).

### 5.4 Mission advancement
1. Teacher manually taps "advance" once the class is ready to move to the next city/mission.
2. No automatic threshold-based advancement.

### 5.5 Sync
1. Whenever the app detects connectivity, it flushes the pending local queue of quiz attempts to the backend.
2. Backend deduplicates by client-generated UUID and updates authoritative student/section records.

### 5.6 Leaderboard
1. Computed from `quiz_attempts` filtered to the current week (Monday reset), summed per student.
2. No separate leaderboard table — always derived from raw attempt data.

## 6. Functional requirements

| ID | Requirement |
|---|---|
| FR1 | App must support session-based progress per class section, persisting between classes. |
| FR2 | Each student within a section has individual XP, level, and badge tracking. |
| FR3 | Mission/map advancement is manual, teacher-triggered only. |
| FR4 | Turn queue must be fair: weighted by recency (time/sessions since last turn), not pure random and not a resettable weekly counter. |
| FR4a | Absence must not penalize a student's fairness priority. A student's `last_turn_at` should simply not update while absent; on return, they are naturally prioritized because more time has passed since their last turn than for students who attended every session. |
| FR5 | XP is awarded only for board-based answers (no parallel scoring mechanism). |
| FR6 | Core gameplay (quiz, XP, mission progress) must function with zero network connectivity. |
| FR7 | All local progress must sync to the backend once connectivity resumes, without data loss or duplication. |
| FR8 | Quiz content must be pre-written and human-reviewed before being published; no live LLM-generated facts. |
| FR9 | Mascot dialogue may use an LLM to vary phrasing of pre-verified facts/scripted lines. |
| FR10 | Leaderboard resets weekly (Monday), computed from raw attempt history, not manually reset data. This is separate from turn fairness (FR4/FR4a), which is never reset and tracks all-time recency so absences don't create permanent unfairness. |
| FR11 | Content must be tagged by class, subject, chapter, and syllabus topic code. |
| FR12 | Teacher can mark students absent (removed from turn queue for that session). |

## 7. Non-functional requirements

- Must run smoothly on modest classroom hardware (integrated graphics, older office PCs).
- Touch-first UI with large tap targets suitable for smartboard interaction at a distance.
- High contrast, legible text from the back of a classroom.
- No student PII beyond first name/avatar required for core functionality.

## 8. Data model summary

**CMS (content)**
- `missions`: id, title, route_from, route_to, xp_reward, coin_reward, syllabus_class, subject, chapter
- `questions`: id, mission_id, text, options, correct_option, xp_value, syllabus_topic_code, status, effective_from

**Postgres (progress, source of truth)**
- `sections`: id, name, current_mission_id, map_position — no `school_id` in v1 since only a single school is supported; can be re-added later without breaking this model if multi-school support is needed.
- `students`: id, section_id, name, avatar, level, total_xp, coins, gems, badges, **last_turn_at** (timestamptz, nullable — used for recency-based turn fairness; absence simply leaves this unchanged rather than being tracked as a separate flag/penalty)
- `quiz_attempts`: id, student_id, question_id, correct, xp_awarded, answered_at, synced_at

**IndexedDB (offline, session-local)**
- `session_state`: shuffled_queue, turns_taken, cached_missions, cached_questions
- `pending_sync_queue`: unsynced quiz_attempts with client UUIDs

## 9. Tech stack

- **Frontend**: React, React Three Fiber + Drei, GSAP, IndexedDB
- **Backend**: Node.js (NestJS/Fastify), PostgreSQL
- **Content**: Headless CMS (e.g. Sanity) with draft → reviewed → published workflow
- **AI companion**: Claude/GPT API via a thin serverless proxy, used only for mascot dialogue variation
- **3D assets**: Blender/Mixamo for mascot, low-poly sourced/custom assets for car and environment, exported as GLB

## 10. Success metrics (initial, directional)

- A teacher can run a full class session with zero visible glitches from an offline/online transition.
- Turn distribution across a week is roughly even per student (no student with zero turns while others have 3+, absent students excluded).
- Quiz content accuracy: zero factual errors in published (reviewed) content.
- Session load time and interaction responsiveness acceptable on target classroom hardware.

## 11. Phased delivery plan

- **Phase 1**: Core loop — sections, students, static question set, quiz flow, manual mission advancement, fair turn queue/spinner.
- **Phase 2**: Offline-first — IndexedDB caching, pending sync queue, background sync with dedup.
- **Phase 3**: 3D map and car.
- **Phase 4**: Mascot (animation pipeline, then LLM-based dialogue variation).
- **Phase 5**: Leaderboard and teacher reporting views.
- **Phase 6**: CMS content pipeline and syllabus tagging.
- **Phase 7**: Polish — monument reveal cards, performance pass, session recap export.

## 12. Open questions

- Resolved: single school in v1, Grade 1–5 scope (NCERT EVS/GK-oriented content), and absence handling (recency-based turn fairness, no penalty) — see section 2.1.
- Remaining: which specific state-mascot set to build first for the future mascot-per-state feature (see section 13), once pilot content/state coverage is finalized.

## 13. Future feature (not in v1 scope)

**Mascot per state**: instead of a single fixed companion character, each state has its own mascot based on that state's well-known animal or bird (e.g. tiger for West Bengal, peacock as a national/finale unlock). Reinforces state-symbol learning as a side effect of gameplay. Deferred to Phase 4+ to avoid front-loading 3D asset production; when built, should reuse a small number of base rigs (e.g. one mammal rig, one bird rig) across all state mascots rather than fully custom-modeling each one, and should launch with only the mascots needed for whichever states the pilot content covers.