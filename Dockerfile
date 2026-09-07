# ─── GIAI ĐOẠN 1: BUILD FRONTEND REACT ───
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# ─── GIAI ĐOẠN 2: RUNTIME BACKEND FASTAPI ───
FROM python:3.10-slim AS runner
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

# Cài đặt thư viện Python
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r ./backend/requirements.txt

# Copy mã nguồn Backend & Logo
COPY backend/ ./backend/
COPY logo-icon.svg ./

# Copy kết quả build từ Giai đoạn 1 sang
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Mở cổng mặc định
EXPOSE 8000

# Chạy server FastAPI
CMD ["sh", "-c", "python -m uvicorn main:app --app-dir backend --host 0.0.0.0 --port ${PORT:-8000}"]
