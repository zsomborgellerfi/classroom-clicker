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

1. Copy `.env.example` to `.env` in the repository root and update values as needed.
2. Ensure `DATABASE_URL` points to a running PostgreSQL instance (local Docker or remote).
3. Configure SMTP creds if you want password reset emails to be sent. For local testing we recommend Mailhog/Mailtrap; leaving the fields blank will cause the backend to skip sending emails and simply log a token in the console.

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

- **Frontend TypeScript check**: `cd frontend && npx tsc --noEmit`
- **Backend TypeScript check**: `cd backend && npx tsc --noEmit`

ESLint is not configured yet in this repo; use the TypeScript compiler to ensure type safety.

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
