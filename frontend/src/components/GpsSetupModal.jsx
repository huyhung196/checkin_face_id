import React, { useState, useEffect, useRef } from 'react';
import { MapPin, X, Navigation, Save, AlertCircle, Compass } from 'lucide-react';

export default function GpsSetupModal({ initialData, onClose, onSaveSuccess }) {
  const [locationName, setLocationName] = useState(initialData?.location_name || 'Văn Phòng Công Ty');
  const [lat, setLat] = useState(initialData?.latitude || 10.7769);
  const [lng, setLng] = useState(initialData?.longitude || 106.7009);
  const [radius, setRadius] = useState(initialData?.radius_meters || 100);

  const [isLocating, setIsLocating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);

  // Khởi tạo bản đồ Leaflet trong Modal
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (typeof window.L === 'undefined') {
      setError('Chưa nạp được thư viện bản đồ Leaflet. Vui lòng kiểm tra kết nối mạng!');
      return;
    }

    const L = window.L;

    // Nếu chưa khởi tạo map instance
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView([lat, lng], 16);
      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);

      // Thêm Marker
      const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
      markerRef.current = marker;

      // Thêm Bán Kính Circle
      const circle = L.circle([lat, lng], {
        color: '#FD6900',
        fillColor: '#FD6900',
        fillOpacity: 0.2,
        radius: Number(radius)
      }).addTo(map);
      circleRef.current = circle;

      // Sự kiện di chuyển marker khi kéo ghim
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        setLat(Math.round(pos.lat * 1000000) / 1000000);
        setLng(Math.round(pos.lng * 1000000) / 1000000);
      });

      // Sự kiện click trên bản đồ để chọn tọa độ mới
      map.on('click', (e) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        const newLat = Math.round(clickLat * 1000000) / 1000000;
        const newLng = Math.round(clickLng * 1000000) / 1000000;
        setLat(newLat);
        setLng(newLng);
        marker.setLatLng([newLat, newLng]);
      });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Cập nhật vị trí Marker và Vòng Tròn Bán Kính khi state thay đổi
  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current || !circleRef.current) return;
    const L = window.L;
    const newPos = [lat, lng];

    markerRef.current.setLatLng(newPos);
    circleRef.current.setLatLng(newPos);
    circleRef.current.setRadius(Number(radius) || 50);

    mapInstanceRef.current.panTo(newPos);
  }, [lat, lng, radius]);

  // Lấy vị trí GPS hiện tại của thiết bị
  const handleGetDeviceLocation = () => {
    if (!navigator.geolocation) {
      setError('Trình duyệt của bạn không hỗ trợ định vị GPS.');
      return;
    }
    setIsLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const newLat = Math.round(position.coords.latitude * 1000000) / 1000000;
        const newLng = Math.round(position.coords.longitude * 1000000) / 1000000;
        setLat(newLat);
        setLng(newLng);
      },
      (err) => {
        setIsLocating(false);
        let msg = 'Không lấy được vị trí GPS.';
        if (err.code === 1) msg = 'Bạn đã từ chối quyền truy cập vị trí GPS.';
        else if (err.code === 2) msg = 'Không thể xác định tọa độ thiết bị.';
        else if (err.code === 3) msg = 'Quá thời gian chờ định vị GPS.';
        setError(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Lưu cấu hình GPS
  const handleSave = async (e) => {
    e.preventDefault();
    if (!locationName.trim()) {
      setError('Vui lòng nhập tên vị trí mục tiêu!');
      return;
    }
    if (radius <= 0) {
      setError('Bán kính cho phép phải lớn hơn 0m!');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onSaveSuccess({
        location_name: locationName.trim(),
        latitude: Number(lat),
        longitude: Number(lng),
        radius_meters: Number(radius)
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Lỗi khi lưu cài đặt GPS');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-card" style={{ maxWidth: 640, width: '92%', padding: 24, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-main)' }}>
            <MapPin size={22} color="#FD6900" />
            <span>Cài Đặt Tọa Độ GPS Mục Tiêu</span>
          </h2>
          <button type="button" className="btn-icon" onClick={onClose} style={{ width: 32, height: 32 }}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(225, 29, 72, 0.12)', border: '1px solid rgba(225, 29, 72, 0.3)', color: '#e11d48', fontSize: '0.85rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>
                Tên Vị Trí / Chi Nhánh Mục Tiêu:
              </label>
              <input
                type="text"
                className="search-input"
                style={{ width: '100%', padding: '10px 14px' }}
                placeholder="VD: Văn Phòng Công Ty, Chi Nhánh 1..."
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>
                  Vĩ Độ (Latitude):
                </label>
                <input
                  type="number"
                  step="any"
                  className="search-input"
                  style={{ width: '100%', padding: '10px 14px', fontFamily: 'var(--font-mono)' }}
                  value={lat}
                  onChange={(e) => setLat(Number(e.target.value))}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>
                  Kinh Độ (Longitude):
                </label>
                <input
                  type="number"
                  step="any"
                  className="search-input"
                  style={{ width: '100%', padding: '10px 14px', fontFamily: 'var(--font-mono)' }}
                  value={lng}
                  onChange={(e) => setLng(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleGetDeviceLocation}
                disabled={isLocating}
                style={{ fontSize: '0.82rem' }}
              >
                <Navigation size={15} className={isLocating ? 'spin-icon' : ''} />
                <span>{isLocating ? 'Đang định vị...' : 'Lấy Vị Trí Thiết Bị Hiện Tại'}</span>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Bán kính (m):
                </label>
                <select
                  className="search-input"
                  style={{ padding: '8px 12px', fontSize: '0.85rem', fontWeight: 700 }}
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                >
                  <option value={30}>30 mét</option>
                  <option value={50}>50 mét</option>
                  <option value={100}>100 mét</option>
                  <option value={200}>200 mét</option>
                  <option value={500}>500 mét</option>
                  <option value={1000}>1,000 mét (1 km)</option>
                </select>
              </div>
            </div>

            {/* Bản Đồ Tương Tác Chọn Điểm */}
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Compass size={14} color="#FD6900" />
                <span>Bấm vào bản đồ hoặc kéo ghim cam để điều chỉnh tọa độ chính xác:</span>
              </div>
              <div
                ref={mapContainerRef}
                style={{
                  width: '100%',
                  height: 280,
                  borderRadius: 12,
                  overflow: 'hidden',
                  border: '1px solid var(--card-border)',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSaving}>
              Hủy
            </button>
            <button type="submit" className="btn-primary" disabled={isSaving}>
              <Save size={16} />
              <span>{isSaving ? 'Đang lưu...' : 'Lưu Cài Đặt GPS'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
