import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { AuthUser } from "./api";

type AuthState = {
  user: AuthUser | null;
};

const initialState: AuthState = {
  user: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearCredentials: (state) => {
      state.user = null;
    },
    setCurrentUser: (state, action: PayloadAction<AuthUser>) => {
      state.user = action.payload;
    },
  },
});

export const { clearCredentials, setCurrentUser } = authSlice.actions;

export default authSlice.reducer;
