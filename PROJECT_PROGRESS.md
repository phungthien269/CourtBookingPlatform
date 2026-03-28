# Project Progress

Doc này là checkpoint triển khai hiện tại. Mỗi lần bắt đầu làm tiếp, hãy đọc file này sau `PROJECT_CONTEXT.md`.

## 1. Snapshot hiện tại

Ngày checkpoint: `2026-03-29`

Repo đã được clone vào:

- `D:\BookingPlatform`

Branch hiện tại:

- `main`

## 2. Những gì đã có trong repo

### Đã có khá đầy đủ

- Discovery public:
  - map + list venues
  - filter theo district / sport type
  - venue detail
- Auth:
  - register / login / verify OTP
- Booking flow:
  - chọn court
  - chọn slot
  - quote
  - hold slot 5 phút
  - payment page
  - manager confirm / cancel booking
- Realtime/WebSocket:
  - đã có nền tảng cho booking + notifications
- Review + chat + notifications:
  - đã có phase 5 và 6 ở mức source code
- Database:
  - Prisma schema khá đầy, có seed data demo
- Manager portal:
  - dashboard, courts, schedule, analytics, subscription đã nối data thật
- Admin portal:
  - dashboard, renewal approvals, manager management, audit logs đã nối data thật

### Đang còn thiếu / chưa hoàn thiện rõ ràng

- Chưa có test tự động cho manager/admin portal
- Chưa có QA giao diện frontend đầy đủ cho toàn bộ luồng admin/manager
- Manager notifications hiện đã điều hướng đúng route, nhưng chưa có booking detail riêng cho manager
- `backend/dist/**` và `frontend/dist/**` đang chứa build artifact local

## 3. Việc đã làm trong các phiên gần nhất

### Đã hoàn thành

- Kiểm tra repo thực tế và xác nhận stack hiện tại không phải Spring Boot, mà là:
  - frontend React/Vite
  - backend Node/Express/Prisma
- Tạo checkpoint docs:
  - `PROJECT_CONTEXT.md`
  - `PROJECT_PROGRESS.md`
- Build kiểm tra:
  - `backend`: pass
  - `frontend`: pass
- Tạo backend service mới:
  - `backend/src/services/managerPortal.service.ts`
  - `backend/src/services/adminPortal.service.ts`
- Mở rộng backend route:
  - `backend/src/routes/manager.ts`
  - `backend/src/routes/admin.ts`
  - `backend/src/index.ts`
- Mở rộng frontend API:
  - `frontend/src/api/manager.ts`
  - `frontend/src/api/admin.ts`
- Thay placeholder manager pages bằng pages thật:
  - `frontend/src/pages/manager/Dashboard.tsx`
  - `frontend/src/pages/manager/ManagerCourtsPage.tsx`
  - `frontend/src/pages/manager/ManagerSchedulePage.tsx`
  - `frontend/src/pages/manager/ManagerAnalyticsPage.tsx`
  - `frontend/src/pages/manager/ManagerSubscriptionPage.tsx`
- Thay placeholder admin pages bằng pages thật:
  - `frontend/src/pages/admin/Dashboard.tsx`
  - `frontend/src/pages/admin/Approvals.tsx`
  - `frontend/src/pages/admin/Managers.tsx`
  - `frontend/src/pages/admin/AuditLogs.tsx`
- Update routing và layout:
  - `frontend/src/App.tsx`
  - `frontend/src/components/layouts/ManagerLayout.tsx`
  - `frontend/src/components/layouts/AdminLayout.tsx`
- Fix notification navigation theo role:
  - `frontend/src/components/NotificationBell.tsx`
  - `frontend/src/pages/Notifications.tsx`
- Chạy smoke test runtime trên backend local:
  - `npx prisma db push`: pass
  - `npm run db:seed`: pass
  - login admin/manager: pass
  - manager gửi renewal request: pass
  - admin approve renewal request: pass
  - admin create manager: pass
  - admin lock/unlock manager: pass
  - admin audit logs trả dữ liệu: pass
  - reseed lại lần cuối để trả DB về bộ dữ liệu demo sạch: pass

### Nội dung backend manager portal mới

Đã thêm logic/API cho:

- manager context
- manager overview
- manager courts
- update court
- venue image management
- weekly schedule
- holiday management
- blackout management
- analytics
- subscription summary
- subscription renewal request log

### Nội dung backend admin portal mới

Đã thêm logic/API cho:

