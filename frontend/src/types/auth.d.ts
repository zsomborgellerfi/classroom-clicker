import type { User } from "@shared/types";

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface RegisterCredentials extends LoginCredentials {
  name: string;
  role?: User["role"];
}
