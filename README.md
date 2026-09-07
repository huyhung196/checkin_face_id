# 📸 Hệ Thống Điểm Danh Face ID AI & Định Vị GPS (Face ID AI Check-in & GPS)

Hệ thống điểm danh thông minh tích hợp **Nhận diện khuôn mặt đa góc AI (Vector 128D)** và **Định vị GPS đối chiếu bán kính thực tế**, hỗ trợ giao diện mượt mà trên cả Máy tính & Điện thoại (PWA).

![System Banner](frontend/public/logo-icon.svg)

---

## 🌟 Các Tính Năng Nổi Bật

### 1. 🤖 Nhận Diện Khuôn Mặt AI Đa Góc Mặt (AI Face Recognition 128D)
- **So khớp thời gian thực**: Sử dụng thư viện `@vladmandic/face-api` (mô hình `tinyFaceDetector`, `faceLandmark68Net`, `faceRecognitionNet`) chạy trực tiếp trên trình duyệt Web GPU.
- **Ngưỡng nhận diện 50%**: Độ khớp AI `>= 50.0%` (Distance Threshold = 0.40) mới xác nhận đúng danh tính nhân viên. Độ khớp dưới 50% tự động đánh dấu là **"Người lạ"**.
- **Đăng ký hồ sơ 5 góc mặt tự động**: Quy trình Wizard thu thập 5 góc mặt (*Thẳng, Trái, Phải, Ngẩng, Cúi*) × 5 mẫu/góc = **25 vector 128D** giúp AI nhận diện cực nhạy dưới mọi góc nhìn.
- **Kiểm soát khung hình bầu dục chính giữa (Oval Guide Positioning)**: 
  - Tự động định vị tâm khuôn mặt và kích thước chuẩn trong khung hình.
  - Phản hồi chỉ dẫn trực tiếp (*"Đưa khuôn mặt lên cao hơn"*, *"Tiến lại gần camera hơn"*...).
  - **Tuyệt đối không thu mẫu khi khuôn mặt nằm ngoài hình bầu dục chính giữa**.

---

### 2. 📍 Định Vị GPS Mục Tiêu & Đối Chiếu Bán Kính (GPS Geolocation Verification)
- **Cấu hình vị trí Admin (Tab Cấu Hình GPS)**: Cài đặt vị trí mục tiêu công ty/văn phòng, chọn tọa độ trực quan trên bản đồ Leaflet OpenStreetMap và quy định bán kính cho phép (ví dụ: 50m, 100m).
- **Điểm danh GPS tự động**: Khi bấm nút *"Chụp & Điểm Danh"*, hệ thống tự động thu thập vị trí GPS thiết bị người dùng qua HTML5 Geolocation API.
- **Tính khoảng cách Haversine**: Tự động tính khoảng cách thực tế giữa vị trí người dùng và mục tiêu:
  - Badge xanh `✓ Đạt (x m)` khi nằm trong bán kính quy định.
  - Badge đỏ `❌ Vi Phạm (x m / Cho phép y m)` khi nằm ngoài bán kính.
- **Thẻ Mini GPS Map**: Hiển thị bản đồ thu nhỏ interactive ngay cạnh camera trên màn hình chính.

---

### 3. 📊 Quản Lý Nhân Viên & Nhật Ký Điểm Danh
- **Quản lý Nhân viên**: Thêm mới, chỉnh sửa, xóa, tìm kiếm nhân viên, quản lý bộ vector nhận diện khuôn mặt AI và ảnh đại diện.
- **Nhật ký thời gian thực**: Hiển thị danh sách các lượt điểm danh với ảnh chụp snapshot, thời gian, tên nhân viên, độ khớp AI, trạng thái khớp GPS và tên thiết bị.
- **Xem chi tiết ảnh**: Modal hiển thị chi tiết ảnh snapshot và thông tin điểm danh phóng to.
- **Xuất Báo Cáo Excel (CSV)**: Xuất dữ liệu điểm danh ra file CSV tiếng Việt chuẩn UTF-8 BOM cho Excel.

---

### 4. 📱 Hỗ Trợ Đa Nền Tảng & PWA (Progressive Web App)
- **Giao diện Responsive**: Thích ứng hoàn hảo trên cả Màn hình máy tính (Bảng Table) và Điện thoại di động (Danh sách thẻ Mobile Card, Thanh chuyển tab phía dưới `Mobile Bottom Nav`).
- **PWA Ready**: Có thể cài đặt ứng dụng trực tiếp lên màn hình chính điện thoại iOS / Android hoặc máy tính như ứng dụng Native.
- **Tích hợp Cloudflare Tunnel**: Hỗ trợ khởi tạo đường truyền HTTPS an toàn tự động để điện thoại kết nối qua Wi-Fi/4G có thể cấp quyền mở Camera & GPS.

---

## 🛠️ Công Nghệ Sử Dụng

### Backend
- **Framework**: Python 3.11+ (FastAPI, Uvicorn ASGI Server).
- **Cơ sở dữ liệu**: SQLite3 (`backend/checkin.db` - tự động tạo bảng & thực hiện schema migration).
- **Xử lý ảnh & Thuật toán**: Pillow (PIL), NumPy, Thuật toán khoảng cách Haversine.

### Frontend
- **Framework**: React 18, Vite.
- **AI Vision**: `@vladmandic/face-api` (TensorFlow.js / WebGL backend).
- **Bản đồ**: Leaflet JS, OpenStreetMap API.
- **Icons & Styling**: Lucide React Icons, Vanilla CSS Design System (Glassmorphism & Vibrant Theme).

---

## 📁 Cấu Trúc Mã Nguồn

