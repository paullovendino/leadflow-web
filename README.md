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

The Laravel API remains `/api/v1/...`. Frontend route changes do not change API URLs.

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run format
```

## Public and admin routes

The public marketing site and the authenticated CRM are separate surfaces in the same SPA.

### Public

The public site does **not** expose a staff login link. Visitors stay on the marketing pages.

| Path | Purpose |
| --- | --- |
| `/` | Public landing page |
| `/#services` | Active service catalog |
| `/#how-it-works` | Request → review → follow-up |
| `/#contact` | Public lead form |

### Admin

Staff open the login URL directly. It is not linked from the public navigation.

| Path | Purpose |
| --- | --- |
| `/admin` | Staff login |

After authentication:

| Path | Purpose |
| --- | --- |
| `/admin/dashboard` | Workspace home |
| `/admin/leads` | Lead list |
| `/admin/leads/:id` | Lead detail |
| `/admin/pipeline` | Pipeline board |
| `/admin/customers` | Customer list |
| `/admin/customers/:id` | Customer detail |
| `/admin/appointments` | Appointment list |
| `/admin/appointments/:id` | Appointment detail |
| `/admin/staff` | Staff management (administrator and manager) |
| `/admin/services` | Service catalog |
| `/admin/availability` | Recurring working hours |

### Auth behavior

- Unauthenticated `/admin/*` pages redirect to `/admin`
- Authenticated visits to `/admin` redirect to `/admin/dashboard`
- Logout returns to `/admin`
- Authenticated staff can still open `/` to preview the public site
- Older CRM paths such as `/login` and `/dashboard` redirect to the `/admin` equivalents
