import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { notificationsApi } from '@api/endpoints';

export const fetchNotifications = createAsyncThunk('notifications/fetch', (params) => notificationsApi.list({ limit: 50, ...params }));
export const markRead = createAsyncThunk('notifications/read', async (id) => {
  await notificationsApi.read(id);
  return id;
});
export const markAllRead = createAsyncThunk('notifications/readAll', () => notificationsApi.readAll());

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: { items: [], unread: 0, loading: false },
  reducers: {
    // Socket event → new notification on top.
    notificationReceived(state, { payload }) {
      if (state.items.some((n) => n._id === payload._id)) return;
      state.items.unshift({ ...payload, read: false });
      state.unread += 1;
    },
  },
  extraReducers: (b) =>
    b
      .addCase(fetchNotifications.pending, (s) => { s.loading = true; })
      .addCase(fetchNotifications.fulfilled, (s, { payload }) => {
        s.loading = false;
        s.items = payload.items;
        s.unread = payload.unread;
      })
      .addCase(fetchNotifications.rejected, (s) => { s.loading = false; })
      .addCase(markRead.fulfilled, (s, { payload }) => {
        const n = s.items.find((x) => x._id === payload);
        if (n && !n.read) {
          n.read = true;
          s.unread = Math.max(0, s.unread - 1);
        }
      })
      .addCase(markAllRead.fulfilled, (s) => {
        s.items.forEach((n) => { n.read = true; });
        s.unread = 0;
      }),
});

export const { notificationReceived } = notificationsSlice.actions;
export default notificationsSlice.reducer;
