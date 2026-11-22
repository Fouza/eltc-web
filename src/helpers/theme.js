import { useSyncExternalStore } from 'react';

// Light/dark theme. Stored per browser; defaults to the system setting.
// index.html applies the saved theme before the app loads to avoid a white flash.
const KEY = 'eltc-theme';
const listeners = new Set();

const saved = () => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};
const systemDark = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;

let theme = saved() === 'dark' || (saved() !== 'light' && systemDark()) ? 'dark' : 'light';

const apply = () => document.documentElement.setAttribute('data-bs-theme', theme);

export const setTheme = (next) => {
  theme = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    // Private mode or blocked storage: the theme still applies for this visit.
  }
  apply();
  listeners.forEach((l) => l());
};

export const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

export const initTheme = apply;

export const useTheme = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => theme,
  );
