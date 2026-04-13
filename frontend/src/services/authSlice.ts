import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { AuthResponse, AuthUser } from "./api";

type AuthState = {
  accessToken: string | null;
  tokenType: "Bearer";
  user: AuthUser | null;
};

const initialState: AuthState = {
  accessToken: null,
  tokenType: "Bearer",
  user: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<AuthResponse>) => {
      state.accessToken = action.payload.accessToken;
      state.tokenType = action.payload.tokenType;
      state.user = action.payload.user;
    },
    clearCredentials: (state) => {
      state.accessToken = null;
      state.tokenType = "Bearer";
      state.user = null;
    },
    setCurrentUser: (state, action: PayloadAction<AuthUser>) => {
      state.user = action.payload;
    },
  },
});

export const { setCredentials, clearCredentials, setCurrentUser } =
  authSlice.actions;

export default authSlice.reducer;
