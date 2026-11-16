import { configureStore } from '@reduxjs/toolkit';
import auth from './authSlice';
import refs from './refsSlice';
import notifications from './notificationsSlice';
import ui from './uiSlice';
import students from './studentsSlice';
import groups from './groupsSlice';

export const store = configureStore({ reducer: { auth, refs, notifications, ui, students, groups } });
