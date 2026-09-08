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
  Compass
} from 'lucide-react';
import { gpsApi } from '../api/gpsApi';
import GpsSetupModal from './GpsSetupModal';

export default function GpsCheckinView({ employees = [] }) {
  const [gpsSettings, setGpsSettings] = useState(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

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

  useEffect(() => {
    fetchSettings();
    fetchLogs();
    const interval = setInterval(() => {
      fetchLogs(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchSettings, fetchLogs]);

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* KHU VỰC CÀI ĐẶT & BẢN ĐỒ THỜI GIAN THỰC */}
      <div className="glass-card" style={{ padding: 24 }}>
        <div className="card-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <h2 className="card-title">
            <Compass size={20} color="#FD6900" />
            <span>Cấu Hình GPS Mục Tiêu (Admin)</span>
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setShowSetupModal(true)}
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              <Settings size={16} />
              <span>{isConfigured ? 'Cài Đặt GPS Mục Tiêu' : 'Cài Đặt GPS'}</span>
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

        {/* TRẠNG THÁI 1: CHƯA CÀI ĐẶT GPS (KHÔNG HIỂN THỊ BẢN ĐỒ) */}
        {!isConfigured && !isLoadingSettings && (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px dashed var(--card-border)', marginTop: 12 }}>
            <MapPin size={48} color="#FD6900" style={{ opacity: 0.6, marginBottom: 12 }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Chưa Thiết Lập Vị Trí Tọa Độ GPS Mục Tiêu
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', maxWidth: 460, margin: '8px auto 20px' }}>
              Vui lòng nhấn vào nút <strong>"Cài Đặt GPS"</strong> bên dưới để chọn vị trí công ty/văn phòng và quy định bán kính cho phép điểm danh (ví dụ: 100m).
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

        {/* TRẠNG THÁI 2: ĐÃ CÀI ĐẶT GPS (HIỂN THỊ THÔNG TIN VỊ TRÍ & BẢN ĐỒ CĂN CHỈNH MỤC TIÊU) */}
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
