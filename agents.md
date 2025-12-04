# Classroom Clicker Agents

## Why This Exists
- Keep multi-agent work aligned with the actual monorepo layout (`backend/`, `frontend/`, `shared/`, container scripts, and infra).
- Capture the domain language (classes, lessons, quizzes, responses) defined in `backend/prisma/schema.prisma` and the REST surface in `backend/src/routes`.
- Make it obvious where each agent hands off work so we do not duplicate efforts or drift from the TypeScript contracts shared with the React client.
- Document the feature-first frontend structure (`src/features/**`, `src/shared/ui`, `@` alias) so pages stay thin and behavior moves into testable components/hooks.

## Product Snapshot
- Web-based classroom clicker: teachers manage classes, lessons, and quizzes; students respond in real time; admins manage users and classes.
- Backend (`backend/`): Express + TypeScript + Prisma/PostgreSQL, JWT auth (`backend/src/app.ts`, `backend/src/middleware`), password reset tokens, role-gated routers (`backend/src/routes`), class invite management, and Socket.IO broadcasting (`backend/src/services/socket.service.ts`) for quiz activation + response updates.
- Frontend (`frontend/`): React 18 + Vite + Redux Toolkit + React Query + MUI (`frontend/src/App.tsx`, `frontend/src/store`), i18next for internationalization (English/Hungarian), theme switching (light/dark/system), socket listeners for students/teachers, and dedicated password reset pages (`/forgot-password`, `/reset-password`).
- Shared contracts in `shared/types` keep models consistent between client and server builds (User, Class, Lesson, Quiz, Question, QuizOption, Response, ClassInvite).
- Docker-first local orchestration via `docker-compose.yml`, with dev scripts (`dev.sh`, `dev-detached.sh`) bootstrapping services plus `nginx/` reverse proxy and `pgadmin/`.

## Domain Entities (from Prisma)
| Entity | Relationships / Notes |
| --- | --- |
| `User` | Roles: `ADMIN`, `TEACHER`, `STUDENT`; teachers own `Class` records, students enroll via `Class.students`; responses recorded per quiz; password reset tokens stored on user record (`backend/prisma/schema.prisma`). |
| `Class` | Tied to a single teacher; aggregates `Lesson` and enrolled students; has `ClassInvite` records for enrollment; counts used in controllers for dashboards (`backend/src/controllers/class.controller.ts`). |
| `ClassInvite` | Invite codes for class enrollment; supports expiration (`expiresAt`), max uses (`maxUses`), and usage tracking (`uses`); cascade deletes with class. |
| `Lesson` | Belongs to class; ordered by `createdAt`; holds quizzes (`backend/src/controllers/lesson.controller.ts`). |
| `Quiz` | Single-question quizzes with structured options; supports time limits (`timeLimitSeconds`), availability windows (`availableUntil`), attempt limits (`attemptLimit`), and activation tracking (`isActive`, `activatedAt`); route handlers enforce 2–10 options and exactly one correct answer (`backend/src/controllers/quiz.controller.ts`). |
| `Question`, `QuizOption`, `Response`, `QuizAnswer` | Maintain quiz content and student submissions; `Response` tracks attempt numbers and scores; cascade deletes propagate through Prisma relations. |

## Toolchain & Commands
- Backend: `npm run dev` (nodemon with ts-node-dev) / `npm run build` / `npm run seed`; Prisma CLI for schema migrations (`npx prisma migrate deploy`) and generation (`npm run prisma:generate`); environment via `.env` mirrored from `.env.example`; use `npm run tsc` or `npx tsc --noEmit` for type checks; `npm test` for Jest tests.
- Frontend: `npm run dev` (Vite), `npm run build`, `npm run lint` (ESLint), `npm run format` (Prettier); run `npm run tsc` or `npx tsc --noEmit` for type checks; `npm run test` (watch) or `npm run test:run` (coverage) for Vitest.
- Containers: `docker-compose up --build` wires backend, frontend, Postgres, pgAdmin, and nginx reverse proxy; per-service Dockerfiles live under `backend/` (`Dockerfile.dev`) and `frontend/` (`Dockerfile.dev`).
- Frontend aliasing: Vite + TS are configured with `@`→`src` and `@shared`→`../shared`; keep new feature code under `src/features/<domain>` and reusable UI in `src/shared/ui`.
- Scripts: `./scripts/run-tests.sh` runs both backend Jest and frontend Vitest suites; `./scripts/run-tsc.sh` type-checks both projects.

