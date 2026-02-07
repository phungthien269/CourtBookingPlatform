📘 BUSINESS REQUIREMENT DOCUMENT (BRD) — FULL (BẢN CHUẨN)
0) Thông tin tài liệu
Mục	Nội dung
Tên dự án	Sports Court Booking Platform (Pickleball & Badminton)
Phạm vi địa lý	Zoom toàn VN, dữ liệu MVP tập trung TP.HCM
Mô hình	Marketplace (sàn trung gian giữa User & Manager)
Roles	User / Manager / Admin
Trạng thái tài liệu	Draft (Ready for Sign-off)
Mục tiêu sử dụng	Đồ án + CV + Có thể lên production sau
1) Mục tiêu & Giá trị kinh doanh
Business Goal ID	Mục tiêu	Giá trị mang lại	KPI gợi ý (để ghi trong đồ án)
BG-01	Tập trung dữ liệu sân trên 1 nền tảng	User tìm sân nhanh, giảm gọi điện	Tỉ lệ chuyển đổi tìm → đặt
BG-02	Booking theo giờ + realtime	Tránh trùng sân, giảm tranh chấp	% booking trùng = 0
BG-03	Quảng bá sân cho manager	Manager có thêm khách	# booking/manager/tháng
BG-04	Mô hình doanh thu B2B	Thu phí theo sân/tháng	Doanh thu gói/manager
BG-05	Mở rộng đa tỉnh	Scale platform	# tỉnh/thành mới
2) Stakeholders & Actor
Stakeholder	Vai trò	Mục tiêu	Pain point hiện tại
User (người chơi)	Đặt sân	Tìm sân nhanh, xem giờ trống realtime	Gọi điện hỏi sân, mất thời gian
Manager (chủ sân)	Bán giờ sân	Quản lý booking, tăng khách	Quản lý thủ công, dễ trùng giờ
Admin (platform owner)	Quản trị	Duyệt sân, quản lý user/manager	Thiếu dashboard kiểm soát
External: Map API	dịch vụ	Hiển thị map + pin + cluster	Free tier hạn chế
External: Email	dịch vụ	Verify + thông báo booking	Delivery/Spam
External: VietQR	hiển thị QR	Chuyển khoản thủ công	Không auto confirm
3) In-Scope / Out-of-Scope
3.1 In-Scope (MVP)
Scope	Có trong MVP?	Ghi chú
Map hiển thị pin + cluster + filter môn	✅	Free-tier API
List sân song song map	✅	Filter sync map
Booking sân theo giờ chẵn (1h–4h)	✅	Cho phép qua ngày
Giữ slot pending 5 phút	✅	Delay mở slot 30s
Thanh toán tiền mặt	✅	Manager confirm
Chuyển khoản QR (manual)	✅	Tick “đã chuyển” → chờ confirm
Realtime update map/slot/booking	✅	Chống double booking
User: lịch sử đặt + hủy (trước 2h)	✅	Không blacklist
Manager: khóa sân theo giờ, dashboard ngày/giờ	✅	Realtime notify
Manager: thống kê + export Excel	✅	Theo ngày/tuần/tháng
Admin: tạo manager, duyệt sân, khóa user/manager	✅	Admin xem log khi tranh chấp
Review (⭐ + comment ngắn)	✅	MVP nhỏ
Chat user↔manager (text-only, nhẹ)	✅	Không file, không realtime phức tạp
Hotline/support contact	✅	Hiển thị rõ
3.2 Out-of-Scope / Phase 2 (Future)
Scope	Phase 2	Lý do
Auto confirm chuyển khoản qua API ngân hàng	✅	phức tạp pháp lý/kỹ thuật
QR riêng cho từng đơn hàng	✅	phụ thuộc auto confirm
Mobile app	✅	MVP web trước
Chat realtime mạnh + gửi file/image	✅	MVP nhẹ
Review nâng cao (ảnh, like/dislike, report)	✅	MVP nhẹ
AI recommendation / sân hot / giờ hot charts	✅	chưa cần
4) Assumptions & Constraints
ID	Loại	Nội dung
AC-01	Assumption	User xem sân & giờ trống không cần login
AC-02	Constraint	Giờ hệ thống UTC+7
AC-03	Constraint	Map API free-tier
AC-04	Constraint	Không mobile (chỉ responsive web)
AC-05	Constraint	Payment transfer confirm thủ công
AC-06	Constraint	Manager quản lý 1 địa điểm
AC-07	Constraint	Không lộ số ĐT manager trước khi đặt
5) Quy tắc nghiệp vụ (Business Rules)
BR ID	Quy tắc	Chi tiết
BR-01	Giờ đặt	Chỉ giờ chẵn (7,8,9…), không 9h30
BR-02	Thời lượng	Min 1h, Max 4h
BR-03	Qua ngày	Cho phép 22h–0h
BR-04	Pending slot	Khi user “chọn thanh toán” → giữ 5 phút
BR-05	Pending countdown	Reload không reset, giữ nguyên thời gian
BR-06	Release slot	Hết 5 phút → nhả slot, delay 30s
BR-07	Race condition	Ai bấm thanh toán trước giữ slot
BR-08	Transfer confirm	Tick “đã chuyển” → WAITING_MANAGER_CONFIRM
BR-09	Auto cancel	Manager không confirm trong 1h → hủy
BR-10	Cancel by user	Chỉ hủy trước giờ chơi tối thiểu 2h
BR-11	Cancel by manager	Được hủy booking đã confirm, bắt buộc lý do + liên hệ xin lỗi
BR-12	Limit booking	Giới hạn 1 user tối đa 5 sân (anti-spam)
BR-13	Pricing	Giá hiển thị là giá/giờ, đã gồm VAT
BR-14	Price changes	Không áp dụng ngược booking đã thanh toán
BR-15	Manager expiry	Hết hạn → ẩn sân khỏi map, booking cũ vẫn valid
BR-16	Review rule	Chỉ review sân đã đặt (sau khi hoàn thành)
BR-17	Chat scope	Text-only, gắn với booking
6) Booking Lifecycle (State Machine)
State	Ý nghĩa	Ai tạo ra	Chuyển sang state nào
PENDING_PAYMENT	Giữ slot 5 phút chờ thanh toán	User (bấm thanh toán)	WAITING_MANAGER_CONFIRM / EXPIRED
WAITING_MANAGER_CONFIRM	Chờ manager xác nhận (cash/transfer)	User (tick đã chuyển) hoặc cash đặt xong	CONFIRMED / CANCELLED_BY_MANAGER / (auto-cancel 1h)
CONFIRMED	Booking hợp lệ	Manager	(Manager cancel) CANCELLED_BY_MANAGER
CANCELLED_BY_USER	User hủy (>=2h trước)	User	—
CANCELLED_BY_MANAGER	Manager từ chối/hủy	Manager	—
EXPIRED	Hết pending 5 phút	System	—
7) Functional Requirements — FULL (bảng yêu cầu chi tiết)

