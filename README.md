# CourtBooking Platform

## Project Overview

CourtBooking is a marketplace web application for sports court booking, focused on badminton, pickleball, and tennis. The platform connects players (`Users`) with court owners (`Managers`) through a single booking and operations system.

The current production target is a web-only public beta with:

- Venue discovery on a map
- Hour-based booking with anti-double-booking protection
- `CASH` payments with manual manager confirmation
- `TRANSFER` payments with automatic confirmation via webhook-based bank transfer detection
- Separate backend API and worker processes for hold expiry, confirmation timeout, payment processing, and heartbeat monitoring

## Tech Stack

- Frontend: `React 18`, `Vite`, `TypeScript`, `Tailwind CSS`
- Backend: `Node.js`, `Express`, `TypeScript`
- Database / ORM: `PostgreSQL`, `Prisma`
- Realtime: WebSocket via `ws`
- Map: `Leaflet`, `react-leaflet`
- Logging / Monitoring: `pino`, optional `Sentry`
- Email: `Resend`

## Key Features

### Guest / User

- Venue discovery on map and list views, with district and sport filters
- Court selection by venue layout
- Booking on fixed hourly slots with durations from `1` to `4` hours
- Cross-day booking support
- `5-minute` slot hold during payment, with delayed release to reduce race conditions
- Payment flows:
  - `CASH` -> moves to `WAITING_MANAGER_CONFIRM`
  - `TRANSFER` -> generates a transfer session with a unique `referenceCode` and QR code
- Booking cancellation only if the start time is at least `2 hours` away
- Notifications, booking-based chat, and post-completion reviews

### Manager Portal

- Booking dashboard with real-time updates
- Confirm / reject booking actions, including required rejection reason
- Venue and court management: pricing, active status, images
- Schedule management: opening hours, holidays, and blackout time ranges
- Analytics and CSV export
- Subscription renewal requests and visibility control for expired venues

### Admin Portal

- Overview dashboard
- Renewal approval / rejection workflow with audit logs
- Manager account management: create, lock, unlock
- Audit log viewer with CSV export
- Payment reconciliation queue for webhook events that could not be auto-confirmed:
  - `UNMATCHED`
  - `LATE_PAYMENT`
  - `AMOUNT_MISMATCH`

## Core Business Rules

- Bookings use fixed hourly slots such as `07:00`, `08:00`, `09:00`
- Booking duration is limited to `1-4 hours`
- Slot hold lasts `5 minutes` in `PENDING_PAYMENT`
- Expired holds are released after an extra `30-second` buffer
- Cash bookings are auto-cancelled if the manager does not confirm within `1 hour`
- Users can only cancel if the booking starts in at least `2 hours`
- Business timezone is `UTC+7`

## Booking Lifecycle

Primary flow:

`PENDING_PAYMENT` -> `WAITING_MANAGER_CONFIRM` -> `CONFIRMED`

Other terminal / alternate states:

- `CANCELLED_BY_USER`
- `CANCELLED_BY_MANAGER`
- `EXPIRED`
- `COMPLETED`

## Health Endpoints

- `GET /api/health`
- `GET /api/health/live`
- `GET /api/health/ready`

`ready` returns `ready=true` only when the database is reachable and the worker heartbeat is still fresh.

## Repository Structure

- `frontend/`: React application for User, Manager, and Admin portals
- `backend/`: Express API, worker entrypoint, Prisma schema, and seed data
- `docs/`: production docs and operational policies
- `design/`: design assets
- `docker-compose.yml`: local PostgreSQL setup

## Local Development

### Prerequisites

- `Node.js >= 18`
- `Docker Desktop`

### 1. Start PostgreSQL

```powershell
docker compose up -d
```

### 2. Start the Backend API

```powershell
cd backend
copy .env.example .env
npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

Default API URL: `http://localhost:3001/api`

### 3. Start the Backend Worker

```powershell
cd backend
npm run dev:worker
```

### 4. Start the Frontend

```powershell
cd frontend
copy .env.example .env
npm install
npm run dev
```

Default frontend URL: `http://localhost:5173`

## Demo Credentials

- Admin: `admin@courtbooking.vn / Admin@123`
- Manager: `manager1@courtbooking.vn` to `manager4@courtbooking.vn / Manager@123`
- User: `user@courtbooking.vn / User@123`

## Production Documentation

- `docs/production/README.md`
- `docs/production/secrets-checklist.md`
- `docs/production/runbook-deploy.md`
- `docs/production/runbook-rollback.md`
- `docs/policies/*`