```text
checkin_face_id/
├── backend/
│   ├── app/
│   │   ├── database.py             # Khởi tạo SQLite DB & tự động migration
│   │   ├── models.py               # Pydantic Schemas cho API Requests
│   │   ├── config.py               # Cấu hình đường dẫn uploads & DB
│   │   ├── routers/
│   │   │   ├── checkin.py          # API tiếp nhận ảnh chụp Face ID + GPS
│   │   │   ├── employees.py        # API quản lý nhân viên & vector mặt
│   │   │   ├── gps.py              # API cấu hình vị trí GPS & nhật ký GPS
│   │   │   └── system.py           # API hệ thống & xuất báo cáo CSV
│   │   └── services/
│   │       ├── checkin_service.py  # Xử lý điểm danh, so khớp AI & lưu DB
│   │       ├── employee_service.py # Xử lý lưu ảnh & quản lý nhân viên
│   │       ├── face_service.py     # Thuật toán Euclidean distance so khớp AI
│   │       ├── gps_service.py      # Thuật toán Haversine distance tính khoảng cách GPS
│   │       └── export_service.py   # Xuất file CSV UTF-8 BOM
│   ├── main.py                     # Entry point FastAPI Backend
│   └── uploads/                    # Thư mục chứa ảnh chụp snapshot
├── frontend/
│   ├── public/
│   │   ├── models/                 # Thư mục lưu trữ AI weights (face-api)
│   │   └── manifest.json           # Cấu hình Progressive Web App (PWA)
│   └── src/
│       ├── api/                    # Axios API Service Modules
│       ├── components/
│       │   ├── CameraView.jsx      # Frame camera chụp ảnh điểm danh
│       │   ├── MiniGpsCard.jsx     # Thẻ bản đồ thu nhỏ GPS quy định
│       │   ├── LogTable.jsx        # Bảng nhật ký điểm danh (Desktop & Mobile)
│       │   ├── GpsCheckinView.jsx  # Khu vực Admin cài đặt vị trí GPS
│       │   ├── GpsSetupModal.jsx   # Modal chọn vị trí trên bản đồ Leaflet
│       │   ├── CheckinResult.jsx   # Banner hiển thị kết quả điểm danh
│       │   ├── ImageModal.jsx      # Modal xem chi tiết ảnh chụp phóng to
│       │   └── employees/
│       │       ├── EmployeeManager.jsx       # Quản lý danh sách nhân viên
│       │       └── MultiShotEnrollWizard.jsx # Wizard thu thập 5 góc mặt AI
│       ├── utils/
│       │   ├── faceEngine.js       # Thuật toán AI face-api & kiểm tra khung Oval
│       │   └── audio.js            # Hiệu ứng âm thanh Shutter, Beep, Chime
│       ├── App.jsx                 # Layout chính ứng dụng & chuyển Tab
│       └── index.css               # Hệ thống CSS Design System
├── run_server.py                   # Script khởi chạy 1-click (FastAPI + Cloudflare)
└── README.md
```

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy

### Cách 1: Chạy 1-Click (Khuyên dùng)
Chạy tập lệnh Python tự động khởi động máy chủ API và Tunnel kết nối an toàn:
```bash
python run_server.py
```
- Trình duyệt sẽ tự động mở trang web tại địa chỉ: **`http://localhost:8000`**
- Đường link Cloudflare HTTPS công khai sẽ được copy tự động vào Clipboard để mở trên điện thoại.

---

### Cách 2: Chạy Thủ Công

#### 1. Khởi động Backend (Python FastAPI)
```bash
cd backend
# Cài đặt các thư viện phụ thuộc (nếu chưa cài)
pip install fastapi uvicorn pillow pydantic

# Chạy server Uvicorn
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

#### 2. Biên dịch & Chạy Frontend (React / Vite)
```bash
cd frontend
# Cài đặt node_modules (nếu chưa cài)
npm install

# Chạy ở chế độ Development (Hot Reload)
npm run dev
# -> Truy cập: http://localhost:5173

# Hoặc Biên dịch bản Production Bundle (cho FastAPI phục vụ)
npm run build
```

---

## ⚙️ Quy Trình Điểm Danh & Thu Mẫu Chuẩn

1. **Khởi Tạo Cấu Hình GPS Mục Tiêu**:
   - Vào tab **"Cấu Hình GPS"** (Dành cho Admin).
   - Bấm nút **"Cài Đặt GPS"**, di chuyển bản đồ chọn vị trí văn phòng/công ty và nhập bán kính cho phép (ví dụ: 50m).
2. **Đăng Ký Nhân Viên Mới**:
   - Vào tab **"Quản Lý Nhân Viên"** -> Bấm **"Thêm Nhân Viên"**.
   - Nhập Mã NV, Họ Tên, Phòng Ban và bấm **"Quét 5 Góc Mặt AI"**.
   - Đưa khuôn mặt vào **khung hình bầu dục chính giữa**, xoay mặt chậm theo chỉ dẫn của AI (Thẳng -> Trái -> Phải -> Ngẩng -> Cúi) để thu thập đủ 25 vector mẫu.
3. **Thực Hiện Điểm Danh**:
   - Chuyển sang tab **"Camera Điểm Danh Face ID & GPS"**.
   - Nhìn vào Camera và bấm **"Chụp & Điểm Danh"**.
   - Hệ thống tự động so khớp độ chính xác khuôn mặt AI và đối chiếu vị trí định vị GPS của thiết bị.

---

## 📄 Giấy Phép
Dự án được phát triển chuyên nghiệp theo tiêu chuẩn Web App Production.
