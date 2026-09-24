# LeadFlow web

Vue 3 SPA for LeadFlow.

## Stack

- Vue 3 Composition API
- TypeScript
- Pinia
- Vue Router
- Tailwind CSS
- Axios

## Setup

```bash
npm install
copy .env.example .env
npm run dev
```

The SPA runs at `http://localhost:5173` and expects the API at `http://localhost:8000`.

`VITE_API_URL` must match the Laravel `APP_URL` host. Use `localhost` on both sides.

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run format
```

## Current screens

- `/login` — session login
- `/` — authenticated home
- `/users` — staff management (administrator and manager)
- `/services` — service catalog
- `/availability` — recurring working hours

CRM, pipeline, and calendar screens are intentionally absent until later phases.
