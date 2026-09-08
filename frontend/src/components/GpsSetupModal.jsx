import React, { useState, useEffect, useRef } from 'react';
import { MapPin, X, Navigation, Save, AlertCircle, Compass, Clock, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { shiftApi } from '../api/shiftApi';

export default function GpsSetupModal({ initialData, initialTab = 'gps', onClose, onSaveSuccess }) {
  const [modalTab, setModalTab] = useState(initialTab); // 'gps' | 'shift'

  // GPS State
  const [locationName, setLocationName] = useState(initialData?.location_name || 'Văn Phòng Công Ty');
  const [lat, setLat] = useState(initialData?.latitude || 10.7769);
  const [lng, setLng] = useState(initialData?.longitude || 106.7009);
  const [radius, setRadius] = useState(initialData?.radius_meters || 100);

  const [isLocating, setIsLocating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  // Shift State
  const [shiftName, setShiftName] = useState('Ca Hành Chính Mebieco');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:30');
  const [gracePeriod, setGracePeriod] = useState(15);
  const [earlyBuffer, setEarlyBuffer] = useState(0);
  const [isSavingShift, setIsSavingShift] = useState(false);
  const [shiftSuccess, setShiftSuccess] = useState(null);
  const [shiftError, setShiftError] = useState(null);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);

  // Tải cấu hình ca làm việc khi mở modal
  useEffect(() => {
    async function loadShift() {
      try {
        const res = await shiftApi.getSettings();
        if (res && res.success && res.data) {
          setShiftName(res.data.shift_name || 'Ca Hành Chính Mebieco');
          setStartTime(res.data.start_time || '08:00');
          setEndTime(res.data.end_time || '17:30');
          setGracePeriod(Number(res.data.grace_period_minutes ?? 15));
          setEarlyBuffer(Number(res.data.early_leave_buffer_minutes ?? 0));
        }
      } catch (err) {
        console.error("Lỗi khi tải cài đặt ca trong modal:", err);
      }
    }
    loadShift();
  }, []);

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

  // Tính giờ mốc ân hạn
  const calcGraceTimeStr = () => {
    try {
      const [h, m] = startTime.split(':').map(Number);
      const totalMins = h * 60 + m + Number(gracePeriod);
      const gh = Math.floor(totalMins / 60) % 24;
      const gm = totalMins % 60;
      return `${String(gh).padStart(2, '0')}:${String(gm).padStart(2, '0')}`;
    } catch {
      return startTime;
    }
  };

  // Lưu cấu hình Ca làm việc
  const handleSaveShift = async (e) => {
    e.preventDefault();
    setIsSavingShift(true);
    setShiftError(null);
    setShiftSuccess(null);
    try {
      const payload = {
        shift_name: shiftName,
        start_time: startTime,
        end_time: endTime,
        grace_period_minutes: Number(gracePeriod),
        early_leave_buffer_minutes: Number(earlyBuffer)
      };
      const res = await shiftApi.saveSettings(payload);
      if (res && res.success) {
        setShiftSuccess(`Đã lưu cấu hình ca: ${shiftName}`);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setShiftError(res.message || 'Lỗi khi lưu ca làm việc');
      }
    } catch (err) {
      setShiftError(err.message || 'Lỗi lưu ca làm việc');
    } finally {
      setIsSavingShift(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content glass-card" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 640, width: '92%', padding: 24, maxHeight: '92vh', overflowY: 'auto', margin: 'auto' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-main)', margin: 0 }}>
            <Compass size={22} color="#FD6900" />
            <span>Cấu Hình Hệ Thống (GPS & Ca Làm Việc)</span>
          </h2>
          <button type="button" className="btn-icon" onClick={onClose} style={{ width: 32, height: 32 }}>
            <X size={18} />
          </button>
        </div>

        {/* Chuyển đổi Tab trong Modal */}
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.05)', padding: 4, borderRadius: 10, gap: 4, marginBottom: 18 }}>
          <button
            type="button"
            className={`tab-btn ${modalTab === 'gps' ? 'active' : ''}`}
            onClick={() => setModalTab('gps')}
            style={{ flex: 1, padding: '7px 12px', fontSize: '0.84rem', borderRadius: 8, justifyContent: 'center' }}
          >
            <MapPin size={15} />
            <span>1. Tọa Độ GPS</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${modalTab === 'shift' ? 'active' : ''}`}
            onClick={() => setModalTab('shift')}
            style={{ flex: 1, padding: '7px 12px', fontSize: '0.84rem', borderRadius: 8, justifyContent: 'center' }}
          >
            <Clock size={15} />
            <span>2. Ca Làm Việc</span>
          </button>
        </div>

        {/* ────────────────── TAB 1: GPS ────────────────── */}
        {modalTab === 'gps' && (
          <>
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
                      height: 260,
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
          </>
        )}

        {/* ────────────────── TAB 2: CA LÀM VIỆC ────────────────── */}
        {modalTab === 'shift' && (
          <>
            {shiftSuccess && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', fontSize: '0.85rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={16} />
                <span>{shiftSuccess}</span>
              </div>
            )}

            {shiftError && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(225, 29, 72, 0.12)', border: '1px solid rgba(225, 29, 72, 0.3)', color: '#e11d48', fontSize: '0.85rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={16} />
                <span>{shiftError}</span>
              </div>
            )}

            <form onSubmit={handleSaveShift} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Tên Ca Làm Việc</label>
                <input
                  type="text"
                  className="custom-input"
                  value={shiftName}
                  onChange={(e) => setShiftName(e.target.value)}
                  placeholder="VD: Ca Hành Chính Mebieco"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Giờ Vào Ca Chuẩn *</label>
                  <input
                    type="time"
                    className="custom-input"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                    style={{ fontWeight: 700 }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Giờ Tan Ca Chuẩn *</label>
                  <input
                    type="time"
                    className="custom-input"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                    style={{ fontWeight: 700 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }} title="Cho phép chấm công trễ tối đa X phút mà không bị tính là Đi Trễ">
                    Cho Phép Trễ (Ân hạn)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      min="0"
                      max="120"
                      className="custom-input"
                      value={gracePeriod}
                      onChange={(e) => setGracePeriod(e.target.value)}
                      style={{ paddingRight: 45 }}
                    />
                    <span style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '0.8rem',
                      color: 'var(--text-muted)',
                      pointerEvents: 'none'
                    }}>
                      phút
                    </span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }} title="Cho phép về sớm tối đa X phút mà không tính là Về Sớm">
                    Cho Phép Về Sớm
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      min="0"
                      max="120"
                      className="custom-input"
                      value={earlyBuffer}
                      onChange={(e) => setEarlyBuffer(e.target.value)}
                      style={{ paddingRight: 45 }}
                    />
                    <span style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '0.8rem',
                      color: 'var(--text-muted)',
                      pointerEvents: 'none'
                    }}>
                      phút
                    </span>
                  </div>
                </div>
              </div>

              {/* Quy tắc tóm tắt */}
              <div style={{
                background: 'rgba(253, 105, 0, 0.07)',
                border: '1px solid rgba(253, 105, 0, 0.25)',
                borderRadius: 10,
                padding: '12px 14px',
                fontSize: '0.82rem',
                lineHeight: 1.5,
                color: 'var(--text-main)'
              }}>
                <div style={{ fontWeight: 700, color: 'var(--brand-orange)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <ShieldCheck size={14} /> Quy tắc tự động đối soát:
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text-muted)' }}>
                  <li>
                    <b>Vào Ca:</b> Check-in sau <b>{calcGraceTimeStr()}</b> sẽ được ghi nhận là <span style={{ color: '#f59e0b', fontWeight: 700 }}>Đi Trễ</span>.
                  </li>
                  <li>
                    <b>Tan Ca:</b> Check-out trước <b>{endTime}</b> sẽ được ghi nhận là <span style={{ color: '#ef4444', fontWeight: 700 }}>Về Sớm</span>.
                  </li>
                </ul>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" className="btn-secondary" onClick={onClose} disabled={isSavingShift}>
                  Hủy
                </button>
                <button type="submit" className="btn-primary" disabled={isSavingShift}>
                  <Save size={16} />
                  <span>{isSavingShift ? 'Đang lưu...' : 'Lưu Cấu Hình Ca'}</span>
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
