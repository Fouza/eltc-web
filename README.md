# eltc-web

Back-office web app for ELTC School, on the Rangewell architecture (see `../NEW_PROJECT_BLUEPRINT.md`):
React 19 + Redux Toolkit + React Router 7, built by Vite as a static SPA, Bootstrap 5 + SCSS modules, socket.io-client 4.

## Run locally

```bash
cp .env.example .env     # VITE_API_URL / VITE_SOCKET_URL (public values only)
npm install
npm run dev              # http://localhost:5174 (8777 is left free for rangewell-admin)
npm run build            # → dist/ ; `npm start` serves it with history fallback
npm test                 # vitest + React Testing Library
```

## Layout

```
src/
  main.jsx            store + SocketProvider + ConfirmProvider + router + toasts
  routes.jsx          route config with `auth` / `roles` (Rangewell style) → React Router objects
  store/              RTK slices: auth, refs (campuses, languages, programs, teachers, settings), notifications, ui, students, groups
  api/                client.js (fetch wrapper, Bearer token, throws on non-2xx) + endpoints.js (plain functions per domain)
  components/         <Name>/<Name>.jsx + <Name>.module.scss, re-exported from components/index.js
  pages/<Area>/       one folder per area (Dashboard, Students, Groups, Attendance, Exams, Payments, ...)
  layouts/            AppLayout (sidebar + top bar), PublicLayout
  context/            SocketContext (socket events → Redux), ConfirmContext (await confirm({...}))
  helpers/            format (money, dates), csv (import/export), hooks (useApi, useCan, useCampus), forms, toast
  data/               roles.js (copy of the API's), enums.js (labels + badge tones), days.js
  styles/             _variables.scss (design tokens), _bootstrap.scss (theme), utilities/, global.scss
```

Conventions: global/shared state lives in slices; page-local data uses `useApi(() => api.x(), [deps])`.
Utility classes live in `styles/utilities/_utilities.scss` — check there before inventing a class.
Brand: blue `#064CA5` + white, gradient to purple `#7B3FE4` for primary buttons (tokens in `_variables.scss`).
