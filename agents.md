# Classroom Clicker Agents

## Why This Exists
- Keep multi-agent work aligned with the actual monorepo layout (`backend/`, `frontend/`, `shared/`, container scripts, and infra).
- Capture the domain language (classes, lessons, quizzes, responses) defined in `backend/prisma/schema.prisma` and the REST surface in `backend/src/routes`.
- Make it obvious where each agent hands off work so we do not duplicate efforts or drift from the TypeScript contracts shared with the React client.
- Document the feature-first frontend structure (`src/features/**`, `src/shared/ui`, `@` alias) so pages stay thin and behavior moves into testable components/hooks.

## Product Snapshot
- Web-based classroom clicker: teachers manage classes, lessons, and quizzes; students respond in real time; admins manage users.
- Backend (`backend/`): Express + TypeScript + Prisma/PostgreSQL, JWT auth (`backend/src/app.ts`, `backend/src/middleware`), password reset tokens, role-gated routers (`backend/src/routes`), and Socket.IO broadcasting (`backend/src/services/socket.service.ts`) for quiz activation + response updates.
- Frontend (`frontend/`): React 18 + Vite + Redux Toolkit + React Query + MUI (`frontend/src/App.tsx`, `frontend/src/store`), with socket listeners for students/teachers and dedicated password reset pages (`/forgot-password`, `/reset-password`).
- Shared contracts in `shared/types` keep models consistent between client and server builds.
- Docker-first local orchestration via `docker-compose.yml`, with dev scripts (`dev.sh`, `dev-detached.sh`) bootstrapping services plus `nginx/` edge proxy and `pgadmin/`.

## Domain Entities (from Prisma)
| Entity | Relationships / Notes |
| --- | --- |
| `User` | Roles: `ADMIN`, `TEACHER`, `STUDENT`; teachers own `Class` records, students enroll via `Class.students`; responses recorded per quiz (`backend/prisma/schema.prisma`). |
| `Class` | Tied to a single teacher; aggregates `Lesson` and enrolled students; counts used in controllers for dashboards (`backend/src/controllers/class.controller.ts`). |
| `Lesson` | Belongs to class; ordered by `createdAt`; holds quizzes (`backend/src/controllers/lesson.controller.ts`). |
| `Quiz` | Single-question quizzes with structured options; route handlers enforce 2–10 options and exactly one correct answer (`backend/src/controllers/quiz.controller.ts`). |
| `Question`, `QuizOption`, `Response`, `QuizAnswer` | Maintain quiz content and student submissions; cascade deletes propagate through Prisma relations. |

## Toolchain & Commands
- Backend: `npm run dev` (nodemon) / `npm run build` / `npm run seed`; Prisma CLI for schema migrations (`npx prisma migrate deploy`) and generation; environment via `.env` mirrored from `.env.example`; use `npx tsc --noEmit` for type checks.
- Frontend: `npm run dev` (Vite), `npm run build`; run `npx tsc --noEmit` to catch type errors until ESLint is configured.
- Containers: `docker-compose up --build` wires backend, frontend, Postgres, pgAdmin, and nginx; per-service Dockerfiles live under `backend/` and `frontend/`.
- Frontend aliasing: Vite + TS are configured with `@`→`src` and `@shared`→`../shared`; keep new feature code under `src/features/<domain>` and reusable UI in `src/shared/ui`.

## Collaboration Patterns
- **Contracts first**: Any schema/DTO change (REST or WebSocket payload) propagates `shared/types/` → backend validators (`backend/src/schemas`) → frontend API hooks (`frontend/src/lib/api.ts`, RTK slices, React Query hooks).
- **Auth-aware UX**: Role-based routing lives in `frontend/src/routes/ProtectedRoute.tsx` and `src/shared/ui/RoleRoute.tsx`; backend mirrors this with `authMiddleware` + `roleCheck`.
- **Password reset**: Tokens are issued via `/auth/password/forgot` (stored on the user record) and consumed via `/auth/password/reset`. In non-prod environments the token is logged/returned for dev convenience; production must rely on email delivery. Frontend pages live under `src/features/auth/pages`.
- **Realtime**: Student-facing sockets listen for `quiz:activated`; teacher sockets listen for `quiz:responses-updated`. Any payload tweak must be reflected in both backend emitters and frontend listeners plus React Query invalidations.
- **Componentization rule**: Pages under `src/features/*/pages` stay thin (data fetching + layout only). Move UI/logic into `src/features/*/components`, `src/features/*/hooks`, or `src/shared/ui` so responsibilities are testable and reusable.
- **Testing expectations**: Backend uses Jest (`backend/package.json`), though suites are thin—QA agent should backfill; frontend relies on manual/React Query testing for now.
- **Observability**: `/health` endpoint (`backend/src/app.ts`) is the lightweight liveness probe; additional metrics/logging are to be added by Platform/QA agents when needed.

## Agent Roster

