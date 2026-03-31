# CourtBooking Platform (Pickleball & Badminton)

CourtBooking là nền tảng **marketplace đặt sân thể thao theo giờ** (MVP: **Badminton** + **Pickleball**) với 3 portal: **User**, **Manager**, **Admin**.

Production cut hướng tới **Public Beta (web-only)**:

- Khám phá sân trên **map**
- Booking theo giờ + **anti double-booking** (hold slot + realtime update)
- **Cash**: manager confirm thủ công
- **Transfer**: auto-confirm qua **bank webhook aggregator** (idempotent) + có **payment reconciliation queue**
- Backend tách **API service** và **Worker service** (jobs: expire hold, timeout confirm, payment processing, heartbeat)

## Tech Stack

- Frontend: React 18, Vite, TypeScript, Tailwind CSS
- Backend: Node.js, Express, TypeScript
- Database/ORM: PostgreSQL, Prisma
- Realtime: WebSocket (`ws`)
- Map: Leaflet + `react-leaflet`
- Logging/Monitoring: `pino`, `pino-http`, optional `Sentry`
- Email: `Resend`

## Key Features

### Guest / User

- Map + list venues, filter theo môn/quận
- Chọn **sân con** theo layout (Court #)
- Chọn slot **giờ chẵn**, duration **1–4h**, hỗ trợ qua ngày
- **Hold slot 5 phút** khi bắt đầu thanh toán (refresh không reset), release có delay **30s**
- Payment:
  - Cash -> `WAITING_MANAGER_CONFIRM`
  - Transfer -> tạo **transfer session** với `referenceCode` riêng theo booking + hiển thị VietQR
- Hủy booking (chỉ khi trước giờ chơi >= **2h**)
- Notifications, chat text theo booking (MVP), review (sau completed)

### Manager Portal

- Dashboard booking theo ngày/giờ, realtime notification
- Confirm / reject booking + bắt buộc lý do khi hủy
- Quản lý venue/courts: giá theo giờ, ảnh (<=10), active/inactive
- Thiết lập lịch hoạt động (ca/ngày), ngày nghỉ, khóa sân theo time range
- Analytics + export CSV
- Subscription renewal request (manual) và expiry ẩn venue khỏi map

### Admin Portal

- Overview dashboard
- Duyệt/từ chối renewal requests + audit logs
- Quản lý manager: create, lock/unlock
- Audit logs viewer + export CSV
- **Payment reconciliation queue**: xem webhook không auto-confirm (`UNMATCHED`, `LATE_PAYMENT`, `AMOUNT_MISMATCH`)

## Business Rules (tóm tắt)

- Slot theo **giờ chẵn** (7:00, 8:00, ...), duration **1–4h**
- Hold slot **5 phút** (`PENDING_PAYMENT`), hết hold release có delay **30s**
- Cash: nếu manager không confirm trong **1h** -> auto-cancel
- User chỉ hủy được nếu còn trước giờ chơi **>=2h**
- Timezone nghiệp vụ: **UTC+7**

## Booking Lifecycle

`PENDING_PAYMENT` -> `WAITING_MANAGER_CONFIRM` -> `CONFIRMED`  
Ngoài ra: `CANCELLED_BY_USER`, `CANCELLED_BY_MANAGER`, `EXPIRED`, `COMPLETED`

## Health Endpoints

- `GET /api/health`
- `GET /api/health/live`
- `GET /api/health/ready`

`ready` chỉ `ready=true` khi DB reachable và worker heartbeat còn mới.

## Repo Structure

- `frontend/`: React app (User/Manager/Admin portals)
- `backend/`: Express API + Worker entrypoint + Prisma schema/seed
- `docs/`: production docs + policies
- `design/`: design assets
- `docker-compose.yml`: PostgreSQL local

## Local Development

### Prerequisites

- Node.js >= 18
- Docker Desktop

### 1) Start PostgreSQL

```powershell
docker compose up -d
```

### 2) Backend API

```powershell
cd backend
copy .env.example .env
npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

API default: `http://localhost:3001/api`

### 3) Backend Worker

```powershell
cd backend
npm run dev:worker
```

### 4) Frontend

```powershell
cd frontend
copy .env.example .env
npm install
npm run dev
```

Frontend default: `http://localhost:5173`

## Demo Credentials (seed)

- Admin: `admin@courtbooking.vn / Admin@123`
- Manager: `manager1@courtbooking.vn` đến `manager4@courtbooking.vn / Manager@123`
- User: `user@courtbooking.vn / User@123`

## Production Docs

- `docs/production/README.md`
- `docs/production/secrets-checklist.md`
- `docs/production/runbook-deploy.md`
- `docs/production/runbook-rollback.md`
- `docs/policies/*`

## CV Highlights (copy/paste)

- Built a map-based sports court booking marketplace (User/Manager/Admin portals) with real-time availability and RBAC.
- Implemented anti double-booking with server-side slot hold (`PENDING_PAYMENT`) + worker-driven expiry/timeouts.
- Designed transfer auto-confirm payments via bank webhook aggregator: transfer sessions with unique reference codes, idempotent webhook ingestion, and admin reconciliation queue for late/mismatched payments.
- Production hardening: structured logging (pino), rate limiting, security headers (helmet), health/readiness checks, audit logs, and transactional email (Resend).