## Collaboration Patterns
- **Contracts first**: Any schema/DTO change (REST or WebSocket payload) propagates `shared/types/` → backend validators (`backend/src/schemas`) → frontend API hooks (`frontend/src/lib/api.ts`, RTK slices, React Query hooks). Shared types include: User, Class, ClassInvite, Lesson, Quiz, Question, QuizOption, Response.
- **Auth-aware UX**: Role-based routing lives in `frontend/src/routes/ProtectedRoute.tsx` and `src/shared/ui/RoleRoute.tsx`; backend mirrors this with `authMiddleware` + `roleCheck`. Role-based layouts in `src/layouts/` (AdminLayout, TeacherLayout, StudentLayout).
- **Password reset**: Tokens are issued via `/api/auth/password/forgot` (stored on the user record with expiration) and consumed via `/api/auth/password/reset`. In non-prod environments the token is logged/returned for dev convenience (`EXPOSE_RESET_TOKEN=true`); production must rely on email delivery. Frontend pages live under `src/features/auth/pages` with forms in `src/features/auth/components`.
- **Class invites**: Teachers generate invite codes via `/api/teacher/classes/:classId/invites`; students join via `/api/student/classes/join` with invite code. Invites support expiration, max uses, and usage tracking. Frontend components: `ClassJoinDialog` (student), invite management in `StudentManagement` page (teacher).
- **Realtime**: Student-facing sockets listen for `quiz:activated`; teacher sockets listen for `quiz:responses-updated`. Socket connection managed in `frontend/src/lib/socket.ts`; React Query cache invalidation ensures UI stays in sync. Any payload tweak must be reflected in both backend emitters (`backend/src/services/socket.service.ts`) and frontend listeners plus React Query invalidations.
- **Internationalization**: i18next configured with English and Hungarian locales (`frontend/src/i18n/locales/`); language detection and switching via `LanguageSelector` component; use `useTranslation` hook from `src/hooks/useTranslation.ts`.
- **Theme management**: Theme switching (light/dark/system) via `ThemeContext` (`src/contexts/ThemeContext.tsx`) with persistent preferences; MUI theme configuration in `src/theme.ts`; `ThemeSwitcher` component in shared UI.
- **Componentization rule**: Pages under `src/features/*/pages` stay thin (data fetching + layout only). Move UI/logic into `src/features/*/components`, `src/features/*/hooks`, or `src/shared/ui` so responsibilities are testable and reusable. Test files colocated in `__tests__` folders.
- **Testing expectations**: Backend uses Jest (`cd backend && npm test`) with specs colocated beside the source (`*.test.ts` files); frontend ships Vitest + React Testing Library (`cd frontend && npm run test` for watch, `npm run test:run` for coverage). Test setup files: `backend/src/test/setup.ts`, `frontend/src/test/setup.ts`. When a change spans both apps, run `./scripts/run-tests.sh` so regressions are caught before hand-off.
- **Linting & Formatting**: Frontend has ESLint configured (`npm run lint`); backend uses Prettier (`npm run format`). Both use TypeScript strict mode; run `./scripts/run-tsc.sh` to type-check both projects.
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
  - Extend routers (`backend/src/routes`) with versioned endpoints and role enforcement (`/api/auth`, `/api/admin`, `/api/teacher`, `/api/student`).
  - Implement validation layers via Zod schemas (`backend/src/schemas`) plus shared DTOs.
  - Maintain JWT auth flows (`backend/src/controllers/auth.controller.ts`, `backend/src/middleware/auth.ts`), password hashing (bcrypt), and password reset lifecycle (tokens, expirations, migrations).
  - Manage class invite system (`ClassInvite` model, invite generation, validation, usage tracking).
  - Make sure migrations + seeds (`backend/src/db/seed.ts`) cover new models.
  - Keep Socket.IO events (`backend/src/services/socket.service.ts`) aligned with student + teacher listeners (`quiz:activated`, `quiz:responses-updated`).
  - Email service (`backend/src/services/email.service.ts`) for password reset (configurable via `DISABLE_EMAIL` and `EXPOSE_RESET_TOKEN` env vars).
- **Hand-offs**:
  - Publishes new API shapes to Shared Contracts Agent.
  - Provides REST examples and error envelopes to Frontend Agent for integration.
- **Quality Gates**: Add/refresh Jest + Supertest suites (colocated `*.test.ts` files), ensure Prisma migrations are committed, keep consistent logging and status codes, maintain test coverage for controllers and middleware.

