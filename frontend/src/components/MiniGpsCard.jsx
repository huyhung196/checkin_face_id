import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Settings, Compass, AlertCircle } from 'lucide-react';
import { gpsApi } from '../api/gpsApi';

export default function MiniGpsCard({ onOpenGpsSetup }) {
  const [gpsSettings, setGpsSettings] = useState(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const miniMapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    async function loadGps() {
      setIsLoading(true);
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
        setIsConfigured(false);
      } finally {
        setIsLoading(false);
      }
    }
    loadGps();
  }, []);

  // Khởi tạo bản đồ thu nhỏ
  useEffect(() => {
    if (!isConfigured || !gpsSettings) return;

    let isMounted = true;
    let timer = null;

    const initMiniMap = () => {
      if (!isMounted || !miniMapContainerRef.current) return;

      if (typeof window.L === 'undefined') {
        timer = setTimeout(initMiniMap, 250);
        return;
      }

      const L = window.L;
      const pos = [gpsSettings.latitude, gpsSettings.longitude];

      try {
        if (!mapInstanceRef.current) {
          const map = L.map(miniMapContainerRef.current, {
            zoomControl: false,
            attributionControl: false,
            dragging: false,
            scrollWheelZoom: false,
            doubleClickZoom: false,
            boxZoom: false,
            keyboard: false
          }).setView(pos, 15);

          mapInstanceRef.current = map;

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19
          }).addTo(map);

          // Vòng tròn bán kính cho phép
          L.circle(pos, {
            color: '#FD6900',
            fillColor: '#FD6900',
            fillOpacity: 0.25,
            radius: Number(gpsSettings.radius_meters)
          }).addTo(map);

          // Ghim điểm tâm màu cam nổi bật
          L.circleMarker(pos, {
            radius: 6,
            color: '#ffffff',
            weight: 2,
            fillColor: '#FD6900',
            fillOpacity: 1
          }).addTo(map);

          setTimeout(() => {
            if (mapInstanceRef.current) {
              mapInstanceRef.current.invalidateSize();
            }
          }, 150);
        } else {
          mapInstanceRef.current.setView(pos, 15);
          setTimeout(() => {
            if (mapInstanceRef.current) {
              mapInstanceRef.current.invalidateSize();
            }
          }, 150);
        }
      } catch (err) {
        console.warn("Lỗi khởi tạo mini map:", err);
      }
    };

    initMiniMap();

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [isConfigured, gpsSettings]);

  // Clean up map khi unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  if (isLoading) return null;

  return (
    <div className="glass-card" style={{ padding: '12px 16px', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
          <Compass size={17} color="#FD6900" />
          <span>Vị Trí & Bán Kính GPS Quy Định</span>
        </div>
        {onOpenGpsSetup && (
          <button
            type="button"
            className="btn-secondary"
            onClick={onOpenGpsSetup}
            style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: 6 }}
          >
            <Settings size={12} /> Cài Đặt
          </button>
        )}
      </div>

      {!isConfigured ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', fontSize: '0.82rem', color: '#ef4444' }}>
          <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
          <span><b>Chưa cấu hình GPS mục tiêu:</b> Hệ thống đang khóa điểm danh. Vui lòng bấm <b>"Cài Đặt"</b> để thiết lập vị trí & bán kính công ty.</span>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--brand-orange)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {gpsSettings.location_name}
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              Tọa độ: {gpsSettings.latitude.toFixed(5)}, {gpsSettings.longitude.toFixed(5)}
            </div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#10b981' }}>
              Bán kính cho phép: {gpsSettings.radius_meters} mét
            </div>
          </div>

          <div
            ref={miniMapContainerRef}
            style={{
              width: 140,
              height: 76,
              borderRadius: 10,
              overflow: 'hidden',
              border: '1px solid var(--border-card)',
              boxShadow: 'var(--shadow-sm)',
              flexShrink: 0,
              background: '#f1f5f9'
            }}
          />
        </div>
      )}
    </div>
  );
}
