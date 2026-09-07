import React, { useState, useEffect } from 'react';
import { Download, Share2, PlusSquare, X, Smartphone, CheckCircle } from 'lucide-react';

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Kiểm tra nếu đang chạy ở chế độ PWA Standalone
    const isApp = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    setIsStandalone(isApp);

    // Kiểm tra thiết bị iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // Bắt sự kiện beforeinstallprompt trên Chrome / Edge / Android
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else if (isIos) {
      setShowIosGuide(true);
    } else {
      alert("Để cài đặt ứng dụng, hãy mở menu trình duyệt (dấu 3 chấm) và chọn 'Cài đặt ứng dụng' hoặc 'Thêm vào màn hình chính'.");
    }
  };

  // Ẩn nếu đã ở chế độ PWA hoặc người dùng đã tắt
  if (isStandalone || dismissed) return null;
  if (!deferredPrompt && !isIos) return null;

  return (
    <>
      <div className="pwa-install-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <div className="pwa-badge-icon">
            <Smartphone size={20} color="#FD6900" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
              Cài đặt Face ID App về điện thoại
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Điểm danh mượt mà, mở trực tiếp từ màn hình chính (PWA)
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button 
            type="button" 
            className="btn-primary pwa-btn-sm"
            onClick={handleInstallClick}
          >
            <Download size={15} />
            Cài Đặt Ngay
          </button>

          <button 
            type="button" 
            className="pwa-close-btn"
            onClick={() => setDismissed(true)}
            title="Đóng"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Popup hướng dẫn cho iOS Safari */}
      {showIosGuide && (
        <div className="modal-overlay" onClick={() => setShowIosGuide(false)}>
          <div className="glass-card modal-content" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--brand-orange)' }}>
                📲 Cài Đặt Trên iPhone / iPad (iOS)
              </h3>
              <button type="button" className="btn-icon" onClick={() => setShowIosGuide(false)} style={{ width: 34, height: 34 }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: '0.9rem', color: 'var(--text-main)', marginTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span className="pwa-step-num">1</span>
                <div>Bấm vào biểu tượng <strong>Chia sẻ (Share)</strong> <Share2 size={16} style={{ display: 'inline', verticalAlign: 'middle', color: '#006AFF' }} /> ở thanh menu Safari.</div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span className="pwa-step-num">2</span>
                <div>Cuộn xuống và chọn <strong>"Thêm vào Màn hình chính" (Add to Home Screen)</strong> <PlusSquare size={16} style={{ display: 'inline', verticalAlign: 'middle', color: '#FD6900' }} />.</div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span className="pwa-step-num">3</span>
                <div>Bấm <strong>"Thêm" (Add)</strong> ở góc trên bên phải để hoàn tất!</div>
              </div>
            </div>

            <button 
              type="button" 
              className="btn-primary" 
              style={{ width: '100%', marginTop: 20 }} 
              onClick={() => setShowIosGuide(false)}
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}
    </>
  );
}
