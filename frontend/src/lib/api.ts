import axios from "axios";

const api = axios.create({
  baseURL:
    (import.meta.env.VITE_API_URL as string) || "http://localhost:3000/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "TEACHER" | "STUDENT";
}

export interface AuthResponse {
  token: string;
  user: User;
}

export const auth = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>("/auth/login", credentials);
    return data;
  },
  register: async (
    userData: LoginCredentials & { name: string; role?: User["role"] }
  ): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>("/auth/register", userData);
    return data;
  },
};

export default api;
