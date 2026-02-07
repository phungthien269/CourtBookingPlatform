# Stitch Screen → Frontend Route Mapping

| Stitch Screen ID | Screen Name | FE Route | Layout | Notes |
|------------------|-------------|----------|--------|-------|
| `1d1d4f217748480587c3b42cb3ae6673` | Home Discovery | `/` | Public | Map placeholder + venue list |
| `3670b85106644d27a546302c40018221` | Login | `/auth/login` | Auth | Centered card |
| `4c5c379bfa1e491a937a3ae6e3d40b8b` | Register | `/auth/register` | Auth | Centered card |
| `2f0e1502274d403ca48b46a6e559e992` | OTP Verification | `/auth/verify-otp` | Auth | 6-digit input |
| `76bd56ae51854d07a321190ff64f63eb` | My Bookings | `/me/bookings` | User | Booking list with tabs |
| `ea19eb2d1b0b431086c9eb22a22b65d1` | Booking Detail | `/me/bookings/:id` | User | Two-column layout |
| `a8b32e5c39bd43aeb8424e759fb98347` | Chat | `/me/chat/:bookingId` | User | Simple messaging UI |
| `d6107b63c1ac46f0918bbe00830b5640` | Manager Dashboard | `/manager` | Manager | Timeline/calendar view |
| `1a9349c2f2764daa999269eb724a5145` | Admin Dashboard | `/admin` | Admin | KPI cards + activity feed |
| `939623b53d574b51895d73e08d6edaf3` | Manager List | `/admin/managers` | Admin | Data table |
| `00bf5a96ace7476ca5893ac304229bd2` | Approval Queue | `/admin/approvals` | Admin | Card-based queue |
| `cbebd87134174f45a466839c25bbbe64` | Audit Logs | `/admin/logs` | Admin | Log viewer table |

## Placeholder Pages (No Stitch Screen Yet)

| FE Route | Layout | Phase 0 Content |
|----------|--------|-----------------|
| `/manager/courts` | Manager | "Quản lý sân - Coming in Phase 1" |
| `/manager/schedule` | Manager | "Lịch hoạt động - Coming in Phase 1" |
| `/manager/analytics` | Manager | "Thống kê - Coming in Phase 1" |
| `/manager/subscription` | Manager | "Gia hạn - Coming in Phase 1" |
| `/manager/chat/:bookingId` | Manager | Reuse Chat component |
