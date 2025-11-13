# Classroom Clicker

Classroom Clicker is a monorepo that powers a web-based clicker experience for teachers and students. Teachers create classes, lessons, and single-question quizzes; students receive real-time notifications when a quiz starts and can respond from their dashboards. Admins manage users and classes. The repository contains:

- **backend/** – Express + TypeScript API backed by PostgreSQL via Prisma, including JWT auth, role-based routing, WebSocket notifications, and password reset flows.
- **frontend/** – React 18 + Vite application using Redux Toolkit, React Query, and MUI for a feature-first UI.
- **shared/** – TypeScript contract definitions consumed by both backend and frontend.

## Key Features

- Teacher dashboard for managing classes, lessons, quizzes, and viewing real-time response stats.
- Student dashboard with live quiz activation alerts (Socket.IO) and retake-aware flows.
- Admin user management, including CSV user import.
- Password reset experience for teachers and students (token-based, surfaced in dev for easy testing).
- Docker-first development scripts (`dev.sh`, `dev-detached.sh`) for spinning up backend, frontend, Postgres, pgAdmin, and nginx.

## Getting Started

### Prerequisites

- Node.js 18+
- npm (shipped with Node)
- Docker + Docker Compose (if you prefer containerized dev)

### Environment

You need two dedicated `.env` files plus an optional root override:

1. **Backend (`backend/.env`)** – Source of truth for Prisma + Express (copy from `backend/.env.example`). `docker-compose` automatically loads this file via `env_file`, so you only need to maintain secrets such as `JWT_SECRET` once. Use local-friendly values (DB host `localhost`, etc.); Compose overrides `DATABASE_URL` internally to point at the `db` service.
2. **Frontend (`frontend/.env`)** – Vite-only vars prefixed with `VITE_` (copy from `frontend/.env.example`). Typically just `VITE_API_URL`.
3. **Root (`.env`, optional)** – Only needed if you want to define additional Docker Compose substitutions or script-specific overrides. You can leave it absent for most workflows now that Compose reads `backend/.env`.

For SMTP you can point to Mailhog/Mailtrap during development. Setting `DISABLE_EMAIL=true` in `backend/.env` skips delivery and simply logs the token; `EXPOSE_RESET_TOKEN=true` returns the token to the API caller for convenience.

### Install Dependencies

```bash
npm install            # installs the root dependencies and workspace hoists
cd backend && npm install
cd ../frontend && npm install
```

### Database Setup

The Prisma schema lives in `backend/prisma/schema.prisma`.

```bash
cd backend
npx prisma migrate deploy     # applies committed migrations
npx prisma generate           # regenerates Prisma Client
npm run seed                  # optional: seed sample data
```

### Running the Apps

**Backend**

```bash
cd backend
npm run dev
```

This runs the Express API with hot reload (ts-node-dev) and automatically connects to Postgres.

**Frontend**

```bash
cd frontend
npm run dev
```

The Vite dev server runs at `http://localhost:5173`. It expects the backend at `http://localhost:3000`.

### Full Stack via Docker

Run everything (backend, frontend, Postgres, pgAdmin, nginx proxy) using the helper script:

```bash
./dev.sh          # foreground
./dev-detached.sh # background
```

## Testing & Linting

- **Full stack tests**: `./scripts/run-tests.sh` (runs backend Jest suite then frontend Vitest suite).
- **Backend unit tests (Jest + ts-jest)**: `cd backend && npm test` (watch) or `npm test -- --runInBand` for CI-friendly serial runs.
- **Frontend unit/component tests (Vitest + React Testing Library)**: `cd frontend && npm run test` (watch) or `npm run test:run` for a single run with coverage.
- **Frontend TypeScript check**: `cd frontend && npx tsc --noEmit`
- **Backend TypeScript check**: `cd backend && npx tsc --noEmit`

### Backend testing details
- Jest picks up any `*.test.ts` under `backend/src/**`; keep unit tests close to the modules they cover (e.g., `middleware/auth.test.ts`).
- `ts-jest` compiles tests against `tsconfig.test.json`, and `src/test/setup.ts` seeds required env vars (JWT secrets, client URL). Override via `.env` if you need different values.
- To run a single spec: `cd backend && npm test -- src/middleware/auth.test.ts`.
- Integration tests that hit Express routes should import the shared `app` and use Supertest; keep Prisma usage mocked unless a SQLite test harness is explicitly added.

### Frontend testing details
- Vitest looks for files named `*.test.ts(x)` in `frontend/src/**`; colocate them under `__tests__` folders to mirror component structure.
- The test environment is jsdom with React Testing Library helpers pre-configured in `src/test/setup.ts` (jest-dom matchers, cleanup, `matchMedia` polyfill).
- Watching mode (`npm run test`) keeps Vitest hot; use `npm run test:run -- --runTestsByPath src/shared/ui/__tests__/RoleRoute.test.tsx` for targeted CI-friendly runs.
- RTL guidance: mock translation/state hooks at the module level (`vi.mock("@/hooks/useTranslation", ...)`) and assert UI/dispatch side-effects rather than implementation details.

ESLint is not configured yet in this repo; use the TypeScript compiler and the new test suites to keep regressions out.

## Password Reset Flow (Dev Notes)

- POST `/auth/password/forgot` to request a reset token. In non-production mode the token is logged and returned in the response for testing.
- POST `/auth/password/reset` with `{ token, password }` to update the password.
- Frontend pages are available at `/forgot-password` and `/reset-password`.

## Real-time Quiz Updates

- Socket.IO is initialized in `backend/src/services/socket.service.ts`.
- Students join their own rooms; teachers join rooms keyed by their ID.
- When a quiz response is recorded, the teacher receives a `quiz:responses-updated` event and the UI automatically refreshes eligible/remaining counts and the responses table.

## Contributing

1. Fork/branch from `main`.
2. Make changes in backend/frontend/shared as needed.
3. Run the TypeScript checks.
4. Commit with a descriptive message.
5. Open a PR.

See `agents.md` for multi-agent collaboration instructions and role definitions.
