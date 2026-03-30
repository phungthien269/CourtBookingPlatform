# Kana Flow

**Kana Flow** là một ứng dụng di động học tiếng Nhật (Hiragana và Katakana). Ứng dụng chú trọng vào việc gợi nhớ nhanh thông qua việc học flashcard, ôn luyện kiểm tra trí nhớ với hệ thống thẻ câu hỏi, khả năng đồng bộ dữ liệu đám mây (hoặc offline local) và giao diện song ngữ (Việt / Anh).

## 🛠 Công nghệ sử dụng
- **React 19 + Vite + TypeScript**
- **React Router v7**
- **Tailwind CSS v4**
- **Zustand** (Quản lý State)
- **TanStack Query**
- **Framer Motion** (Tạo hiệu ứng lật thẻ mượt mà)
- **react-i18next** (Hệ thống đa ngôn ngữ)
- **Supabase** (Cơ sở dữ liệu lưu trữ đám mây & xác thực)
- **vite-plugin-pwa** (Cài đặt ứng dụng như Progressive Web App, hỗ trợ lưu thiết bị iOS/Android)
- **Agentation** (Công cụ hỗ trợ trực quan hóa UI khi phát triển)

## 🌟 Chức năng nổi bật

### 1. Học bảng chữ cái
- **Hiragana**: 46 mẫu tự cơ bản, âm đục/âm bán đục (dakuten/handakuten), âm ghép (youon), âm ngắt (sokuon) và trường âm.
- **Katakana**: Tương tự Hiragana, cộng thêm bảng âm ngoại lai (loanword/long vowel).
- **Lựa chọn chữ linh hoạt**:
  - Chọn từng chữ cái riêng lẻ.
  - Chọn nhanh toàn bộ khu vực theo hàng ngang.
  - Chọn theo từng danh mục lớn (chữ cơ bản, chữ âm đục, âm ghép...).
  - Chọn tất cả chỉ bằng 1 nút nhấn.
  - Live summary cho biết số lượng thẻ từ đang chọn.

### 2. Chế độ học tập (Study Mode)
- Học tuần tự thông qua thẻ flashcard với các hiệu ứng lật (flip) hoạt ảnh bắt mắt.
- Hỗ trợ cấu hình lại phím tắt (Keyboard shortcuts) cho màn hình Desktop thuận tiện lật và chuyển câu nhanh hơn.

### 3. Chế độ ôn tập (Review Mode)
- Cơ chế trắc nghiệm lựa chọn (4 đáp án) từ kho từ đang học.
- Đảo thứ tự bảng ngẫu nhiên.
- **Cơ chế nhắc nhở thông minh**: 
  - Mặc định bộ câu hỏi cần trả lời đúng 5 lần (`remaining = 5`).
  - Trả lời đúng (-1 lần còn lại), trả lời sai sẽ bị phạt điểm (+3 lần cộng thêm).
  - Phiên ôn tập chỉ kết thúc khi toàn bộ các từ được chọn về ngưỡng trả lời đúng mục tiêu `0`.
- Tùy chọn hiển thị ẩn/hiện và xem đáp án ngay lập tức nếu làm sai.

### 4. Thống kê tiến độ (Progress)
- Hiển thị cấp độ ghi nhớ thông qua bộ thống kê.
- Phân tích và báo cáo những mặt chữ đang gặp khó khăn (weak items).
- Tracking lịch sử các phiên học / phiên ôn tập và các lần attempt trả lời đúng/sai của bạn.
- Hiển thị độ thành thạo phân rã theo nhóm (Hiragana/Katakana) hoặc các nhóm kí tự chi tiết.

### 5. Cài đặt cá nhân hóa (Settings)
- Thay đổi giao diện (Theme: Sáng / Tối / Tự động System).
- Ngôn ngữ hiển thị (Mặc định: Tiếng Việt, hỗ trợ tiếng Anh).
- Tùy chỉnh chi tiết bản đồ phím tắt bàn phím.
- Theo dõi trạng thái đồng bộ cơ sở dữ liệu (Cloud Persistence <-> Local Fallback).
- Cài đặt App (PWA Shortcut) lên màn hình điện thoại như ứng dụng Native.

