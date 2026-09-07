# Web App Check-in Chụp Ảnh & Ghi Log Địa Chỉ IP

Ứng dụng Web điểm danh chụp ảnh từ camera, gửi ảnh lên server, tự động phát hiện và ghi log **Địa chỉ IP của Client**, thời gian, thiết bị, và lưu trữ dữ liệu vào SQLite.

## 🛠️ Công Nghệ Sử Dụng
- **Backend**: Python 3 (FastAPI, Uvicorn, SQLite3, Pillow/OpenCV).
- **Frontend**: ReactJS (Vite, Lucide Icons, Glassmorphism CSS, Web Audio API).
- **Database**: SQLite (`backend/checkin.db` - tự động tạo và lưu trữ).
- **Lưu trữ ảnh**: `backend/uploads/` (ảnh chất lượng cao theo timestamp).

---

## 🚀 Cách Chạy Ứng Dụng

### Cách 1: Chạy nhanh (1-Click)
Nhấp đúp vào file `run_app.bat` tại thư mục gốc. Trình duyệt sẽ tự động mở trang web tại địa chỉ:
👉 **`http://localhost:8000`**

### Cách 2: Chạy thủ công bằng dòng lệnh

**Bước 1: Chạy Backend (Python)**
```bash
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Bước 2: Mở trình duyệt**
- Truy cập `http://localhost:8000` (đã tích hợp sẵn bản build React hoàn chỉnh).

*(Nếu muốn phát triển và chỉnh sửa mã nguồn React trực tiếp với Hot-Reload):*
```bash
cd frontend
npm run dev
# Truy cập: http://localhost:5173
```

---

## 🌟 Các Tính Năng Nổi Bật
1. **Camera Điểm Danh Trực Tiếp**:
   - Tự động nhận diện webcam máy tính / camera điện thoại.
   - Hỗ trợ đổi camera trước/sau.
   - Chế độ hẹn giờ chụp 3 giây kèm âm thanh đếm ngược.
   - Hiệu ứng đèn Flash chớp sáng và âm thanh Shutter khi chụp.
2. **Ghi Nhận Địa Chỉ IP Tự Động**:
   - Backend phân tích và lưu chính xác địa chỉ IP của máy khách (hỗ trợ cả Localhost, mạng LAN, Wi-Fi, Reverse Proxy, Cloudflare).
3. **Bảng Nhật Ký Thời Gian Thực (Realtime Log Table)**:
   - Hiển thị danh sách check-in ngay dưới camera.
   - Thumbnail ảnh chụp (bấm vào để phóng to xem ảnh kích thước đầy đủ).
   - Tag địa chỉ IP nổi bật.
   - Tìm kiếm nhanh theo tên hoặc IP.
   - Nút **Xuất Excel (CSV)** tiếng Việt chuẩn UTF-8.
   - Nút **Xóa log** tiện lợi.
