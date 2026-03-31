# Deploy Runbook

## Pre-deploy

1. Merge to `main`.
2. Verify CI green on lint, build, prisma validate.
3. Run staging smoke:
   - register/verify
   - cash booking
   - transfer auto-confirm webhook
   - manager dashboard refresh
   - admin renewal + audit logs

## Backend API

1. Set Railway start command to `npm run start:api`.
2. Run `npx prisma migrate deploy`.
3. Confirm `GET /api/health/ready` returns `ready=true`.

## Worker

1. Set Railway worker start command to `npm run start:worker`.
2. Verify worker heartbeat appears within 30 seconds.

## Frontend

1. Deploy [frontend](/D:/BookingPlatform/frontend) to Vercel.
2. Confirm `VITE_API_URL` points to the API base URL.
3. Validate homepage, login, payment page, manager portal, admin portal.