## 🚀 Hướng dẫn cài đặt và chạy tại máy

### Yêu cầu bản thân máy phát triển
- Node.js.
- Supabase account (nếu muốn thử tính năng lưu trữ cloud).

### Các bước cài đặt dự án
1. **Cài đặt các gói phụ thuộc (Dependencies)**:
   ```bash
   npm install
   ```
2. **Thiết lập biến môi trường dự án**:
   Sao chép tham chiếu `.env.example` thành `.env`:
   ```bash
   cp .env.example .env
   ```
   *(Cho Windows PowerShell)*:
   ```powershell
   Copy-Item .env.example .env
   ```
3. **Khởi chạy Development Server**:
   ```bash
   npm run dev
   ```
4. **Build source code cho Production**:
   ```bash
   npm run build
   ```
5. **Chạy kịch bản Test hệ thống**:
   ```bash
   npm run test
   ```

## ☁️ Cấu hình Supabase (Tùy chọn)

Nếu bạn muốn App hoạt động với chức năng Cloud Save (để đồng bộ tiến trình học giữa PC và điện thoại):
1. Khởi tạo một dự án mới trên nền tảng Supabase.
2. Bật chức năng Auth *Anonymous* (Đăng nhập tự động không cần danh tính).
3. Thêm URL Web của bạn vào mục "Auth redirect URLs" để sau này có thể nâng cấp liên kết Identity.
4. Đọc/chạy file SQL cấu trúc bảng tại `supabase/migrations/001_initial.sql`.
5. Sinh tệp dữ liệu Seed Database Kana bằng câu lệnh tích hợp trên máy:
   ```bash
   npm run seed:generate
   ```
6. Paste đoạn query sinh ra trong file `supabase/seed.sql` chạy thẳng vào SQL Editor của Supabase.
7. Cập nhật và lưu lại file `.env` với các nội dung API:
   - `VITE_SUPABASE_URL=...`
   - `VITE_SUPABASE_ANON_KEY=...`
   - `VITE_APP_URL=http://localhost:5173`
   - `VITE_AGENTATION_ENDPOINT=` (Chỉ dùng riêng cho Tool UI nội bộ máy ảo)

*🚨 Lưu ý hệ thống: Tệp `supabase/seed.sql` là kết quả render được tự động hóa trích dẫn từ file code Data Master `src/lib/kana-data.ts`. Bất kỳ thay đổi, hiệu chỉnh nào đối với cấu trúc Romaji/Chữ tiếng Nhật trong đó cũng phải đi cùng với bước lệnh chạy lại `npm run seed:generate`.*

Trường hợp **không sử dụng cấu hình CSDL Supabase**, ứng dụng mặc định sẽ hoạt động ở **Offline Persistence Mode** thông qua bộ nhớ Local Storage thiết bị.

## 🧬 Cấu trúc thư mục lõi
- `src/components`: Component tái sử dụng/UI Layout chung (`layout.tsx`, `ui.tsx`).
- `src/pages`: Toàn bộ các trang Routing chức năng (Màn hình chính, màn hình bảng chữ, ôn tập, tiến độ, cài đặt,...).
- `src/lib`: Bộ logic xử lý nghiệp vụ của ứng dụng:
  - `kana-data.ts`: Master Data toàn vẹn Romaji, Nghĩa Vi-En, thông tin ký tự.
  - `review-engine.ts`: Chứa thuật toán tạo test 4 đáp án và sắp xếp lựa chọn vòng Review học.
  - `progress.ts`: Cập nhật logic tăng Streak nhớ ký tự, điều hướng lưu Status item...
  - `storage.ts`: Trạm Data Access Layer kiểm soát toàn quyền trạng thái sync với Supabase / Offline Local Web Storage.
  - `i18n.ts`: Bộ logic setup chuyển ngữ app.
- `src/store`: Hệ thống chia sẻ Global App State điều khiển lưu lượng người dùng, cache trạng thái thiết lập qua thư viện Zustand (`use-app-store.ts`).
- `supabase/`: Lưu định nghĩa Model DB và các đoạn query liên quan đến Cloud Backend.