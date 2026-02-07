🎯 USE CASE MODEL — Tổng quan (để vẽ Diagram)
Actors
Actor	Mô tả
Guest	Người chưa đăng nhập
User	Người chơi đã đăng nhập
Manager	Chủ sân (quản lý 1 địa điểm)
Admin	Quản trị nền tảng
System Scheduler	Hệ thống chạy job tự động (expire pending, auto-cancel 1h…)
Email Service	Dịch vụ email (OTP verify, email booking)
Map API	Dịch vụ bản đồ (render map, marker, cluster)
🗺️ Use Case List (Bảng tổng hợp)
A) Guest / User
UC ID	Use Case	Actor	Priority
UC-G-01	Xem bản đồ sân + danh sách sân	Guest/User	Must
UC-G-02	Filter sân theo môn + quận/huyện	Guest/User	Must
UC-G-03	Xem chi tiết sân (popup)	Guest/User	Must
UC-AU-01	Đăng ký tài khoản	Guest	Must
UC-AU-02	Xác thực email bằng OTP	Guest	Must
UC-AU-03	Đăng nhập	Guest	Must
UC-AU-04	Đăng nhập Google	Guest	Should
UC-U-01	Chọn sân con theo layout	User	Must
UC-U-02	Chọn giờ đặt sân (1–4h, giờ chẵn, qua ngày)	User	Must
UC-U-03	Bắt đầu thanh toán (giữ slot 5 phút)	User	Must
UC-U-04	Thanh toán tiền mặt (tạo booking chờ confirm)	User	Must
UC-U-05	Thanh toán chuyển khoản QR + tick đã chuyển	User	Must
UC-U-06	Nhận thông báo trạng thái booking	User	Should
UC-U-07	Xem lịch sử booking + chi tiết booking	User	Must
UC-U-08	Hủy booking (>= 2h)	User	Must
UC-U-09	Review sân (⭐ + comment)	User	Must
UC-U-10	Chat text với manager (gắn booking)	User	Must
UC-U-11	Xem thông tin liên hệ sân sau khi đặt thành công	User	Must
B) Manager
UC ID	Use Case	Actor	Priority
UC-M-01	Đăng nhập manager	Manager	Must
UC-M-02	Xem dashboard booking theo ngày/giờ	Manager	Must
UC-M-03	Nhận notification booking realtime	Manager	Must
UC-M-04	Xác nhận booking (cash/transfer)	Manager	Must
UC-M-05	Từ chối / hủy booking + nhập lý do	Manager	Must
UC-M-06	Quản lý thông tin sân (tạo/sửa gửi admin duyệt)	Manager	Must
UC-M-07	Upload ảnh sân (<=10) + ảnh đại diện	Manager	Must
UC-M-08	Thiết lập giờ hoạt động (nhiều ca) + ngày nghỉ	Manager	Must
UC-M-09	Khóa sân theo khung giờ	Manager	Must
UC-M-10	Thiết lập giá theo giờ	Manager	Must
UC-M-11	Xem thống kê doanh thu (ngày/tuần/tháng)	Manager	Must
UC-M-12	Export Excel	Manager	Must
UC-M-13	Gia hạn nền tảng (QR platform)	Manager	Must
UC-M-14	Xem lịch sử gia hạn + ngày hết hạn	Manager	Must
UC-M-15	Trả lời chat user (text-only)	Manager	Must
C) Admin
UC ID	Use Case	Actor	Priority
UC-AD-01	Đăng nhập admin	Admin	Must
UC-AD-02	Tạo tài khoản manager	Admin	Must
UC-AD-03	Duyệt/Reject thay đổi thông tin sân + lý do	Admin	Must
UC-AD-04	Sửa thông tin sân thay manager	Admin	Should
UC-AD-05	Khóa / mở khóa user	Admin	Must
UC-AD-06	Khóa / mở khóa manager	Admin	Must
UC-AD-07	Xem danh sách booking theo manager/sân	Admin	Should
UC-AD-08	Xem log tranh chấp (audit log)	Admin	Must
UC-AD-09	Xem report doanh thu theo manager	Admin	Should
UC-AD-10	Quản lý hotline/support info	Admin	Should
D) System Scheduler (Job tự động)
UC ID	Use Case	Actor	Priority
UC-SYS-01	Expire pending sau 5 phút (+ delay 30s mở slot)	Scheduler	Must
UC-SYS-02	Auto-cancel WAITING_MANAGER_CONFIRM sau 1h	Scheduler	Must
UC-SYS-03	Xác định booking “completed” để mở review	Scheduler	Should
📌 Use Case Specifications (Chi tiết từng Use Case quan trọng)

