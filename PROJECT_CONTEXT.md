# Project Context

Doc này là điểm vào đầu tiên cho mọi phiên làm việc tiếp theo. Trước khi code, hãy đọc file này rồi đọc tiếp `PROJECT_PROGRESS.md`.

## 1. Mục tiêu sản phẩm

- Dự án: `Sports Court Booking Platform`
- Domain MVP: đặt sân `badminton` và `pickleball`
- Mô hình: marketplace kết nối `User`, `Manager`, `Admin`
- Bài toán chính:
  - User tìm sân trên map, xem slot trống, đặt sân theo giờ
  - Manager quản lý lịch sân, xác nhận booking, theo dõi hoạt động
  - Admin quản lý manager, duyệt sân, xử lý audit/log

## 2. Tài liệu nghiệp vụ nguồn

- `BussinessRequirementDocument.md`
- `UseCasemodel.md`

Hai file trên là nguồn truth cho nghiệp vụ và use case. Khi có mâu thuẫn giữa UI hiện tại và BRD, cần bám BRD trước rồi mới đánh giá chi phí chỉnh sửa.

## 3. Tech stack thực tế trong repo

BRD từng ghi Spring Boot, nhưng repo hiện tại đang dùng:

- Frontend: `React 18 + Vite + TypeScript + Tailwind`
- Backend: `Node.js + Express + TypeScript`
- ORM/DB: `Prisma + PostgreSQL`
- Realtime: `WebSocket`
- Map: `Leaflet + react-leaflet`

## 4. Cấu trúc repo

- `frontend/`: ứng dụng web phía client
- `backend/`: API, WebSocket, scheduler, Prisma
- `design/`: tài nguyên thiết kế
- `docker-compose.yml`: PostgreSQL local

## 5. Quy tắc nghiệp vụ cốt lõi

- Slot booking theo `giờ chẵn`
- Thời lượng: `1h - 4h`
- Có hỗ trợ booking qua ngày
- `PENDING_PAYMENT` giữ slot `5 phút`
- Hết pending có `delay mở slot 30 giây`
- `WAITING_MANAGER_CONFIRM` auto cancel sau `1 giờ`
- User chỉ được hủy khi còn trước giờ chơi ít nhất `2 giờ`
- Không lộ contact manager trước khi booking được confirm
- Timezone nghiệp vụ: `UTC+7`

## 6. Booking lifecycle

- `PENDING_PAYMENT`
- `WAITING_MANAGER_CONFIRM`
- `CONFIRMED`
- `CANCELLED_BY_USER`
- `CANCELLED_BY_MANAGER`
- `EXPIRED`
- `COMPLETED`

## 7. Demo credentials hiện có trong seed

- Admin: `admin@courtbooking.vn / Admin@123`
- Manager: `manager1@courtbooking.vn` đến `manager4@courtbooking.vn / Manager@123`
- User: `user@courtbooking.vn / User@123`

## 8. Cách chạy local

### Database

```powershell
docker compose up -d
cd backend
npx prisma db push
npm run db:seed
```

### Backend

```powershell
cd backend
npm run dev
```

### Frontend

```powershell
cd frontend
npm run dev
```

## 9. Working rules cho các phiên tiếp theo

- Luôn đọc `PROJECT_CONTEXT.md` trước
- Sau đó đọc `PROJECT_PROGRESS.md` để biết checkpoint gần nhất
- Trước khi sửa code, chạy `git status --short`
- Ưu tiên tiếp tục từ phần dang dở thay vì refactor lại phần đã ổn
- `src/` là source of truth; `dist/` chỉ là build artifact
