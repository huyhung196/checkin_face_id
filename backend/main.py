import os
from datetime import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse

from app.config import (
    UPLOAD_DIR,
    FRONTEND_DIST,
    MODELS_DIR,
    ICONS_DIR,
    LOGO_FILE
)
from app.database import init_db
from app.routers.employees import router as employees_router
from app.routers.checkin import router as checkin_router
from app.routers.logs import router as logs_router
from app.routers.system import router as system_router
from app.routers.export import router as export_router
from app.routers.gps import router as gps_router
from app.routers.auth import router as auth_router

# 1. Khởi tạo Cơ sở dữ liệu SQLite
init_db()

# 2. Khởi tạo FastAPI App
app = FastAPI(
    title="Face ID AI Check-in & GPS System API",
    description="Hệ thống điểm danh nhận diện khuôn mặt AI & Phân quyền Quản trị",
    version="3.1.0"
)

# 3. Cấu hình CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. Đăng ký tất cả các Routers
app.include_router(auth_router)
app.include_router(employees_router)
app.include_router(checkin_router)
app.include_router(logs_router)
app.include_router(system_router)
app.include_router(export_router)
app.include_router(gps_router)

# 5. Phục vụ thư mục tệp tĩnh (Static Files)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

if os.path.exists(MODELS_DIR):
    app.mount("/models", StaticFiles(directory=MODELS_DIR), name="models")

if os.path.exists(ICONS_DIR):
    app.mount("/icons", StaticFiles(directory=ICONS_DIR), name="icons")

if os.path.exists(FRONTEND_DIST):
    assets_dir = os.path.join(FRONTEND_DIST, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")


# 6. Các Endpoint Phục vụ PWA & Root SPA
@app.get("/manifest.json")
def get_manifest():
    manifest_file = os.path.join(FRONTEND_DIST, "manifest.json")
    if not os.path.exists(manifest_file):
        manifest_file = os.path.join(os.path.dirname(FRONTEND_DIST), "public", "manifest.json")
    if os.path.exists(manifest_file):
        return FileResponse(manifest_file, media_type="application/manifest+json")
    return JSONResponse(status_code=404, content={"message": "Manifest not found"})


@app.get("/sw.js")
def get_service_worker():
    sw_file = os.path.join(FRONTEND_DIST, "sw.js")
    if not os.path.exists(sw_file):
        sw_file = os.path.join(os.path.dirname(FRONTEND_DIST), "public", "sw.js")
    if os.path.exists(sw_file):
        return FileResponse(sw_file, media_type="application/javascript")
    return JSONResponse(status_code=404, content={"message": "Service worker not found"})


@app.get("/logo-icon.svg")
def get_logo():
    if os.path.exists(LOGO_FILE):
        return FileResponse(LOGO_FILE, media_type="image/svg+xml")
    return JSONResponse(status_code=404, content={"message": "Logo not found"})


@app.get("/")
@app.get("/index.html")
def serve_spa():
    index_file = os.path.join(FRONTEND_DIST, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {
        "status": "online",
        "service": "Face ID AI Check-in & IP Logger API (Production Modular)",
        "version": "3.0.0",
        "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
