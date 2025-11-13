import axios from "axios";

const api = axios.create({
  baseURL:
    (import.meta.env.VITE_API_URL as string) || "http://localhost:3000/api",
});

type TokenGetter = () => string | null;

let getToken: TokenGetter | null = null;

export const configureApiAuth = (tokenResolver: TokenGetter) => {
  getToken = tokenResolver;
};

// Add request interceptor to include auth token
api.interceptors.request.use((config) => {
  const token = getToken?.();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// API Endpoints
export const ENDPOINTS = {
  AUTH: {
    LOGIN: () => `/auth/login`,
    REGISTER: () => `/auth/register`,
    ME: () => `/auth/me`,
    REQUEST_RESET: () => `/auth/password/forgot`,
    RESET_PASSWORD: () => `/auth/password/reset`,
  },
  CLASS: {
    LIST: () => `/teacher/classes`,
    GET: (classId: string) => `/teacher/classes/${classId}`,
    CREATE: () => `/teacher/classes`,
    UPDATE: (classId: string) => `/teacher/classes/${classId}`,
    DELETE: (classId: string) => `/teacher/classes/${classId}`,
    ASSIGN_STUDENT: (classId: string) => `/teacher/classes/${classId}/students`,
    INVITES: {
      LIST: (classId: string) => `/teacher/classes/${classId}/invites`,
      CREATE: (classId: string) => `/teacher/classes/${classId}/invites`,
      DELETE: (classId: string, inviteId: string) =>
        `/teacher/classes/${classId}/invites/${inviteId}`,
    },
    PROGRESS: (classId: string) => `/teacher/classes/${classId}/progress`,
  },
  LESSON: {
    LIST: (classId: string) => `/teacher/classes/${classId}/lessons`,
    GET: (classId: string, lessonId: string) =>
      `/teacher/classes/${classId}/lessons/${lessonId}`,
    CREATE: (classId: string) => `/teacher/classes/${classId}/lessons`,
    UPDATE: (classId: string, lessonId: string) =>
      `/teacher/classes/${classId}/lessons/${lessonId}`,
    DELETE: (classId: string, lessonId: string) =>
      `/teacher/classes/${classId}/lessons/${lessonId}`,
  },
  QUIZ: {
    LIST: (classId: string, lessonId: string) =>
      `/teacher/classes/${classId}/lessons/${lessonId}/quizzes`,
    GET: (classId: string, lessonId: string, quizId: string) =>
      `/teacher/classes/${classId}/lessons/${lessonId}/quizzes/${quizId}`,
    CREATE: (classId: string, lessonId: string) =>
      `/teacher/classes/${classId}/lessons/${lessonId}/quizzes`,
    UPDATE: (classId: string, lessonId: string, quizId: string) =>
      `/teacher/classes/${classId}/lessons/${lessonId}/quizzes/${quizId}`,
    DELETE: (classId: string, lessonId: string, quizId: string) =>
      `/teacher/classes/${classId}/lessons/${lessonId}/quizzes/${quizId}`,
    RESPONSES: (classId: string, lessonId: string, quizId: string) =>
      `/teacher/classes/${classId}/lessons/${lessonId}/quizzes/${quizId}/responses`,
  },
  ADMIN: {
    INSIGHTS: () => `/admin/insights`,
    USERS: {
      LIST: () => `/admin/users`,
      CREATE: () => `/admin/users`,
      IMPORT: () => `/admin/users/import`,
      UPDATE: (userId: string) => `/admin/users/${userId}`,
      DELETE: (userId: string) => `/admin/users/${userId}`,
    },
  },
  TEACHER: {
    STUDENTS: () => `/teacher/students`,
    DASHBOARD: () => `/teacher/dashboard`,
  },
  STUDENT: {
    CLASSES: {
      LIST: () => `/student/classes`,
      GET: (classId: string) => `/student/classes/${classId}`,
    },
    JOIN: () => `/student/classes/join`,
    PROGRESS: () => `/student/progress`,
    DASHBOARD: () => `/student/dashboard`,
    QUIZ: {
      GET: (classId: string, lessonId: string, quizId: string) =>
        `/student/classes/${classId}/lessons/${lessonId}/quizzes/${quizId}`,
      SUBMIT: (classId: string, lessonId: string, quizId: string) =>
        `/student/classes/${classId}/lessons/${lessonId}/quizzes/${quizId}/responses`,
    },
  },
} as const;

export default api;
