import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MapPin, 
  Settings, 
  Navigation, 
  CheckCircle2, 
  AlertTriangle, 
  Globe, 
  Clock, 
  History, 
  RefreshCw, 
  Trash2, 
  Smartphone, 
  Inbox, 
  ShieldCheck,
  Compass,
  Save,
  Check
} from 'lucide-react';
import { gpsApi } from '../api/gpsApi';
import { shiftApi } from '../api/shiftApi';
import GpsSetupModal from './GpsSetupModal';

export default function GpsCheckinView({ employees = [], initialSubTab = 'gps', onSubTabChange }) {
  const [activeSubTab, setActiveSubTab] = useState(initialSubTab); // 'gps' | 'shift'
  const [gpsSettings, setGpsSettings] = useState(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  // Cấu hình Ca làm việc
  const [shiftName, setShiftName] = useState('Ca Hành Chính Mebieco');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:30');
  const [gracePeriod, setGracePeriod] = useState(15);
  const [earlyBuffer, setEarlyBuffer] = useState(0);
  const [isLoadingShift, setIsLoadingShift] = useState(true);
  const [isSavingShift, setIsSavingShift] = useState(false);
  const [shiftSuccessMsg, setShiftSuccessMsg] = useState(null);
  const [shiftErrorMsg, setShiftErrorMsg] = useState(null);

  const [showSetupModal, setShowSetupModal] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkinResult, setCheckinResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const [logs, setLogs] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const targetMarkerRef = useRef(null);
  const userMarkerRef = useRef(null);
  const circleRef = useRef(null);

  // Tải cài đặt GPS mục tiêu
  const fetchSettings = useCallback(async () => {
    setIsLoadingSettings(true);
    try {
      const res = await gpsApi.getSettings();
      if (res.success && res.data && res.is_configured) {
        setGpsSettings(res.data);
        setIsConfigured(true);
      } else {
        setGpsSettings(null);
        setIsConfigured(false);
      }
    } catch (err) {
      console.error("Lỗi khi tải cài đặt GPS:", err);
      setIsConfigured(false);
    } finally {
      setIsLoadingSettings(false);
    }
  }, []);

  // Tải lịch sử điểm danh GPS
  const fetchLogs = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoadingLogs(true);
    try {
      const res = await gpsApi.getLogs({ limit: 50 });
      setLogs(res.logs || []);
    } catch (err) {
      console.error("Lỗi khi tải nhật ký GPS:", err);
    } finally {
      if (!isSilent) setIsLoadingLogs(false);
    }
  }, []);

  // Tải cấu hình Ca làm việc
  const fetchShiftSettings = useCallback(async () => {
    setIsLoadingShift(true);
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
      console.error("Lỗi khi tải cấu hình ca làm việc:", err);
    } finally {
      setIsLoadingShift(false);
    }
  }, []);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  useEffect(() => {
    fetchSettings();
    fetchShiftSettings();
    fetchLogs();
    const interval = setInterval(() => {
      fetchLogs(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchSettings, fetchShiftSettings, fetchLogs]);

  // Khởi tạo bản đồ hiển thị khi đã cài đặt xong GPS
  useEffect(() => {
    if (!isConfigured || !gpsSettings) return;

    let isMounted = true;
    let timer = null;

    const initMap = () => {
      if (!isMounted || !mapContainerRef.current) return;
      if (typeof window.L === 'undefined') {
        timer = setTimeout(initMap, 250);
        return;
      }

      const L = window.L;
      const targetPos = [gpsSettings.latitude, gpsSettings.longitude];

      try {
        if (!mapInstanceRef.current) {
          const map = L.map(mapContainerRef.current).setView(targetPos, 16);
          mapInstanceRef.current = map;

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19
          }).addTo(map);

          // Thêm Ghim Mục Tiêu (Cam)
          const targetMarker = L.marker(targetPos).addTo(map)
            .bindPopup(`<b>${gpsSettings.location_name || 'Mục tiêu'}</b><br/>Bán kính cho phép: ${gpsSettings.radius_meters}m`)
            .openPopup();
          targetMarkerRef.current = targetMarker;

          // Thêm Vòng Tròn Bán Kính
          const circle = L.circle(targetPos, {
            color: '#FD6900',
            fillColor: '#FD6900',
            fillOpacity: 0.18,
            radius: Number(gpsSettings.radius_meters)
          }).addTo(map);
          circleRef.current = circle;

          setTimeout(() => {
            if (mapInstanceRef.current) {
              mapInstanceRef.current.invalidateSize();
            }
          }, 200);
        } else {
          mapInstanceRef.current.setView(targetPos, 16);
          if (targetMarkerRef.current) targetMarkerRef.current.setLatLng(targetPos);
          if (circleRef.current) {
            circleRef.current.setLatLng(targetPos);
            circleRef.current.setRadius(Number(gpsSettings.radius_meters));
          }
          setTimeout(() => {
            if (mapInstanceRef.current) {
              mapInstanceRef.current.invalidateSize();
            }
          }, 200);
        }
      } catch (err) {
        console.warn("Lỗi khởi tạo bản đồ GPS setup:", err);
      }
    };

    initMap();

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [isConfigured, gpsSettings]);

  // Cập nhật vị trí ghim của người dùng trên bản đồ sau khi điểm danh
  const updateUserPositionOnMap = (userLat, userLng, isValid) => {
    if (!mapInstanceRef.current || typeof window.L === 'undefined') return;
    const L = window.L;
    const userPos = [userLat, userLng];

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng(userPos);
    } else {
      // Icon màu xanh nếu Đạt, màu đỏ nếu Không đạt
      const pinColor = isValid ? '#10b981' : '#e11d48';
      const userMarker = L.circleMarker(userPos, {
        radius: 9,
        color: '#ffffff',
        weight: 2,
        fillColor: pinColor,
        fillOpacity: 0.95
      }).addTo(mapInstanceRef.current);
      
      userMarker.bindPopup(`<b>Vị trí của bạn</b><br/>${isValid ? '✓ Đạt' : '❌ Ngoài khu vực'}`);
      userMarkerRef.current = userMarker;
    }

    // Zoom vừa đủ để nhìn thấy cả vị trí mục tiêu và vị trí người dùng
    if (targetMarkerRef.current) {
      const bounds = L.latLngBounds([
        [gpsSettings.latitude, gpsSettings.longitude],
        userPos
      ]);
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40] });
    }
  };

  // Lưu cài đặt GPS từ Modal
  const handleSaveSettings = async (settingsPayload) => {
    const res = await gpsApi.saveSettings(settingsPayload);
    if (res.success) {
      setGpsSettings(res.data);
      setIsConfigured(true);
      setErrorMsg(null);
    }
  };

  // Thực hiện Điểm Danh GPS
  const handleExecuteGpsCheckin = () => {
    if (!isConfigured || !gpsSettings) {
      setErrorMsg("Vui lòng thực hiện Cài đặt GPS mục tiêu trước!");
      return;
    }

    if (!navigator.geolocation) {
      setErrorMsg("Trình duyệt không hỗ trợ định vị GPS!");
      return;
    }

    setIsCheckingIn(true);
    setErrorMsg(null);
    setCheckinResult(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;

          const res = await gpsApi.submitCheckin({
            user_lat: userLat,
            user_lng: userLng,
            public_ip: publicIp,
            user_name: 'Nhân viên GPS'
          });

          if (res.success && res.data) {
            setCheckinResult(res.data);
            updateUserPositionOnMap(userLat, userLng, res.is_valid);
            fetchLogs();
          }
        } catch (err) {
          setErrorMsg(err.message || 'Lỗi khi gửi dữ liệu điểm danh GPS!');
        } finally {
          setIsCheckingIn(false);
        }
      },
      (err) => {
        setIsCheckingIn(false);
        let msg = 'Không lấy được tọa độ vị trí hiện tại.';
        if (err.code === 1) msg = 'Bạn đã từ chối cho phép quyền GPS trên trình duyệt.';
        else if (err.code === 2) msg = 'Không thể kết nối vệ tinh GPS của thiết bị.';
        else if (err.code === 3) msg = 'Hết thời gian chờ phản hồi từ GPS.';
        setErrorMsg(msg);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  // Xóa log GPS
  const handleDeleteLog = async (id) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa log GPS #${id}?`)) return;
    try {
      await gpsApi.deleteLog(id);
      fetchLogs();
      if (checkinResult && checkinResult.id === id) {
        setCheckinResult(null);
      }
    } catch (err) {
      console.error("Lỗi xóa log GPS:", err);
    }
  };

  // Reset xóa cài đặt GPS mục tiêu (vẫn giữ nguyên lịch sử nhật ký)
  const handleResetGpsSettings = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa cài đặt GPS mục tiêu không?\n(Lưu ý: Mọi nhật ký điểm danh GPS trước đó vẫn được giữ nguyên)")) return;
    try {
      const res = await gpsApi.resetSettings();
      if (res.success) {
        setGpsSettings(null);
        setIsConfigured(false);
        setCheckinResult(null);
        setErrorMsg(null);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }
      }
    } catch (err) {
      setErrorMsg(err.message || "Lỗi khi xóa cài đặt GPS");
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
    setShiftErrorMsg(null);
    setShiftSuccessMsg(null);
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
        setShiftSuccessMsg(`Đã lưu cấu hình: ${shiftName} (${startTime} - ${endTime}, ân hạn ${gracePeriod}p)`);
        setTimeout(() => setShiftSuccessMsg(null), 5000);
      } else {
        setShiftErrorMsg(res.message || 'Lỗi khi lưu cấu hình ca');
      }
    } catch (err) {
      setShiftErrorMsg(err.message || 'Lỗi khi lưu cấu hình ca làm việc');
    } finally {
      setIsSavingShift(false);
    }
  };

  const handleSubTabClick = (tab) => {
    setActiveSubTab(tab);
    if (onSubTabChange) onSubTabChange(tab);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* HEADER QUẢN TRỊ CẤU HÌNH HỆ THỐNG */}
      <div className="glass-card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
              <Compass size={24} color="#FD6900" />
              <span>Cấu Hình Hệ Thống: GPS & Ca Làm Việc</span>
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
              Thiết lập bán kính định vị chấm công GPS và cấu hình khung giờ ca làm việc, nhận diện đi trễ / về sớm
            </p>
          </div>

          {/* Sub-tab chuyển đổi nhanh giữa GPS và Ca làm việc */}
          <div style={{
            display: 'flex',
            background: 'rgba(0, 0, 0, 0.05)',
            padding: 4,
            borderRadius: 10,
            gap: 4
          }}>
            <button
              type="button"
              className={`tab-btn ${activeSubTab === 'gps' ? 'active' : ''}`}
              onClick={() => handleSubTabClick('gps')}
              style={{ padding: '8px 16px', fontSize: '0.86rem', borderRadius: 8 }}
            >
              <MapPin size={16} />
              <span>1. Vị Trí Tọa Độ GPS</span>
            </button>
            <button
              type="button"
              className={`tab-btn ${activeSubTab === 'shift' ? 'active' : ''}`}
              onClick={() => handleSubTabClick('shift')}
              style={{ padding: '8px 16px', fontSize: '0.86rem', borderRadius: 8 }}
            >
              <Clock size={16} />
              <span>2. Khung Giờ Ca Làm Việc</span>
            </button>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 1: CẤU HÌNH TỌA ĐỘ GPS MỤC TIÊU & BẢN ĐỒ THỜI GIAN THỰC */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeSubTab === 'gps' && (
        <div className="glass-card" style={{ padding: 24 }}>
          <div className="card-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, margin: 0, color: 'var(--text-main)' }}>
              <MapPin size={20} color="#FD6900" />
              <span>Vị Trí GPS Mục Tiêu (Admin)</span>
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setShowSetupModal(true)}
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              >
                <Settings size={16} />
                <span>{isConfigured ? 'Cài Đặt GPS Mục Tiêu' : 'Bắt Đầu Cài Đặt GPS'}</span>
              </button>

              {isConfigured && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleResetGpsSettings}
                  style={{ padding: '8px 14px', fontSize: '0.85rem', color: '#e11d48', borderColor: 'rgba(225, 29, 72, 0.3)' }}
                  title="Xóa cài đặt vị trí GPS mục tiêu"
                >
                  <Trash2 size={16} color="#e11d48" />
                  <span>Xóa GPS</span>
                </button>
              )}
            </div>
          </div>

          {/* THÔNG BÁO LỖI / CẢNH BÁO */}
          {errorMsg && (
            <div style={{ margin: '14px 0', padding: '12px 16px', borderRadius: 10, background: 'rgba(225, 29, 72, 0.12)', border: '1px solid rgba(225, 29, 72, 0.3)', color: '#e11d48', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertTriangle size={18} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TRẠNG THÁI 1: CHƯA CÀI ĐẶT GPS */}
          {!isConfigured && !isLoadingSettings && (
            <div style={{ textAlign: 'center', padding: '40px 20px', background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px dashed var(--card-border)', marginTop: 14 }}>
              <MapPin size={48} color="#FD6900" style={{ opacity: 0.6, marginBottom: 12 }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Chưa Thiết Lập Vị Trí Tọa Độ GPS Mục Tiêu
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', maxWidth: 460, margin: '8px auto 20px' }}>
                Vui lòng nhấn vào nút <strong>"Cài Đặt GPS"</strong> để chọn vị trí công ty/văn phòng và quy định bán kính cho phép điểm danh (ví dụ: 100m).
              </p>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setShowSetupModal(true)}
                style={{ padding: '12px 24px', fontSize: '0.95rem' }}
              >
                <Settings size={18} />
                <span>Bắt Đầu Cài Đặt GPS</span>
              </button>
            </div>
          )}

          {/* TRẠNG THÁI 2: ĐÃ CÀI ĐẶT GPS */}
          {isConfigured && gpsSettings && (
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* THẺ THÔNG TIN VỊ TRÍ MỤC TIÊU */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, background: 'rgba(253, 105, 0, 0.06)', padding: 16, borderRadius: 12, border: '1px solid rgba(253, 105, 0, 0.2)' }}>
                <div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>TÊN ĐỊA ĐIỂM:</span>
                  <strong style={{ color: 'var(--brand-orange)', fontSize: '1.05rem' }}>{gpsSettings.location_name}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>TỌA ĐỘ MỤC TIÊU:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 700 }}>
                    {gpsSettings.latitude.toFixed(6)}, {gpsSettings.longitude.toFixed(6)}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>BÁN KÍNH CHO PHÉP:</span>
                  <span style={{ color: '#10b981', fontSize: '1rem', fontWeight: 800 }}>
                    {gpsSettings.radius_meters} mét
                  </span>
                </div>
              </div>

              {/* KHU VỰC BẢN ĐỒ VỊ TRÍ & VÒNG TRÒN BÁN KÍNH */}
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MapPin size={14} color="#FD6900" />
                  <span>Bản đồ khu vực mục tiêu & bán kính cho phép {gpsSettings.radius_meters}m:</span>
                </div>
                <div
                  ref={mapContainerRef}
                  style={{
                    width: '100%',
                    height: 380,
                    borderRadius: 14,
                    overflow: 'hidden',
                    border: '1px solid var(--card-border)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 2: CẤU HÌNH CA LÀM VIỆC TRỰC TIẾP TRÊN TRANG (TẬP TRUNG)  */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeSubTab === 'shift' && (
        <div className="glass-card" style={{ padding: 24, maxWidth: 680, width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'rgba(253, 105, 0, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--brand-orange)',
              flexShrink: 0
            }}>
              <Clock size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Cấu Hình Ca Làm Việc & Chấm Công
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Thiết lập mốc giờ Vào Ca, Tan Ca và thời gian ân hạn đối soát tự động
              </p>
            </div>
          </div>

          {/* Thông báo thành công */}
          {shiftSuccessMsg && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 16px',
              borderRadius: 10,
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#10b981',
              fontSize: '0.88rem',
              fontWeight: 600,
              marginBottom: 16
            }}>
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
              <span>{shiftSuccessMsg}</span>
            </div>
          )}

          {/* Thông báo lỗi */}
          {shiftErrorMsg && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 16px',
              borderRadius: 10,
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              fontSize: '0.88rem',
              marginBottom: 16
            }}>
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
              <span>{shiftErrorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSaveShift} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>Tên Ca Làm Việc</label>
              <input
                type="text"
                className="custom-input"
                value={shiftName}
                onChange={(e) => setShiftName(e.target.value)}
                placeholder="VD: Ca Hành Chính Mebieco"
                required
                style={{ padding: '11px 14px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Giờ Vào Ca Chuẩn *</label>
                <input
                  type="time"
                  className="custom-input"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  style={{ fontWeight: 700, fontSize: '0.95rem', padding: '11px 14px' }}
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
                  style={{ fontWeight: 700, fontSize: '0.95rem', padding: '11px 14px' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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
                    style={{ paddingRight: 45, padding: '11px 45px 11px 14px' }}
                  />
                  <span style={{
                    position: 'absolute',
                    right: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '0.85rem',
                    color: 'var(--text-muted)',
                    pointerEvents: 'none',
                    fontWeight: 600
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
                    style={{ paddingRight: 45, padding: '11px 45px 11px 14px' }}
                  />
                  <span style={{
                    position: 'absolute',
                    right: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '0.85rem',
                    color: 'var(--text-muted)',
                    pointerEvents: 'none',
                    fontWeight: 600
                  }}>
                    phút
                  </span>
                </div>
              </div>
            </div>

            {/* Quy tắc tóm tắt & Đối soát tự động */}
            <div style={{
              background: 'rgba(253, 105, 0, 0.07)',
              border: '1px solid rgba(253, 105, 0, 0.25)',
              borderRadius: 12,
              padding: '14px 18px',
              fontSize: '0.85rem',
              lineHeight: 1.6,
              color: 'var(--text-main)'
            }}>
              <div style={{ fontWeight: 800, color: 'var(--brand-orange)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShieldCheck size={16} /> Quy tắc tự động đối soát chấm công:
              </div>
              <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--text-muted)' }}>
                <li style={{ marginBottom: 4 }}>
                  <b>Vào Ca:</b> Check-in sau <b>{calcGraceTimeStr()}</b> sẽ tự động ghi nhận là <span style={{ color: '#f59e0b', fontWeight: 800 }}>Đi Trễ</span> (tính số phút trễ từ mốc chuẩn {startTime}).
                </li>
                <li>
                  <b>Tan Ca:</b> Check-out trước <b>{endTime}</b> sẽ tự động ghi nhận là <span style={{ color: '#ef4444', fontWeight: 800 }}>Về Sớm</span> (tính số phút về sớm so với mốc {endTime}).
                </li>
              </ul>
            </div>

            {/* Nút lưu */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 10 }}>
              <button 
                type="button" 
                className="btn-secondary"
                onClick={() => {
                  setShiftName('Ca Hành Chính Mebieco');
                  setStartTime('08:00');
                  setEndTime('17:30');
                  setGracePeriod(15);
                  setEarlyBuffer(0);
                }}
                disabled={isSavingShift}
                style={{ padding: '10px 18px' }}
              >
                Mặc Định
              </button>
              <button 
                type="submit" 
                className="btn-primary" 
                disabled={isSavingShift}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', fontSize: '0.92rem' }}
              >
                <Save size={18} />
                <span>{isSavingShift ? 'Đang lưu...' : 'Lưu Cấu Hình Ca Làm Việc'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL CÀI ĐẶT GPS MỤC TIÊU */}
      {showSetupModal && (
        <GpsSetupModal
          initialData={gpsSettings}
          onClose={() => setShowSetupModal(false)}
          onSaveSuccess={handleSaveSettings}
        />
      )}
    </div>
  );
}
