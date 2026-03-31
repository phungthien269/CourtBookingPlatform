# Production Environment Guide

## Environment Matrix

| Environment | Frontend | Backend API | Worker | Database |
| --- | --- | --- | --- | --- |
| `local` | Vite dev server | `tsx watch src/index.ts` | `tsx watch src/worker.ts` | Docker PostgreSQL |
| `staging` | Vercel preview | Railway service `api-staging` | Railway service `worker-staging` | Railway PostgreSQL |
| `production` | Vercel production | Railway service `api-production` | Railway service `worker-production` | Railway PostgreSQL |

## Deployment Shape

- `frontend`: deploy từ [frontend](/D:/BookingPlatform/frontend) lên `Vercel`
- `backend api`: deploy từ [backend](/D:/BookingPlatform/backend) script `npm run start:api`
- `backend worker`: deploy từ [backend](/D:/BookingPlatform/backend) script `npm run start:worker`
- `database`: `Railway PostgreSQL`
- `email`: `Resend`
- `monitoring`: `Sentry` + structured logs từ `pino`

## Health Endpoints

- `GET /api/health`
- `GET /api/health/live`
- `GET /api/health/ready`

`ready` chỉ `ready=true` khi:

- database reachable
- worker heartbeat còn mới

## Release Gate

Không release production nếu thiếu:

- domain chính thức
- support email / support hotline
- `RESEND_API_KEY`
- `PAYMENT_WEBHOOK_SECRET`
- backup restore drill
- staging smoke test pass

