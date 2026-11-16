import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { campusesApi, languagesApi, programsApi, teachersApi, settingsApi } from '@api/endpoints';
import { setFormatSettings } from '@helpers/format';

// Reference data used by every page (selects, badges): loaded once after login, reloaded after edits.
const loaders = {
  campuses: () => campusesApi.list(),
  languages: () => languagesApi.list(),
  programs: () => programsApi.list(),
  teachers: () => teachersApi.list(),
  settings: () => settingsApi.get(),
};

export const fetchRefs = createAsyncThunk('refs/fetchAll', async () => {
  const entries = await Promise.all(Object.entries(loaders).map(async ([k, fn]) => [k, await fn()]));
  return Object.fromEntries(entries);
});

export const reloadRef = createAsyncThunk('refs/reload', async (name) => ({ name, data: await loaders[name]() }));

const refsSlice = createSlice({
  name: 'refs',
  initialState: { loaded: false, campuses: [], languages: [], programs: [], teachers: [], settings: null },
  reducers: {},
  extraReducers: (b) =>
    b
      .addCase(fetchRefs.fulfilled, (s, { payload }) => {
        Object.assign(s, payload, { loaded: true });
        setFormatSettings(payload.settings);
      })
      .addCase(reloadRef.fulfilled, (s, { payload }) => {
        s[payload.name] = payload.data;
        if (payload.name === 'settings') setFormatSettings(payload.data);
      }),
});

export default refsSlice.reducer;

// Selectors
export const selectCampusMap = (s) => Object.fromEntries(s.refs.campuses.map((c) => [c._id, c]));
export const selectProgramMap = (s) => Object.fromEntries(s.refs.programs.map((p) => [p._id, p]));
