import { createSlice, nanoid } from '@reduxjs/toolkit';

const readCampus = () => {
  try { return localStorage.getItem('eltc_campus') ?? ''; } catch { return ''; }
};

const uiSlice = createSlice({
  name: 'ui',
  initialState: { campus: readCampus(), toasts: [], sidebarOpen: false },
  reducers: {
    campusSelected(state, { payload }) {
      state.campus = payload;
      try { localStorage.setItem('eltc_campus', payload); } catch { /* private mode */ }
    },
    toastAdded: {
      reducer(state, { payload }) { state.toasts.push(payload); },
      prepare: ({ tone = 'success', title, message }) => ({ payload: { id: nanoid(), tone, title, message } }),
    },
    toastRemoved(state, { payload }) { state.toasts = state.toasts.filter((t) => t.id !== payload); },
    sidebarToggled(state, { payload }) { state.sidebarOpen = payload ?? !state.sidebarOpen; },
  },
});

export const { campusSelected, toastAdded, toastRemoved, sidebarToggled } = uiSlice.actions;
export default uiSlice.reducer;
