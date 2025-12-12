# Classroom Clicker

Classroom Clicker is a monorepo that powers a web-based clicker experience for teachers and students. Teachers create classes, lessons, and single-question quizzes; students receive real-time notifications when a quiz starts and can respond from their dashboards. Admins manage users and classes. The repository contains:

- **backend/** – Express + TypeScript API backed by PostgreSQL via Prisma, including JWT auth, role-based routing, WebSocket notifications (Socket.IO), password reset flows, and class invite management.
- **frontend/** – React 18 + Vite application using Redux Toolkit, React Query, MUI, i18next (English/Hungarian), and theme switching (light/dark/system) for a feature-first UI.
- **shared/** – TypeScript contract definitions consumed by both backend and frontend, ensuring type safety across the stack.

## Table of Contents

- [Key Features](#key-features)
- [Architecture Overview](#architecture-overview)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Schema](#database-schema)
- [API Documentation](#api-documentation)
- [Socket.IO Events](#socketio-events)
- [Frontend Routing](#frontend-routing)
- [Testing & Linting](#testing--linting)
- [Development Workflow](#development-workflow)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)
- [Deployment](#deployment)
- [Contributing](#contributing)

## Key Features

- **Teacher Dashboard**: Manage classes, lessons, quizzes; view real-time response stats; activate/deactivate quizzes; manage student enrollments via invite codes.
- **Student Dashboard**: Live quiz activation alerts (Socket.IO); join classes via invite codes; view progress and quiz history; retake-aware flows with attempt limits.
- **Admin Dashboard**: User management with CSV import; view and edit user roles; manage all classes across the system.
- **Authentication**: JWT-based auth with password reset flow (token-based, exposed in dev for testing); role-based access control (ADMIN, TEACHER, STUDENT).
- **Internationalization**: Multi-language support (English/Hungarian) with language detection and switching.
- **Theme Support**: Light/dark/system theme switching with persistent preferences.
- **Real-time Updates**: Socket.IO integration for quiz activation notifications and live response updates.
- **Docker-first Development**: Scripts (`dev.sh`, `dev-detached.sh`) for spinning up backend, frontend, Postgres, pgAdmin, and nginx reverse proxy.

## Architecture Overview

### Backend Architecture

- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT tokens with role-based access control
- **Real-time**: Socket.IO for WebSocket connections
- **Validation**: Zod schemas for request validation
- **Error Handling**: Centralized error service
- **Email**: Nodemailer for password reset emails (configurable)

### Frontend Architecture

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **State Management**: 
  - Redux Toolkit for auth state
  - React Query (TanStack Query) for server state
- **UI Library**: Material-UI (MUI) with custom theming
- **Routing**: React Router v6 with protected routes
- **Internationalization**: i18next with English and Hungarian locales
- **Styling**: SCSS + MUI theme system
- **Real-time**: Socket.IO client for WebSocket connections
- **Forms**: React Hook Form with Zod validation

### Shared Contracts

Type definitions in `shared/types/` ensure type safety across the stack:
- `User`, `Class`, `ClassInvite`, `Lesson`, `Quiz`, `Question`, `QuizOption`, `Response`

## Getting Started

### Prerequisites

- **Node.js**: 18+ (LTS recommended)
- **npm**: Shipped with Node.js
- **Docker + Docker Compose**: Optional, for containerized development
- **PostgreSQL**: 14+ (if running locally without Docker)

### Environment Setup

You need two dedicated `.env` files plus an optional root override:

1. **Backend (`backend/.env`)** – Copy from `backend/.env.example`. Required variables:
   - `DATABASE_URL`: PostgreSQL connection string
   - `JWT_SECRET`: Secret key for JWT token signing
   - `JWT_REFRESH_SECRET`: Secret key for refresh tokens (if implemented)
   - `ADMIN_EMAIL`: Email address for the default admin user (required for seeding)
   - `ADMIN_PASSWORD`: Password for the default admin user (required for seeding)
   - `PORT`: Server port (default: 3000)
   - `CLIENT_URL`: Frontend URL for CORS (default: http://localhost:5173)
   - `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`: SMTP configuration
   - `DISABLE_EMAIL`: Set to `true` to skip email delivery (logs tokens instead)
   - `EXPOSE_RESET_TOKEN`: Set to `true` to return reset tokens in API responses (dev only)

2. **Frontend (`frontend/.env`)** – Copy from `frontend/.env.example`. Required variables:
   - `VITE_API_URL`: Backend API URL (default: http://localhost:3000/api)
   - `VITE_SOCKET_URL`: Socket.IO server URL (optional, defaults to API URL without `/api`)

3. **Root (`.env`, optional)** – Only needed for Docker Compose overrides or script-specific variables.

**Note**: When using Docker Compose, `DATABASE_URL` is automatically overridden to point to the `db` service.

### Install Dependencies

```bash
# Install root dependencies (if any)
npm install

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### Database Setup

The Prisma schema lives in `backend/prisma/schema.prisma`.

```bash
cd backend

# Apply migrations
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate

# (Optional) Seed sample data
npm run seed
```

**Note**: When using Docker Compose, migrations and seeding happen automatically on container startup.

**Important**: The seed script requires `ADMIN_EMAIL` and `ADMIN_PASSWORD` to be set in `backend/.env`. These credentials will be used to create the default admin user during seeding.

### Running the Apps

#### Local Development (Without Docker)

**Backend**:
```bash
cd backend
npm run dev
```
Runs Express API with hot reload (ts-node-dev via nodemon) on `http://localhost:3000`.

**Frontend**:
```bash
cd frontend
npm run dev
```
Runs Vite dev server on `http://localhost:5173`. Expects backend at `http://localhost:3000`.

#### Full Stack via Docker

Run everything (backend, frontend, Postgres, pgAdmin, nginx proxy) using helper scripts:

```bash
# Foreground (logs visible)
./dev.sh

# Background (detached)
./dev-detached.sh
```

**Services**:
- Backend: `http://localhost:3000`
- Frontend: `http://localhost:5173`
- pgAdmin: `http://localhost:5050` (admin@admin.com / admin)
- PostgreSQL: `localhost:5432` (postgres / postgres)

**Note**: On Windows, use `dev.bat` or `dev-detached.bat`.

## Environment Variables

### Backend Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | - | Yes |
| `JWT_SECRET` | Secret for JWT token signing | - | Yes |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens | - | No |
| `ADMIN_EMAIL` | Email for default admin user (required for seeding) | - | Yes* |
| `ADMIN_PASSWORD` | Password for default admin user (required for seeding) | - | Yes* |
| `PORT` | Server port | `3000` | No |
| `NODE_ENV` | Environment (development/production) | `development` | No |
| `CLIENT_URL` | Frontend URL for CORS | `http://localhost:5173` | No |
| `FRONTEND_URL` | Alternative frontend URL | - | No |
| `EMAIL_HOST` | SMTP server host | - | No |
| `EMAIL_PORT` | SMTP server port | `587` | No |
| `EMAIL_USER` | SMTP username | - | No |
| `EMAIL_PASS` | SMTP password | - | No |
| `EMAIL_FROM` | Email sender address | - | No |
| `DISABLE_EMAIL` | Skip email delivery (log instead) | `false` | No |
| `EXPOSE_RESET_TOKEN` | Return reset tokens in API responses | `false` | No |

\* Required when running the seed script (`npm run seed`)

### Frontend Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_API_URL` | Backend API base URL | `http://localhost:3000/api` | No |
| `VITE_SOCKET_URL` | Socket.IO server URL | Derived from `VITE_API_URL` | No |

**Note**: All frontend environment variables must be prefixed with `VITE_` to be accessible in the application.

## Database Schema

### Core Models

**User**
- `id` (UUID, primary key)
- `email` (unique)
- `password` (hashed with bcrypt)
- `firstName`, `lastName`
- `externalId` (optional, for external system integration)
- `role` (enum: ADMIN, TEACHER, STUDENT)
- `passwordResetToken`, `passwordResetExpires` (for password reset)
- `createdAt`, `updatedAt`

**Class**
- `id` (UUID, primary key)
- `name`, `description`
- `teacherId` (foreign key to User)
- `createdAt`, `updatedAt`
- Relations: `teacher`, `lessons`, `students`, `invites`

**ClassInvite**
- `id` (UUID, primary key)
- `code` (unique invite code)
- `classId` (foreign key to Class)
- `createdBy` (optional user ID)
- `maxUses` (optional limit)
- `uses` (usage counter)
- `expiresAt` (optional expiration)
- `createdAt`

**Lesson**
- `id` (UUID, primary key)
- `title`, `content`
- `classId` (foreign key to Class)
- `createdAt`, `updatedAt`
- Relations: `class`, `quizzes`

**Quiz**
- `id` (UUID, primary key)
- `title`
- `isActive` (boolean)
- `lessonId` (foreign key to Lesson)
- `timeLimitSeconds` (optional)
- `availableUntil` (optional DateTime)
- `attemptLimit` (optional, default: 1)
- `activatedAt` (optional DateTime)
- `createdAt`, `updatedAt`
- Relations: `lesson`, `questions`, `responses`

**Question**
- `id` (UUID, primary key)
- `text`, `explanation` (optional)
- `order` (default: 0)
- `quizId` (foreign key to Quiz)
- `createdAt`, `updatedAt`
- Relations: `quiz`, `options`, `answers`

**QuizOption**
- `id` (UUID, primary key)
- `text`
- `isCorrect` (boolean)
- `questionId` (foreign key to Question)
- Relations: `question`, `answers`

**Response**
- `id` (UUID, primary key)
- `quizId` (foreign key to Quiz)
- `userId` (foreign key to User)
- `score` (Float)
- `attemptNumber` (default: 1)
- `submittedAt`
- Relations: `quiz`, `user`, `answers`

**QuizAnswer**
- `id` (UUID, primary key)
- `responseId` (foreign key to Response)
- `questionId` (foreign key to Question)
- `selectedOptionId` (foreign key to QuizOption)
- Relations: `response`, `question`, `selectedOption`

### Relationships

- One Teacher → Many Classes
- One Class → Many Lessons
- One Lesson → Many Quizzes
- One Quiz → Many Questions
- One Question → Many QuizOptions (2-10 options, exactly one correct)
- One Quiz → Many Responses (one per student per attempt)
- One Response → Many QuizAnswers (one per question)
- Many Students ↔ Many Classes (many-to-many via `Class.students`)
- One Class → Many ClassInvites

## API Documentation

### Base URL

- Local: `http://localhost:3000/api`
- Production: Configure via `VITE_API_URL`

### Authentication

Most endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

### Auth Endpoints (`/api/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | No | Register new user |
| POST | `/auth/login` | No | Login and receive JWT token |
| GET | `/auth/me` | Yes | Get current user info |
| POST | `/auth/password/forgot` | No | Request password reset token |
| POST | `/auth/password/reset` | No | Reset password with token |

**Request/Response Examples**:

```typescript
// POST /auth/register
{
  "email": "teacher@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "TEACHER"
}

// POST /auth/login
{
  "email": "teacher@example.com",
  "password": "securePassword123"
}
// Response: { token: "jwt-token", user: {...} }

// POST /auth/password/forgot
{
  "email": "user@example.com"
}
// Response (dev): { token: "reset-token" }
```

### Teacher Endpoints (`/api/teacher`)

**All endpoints require TEACHER role.**

#### Classes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/teacher/classes` | List all teacher's classes |
| POST | `/teacher/classes` | Create new class |
| GET | `/teacher/classes/:id` | Get class details |
| PUT | `/teacher/classes/:id` | Update class |
| DELETE | `/teacher/classes/:id` | Delete class |
| GET | `/teacher/classes/:id/progress` | Get class progress stats |

#### Students

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/teacher/classes/:id/students` | Add student to class |
| POST | `/teacher/classes/:id/students/bulk` | Bulk add students |
| GET | `/teacher/classes/:id/students/:studentId` | Get student details |
| DELETE | `/teacher/classes/:id/students/:studentId` | Remove student |

#### Invites

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/teacher/classes/:id/invites` | List class invites |
| POST | `/teacher/classes/:id/invites` | Create invite |
| DELETE | `/teacher/classes/:classId/invites/:inviteId` | Delete invite |

#### Lessons

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/teacher/classes/:classId/lessons` | List lessons |
| POST | `/teacher/classes/:classId/lessons` | Create lesson |
| GET | `/teacher/classes/:classId/lessons/:lessonId` | Get lesson |
| PUT | `/teacher/classes/:classId/lessons/:lessonId` | Update lesson |
| DELETE | `/teacher/classes/:classId/lessons/:lessonId` | Delete lesson |

#### Quizzes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/teacher/classes/:classId/lessons/:lessonId/quizzes` | List quizzes |
| POST | `/teacher/classes/:classId/lessons/:lessonId/quizzes` | Create quiz |
| GET | `/teacher/classes/:classId/lessons/:lessonId/quizzes/:quizId` | Get quiz |
| PUT | `/teacher/classes/:classId/lessons/:lessonId/quizzes/:quizId` | Update quiz |
| DELETE | `/teacher/classes/:classId/lessons/:lessonId/quizzes/:quizId` | Delete quiz |
| GET | `/teacher/classes/:classId/lessons/:lessonId/quizzes/:quizId/responses` | Get quiz responses |

#### Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/teacher/dashboard` | Get dashboard stats |
| GET | `/teacher/students` | List all students |

### Student Endpoints (`/api/student`)

**All endpoints require STUDENT role.**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/student/classes` | List enrolled classes |
| GET | `/student/classes/:id` | Get class details |
| POST | `/student/classes/join` | Join class with invite code |
| GET | `/student/classes/:classId/lessons` | List lessons |
| GET | `/student/classes/:classId/lessons/:lessonId` | Get lesson |
| GET | `/student/classes/:classId/lessons/:lessonId/quizzes` | List quizzes |
| GET | `/student/classes/:classId/lessons/:lessonId/quizzes/:quizId` | Get quiz |
| POST | `/student/classes/:classId/lessons/:lessonId/quizzes/:quizId/responses` | Submit quiz response |
| GET | `/student/progress` | Get student progress |
| GET | `/student/dashboard` | Get dashboard |

**Request Example**:
```typescript
// POST /student/classes/join
{
  "inviteCode": "ABC123"
}

// POST /student/classes/:classId/lessons/:lessonId/quizzes/:quizId/responses
{
  "answers": [
    {
      "questionId": "question-uuid",
      "selectedOptionId": "option-uuid"
    }
  ]
}
```

### Admin Endpoints (`/api/admin`)

**All endpoints require ADMIN role.**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/insights` | Get system insights |
| GET | `/admin/users` | List all users |
| POST | `/admin/users` | Create user |
| POST | `/admin/users/import` | Import users from CSV |
| PUT | `/admin/users/:id` | Update user |
| DELETE | `/admin/users/:id` | Delete user |

**CSV Import Format**:
```csv
email,firstName,lastName,role,externalId
user1@example.com,John,Doe,STUDENT,EXT001
user2@example.com,Jane,Smith,TEACHER,EXT002
```

### Error Responses

All endpoints return errors in a consistent format:

```typescript
{
  "error": "Error message",
  "details": {} // Optional additional details
}
```

Common HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation error)
- `401`: Unauthorized (missing/invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `500`: Internal Server Error

## Socket.IO Events

### Connection

Clients connect with JWT token in auth:
```typescript
socket = io(SOCKET_BASE_URL, {
  auth: { token: "jwt-token" },
  transports: ["websocket"]
});
```

### Rooms

- **Students**: Join room `student:{userId}` on connection
- **Teachers**: Join room `teacher:{userId}` on connection

### Events

#### `quiz:activated` (Student)

Emitted to students when a quiz is activated.

**Payload**:
```typescript
{
  quizId: string;
  quizTitle: string;
  activatedAt?: string | null;
  availableUntil?: string | null;
  timeLimitSeconds?: number | null;
  lessonId: string;
  lessonTitle: string;
  classId: string;
  className: string;
}
```

**Usage**: Students listen for this event to show quiz activation notifications.

#### `quiz:responses-updated` (Teacher)

Emitted to teachers when a student submits a quiz response.

**Payload**:
```typescript
{
  quizId: string;
  lessonId: string;
  classId: string;
}
```

**Usage**: Teachers listen for this event to refresh response counts and tables.

### Frontend Integration

Socket connection is managed in `frontend/src/lib/socket.ts`:
- `connectSocket(token)`: Connect with JWT token
- `disconnectSocket()`: Disconnect

React Query cache invalidation ensures UI stays in sync with real-time updates.

## Frontend Routing

### Public Routes

- `/login` - Login page
- `/register` - Registration page (redirects to login)
- `/forgot-password` - Password reset request
- `/reset-password` - Password reset form

### Protected Routes

All routes below require authentication. Users are redirected to `/login` if not authenticated.

#### Teacher Routes (`/teacher/*`)

- `/teacher` - Dashboard
- `/teacher/classes` - Class list
- `/teacher/classes/:classId` - Class details
- `/teacher/classes/:classId/progress` - Class progress
- `/teacher/classes/:classId/students` - Student management
- `/teacher/classes/:classId/lessons/:lessonId/quizzes` - Quiz list
- `/teacher/classes/:classId/lessons/:lessonId/quizzes/:quizId` - Quiz details

#### Admin Routes (`/admin/*`)

- `/admin` - Dashboard
- `/admin/users` - User management

#### Student Routes (`/student/*`)

- `/student` - Dashboard
- `/student/classes` - Enrolled classes
- `/student/classes/:classId` - Class details
- `/student/classes/:classId/lessons/:lessonId/quizzes/:quizId` - Quiz view/submit
- `/student/progress` - Progress overview

### Route Protection

- `ProtectedRoute`: Wraps routes requiring authentication
- `RoleRoute`: Wraps routes requiring specific roles
- Root `/` redirects based on user role

## Testing & Linting

### Running Tests

**Full Stack**:
```bash
./scripts/run-tests.sh
```
Runs backend Jest suite, then frontend Vitest suite.

**Backend Only**:
```bash
cd backend
npm test              # Watch mode
npm test -- --runInBand # CI mode (serial)
npm test -- src/middleware/auth.test.ts  # Single test
```

**Frontend Only**:
```bash
cd frontend
npm run test           # Watch mode
npm run test:run       # Single run with coverage
npm run test:run -- --runTestsByPath src/shared/ui/__tests__/RoleRoute.test.tsx  # Single test
```

### Backend Testing Details

- **Framework**: Jest with ts-jest
- **Test Location**: `backend/src/**/*.test.ts` (colocated with source)
- **Test Setup**: `backend/src/test/setup.ts` (env vars, mocks)
- **Integration Tests**: Use Supertest with shared `app` export
- **Prisma**: Mocked in tests (no real database)

### Frontend Testing Details

- **Framework**: Vitest + React Testing Library
- **Test Location**: `frontend/src/**/__tests__/*.test.ts(x)`
- **Test Setup**: `frontend/src/test/setup.ts` (jsdom, jest-dom, MUI mocks)
- **Coverage**: Generated with `npm run test:run` (v8 provider)
- **Best Practices**: Mock hooks at module level, assert UI behavior

### Type Checking

```bash
# Both projects
./scripts/run-tsc.sh

# Backend only
cd backend && npm run tsc

# Frontend only
cd frontend && npm run tsc
```

### Linting

**Frontend**:
```bash
cd frontend
npm run lint           # Check for issues
npm run format         # Format with Prettier
```

**Backend**:
```bash
cd backend
npm run format         # Format with Prettier
```

## Development Workflow

### Adding a New Feature

1. **Update Shared Types** (if needed):
   - Add/update types in `shared/types/*.d.ts`
   - Export in `shared/types/index.ts`

2. **Backend**:
   - Create controller in `backend/src/controllers/`
   - Add routes in `backend/src/routes/`
   - Add validation schemas in `backend/src/schemas/`
   - Write tests in `*.test.ts` files
   - Update Prisma schema if needed: `npx prisma migrate dev`

3. **Frontend**:
   - Create feature in `frontend/src/features/<domain>/`
   - Add pages in `features/<domain>/pages/`
   - Add components in `features/<domain>/components/`
   - Add API hooks using React Query
   - Write tests in `__tests__/` folders
   - Add routes in `App.tsx`

4. **Testing**:
   - Run `./scripts/run-tests.sh`
   - Run `./scripts/run-tsc.sh`
   - Run `cd frontend && npm run lint`

### Code Style

- **TypeScript**: Strict mode enabled
- **Formatting**: Prettier (configured in `.prettierrc`)
- **Imports**: Sorted with `@trivago/prettier-plugin-sort-imports`
- **Naming**: camelCase for variables/functions, PascalCase for components/types

### Git Workflow

1. Create feature branch from `main`
2. Make changes with descriptive commits
3. Ensure tests pass and code is linted
4. Open PR with description
5. Address review feedback
6. Merge to `main`

## Project Structure

### Backend Structure

```
backend/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── app.ts                 # Express app setup
│   ├── server.ts             # HTTP server + Socket.IO
│   ├── controllers/          # Route handlers
│   │   ├── admin.controller.ts
│   │   ├── auth.controller.ts
│   │   ├── class.controller.ts
│   │   ├── lesson.controller.ts
│   │   ├── quiz.controller.ts
│   │   └── teacher.controller.ts
│   ├── routes/               # Route definitions
│   │   ├── admin.ts
│   │   ├── auth.ts
│   │   ├── student.ts
│   │   └── teacher.ts
│   ├── middleware/            # Express middleware
│   │   ├── auth.ts           # JWT auth + role check
│   │   └── validate.ts       # Zod validation
│   ├── schemas/              # Zod validation schemas
│   │   ├── auth.schema.ts
│   │   └── class.schema.ts
│   ├── services/            # Business logic
│   │   ├── email.service.ts
│   │   ├── error.service.ts
│   │   └── socket.service.ts
│   ├── db/
│   │   └── seed.ts          # Database seeding
│   ├── test/
│   │   └── setup.ts         # Test configuration
│   └── types/               # TypeScript types
└── package.json
```

### Frontend Structure

```
frontend/
├── src/
│   ├── App.tsx              # Main app + routing
│   ├── main.tsx             # Entry point
│   ├── features/            # Feature modules
│   │   ├── admin/
│   │   │   ├── components/
│   │   │   └── pages/
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   └── pages/
│   │   ├── student/
│   │   │   ├── api/
│   │   │   ├── components/
│   │   │   └── pages/
│   │   └── teacher/
│   │       ├── components/
│   │       └── pages/
│   ├── shared/
│   │   └── ui/              # Reusable components
│   │       ├── RoleRoute.tsx
│   │       ├── NotFound.tsx
│   │       ├── ThemeSwitcher.tsx
│   │       └── LanguageSelector.tsx
│   ├── lib/                 # Utilities
│   │   ├── api.ts          # Axios instance + endpoints
│   │   └── socket.ts       # Socket.IO client
│   ├── store/              # Redux store
│   │   └── slices/
│   │       └── auth/
│   ├── routes/
│   │   └── ProtectedRoute.tsx
│   ├── layouts/            # Page layouts
│   │   ├── AdminLayout.tsx
│   │   ├── TeacherLayout.tsx
│   │   └── StudentLayout.tsx
│   ├── contexts/
│   │   └── ThemeContext.tsx
│   ├── hooks/
│   │   └── useTranslation.ts
│   ├── i18n/               # Internationalization
│   │   ├── config.ts
│   │   └── locales/
│   │       ├── en.ts
│   │       └── hu.ts
│   ├── styles/
│   │   └── main.scss
│   ├── theme.ts            # MUI theme config
│   └── test/
│       └── setup.ts        # Test configuration
└── package.json
```

### Shared Structure

```
shared/
└── types/                  # TypeScript type definitions
    ├── index.ts           # Exports all types
    ├── user.d.ts
    ├── class.d.ts
    ├── classInvite.d.ts
    ├── lesson.d.ts
    ├── quiz.d.ts
    ├── question.d.ts
    ├── quizOption.d.ts
    └── response.d.ts
```

## Troubleshooting

### Backend Issues

**Database Connection Errors**:
- Verify `DATABASE_URL` in `backend/.env`
- Ensure PostgreSQL is running
- Check network connectivity to database

**JWT Errors**:
- Verify `JWT_SECRET` is set
- Check token expiration
- Ensure token is sent in Authorization header

**Socket.IO Connection Issues**:
- Verify `CLIENT_URL` matches frontend URL
- Check CORS configuration
- Ensure token is passed in socket auth

**Prisma Migration Issues**:
- Run `npx prisma migrate reset` to reset database (⚠️ deletes data)
- Check migration files in `backend/prisma/migrations/`
- Verify schema syntax

### Frontend Issues

**API Connection Errors**:
- Verify `VITE_API_URL` in `frontend/.env`
- Check backend is running
- Verify CORS settings on backend

**Socket.IO Connection Issues**:
- Verify `VITE_SOCKET_URL` or check `VITE_API_URL` derivation
- Check token is available when connecting
- Verify backend Socket.IO is initialized

**Build Errors**:
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Clear Vite cache: `rm -rf frontend/node_modules/.vite`
- Check TypeScript errors: `npm run tsc`

**Theme/Language Not Persisting**:
- Check browser localStorage is enabled
- Verify `ThemeContext` and i18next are initialized
- Check for localStorage key conflicts

### Docker Issues

**Container Won't Start**:
- Check Docker daemon is running
- Verify ports 3000, 5173, 5432, 5050 are available
- Check `docker-compose.yml` syntax

**Database Not Migrating**:
- Check backend container logs: `docker-compose logs backend`
- Verify `DATABASE_URL` in container
- Manually run migrations: `docker-compose exec backend npx prisma migrate deploy`

**Volume Mount Issues**:
- Check file permissions
- Verify volume paths in `docker-compose.yml`
- On Windows, ensure WSL2 is configured correctly

## Deployment

### Production Considerations

1. **Environment Variables**:
   - Set `NODE_ENV=production`
   - Use strong `JWT_SECRET` values
   - Configure production database URL
   - Set `CLIENT_URL` to production frontend URL
   - Configure SMTP for email delivery
   - Set `DISABLE_EMAIL=false` and `EXPOSE_RESET_TOKEN=false`

2. **Database**:
   - Run migrations: `npx prisma migrate deploy`
   - Generate Prisma Client: `npx prisma generate`
   - Set up database backups

3. **Backend**:
   - Build: `cd backend && npm run build`
   - Start: `npm start` (runs `dist/server.js`)
   - Use process manager (PM2, systemd, etc.)
   - Set up reverse proxy (nginx) for HTTPS

4. **Frontend**:
   - Build: `cd frontend && npm run build`
   - Serve static files from `dist/` directory
   - Configure nginx for SPA routing
   - Set up CDN for static assets

5. **Security**:
   - Enable HTTPS
   - Set secure CORS origins
   - Use secure cookie settings
   - Implement rate limiting
   - Set up monitoring/logging

### Docker Production

Update `docker-compose.yml` for production:
- Use production Dockerfiles (`Dockerfile` instead of `Dockerfile.dev`)
- Set environment variables securely
- Configure volumes for persistence
- Set up health checks
- Use Docker secrets for sensitive data

## Contributing

1. Fork/branch from `main`
2. Make changes in backend/frontend/shared as needed
3. Run tests: `./scripts/run-tests.sh`
4. Run TypeScript checks: `./scripts/run-tsc.sh`
5. Run linting: `cd frontend && npm run lint`
6. Format code: `cd backend && npm run format` and `cd frontend && npm run format`
7. Commit with descriptive messages
8. Open a PR with:
   - Description of changes
   - Testing instructions
   - Screenshots (if UI changes)

See `agents.md` for multi-agent collaboration instructions and role definitions.

---

**License**: MIT License - Feel free to use this project for any purpose.

**Maintainers**: gellerfizsombor
