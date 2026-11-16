import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { authApi } from '@api/endpoints';
import { clearToken, getToken, setToken } from '@helpers/auth';

export const login = createAsyncThunk('auth/login', async ({ email, password }) => {
  const { token, user } = await authApi.login(email, password);
  setToken(token);
  return { token, user };
});

// On boot: the token cookie exists → fetch the current user.
export const fetchMe = createAsyncThunk('auth/me', () => authApi.me());

const authSlice = createSlice({
  name: 'auth',
  initialState: { token: getToken(), user: null, status: getToken() ? 'loading' : 'ready', error: null },
  reducers: {
    logout(state) {
      clearToken();
      state.token = null;
      state.user = null;
      state.status = 'ready';
    },
    tokenRefreshed(state, { payload }) {
      setToken(payload);
      state.token = payload;
    },
    userUpdated(state, { payload }) {
      state.user = { ...state.user, ...payload };
    },
  },
  extraReducers: (b) =>
    b
      .addCase(login.pending, (s) => { s.error = null; })
      .addCase(login.fulfilled, (s, { payload }) => {
        s.token = payload.token;
        s.user = payload.user;
        s.status = 'ready';
      })
      .addCase(login.rejected, (s, a) => { s.error = a.error.message; })
      .addCase(fetchMe.fulfilled, (s, { payload }) => {
        s.user = payload;
        s.status = 'ready';
      })
      .addCase(fetchMe.rejected, (s) => {
        clearToken();
        s.token = null;
        s.user = null;
        s.status = 'ready';
      }),
});

export const { logout, tokenRefreshed, userUpdated } = authSlice.actions;
export default authSlice.reducer;