- admin overview từ dữ liệu thật
- list renewal requests theo trạng thái
- approve renewal request
- reject renewal request
- cộng dồn `subscriptionExpiresAt` khi duyệt
- ghi audit log cho approval/rejection
- gửi notification cho manager sau khi admin xử lý
- list managers theo filter/search
- create manager account từ admin portal
- lock/unlock manager account
- audit log viewer theo filter/search/date range

## 4. Trạng thái build sau thay đổi

- `backend`: build pass vào ngày `2026-03-29`
- `frontend`: build pass vào ngày `2026-03-29`
- `backend runtime smoke test`: pass vào ngày `2026-03-29`
- `database reseed after smoke test`: pass vào ngày `2026-03-29`
- Ghi chú:
  - frontend vẫn có warning bundle > 500kB ở build production
  - chưa xử lý code splitting

## 5. Working tree cần biết

Hiện có thay đổi sinh ra từ local build:

- `backend/dist/**`
- `frontend/dist/**`
- `frontend/tsconfig.tsbuildinfo`

Các file này là artifact sinh từ build local, không phải trọng tâm nghiệp vụ. Khi làm tiếp, ưu tiên nhìn vào:

- `backend/src/**`
- `frontend/src/**`
- `PROJECT_CONTEXT.md`
- `PROJECT_PROGRESS.md`

## 6. Trạng thái theo module

### Manager portal

- Backend manager portal đã có API thật
- Frontend manager portal đã nối xong vào API thật
- Các route manager sau đã có UI vận hành được:
  - `/manager`
  - `/manager/courts`
  - `/manager/schedule`
  - `/manager/analytics`
  - `/manager/subscription`

### Admin portal

- Admin dashboard đã đọc số liệu renewal thật từ backend
- Admin approvals page đã có:
  - tab filter theo trạng thái
  - danh sách renewal requests thật
  - approve với review note tùy chọn
  - reject với review note bắt buộc
- Admin managers page đã có:
  - search/filter theo trạng thái
  - create manager account
  - lock/unlock manager account
- Admin audit logs page đã có:
  - filter theo event type
  - filter theo date range
  - search theo actor/action/target
  - export CSV từ dữ liệu đang hiển thị
- Backend đã cộng dồn hạn subscription khi approve
- Manager đã nhận được notification sau approve/reject và lock/unlock
- Đã verify runtime bằng API thật cho các luồng admin chính

## 7. Điểm tiếp tục hợp lý nhất

### Ưu tiên 1

Hoàn thiện manager onboarding khi chưa có venue:

1. manager login khi chưa có venue không bị UX dead-end
2. thêm empty state hoặc onboarding flow cho manager mới

### Ưu tiên 2

Chạy full local QA giao diện:

1. chạy backend/frontend local
2. test bằng tài khoản admin, manager, user
3. verify UI end-to-end:
   - manager gửi renewal request
   - admin approve/reject
   - manager thấy notification
   - `subscriptionExpiresAt` tăng đúng
   - admin tạo manager mới
   - admin khóa/mở khóa manager
   - audit logs hiển thị đúng từng action

### Ưu tiên 3

Tối ưu bundle frontend:

1. code splitting manager/admin pages
2. lazy load map / manager portal / admin portal

## 8. File quan trọng cần đọc đầu tiên khi resume

- `PROJECT_CONTEXT.md`
- `PROJECT_PROGRESS.md`
- `backend/src/routes/manager.ts`
- `backend/src/routes/admin.ts`
- `backend/src/services/managerPortal.service.ts`
- `backend/src/services/adminPortal.service.ts`
- `frontend/src/App.tsx`
- `frontend/src/components/layouts/ManagerLayout.tsx`
- `frontend/src/components/layouts/AdminLayout.tsx`
- `frontend/src/pages/manager/Dashboard.tsx`
- `frontend/src/pages/manager/ManagerCourtsPage.tsx`
- `frontend/src/pages/manager/ManagerSchedulePage.tsx`
- `frontend/src/pages/manager/ManagerAnalyticsPage.tsx`
- `frontend/src/pages/manager/ManagerSubscriptionPage.tsx`
- `frontend/src/pages/admin/Dashboard.tsx`
- `frontend/src/pages/admin/Approvals.tsx`
- `frontend/src/pages/admin/Managers.tsx`
- `frontend/src/pages/admin/AuditLogs.tsx`
- `frontend/src/api/manager.ts`
- `frontend/src/api/admin.ts`

## 9. Ghi chú cho phiên sau

- Không cần audit lại toàn repo từ đầu
- Không cần làm lại booking flow phase 1-6
- Không cần làm lại manager portal và admin portal hiện tại
- Điểm tiếp tục hợp lý nhất hiện tại là `manager onboarding khi chưa có venue` hoặc `QA giao diện end-to-end`