Mình viết full spec cho các use case “core” (booking/payment/realtime).
Các use case phụ (login, view list…) vẫn có spec nhưng ngắn hơn để khỏi dài quá.

UC-G-01 — Xem bản đồ sân + danh sách sân
Mục	Nội dung
Primary Actor	Guest/User
Mục tiêu	Xem các sân trên map và danh sách đồng bộ
Preconditions	Có dữ liệu sân đã được admin duyệt & manager còn hạn
Trigger	User vào trang Home/Map
Main Flow	1) Hệ thống tải map HCM (zoom toàn VN) 2) Render pin sân 3) Render list sân 4) Cluster pin gần nhau
Alternate/Exception	Map API lỗi → hiển thị message + list vẫn dùng được
Postconditions	UI map + list hiển thị đồng bộ
Priority	Must
UC-G-02 — Filter sân theo môn + quận/huyện
Mục	Nội dung
Actor	Guest/User
Mục tiêu	Lọc sân theo bộ môn và địa bàn
Preconditions	UC-G-01 đang hiển thị
Main Flow	1) Chọn môn 2) Chọn quận/huyện 3) Map + list update realtime
Rule	Filter môn làm biến mất pin không phù hợp
Priority	Must
UC-G-03 — Xem chi tiết sân (popup)
Mục	Nội dung
Actor	Guest/User
Mục tiêu	Xem thông tin sân trước khi đặt
Trigger	Click pin hoặc click item list
Main Flow	1) Popup hiển thị ảnh 2) Giờ hoạt động 3) Giá dao động (giá/giờ) 4) Nút “Đặt sân”
Constraint	Không hiển thị số ĐT/contact sân
Priority	Must
UC-AU-01 — Đăng ký tài khoản
Mục	Nội dung
Actor	Guest
Mục tiêu	Tạo account user
Main Flow	1) Nhập email/password 2) Hệ thống tạo user trạng thái “unverified” 3) Gửi OTP email
Postconditions	User chưa đặt được sân cho tới khi verify
Priority	Must
UC-AU-02 — Xác thực email bằng OTP
Mục	Nội dung
Actor	Guest
Mục tiêu	Verify tài khoản
Preconditions	User vừa đăng ký hoặc request OTP
Main Flow	1) Nhập OTP 2) Hệ thống verify 3) Cho login
Exceptions	OTP sai/hết hạn → báo lỗi + cho resend
Priority	Must
UC-U-01 — Chọn sân con theo layout
Mục	Nội dung
Actor	User
Mục tiêu	Chọn đúng sân con (court #) trong địa điểm
Preconditions	User đã login
Trigger	Click “Đặt sân” từ popup sân
Main Flow	1) Hiển thị layout vị trí sân 2) User chọn sân # cụ thể 3) Chuyển sang chọn ngày giờ
Postconditions	Hệ thống có “selectedCourtId”
Priority	Must
UC-U-02 — Chọn giờ đặt sân
Mục	Nội dung
Actor	User
Mục tiêu	Chọn thời gian đặt
Preconditions	Đã chọn sân con
Main Flow	1) Chọn ngày 2) Hệ thống show slot giờ chẵn 3) Slot đã booked/pending hiển thị disabled 4) User chọn start time + duration 1–4h
Rules	- Giờ chẵn - Min 1h max 4h - Cho qua ngày
Priority	Must
UC-U-03 — Bắt đầu thanh toán (giữ slot 5 phút)
Mục	Nội dung
Actor	User
Mục tiêu	Lock slot tránh người khác đặt
Trigger	User bấm “Thanh toán”
Main Flow	1) System tạo booking PENDING_PAYMENT 2) Lock slot 5 phút 3) Hiển thị countdown 4) Reload không reset
Exceptions	Nếu slot vừa bị người khác giữ trước → báo “đang được giữ chỗ”
Postconditions	Slot bị lock cho user
Priority	Must
UC-U-04 — Thanh toán tiền mặt
Mục	Nội dung
Actor	User
Mục tiêu	Đặt sân chọn cash
Preconditions	Booking đang PENDING_PAYMENT
Main Flow	1) User chọn “Tiền mặt” 2) Booking chuyển WAITING_MANAGER_CONFIRM 3) Manager nhận notify realtime
Postconditions	Booking chờ manager confirm
Priority	Must
UC-U-05 — Thanh toán chuyển khoản QR + tick đã chuyển
Mục	Nội dung
Actor	User
Mục tiêu	Chuyển khoản thủ công và báo manager
Preconditions	Booking đang PENDING_PAYMENT
Main Flow	1) Hiển thị QR cố định của sân 2) User chuyển khoản 3) Tick “đã chuyển” 4) Booking → WAITING_MANAGER_CONFIRM 5) Notify manager
Rule	Không upload bill
Timeout	1h manager không confirm → auto cancel
Priority	Must
UC-U-08 — Hủy booking
Mục	Nội dung
Actor	User
Mục tiêu	Hủy booking trước giờ chơi
Preconditions	Booking chưa bắt đầu
Rule	Chỉ hủy nếu trước giờ chơi ≥2h
Main Flow	1) User click hủy 2) Booking → CANCELLED_BY_USER 3) Slot mở lại realtime
Priority	Must
UC-U-09 — Review sân
Mục	Nội dung
Actor	User
Mục tiêu	Đánh giá sân
Preconditions	Booking completed + user đã từng đặt sân đó
Main Flow	1) Chọn sao 1–5 2) Nhập comment ngắn 3) Submit
Postconditions	Rating hiển thị trung bình ở sân
Priority	Must
UC-U-10 — Chat text với manager (gắn booking)
Mục	Nội dung
Actor	User (và Manager)
Mục tiêu	Liên hệ về booking (xin lỗi, hướng dẫn…)
Preconditions	Booking tồn tại
Main Flow	1) Mở chat từ booking detail 2) Gửi message text 3) Manager xem & trả lời
Constraint	Không file/image; không realtime phức tạp (polling nhẹ)
Priority	Must
UC-M-04 — Manager xác nhận booking
Mục	Nội dung
Actor	Manager
Mục tiêu	Confirm booking cash/transfer
Preconditions	Booking WAITING_MANAGER_CONFIRM
Main Flow	1) Manager xem booking 2) Confirm 3) Booking → CONFIRMED 4) User nhận notify
Postconditions	Slot locked chính thức
Priority	Must
UC-M-05 — Manager hủy/reject booking + lý do
Mục	Nội dung
Actor	Manager
Mục tiêu	Reject hoặc cancel booking đã confirm
Preconditions	Booking WAITING_MANAGER_CONFIRM hoặc CONFIRMED
Main Flow	1) Click cancel/reject 2) Nhập lý do bắt buộc 3) Booking → CANCELLED_BY_MANAGER 4) User nhận lý do
Rule	Nếu sát giờ, manager phải liên hệ xin lỗi (ngoài hệ thống)
Priority	Must
UC-SYS-01 — Expire pending sau 5 phút + delay 30s
Mục	Nội dung
Actor	System Scheduler
Mục tiêu	Tự động nhả slot
Preconditions	Booking PENDING_PAYMENT quá 5 phút
Main Flow	1) Mark EXPIRED 2) Delay 30s 3) Slot available trở lại
Priority	Must
UC-SYS-02 — Auto-cancel sau 1h chờ manager confirm
Mục	Nội dung
Actor	System Scheduler
Mục tiêu	Không để booking treo
Preconditions	Booking WAITING_MANAGER_CONFIRM quá 1h
Main Flow	1) Mark CANCELLED_BY_MANAGER hoặc EXPIRED? (nên là EXPIRED_CONFIRMATION)
Ghi chú BA	Hiện BRD đang dùng CANCELLED_BY_MANAGER/EXPIRED. Bạn muốn dùng state nào cho case này?
Priority	Must