### 1. Platform Architect Agent
- **Mission**: Guard system-wide coherence across services, environments, and shared abstractions.
- **Focus Areas**:
  - Define cross-cutting architecture choices (auth strategy, database boundaries, shared types).
  - Approve structural refactors affecting both client and server.
  - Ensure scripts (`dev.sh`, Dockerfiles, `docker-compose.yml`) stay in sync with source expectations.
- **Inputs/Outputs**:
  - Inputs: product requirements, infra constraints, feedback from feature agents.
  - Outputs: updated docs, high-level design notes, backlog of tech-debt tickets.
- **Escalations**: Changes that impact deployment topology, secrets handling, or schema migrations require Architect sign-off before implementation.

### 2. Backend/API Agent
- **Mission**: Own Express application logic, Prisma schema evolution, validation, and API stability.
- **Key Responsibilities**:
  - Manage controllers/services/middleware under `backend/src` and keep `PrismaClient` usage efficient.
  - Extend routers (`backend/src/routes`) with versioned endpoints and role enforcement.
  - Implement validation layers via Zod schemas (`backend/src/schemas`) plus shared DTOs.
  - Maintain JWT auth flows (`backend/src/controllers/auth.controller.ts`, `backend/src/middleware/auth.ts`), password hashing (bcrypt), and password reset lifecycle (tokens, expirations, migrations).
  - Make sure migrations + seeds (`backend/src/db/seed.ts`) cover new models.
  - Keep Socket.IO events (`backend/src/services/socket.service.ts`) aligned with student + teacher listeners (activation, response updates).
- **Hand-offs**:
  - Publishes new API shapes to Shared Contracts Agent.
  - Provides REST examples and error envelopes to Frontend Agent for integration.
- **Quality Gates**: Add/refresh Jest + Supertest suites, ensure Prisma migrations are committed, keep consistent logging and status codes.

### 3. Frontend Experience Agent
- **Mission**: Deliver role-aware UX in React, integrating cleanly with the REST API and shared models while keeping feature pages lean.
- **Key Responsibilities**:
  - Manage routing (`src/App.tsx`) and guard logic (`src/routes/ProtectedRoute.tsx`, `src/shared/ui/RoleRoute.tsx`) plus auth adjunct flows (`/forgot-password`, `/reset-password`).
  - Structure code by feature (`src/features/<domain>/{pages,components,hooks}`) so pages compose dedicated components/services rather than housing business logic directly.
  - Coordinate state across Redux Toolkit (`src/store`) and React Query (feature hooks), and surface shared UI via `src/shared/ui`.
  - Implement data fetching through `src/lib/api.ts` or feature-level APIs, honoring ENDPOINTS map; subscribe to socket events where needed and invalidate React Query caches accordingly.
  - Maintain styling in `src/styles/main.scss` and `src/theme.ts`.
- **Hand-offs**:
  - Consumes shared types + API docs; feeds back UX constraints or missing endpoints to Backend Agent.
  - Provides QA Agent with interaction paths and feature flags for testing.
- **Quality Gates**:
  - Every feature page delegates logic to components/hooks; avoid “God pages.”
  - Lint + format clean, strict TypeScript, accessible components, loading/error states for all queries/mutations, toast notifications for outcomes.

### 4. Shared Contracts Agent
- **Mission**: Synchronize DTOs, enums, and validation schemas across `shared/`, backend, and frontend.
- **Key Responsibilities**:
  - Author and evolve `shared/types/*.d.ts`, ensuring they map 1:1 to Prisma models (and any derived view models).
  - Coordinate Zod schemas and frontend form schemas so they stay in lockstep.
  - Detect breaking changes (e.g., renaming `QuizOption` fields) and communicate migration steps.
  - Automate or document the `backend npm run build` step that copies `../shared` into `dist/`.
- **Quality Gates**: Version shared contracts, add checks (e.g., TypeScript project references) if drift becomes likely, document serialization nuances (dates vs ISO strings).

### 5. QA & Delivery Agent
- **Mission**: Validate end-to-end behavior, enforce release readiness, and watch observability hooks.
- **Key Responsibilities**:
  - Expand Jest coverage in backend, add Playwright/Cypress (future) for critical flows, and ensure CI runs lint + tests + builds.
  - Define manual regression checklists (auth, teacher workflows, admin user edits) until automation exists.
  - Verify password reset flows (request + reset) and socket-driven UI updates for both teacher and student dashboards.
  - Monitor `/health` and add deeper telemetry/logging strategies (request IDs, structured logs).
  - Own release tagging, Docker image validation, and smoke tests against docker-compose environments.
- **Hand-offs**:
  - Surfaces bugs to respective agents with reproducible steps.
  - Provides release notes summarizing validated scope.
- **Quality Gates**: No release without passing API + UI tests, schema migrations tested against sample data, and rollback plan captured.

---
Use this file as the single source of truth when spinning up new agents or clarifying ownership. Update it whenever responsibilities or stack choices evolve.
