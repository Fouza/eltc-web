import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { groupsApi } from '@api/endpoints';

export const fetchGroups = createAsyncThunk('groups/fetch', (query, { getState }) =>
  groupsApi.list({ ...getState().groups.query, ...query, campus: getState().ui.campus }),
);

const groupsSlice = createSlice({
  name: 'groups',
  initialState: { query: { status: 'ongoing,planned', program: '', language: '' }, items: [], loading: false, error: null },
  reducers: {
    groupsQueryChanged(state, { payload }) { state.query = { ...state.query, ...payload }; },
    groupUpserted(state, { payload }) {
      const i = state.items.findIndex((g) => g._id === payload._id);
      if (i >= 0) state.items[i] = payload;
      else state.items.unshift(payload);
    },
  },
  extraReducers: (b) =>
    b
      .addCase(fetchGroups.pending, (s) => { s.loading = true; })
      .addCase(fetchGroups.fulfilled, (s, { payload }) => { s.loading = false; s.items = payload; })
      .addCase(fetchGroups.rejected, (s, a) => { s.loading = false; s.error = a.error.message; }),
});

export const { groupsQueryChanged, groupUpserted } = groupsSlice.actions;
export default groupsSlice.reducer;
