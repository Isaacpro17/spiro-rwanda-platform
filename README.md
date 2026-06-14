# Spiro Rwanda Platform

> **Electric mobility infrastructure for Rwanda** — a full-stack web platform that powers battery-swap station operations, rider management, technician workflows, and executive analytics across the Spiro Rwanda network.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Feature Portals](#feature-portals)
- [Tech Stack](#tech-stack)
- [Internationalisation (i18n)](#internationalisation-i18n)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [API Overview](#api-overview)
- [Authentication & Role-Based Access](#authentication--role-based-access)
- [Colour System](#colour-system)
- [Browser Support](#browser-support)
- [License](#license)

---

## Overview

Spiro Rwanda Platform is a multi-role web application that connects every stakeholder in the electric-motorcycle battery-swap ecosystem:

| Stakeholder | Core need served |
|---|---|
| **Rider** | Find stations, request swaps, track history, manage wallet & subscription |
| **Station Operator** | Process swaps, manage inventory, handle reservations & maintenance |
| **Technician** | Receive tasks, run battery diagnostics, log work history |
| **Administrator** | Oversee the entire network — users, stations, batteries, finance, analytics |

The platform is built for the Rwandan market with first-class **English / Kinyarwanda** bilingual support throughout every portal.

---

## Architecture

```
spiro-rwanda-platform/
├── frontend/          # React 19 + TypeScript SPA (Vite)
└── backend/           # Node.js + Express REST API (TypeScript)
```

```
Client (Browser)
      │  HTTPS / REST
      ▼
 Express API  ──►  MongoDB Atlas
      │
      ▼
 Redis (sessions / queue)
```

- **Frontend** talks to the backend via a versioned REST API (`/api/v1/...`).
- **JWT** tokens are issued at login and sent as `Authorization: Bearer` headers on every subsequent request.
- **Role-based route guards** on both client and server enforce portal boundaries.

---

## Feature Portals

### Public

- Landing page with hero, stats, how-it-works, and CTA sections
- About Us — mission, vision, story, values, team
- Services — battery swap, charging, subscription, maintenance
- Contact — enquiry form with map
- Login, Register (multi-step with role selection), OTP phone verification

### Rider Portal

| Page | Capability |
|---|---|
| Dashboard | KPIs, quick-action shortcuts, active subscription status |
| Find Stations | Interactive Leaflet map with real-time availability |
| Swap Request | Book a battery swap with live queue and reservation slot |
| Swap History | Filterable log of all past swaps with cost & duration |
| Payments | Wallet top-up via mobile money, transaction history |
| Subscription | Plan browser, subscribe / upgrade in one click |
| Support | FAQ search + ticket submission and tracking |
| Profile | Personal info, vehicle details, password change, data export |

### Station Operator Portal

| Page | Capability |
|---|---|
| Dashboard | Live battery counts, queue length, today's revenue |
| Process Swap | Step-by-step swap wizard with rider lookup and battery assignment |
| Inventory | Real-time battery status grid, repair requests |
| Reservations | Upcoming / today / all tabs with overdue alerts |
| Maintenance | Log faults, track open requests, urgency classification |
| Analytics | Daily swap chart, revenue trend, stock level gauges |
| Profile | Station info, password change |

### Technician Portal

| Page | Capability |
|---|---|
| Dashboard | Open / in-progress / resolved KPIs, active task list |
| Tasks | Accept, start, and resolve maintenance requests |
| Diagnostics | Battery health analysis by serial number or station browse |
| Work History | Date-ranged log of all resolved tasks with resolution time |
| Profile | Assigned stations overview, password change |

### Admin Portal

| Page | Capability |
|---|---|
| Dashboard | Network-wide KPIs, system health bars, user breakdown chart, activity feed |
| Users | Full CRUD — create, edit, reset passwords, deactivate, delete |
| Stations | Station CRUD, staff assignment (operators + technicians) |
| Batteries | Fleet management, bulk status updates, health inspection modal |
| Finance | Transaction ledger, revenue stats, refund processing |
| Analytics | Recharts visualisations — swaps over time, battery fleet pie, top stations table |
| Settings | Admin profile, subscription plan CRUD, audit log |

---

## Tech Stack

### Frontend

| Layer | Technology |
|---|---|
| Framework | React 19 |
| Language | TypeScript 6 |
| Build | Vite 8 |
| Styling | Tailwind CSS v4 |
| UI primitives | Radix UI (via shadcn/ui) |
| Routing | React Router v6 |
| HTTP client | Axios (custom `api` wrapper with JWT injection) |
| Charts | Recharts |
| Maps | Leaflet + react-leaflet |
| Icons | Lucide React |
| i18n | Custom zero-dependency context system (see below) |

### Backend

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 |
| Framework | Express 5 (TypeScript) |
| Database | MongoDB + Mongoose |
| Cache / queue | Redis (ioredis) |
| Auth | JWT (jsonwebtoken) + bcrypt |
| OTP | SMS via Rwanda telecom gateway |
| Real-time | Socket.io |
| Validation | Zod |
| Testing | Jest + Supertest |

---

## Internationalisation (i18n)

The platform ships a **zero-dependency, type-safe i18n system** built entirely with React Context — no i18next, no external libraries.

### How it works

```
src/
├── contexts/LanguageContext.tsx   # Provider: { lang, t, toggle }
└── i18n/
    ├── en.ts                      # English master (source of truth)
    └── rw.ts                      # Kinyarwanda (typed as `Translations`)
```

- `en.ts` exports the `en` object and derives `export type Translations = typeof en`.
- `rw.ts` annotates its export as `: Translations` — TypeScript will error on any missing or extra key.
- Every component calls `const { t, lang, toggle } = useLanguage()` and accesses strings via a namespace shorthand (e.g. `const d = t.admin.dashboard`).
- Dynamic strings use `.replace('{key}', value)` — no interpolation runtime needed.
- The language toggle button appears on the login and register pages and within every portal's profile settings.

### Namespace map

```
t.nav            t.landing       t.about         t.services
t.contact        t.footer        t.auth.login    t.auth.register
t.auth.otp       t.rider.*       t.operator.*    t.technician.*
t.admin.*
```

---

## Project Structure

```
spiro-rwanda-platform/
│
├── frontend/
│   ├── public/
│   │   ├── spiro-logo.png          # Circular Spiro brand mark (app + favicon)
│   │   ├── hero.png
│   │   └── spiro-motorcycle.png
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/             # Navbar, Footer, DashboardLayout
│   │   │   └── ui/                 # Shared UI (Button, Card, SpiroLogo, Reveal…)
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx
│   │   │   └── LanguageContext.tsx
│   │   ├── i18n/
│   │   │   ├── en.ts
│   │   │   └── rw.ts
│   │   ├── lib/
│   │   │   └── api.ts              # Axios instance + interceptors
│   │   ├── pages/
│   │   │   ├── public/             # Landing, About, Services, Contact, Login, Register, OTP
│   │   │   ├── rider/              # 8 rider pages
│   │   │   ├── operator/           # 7 operator pages
│   │   │   ├── technician/         # 5 technician pages
│   │   │   └── admin/              # 7 admin pages
│   │   ├── App.tsx                 # Route definitions + role guards
│   │   ├── main.tsx                # React root + providers
│   │   └── index.css               # Tailwind directives + CSS variables
│   ├── index.html
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── controllers/            # Route handlers per domain
│   │   ├── models/                 # Mongoose schemas
│   │   ├── routes/                 # Express routers
│   │   ├── services/               # Business logic
│   │   ├── middleware/             # Auth guard, error handler, rate limiter
│   │   ├── sockets/                # Socket.io event handlers
│   │   └── utils/                  # Helpers (JWT, OTP, pagination)
│   ├── tests/
│   └── package.json
│
└── README.md
```

---

## Getting Started

### Prerequisites

- **Node.js** 20+
- **MongoDB** (Atlas URI or local instance)
- **Redis** (local or Redis Cloud)

### 1 — Clone & install

```bash
git clone https://github.com/your-org/spiro-rwanda-platform.git
cd spiro-rwanda-platform

# Backend dependencies
cd backend && npm install

# Frontend dependencies
cd ../frontend && npm install
```

### 2 — Configure environment

```bash
# Backend
cp backend/.env.example backend/.env
# Fill in MONGODB_URI, JWT_SECRET, REDIS_URL, SMS_API_KEY, etc.

# Frontend
cp frontend/.env.example frontend/.env
# Set VITE_API_URL=http://localhost:5000/api/v1
```

### 3 — Run in development

```bash
# Terminal 1 — API
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:5000 |

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret key for signing JWTs |
| `JWT_EXPIRES_IN` | Token lifetime (e.g. `7d`) |
| `REDIS_URL` | Redis connection URL |
| `PORT` | API server port (default `5000`) |
| `SMS_API_KEY` | SMS gateway key for OTP delivery |
| `NODE_ENV` | `development` \| `production` |

### Frontend (`frontend/.env`)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Base URL of the backend API |

---

## Available Scripts

### Frontend

```bash
npm run dev        # Start Vite dev server with HMR
npm run build      # Production build → dist/
npm run preview    # Serve the production build locally
npm run lint       # ESLint
```

### Backend

```bash
npm run dev        # ts-node-dev with hot reload
npm run build      # Compile TypeScript → dist/
npm run start      # Start compiled build
npm run test       # Jest test suite
```

---

## API Overview

All endpoints are prefixed `/api/v1/`.

| Domain | Base path |
|---|---|
| Auth | `/auth` |
| Users | `/users` |
| Stations | `/stations` |
| Batteries | `/batteries` |
| Swaps | `/swaps` |
| Reservations | `/reservations` |
| Payments | `/payments` |
| Subscriptions | `/subscriptions` |
| Maintenance | `/maintenance` |
| Analytics | `/analytics` |
| Audit | `/audit` |

---

## Authentication & Role-Based Access

```
POST /api/v1/auth/register   → creates user, sends OTP
POST /api/v1/auth/verify-otp → verifies phone, activates account
POST /api/v1/auth/login      → returns JWT + user object
```

Roles: `rider` | `operator` | `technician` | `admin`

The frontend enforces role boundaries via `<ProtectedRoute role="...">` wrappers in `App.tsx`. The backend re-validates the role on every protected endpoint via the `requireRole` middleware.

---

## Colour System

Defined as CSS custom properties in `index.css` and referenced throughout Tailwind classes:

| Token | Hex | Usage |
|---|---|---|
| `--color-primary` | `#3D4C9F` | Brand blue — navigation, buttons, active states |
| `--color-accent` | `#FFE500` | Yellow CTA highlights |
| `--color-success` | `#10B981` | Positive feedback |
| `--color-warning` | `#F59E0B` | Alerts |
| `--color-error` | `#EF4444` | Errors |

---

## Browser Support

| Browser | Versions |
|---|---|
| Chrome / Edge | Last 2 |
| Firefox | Last 2 |
| Safari | Last 2 |
| iOS Safari / Chrome Mobile | Last 2 |

---

## License

Copyright © 2026 Spiro Rwanda. All rights reserved.

This codebase is proprietary. Unauthorised copying, modification, distribution, or use of any part of this software without explicit written permission from Spiro Rwanda is strictly prohibited.