Cột Priority theo MoSCoW: Must / Should / Could
Acceptance Criteria dạng testable.

7.1 User – Account & Auth
FR ID	Nhóm	Yêu cầu	Priority	Acceptance Criteria
FR-U-01	Auth	Đăng ký email + password	Must	Đăng ký thành công tạo user role=USER
FR-U-02	Auth	Verify email bằng mã	Must	Không verify thì không đặt sân được
FR-U-03	Auth	Login bằng email/password	Must	Login đúng → vào hệ thống
FR-U-04	Auth	Google login	Should	Login Google → tạo user nếu chưa có
FR-U-05	Auth UX	Xem sân không cần login, đặt sân thì redirect login rồi quay lại	Must	Sau login quay đúng sân/giờ đã chọn
7.2 User – Map & Search
FR ID	Nhóm	Yêu cầu	Priority	Acceptance Criteria
FR-U-06	Map	Hiển thị map + pin sân	Must	Pin đúng vị trí theo dữ liệu
FR-U-07	Map	Cluster khi pin gần nhau	Must	Zoom out → cluster, zoom in → tách
FR-U-08	Search	Filter theo môn (badminton/pickleball/…)	Must	Filter → pin không phù hợp biến mất
FR-U-09	Search	Tìm theo quận/huyện	Must	Chọn quận → map focus + list lọc
FR-U-10	Listing	Có list sân song song map	Must	List sync với map
7.3 User – Court Details & Layout
FR ID	Nhóm	Yêu cầu	Priority	Acceptance Criteria
FR-U-11	Detail	Click pin → popup chi tiết sân (ảnh, giờ hoạt động, giá dao động)	Must	Hiển thị đầy đủ trường yêu cầu
FR-U-12	Layout	Cho user chọn sân con cụ thể theo layout thực tế	Must	User chọn “sân số 2” thành booking sân 2
FR-U-13	Contact	Chỉ hiển thị contact sân sau khi đặt thành công	Must	Trước đặt: không lộ số ĐT
7.4 User – Booking Flow
FR ID	Nhóm	Yêu cầu	Priority	Acceptance Criteria
FR-U-14	Booking	Chọn ngày + giờ chẵn	Must	Chỉ cho chọn giờ nguyên
FR-U-15	Booking	Duration 1–4h	Must	Chặn <1h hoặc >4h
FR-U-16	Booking	Cho phép booking qua ngày	Should	22h–0h đặt được nếu sân mở
FR-U-17	Availability	Slot đã đặt làm mờ	Must	Slot booked → disabled
FR-U-18	Pending	Bấm thanh toán → giữ slot 5 phút (countdown)	Must	User khác thấy “đang giữ chỗ”
FR-U-19	Pending	Reload không reset countdown	Must	Reload vẫn còn thời gian đúng
FR-U-20	Release	Hết pending → nhả slot + delay 30s	Must	30s sau slot available
FR-U-21	Limits	1 user tối đa 5 sân	Must	Booking thứ 6 bị chặn
FR-U-22	Realtime	Map + slot update realtime khi có pending/confirm/cancel	Must	Không cần refresh
7.5 User – Payment
FR ID	Nhóm	Yêu cầu	Priority	Acceptance Criteria
FR-U-23	Payment	Tiền mặt: đặt xong → WAITING_MANAGER_CONFIRM	Must	Manager thấy đơn chờ xác nhận
FR-U-24	Payment	Chuyển khoản: hiển thị VietQR cố định theo sân	Must	QR đúng theo sân
FR-U-25	Payment	Tick “đã chuyển khoản”	Must	State → WAITING_MANAGER_CONFIRM
FR-U-26	Timeout	Manager không confirm trong 1h → auto cancel	Must	Sau 1h state chuyển cancelled
FR-U-27	Email	Gửi email xác nhận khi đặt thành công	Should	Email gửi được + nội dung đúng
7.6 User – Cancellation & Notifications
FR ID	Nhóm	Yêu cầu	Priority	Acceptance Criteria
FR-U-28	Cancel	User hủy booking trước giờ chơi ≥2h	Must	<2h: không cho hủy
FR-U-29	History	Lịch sử booking + lý do hủy (quá thời gian)	Must	EXPIRED hiển thị “Quá thời gian”
FR-U-30	Notify	User nhận thông báo confirm/cancel/expired	Should	Thông báo hiển thị đúng event
7.7 Review (MVP nhỏ)
FR ID	Nhóm	Yêu cầu	Priority	Acceptance Criteria
FR-U-31	Review	Review gồm 1–5 sao + comment ngắn	Must	Lưu được rating + text
FR-U-32	Review	Chỉ review sân đã đặt & đã hoàn thành	Must	Không đặt → không review
FR-U-33	Review	Hiển thị rating trung bình ở trang sân	Should	Sân có avg rating
7.8 Chat (MVP nhỏ)
FR ID	Nhóm	Yêu cầu	Priority	Acceptance Criteria
FR-U-34	Chat	User chat text với manager	Must	Gửi/nhận message lưu lại
FR-U-35	Chat	Chat gắn với booking	Must	Mở chat từ booking detail
FR-U-36	Chat	Không file/image	Must	Không có nút upload
FR-U-37	Chat	Không realtime phức tạp	Could	Có thể polling/refresh nhẹ
8) Manager Requirements — FULL
8.1 Court Management
FR ID	Nhóm	Yêu cầu	Priority	Acceptance Criteria
FR-M-01	Profile	Manager quản lý đúng 1 địa điểm	Must	Không tạo địa điểm thứ 2
FR-M-02	Courts	1 địa điểm có nhiều loại sân	Must	Có badminton/pickleball/…
FR-M-03	Images	Upload tối đa 10 ảnh/sân	Must	11 ảnh bị chặn
FR-M-04	Default image	Không upload vẫn có ảnh mặc định	Should	UI không vỡ
FR-M-05	Pricing	Set giá theo giờ (đã VAT)	Must	User thấy giá/giờ
FR-M-06	Price integrity	Đổi giá không ảnh hưởng booking cũ	Must	Booking cũ giữ giá cũ
8.2 Availability & Locking
FR ID	Nhóm	Yêu cầu	Priority	Acceptance Criteria
FR-M-07	Schedule	Set giờ hoạt động nhiều ca/ngày	Must	5–11, 14–23 ok
FR-M-08	Holiday	Set ngày nghỉ hoàn toàn	Must	Ngày nghỉ: không đặt được
FR-M-09	Locking	Khóa sân theo khung giờ lẻ	Must	Khóa 7–9: user không đặt
8.3 Booking Ops & Realtime
FR ID	Nhóm	Yêu cầu	Priority	Acceptance Criteria
FR-M-10	Notify	Booking event realtime popup + âm thanh	Must	Có popup khi login lại
FR-M-11	View	Dashboard xem theo ngày & giờ	Must	Timeline/Calendar
FR-M-12	Confirm	Confirm booking cash/transfer	Must	CONFIRMED sau confirm
FR-M-13	Reject	Reject booking → CANCELLED_BY_MANAGER	Must	Cập nhật realtime
FR-M-14	Cancel confirmed	Manager hủy booking đã confirm	Should	Bắt buộc lý do
FR-M-15	User info	Manager thấy user name/email + mã booking	Should	Không lộ số ĐT manager trước đặt
8.4 Finance & Subscription
FR ID	Nhóm	Yêu cầu	Priority	Acceptance Criteria
FR-M-16	Stats	Thống kê theo ngày/tuần/tháng	Must	Có số liệu
FR-M-17	Export	Export Excel	Must	File tải xuống được
FR-M-18	Subscription	Giá 10k/sân/tháng	Must	Tính đúng
FR-M-19	Renewal	Gia hạn bằng QR platform	Must	Tạo phiếu thanh toán
FR-M-20	Accumulate	Gia hạn sớm cộng dồn ngày	Must	Expiry tăng đúng
FR-M-21	Expiry effect	Hết hạn → ẩn khỏi map	Must	Không xuất hiện trên map
9) Admin Requirements — FULL
FR ID	Nhóm	Yêu cầu	Priority	Acceptance Criteria
FR-A-01	Manager	Chỉ admin tạo manager	Must	Không có self-register
FR-A-02	Approve	Duyệt toàn bộ thông tin sân	Must	Approve/Reject
FR-A-03	Reject reason	Reject cần lý do	Must	Lý do lưu & hiển thị cho manager
FR-A-04	Edit	Admin sửa thông tin sân	Should	Edit & save thành công
FR-A-05	Lock	Admin khóa user/manager	Must	Account bị hạn chế login/action
FR-A-06	Booking view	Admin xem booking từng sân/manager	Should	Có filter
FR-A-07	Dispute logs	Admin xem log chi tiết khi tranh chấp	Must	Log internal only
FR-A-08	Revenue view	Admin xem doanh thu theo manager	Should	Có report
10) Non-Functional Requirements (NFR)
NFR ID	Nhóm	Yêu cầu	Mức
NFR-01	Performance	Update realtime < 1s (mục tiêu)	Should
NFR-02	Reliability	Không double booking	Must
NFR-03	Security	RBAC đúng role	Must
NFR-04	Privacy	Không lộ số ĐT manager trước đặt	Must
NFR-05	Audit	Lưu log booking event (create/confirm/cancel)	Must
NFR-06	UX	Responsive web	Should
NFR-07	Availability	Nếu manager offline, login lại vẫn thấy event	Must
11) Realtime Events (danh sách sự kiện)
Event	Trigger	Người nhận	Kỳ vọng
EVT-01 Booking pending started	User bấm thanh toán	User khác + map	Slot “đang giữ chỗ”
EVT-02 Booking expired	Hết 5 phút	User + map	Slot nhả (sau 30s)
EVT-03 Transfer ticked	User tick đã chuyển	Manager	Thấy đơn chờ confirm
EVT-04 Manager confirmed	Manager confirm	User + map	CONFIRMED + notify
EVT-05 Cancel by user	User hủy	Manager + map	Slot mở lại
EVT-06 Cancel by manager	Manager hủy	User + map	Hiển thị lý do
12) Data Requirements (khái niệm entity để vẽ ERD)
Entity	Mô tả	Ghi chú
User	tài khoản người chơi	email verify + google
Manager	chủ sân	chỉ admin tạo
Venue/Location	địa điểm	1 manager = 1 venue
SportType	loại môn	badminton/pickleball/…
Court	sân con	có layout/position
Schedule	giờ hoạt động	nhiều ca/ngày + ngày nghỉ
Booking	đơn đặt	state machine
Payment	thông tin thanh toán	cash/transfer QR
Review	rating + comment	sau khi hoàn thành
ChatThread	hội thoại	gắn với booking
ChatMessage	message text	no file
Subscription	gói gia hạn	10k/sân/tháng
AuditLog	log nội bộ	chỉ admin xem
13) Acceptance Criteria tổng (Definition of Done – MVP)
DoD ID	Điều kiện hoàn thành	Tiêu chí
DOD-01	Booking không trùng	2 user không thể giữ/confirm cùng slot
DOD-02	Pending hoạt động	countdown không reset, hết giờ nhả slot
DOD-03	Payment manual flow	cash + transfer tick → manager confirm
DOD-04	Realtime đồng bộ	map/slot/dashboard cập nhật realtime
DOD-05	RBAC đúng	user/manager/admin đúng quyền
DOD-06	Review & Chat MVP	review sao+comment, chat text-only
DOD-07	Admin duyệt sân	approve/reject + reason
DOD-08	Subscription	hết hạn ẩn sân, gia hạn cộng dồn
14) Rủi ro & hướng xử lý (Risk Register)
Risk	Mức	Mô tả	Mitigation
Free-tier map limit	Medium	giới hạn request	cache + tối ưu call
Manual payment dispute	High	tick “đã chuyển” nhưng chưa trả	trạng thái + log + hotline
Realtime phức tạp	High	dễ bug race condition	lock/transaction + event-driven
Chat scope creep	Medium	dễ bị đòi “realtime”	MVP ghi rõ polling/light
Over-scope đồ án	High	làm quá nhiều	MVP/Phase 2 đóng băng
15) Open Questions (đang còn thiếu 1 chút để BRD “100% khóa”)

Bạn chưa trả lời đoạn này ở cuối nên BA list ra (trả lời là khóa luôn):

OQ ID	Câu hỏi cần chốt	Vì sao cần chốt
OQ-01	Tech stack “như mấy nay tui làm” cụ thể là gì? (FE/BE libs, realtime method)	để ghi chuẩn trong BRD
OQ-02	Review có giới hạn độ dài comment không?	tránh spam
OQ-03	Chat “không realtime phức tạp” → polling bao nhiêu giây? (5s/10s/15s)	để test
OQ-04	Booking “completed” là khi nào? (qua giờ chơi? manager đánh dấu?)	để mở review

Nếu bạn muốn BA tự chốt luôn để khỏi hỏi lại:

Review comment max 200 ký tự

Chat polling 5 giây

Booking completed = sau giờ kết thúc booking + 15 phút

16) Deliverables (đầu ra đồ án)
Deliverable	Có	Ghi chú
BRD (tài liệu này)	✅	full
Use Case Diagram	✅	sẽ vẽ theo roles
BPMN Booking Flow	✅	pending/payment/confirm
BPMN Subscription Flow	✅	renewal/expiry
ERD	✅	theo entities mục 12
Test scenarios (happy/edge cases)	✅	từ AC/BR