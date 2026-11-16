import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { studentsApi } from '@api/endpoints';

// The student list keeps its filters when you open a profile and come back.
export const fetchStudents = createAsyncThunk('students/fetch', (query, { getState }) =>
  studentsApi.list({ ...getState().students.query, ...query, campus: getState().ui.campus }),
);

const initialQuery = { q: '', status: '', program: '', overdue: '', page: 1, limit: 25 };

const studentsSlice = createSlice({
  name: 'students',
  initialState: { query: initialQuery, items: [], total: 0, pages: 1, loading: false, error: null },
  reducers: {
    queryChanged(state, { payload }) {
      state.query = { ...state.query, page: 1, ...payload };
    },
    queryReset(state) { state.query = initialQuery; },
  },
  extraReducers: (b) =>
    b
      .addCase(fetchStudents.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(fetchStudents.fulfilled, (s, { payload }) => {
        s.loading = false;
        s.items = payload.items;
        s.total = payload.total;
        s.pages = payload.pages;
      })
      .addCase(fetchStudents.rejected, (s, a) => { s.loading = false; s.error = a.error.message; }),
});

export const { queryChanged, queryReset } = studentsSlice.actions;
export default studentsSlice.reducer;
