import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import api, { ENDPOINTS } from "../../../lib/api";
import type {
  AuthResponse,
  LoginCredentials,
  RegisterCredentials,
} from "../../../types/auth";
import type { AuthState } from "./types";

// Thunks
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

const getStoredUser = () => {
  const user =
    JSON.parse(localStorage.getItem("user") || "null") ||
    JSON.parse(sessionStorage.getItem("user") || "null");
  return user;
};

const getStoredToken = () => {
  return localStorage.getItem("token") || sessionStorage.getItem("token");
};

const user = getStoredUser();
const token = getStoredToken();

const initialState: AuthState = {
  user,
  token,
  isAuthenticated: !!(user && token),
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      sessionStorage.removeItem("user");
      sessionStorage.removeItem("token");
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        const storage = localStorage.getItem("rememberMe")
          ? localStorage
          : sessionStorage;
        storage.setItem("user", JSON.stringify(action.payload.user));
        storage.setItem("token", action.payload.token);
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Login failed";
      });

    // Register
    builder
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        localStorage.setItem("user", JSON.stringify(action.payload.user));
        localStorage.setItem("token", action.payload.token);
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Registration failed";
      });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
