import { configureStore } from "@reduxjs/toolkit";

import authReducer from "./slices/auth/slice";
import { configureApiAuth } from "../lib/api";

export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
});

configureApiAuth(() => store.getState().auth.token);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
