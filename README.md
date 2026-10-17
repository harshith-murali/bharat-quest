<p align="center">
  <img src="https://img.shields.io/badge/React_18-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=threedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Fastify-000000?style=for-the-badge&logo=fastify&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
</p>

# Bharat Quest AI — Offline-First 3D Classroom Learning Platform

> An educational 3D quiz and adventure platform designed for Indian classroom smartboards. Students take turns exploring a 3D interactive map of India, answering geography, history, and civics questions state-by-state guided by a lion mascot. Features an **offline-first** architecture with IndexedDB client caching and idempotent PostgreSQL sync, turn fairness algorithms, and an AI conversational tutor with offline fact fallbacks.

🔗 **Live Demo:** [bharat-quest-one.vercel.app](https://bharat-quest-one.vercel.app)  
📦 **Repository:** [github.com/harshith-murali/bharat-quest](https://github.com/harshith-murali/bharat-quest)

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 18 + Vite + TypeScript | High-performance SPA optimized for smartboard touch screens |
| **3D Rendering** | Three.js + React Three Fiber + `@react-three/drei` | Interactive 3D India map, animated mascot, and spline navigation |
| **Backend API** | Node.js + Fastify + TypeScript | Lightweight, low-overhead REST API with schema validation |
| **Database** | PostgreSQL | Authoritative data store for classrooms, rosters, attempts, and XP |
| **Authentication** | JWT in `HttpOnly` cookie + bcrypt | Role-based access control (Admin / Teacher); students do not need accounts |
| **Offline Engine** | IndexedDB via `idb` | Complete offline playability: quiz, queue, turn fairness, and optimistic XP |
| **AI Mascot** | Hugging Face Router / OpenAI compatible | Topic-guarded educational dialogue with keyword-based offline fallback |
| **Testing** | Vitest + React Testing Library | Unit and integration test coverage across frontend and backend |
| **Deployment** | Docker Compose + Nginx reverse proxy | Production-ready stack designed for AWS ECS/Fargate + RDS |

---

## 🌟 Key Architecture & Highlights

### 1. Offline-First Resilience & Idempotent Sync
Classrooms often face intermittent connectivity. Bharat Quest handles this transparently:
- **Client Cache**: Student rosters, quest checkpoints, and turn state are cached locally in IndexedDB.
- **Optimistic Progression**: Quizzes and XP increments execute instantly on the client with UUIDv4 attempt keys stored in `pending_sync_queue`.
- **Idempotent Sync**: Upon network reconnection, cached attempts flush to `POST /sections/:id/sync-attempts`. The backend query executes:
  ```sql
  INSERT INTO quiz_attempts (id, student_id, question_id, correct, xp_awarded, answered_at)
  VALUES ($1, $2, $3, $4, $5, $6)
  ON CONFLICT (id) DO NOTHING;
  ```
  Only newly inserted rows update server-side student XP totals, completely preventing duplicate points on retries.

### 2. Fair Turn Scheduler (No Child Left Behind)
A classroom smartboard requires engaging every student equitably:
- Students with `last_turn_at = NULL` receive top priority.
- Remaining students are sorted ascending by `last_turn_at` (longest wait time goes first) with minute random jitter to break ties.
- Absent students are skipped without updating their timestamp, giving them natural priority when they return.

### 3. Topic-Guarded AI Mascot with Offline Fallback
- The lion mascot answers questions about state history, culture, and civics.
- Prompts are strictly guarded against off-topic queries and student PII is never transmitted.
- If network access is down or `HF_API_KEY` is omitted, the engine falls back deterministically to seeded `state_facts` using keyword extraction.

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- **Node.js** ≥ 20.x
- **PostgreSQL** ≥ 14.x (or Docker)

### 1. Clone & Enter Project
```bash
git clone https://github.com/harshith-murali/bharat-quest.git
cd bharat-quest
```

### 2. Configure Backend
```bash
cd backend
npm install
cp .env.example .env
```

Create the PostgreSQL database:
```bash
psql -U postgres -c "CREATE DATABASE bharat_quest;"
```

Run migrations and seed demo data:
```bash
npm run migrate         # Idempotent table creation
npm run seed             # 1 demo section + 6 student profiles
npm run seed:classrooms  # Class 3-7 × Section A-D classrooms
npm run seed:facts       # State facts for Facts panel & AI fallback

# Seed the first administrator
ADMIN_EMAIL=head@school.test ADMIN_PASSWORD='choose-a-strong-password' npm run seed:admin

# Start backend dev server
npm run dev
# Server running at http://localhost:3001
```

### 3. Configure Frontend
```bash
cd ../frontend
npm install
npm run dev
# Frontend running at http://localhost:5173 (proxies /api → localhost:3001)
```

Open **http://localhost:5173** in your browser.

---

## 🐳 Docker Deployment (Production Parity)

A complete multi-container stack with Nginx reverse proxy, Fastify backend, and PostgreSQL:

```bash
cp .env.docker.example .env
docker compose up --build -d
```
- **Web App (Nginx)**: `http://localhost:8080` (routes `/api` to the backend)
- **Backend**: Internal service network

Seed the containerized database:
```bash
docker compose exec backend npm run seed
docker compose exec backend npm run seed:classrooms
docker compose exec backend npm run seed:facts
docker compose exec backend env ADMIN_EMAIL=head@school.test ADMIN_PASSWORD='choose-a-strong-password' npm run seed:admin
```

---

## 📡 REST API Reference

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/sections` | Public | List all school sections (Class 3-7) |
| `GET` | `/sections/:id` | Public | Section details with roster, student XP, and levels |
| `POST` | `/sections/:id/sync-attempts` | Public | Idempotent bulk sync of offline quiz attempts |
| `GET` | `/sections/:id/leaderboard` | Public | Weekly XP leaderboard computed via SQL |
| `GET` | `/progress/:sectionId` | Public | Query authoritative quest map checkpoints |
| `PUT` | `/progress/:sectionId` | Public | Upsert unlocked and completed states |
| `GET` | `/facts/:stateName` | Public | Fetch curated NCERT facts for a state |
| `POST` | `/chat` | Public | Ask mascot a question; rate-limited per classroom |
| `POST` | `/auth/login` | Public | Staff authentication (Admin / Teacher) |
| `GET` | `/auth/me` | Staff | Validate current session and retrieve permissions |
| `GET/POST`| `/admin/students` | Staff | CRUD management for classroom rosters |
| `GET` | `/health` | Public | Service liveness health probe |
| `GET` | `/ready` | Public | Database readiness health probe |

---

## 🧪 Testing Suite

```bash
# Backend unit & integration tests
cd backend
npm test
npm run test:coverage

# Frontend unit & component tests
cd ../frontend
npm test
npm run test:coverage
```

*(Note: Three.js WebGL scenes are visually verified as jsdom has no native hardware WebGL context).*

---

## 📄 License
MIT License. Built for Bharat Quest AI.
