import { createAsyncThunk } from "@reduxjs/toolkit";

import api, { ENDPOINTS } from "../../../lib/api";
import type {
  AuthResponse,
  LoginCredentials,
  RegisterCredentials,
} from "../../../types/auth";

export const login = createAsyncThunk<AuthResponse, LoginCredentials>(
  "auth/login",
  async (credentials) => {
    const { data } = await api.post<AuthResponse>(
      ENDPOINTS.AUTH.LOGIN(),
      credentials,
    );
    return data;
  },
);

export const register = createAsyncThunk<AuthResponse, RegisterCredentials>(
  "auth/register",
  async (credentials) => {
    const { data } = await api.post<AuthResponse>(
      ENDPOINTS.AUTH.REGISTER(),
      credentials,
    );
    return data;
  },
); 