### 3. Frontend Experience Agent
- **Mission**: Deliver role-aware UX in React, integrating cleanly with the REST API and shared models while keeping feature pages lean.
- **Key Responsibilities**:
  - Manage routing (`src/App.tsx`) and guard logic (`src/routes/ProtectedRoute.tsx`, `src/shared/ui/RoleRoute.tsx`) plus auth adjunct flows (`/forgot-password`, `/reset-password`).
  - Structure code by feature (`src/features/<domain>/{pages,components,hooks,api}`) so pages compose dedicated components/services rather than housing business logic directly. Current features: `admin`, `auth`, `student`, `teacher`.
  - Coordinate state across Redux Toolkit (`src/store/slices/auth`) and React Query (feature hooks), and surface shared UI via `src/shared/ui` (RoleRoute, NotFound, ThemeSwitcher, LanguageSelector, AlertDialog, Breadcrumbs).
  - Implement data fetching through `src/lib/api.ts` or feature-level APIs (e.g., `src/features/student/api/dashboard.ts`); subscribe to socket events (`src/lib/socket.ts`) where needed and invalidate React Query caches accordingly.
  - Maintain internationalization via i18next (`src/i18n/config.ts`, locales in `src/i18n/locales/`) with `useTranslation` hook (`src/hooks/useTranslation.ts`).
  - Manage theme switching via `ThemeContext` (`src/contexts/ThemeContext.tsx`) with MUI theme configuration (`src/theme.ts`).
  - Maintain styling in `src/styles/main.scss` and `src/theme.ts`.
- **Hand-offs**:
  - Consumes shared types + API docs; feeds back UX constraints or missing endpoints to Backend Agent.
  - Provides QA Agent with interaction paths and feature flags for testing.
- **Quality Gates**:
  - Every feature page delegates logic to components/hooks; avoid “God pages.”
  - Lint (`npm run lint`) + format (`npm run format`) clean, strict TypeScript, accessible components, loading/error states for all queries/mutations, toast notifications (react-hot-toast) for outcomes.
  - Add/maintain Vitest + React Testing Library coverage for shared UI, hooks, and critical flows; keep `npm run test:run` free of flakiness. Test files in `__tests__` folders.

### 4. Shared Contracts Agent
- **Mission**: Synchronize DTOs, enums, and validation schemas across `shared/`, backend, and frontend.
- **Key Responsibilities**:
  - Author and evolve `shared/types/*.d.ts` (User, Class, ClassInvite, Lesson, Quiz, Question, QuizOption, Response), ensuring they map 1:1 to Prisma models (and any derived view models).
  - Export all types via `shared/types/index.ts` for easy importing (`@shared/types`).
  - Coordinate Zod schemas (`backend/src/schemas`) and frontend form schemas (react-hook-form + Zod resolvers) so they stay in lockstep.
  - Detect breaking changes (e.g., renaming `QuizOption` fields) and communicate migration steps.
  - Automate or document the `backend npm run build` step that copies `../shared` into `dist/` via `cp -r ../shared ./dist/`.
- **Quality Gates**: Version shared contracts, add checks (e.g., TypeScript project references) if drift becomes likely, document serialization nuances (dates vs ISO strings), ensure frontend `@shared` alias resolves correctly.

### 5. QA & Delivery Agent
- **Mission**: Validate end-to-end behavior, enforce release readiness, and watch observability hooks.
- **Key Responsibilities**:
  - Expand Jest coverage in backend (controllers, middleware, schemas), add Playwright/Cypress (future) for critical flows, and ensure CI runs lint + tests + builds.
  - Keep `./scripts/run-tests.sh` green before merges; gate releases on both Jest and Vitest suites plus `./scripts/run-tsc.sh` (TypeScript checks).
  - Run frontend linting (`cd frontend && npm run lint`) as part of pre-merge checks.
  - Define manual regression checklists (auth, teacher workflows, admin user edits, class invites, password reset) until automation exists.
  - Verify password reset flows (request + reset), class invite generation/joining, and socket-driven UI updates for both teacher and student dashboards.
  - Test internationalization (language switching) and theme switching (light/dark/system) across all user roles.
  - Monitor `/health` and add deeper telemetry/logging strategies (request IDs, structured logs).
  - Own release tagging, Docker image validation, and smoke tests against docker-compose environments (backend, frontend, Postgres, pgAdmin, nginx).
- **Hand-offs**:
  - Surfaces bugs to respective agents with reproducible steps.
  - Provides release notes summarizing validated scope.
- **Quality Gates**: No release without passing API + UI tests, schema migrations tested against sample data, ESLint clean, TypeScript strict mode passing, and rollback plan captured.

---
Use this file as the single source of truth when spinning up new agents or clarifying ownership. Update it whenever responsibilities or stack choices evolve.
