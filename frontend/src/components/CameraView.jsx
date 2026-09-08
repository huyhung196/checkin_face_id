import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, SwitchCamera, Timer, Sparkles, AlertCircle, UserPlus, ShieldCheck, MapPin } from 'lucide-react';
import { playShutterSound, playBeep, playSuccessChime } from '../utils/audio';
import { detectFaceFast, matchLiveFace, loadFaceModels } from '../utils/faceEngine';

export default function CameraView({ 
  employees = [], 
  onCapture, 
  isSubmitting, 
  onOpenAddEmployee
}) {
  const videoRef = useRef(null);
  const canvasOverlayRef = useRef(null);
  const hiddenCanvasRef = useRef(null);
  const loopTimerRef = useRef(null);
  const isInferencingRef = useRef(false);
  const lastMatchIdRef = useRef(null);

  const [stream, setStream] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [useCountdown, setUseCountdown] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [flashActive, setFlashActive] = useState(false);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [liveMatch, setLiveMatch] = useState(null);

  useEffect(() => { loadFaceModels(); }, []);

  useEffect(() => {
    async function getDevices() {
      try {
        const devList = await navigator.mediaDevices.enumerateDevices();
        const videoDevs = devList.filter(d => d.kind === 'videoinput');
        setDevices(videoDevs);
        if (videoDevs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoDevs[0].deviceId);
        }
      } catch (err) {
        console.warn("Không lấy được danh sách camera:", err);
      }
    }
    getDevices();
  }, []);

  useEffect(() => {
    let currentStream = null;
    async function startCamera() {
      setCameraError(null);
      try {
        if (stream) stream.getTracks().forEach(track => track.stop());
        const constraints = {
          video: selectedDeviceId 
            ? { deviceId: { exact: selectedDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
            : { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        };
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        currentStream = mediaStream;
        setStream(mediaStream);
        if (videoRef.current) videoRef.current.srcObject = mediaStream;
      } catch (err) {
        console.error("Lỗi camera:", err);
        setCameraError(err.message || 'Không thể truy cập camera.');
      }
    }
    startCamera();
    return () => { if (currentStream) currentStream.getTracks().forEach(track => track.stop()); };
  }, [selectedDeviceId]);

  const runDetection = useCallback(async () => {
    if (document.hidden || !videoRef.current || videoRef.current.paused || videoRef.current.ended) return;
    const video = videoRef.current;
    if (video.readyState >= 2 && !isInferencingRef.current) {
      isInferencingRef.current = true;
      try {
        const vW = video.videoWidth || 640;
        const vH = video.videoHeight || 480;
        const faceResult = await detectFaceFast(video);
        if (faceResult && canvasOverlayRef.current) {
          const canvas = canvasOverlayRef.current;
          const ctx = canvas.getContext('2d');
          if (canvas.width !== vW || canvas.height !== vH) { canvas.width = vW; canvas.height = vH; }
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const matchResult = matchLiveFace(faceResult.descriptor, employees, 0.40);
          const isRealMatch = Boolean(matchResult && matchResult.matched && matchResult.employee && matchResult.confidence >= 50.0);
          const { x, y, width, height } = faceResult.box;
          ctx.strokeStyle = isRealMatch ? '#FD6900' : '#006AFF';
          ctx.lineWidth = 3;
          const r = 6;
          ctx.beginPath();
          ctx.moveTo(x + r, y); ctx.lineTo(x + width - r, y);
          ctx.quadraticCurveTo(x + width, y, x + width, y + r);
          ctx.lineTo(x + width, y + height - r);
          ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
          ctx.lineTo(x + r, y + height);
          ctx.quadraticCurveTo(x, y + height, x, y + height - r);
          ctx.lineTo(x, y + r);
          ctx.quadraticCurveTo(x, y, x + r, y);
          ctx.stroke();
          const currentMatchId = isRealMatch ? matchResult.employee.id : 'unmatched';
          if (lastMatchIdRef.current !== currentMatchId) {
            lastMatchIdRef.current = currentMatchId;
            if (isRealMatch) {
              setLiveMatch({ ...matchResult, descriptor: faceResult.descriptor, box: faceResult.box });
            } else {
              setLiveMatch({ matched: false, employee: null, confidence: 0, descriptor: faceResult.descriptor, box: faceResult.box });
            }
          }
        } else {
          if (lastMatchIdRef.current !== null) { lastMatchIdRef.current = null; setLiveMatch(null); }
          if (canvasOverlayRef.current) {
            const ctx = canvasOverlayRef.current.getContext('2d');
            ctx.clearRect(0, 0, canvasOverlayRef.current.width, canvasOverlayRef.current.height);
          }
        }
      } catch (err) { /* ignored */ } finally { isInferencingRef.current = false; }
    }
  }, [employees]);

  useEffect(() => {
    loopTimerRef.current = setInterval(runDetection, 250);
    return () => { if (loopTimerRef.current) clearInterval(loopTimerRef.current); };
  }, [runDetection]);

  const handleSwitchCamera = () => {
    if (devices.length < 2) return;
    const idx = devices.findIndex(d => d.deviceId === selectedDeviceId);
    setSelectedDeviceId(devices[(idx + 1) % devices.length].deviceId);
  };

  const executeCapture = async () => {
    if (!videoRef.current || !hiddenCanvasRef.current) return;
    const isEmpMatched = liveMatch && liveMatch.matched && liveMatch.employee;
    if (!isEmpMatched) {
      alert("❌ Không nhận diện được khuôn mặt nhân viên! Người lạ không được phép điểm danh.");
      return;
    }

    const video = videoRef.current;
    const canvas = hiddenCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const w = video.videoWidth || 640, h = video.videoHeight || 480;
    canvas.width = w; canvas.height = h;
    ctx.translate(w, 0); ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, w, h);
    const imageData = canvas.toDataURL('image/jpeg', 0.90);
    setFlashActive(true); playShutterSound();
    setTimeout(() => { setFlashActive(false); playSuccessChime(); }, 120);

    // Bắt buộc lấy tọa độ GPS thiết bị trước khi gửi điểm danh
    if (!navigator.geolocation) {
      alert("❌ Trình duyệt hoặc thiết bị của bạn không hỗ trợ định vị GPS!");
      return;
    }

    let userLat = null, userLng = null;
    let gpsErrorMsg = null;

    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 7000,
          maximumAge: 0
        });
      });
      if (pos && pos.coords) {
        userLat = pos.coords.latitude;
        userLng = pos.coords.longitude;
      }
    } catch (err) {
      if (err.code === 1) {
        gpsErrorMsg = "Bạn đã từ chối quyền GPS. Vui lòng cấp quyền vị trí cho trang web để điểm danh!";
      } else if (err.code === 2) {
        gpsErrorMsg = "Không thể lấy tín hiệu định vị GPS. Vui lòng bật GPS/Vị trí trên thiết bị!";
      } else if (err.code === 3) {
        gpsErrorMsg = "Hết thời gian chờ phản hồi GPS. Vui lòng kiểm tra lại GPS và thử lại!";
      } else {
        gpsErrorMsg = "Không lấy được vị trí GPS: " + (err.message || "Lỗi GPS");
      }
    }

    if (gpsErrorMsg || userLat === null || userLng === null) {
      alert(`❌ ${gpsErrorMsg || "Không lấy được tọa độ GPS! Bắt buộc phải bật GPS để điểm danh."}`);
      return;
    }

    onCapture({
      image: imageData,
      employee_id: liveMatch.employee.id,
      employee_code: liveMatch.employee.employee_code || '',
      user_name: liveMatch.employee.full_name,
      match_confidence: liveMatch.confidence || 0,
      face_descriptor: liveMatch.descriptor || null,
      user_lat: userLat,
      user_lng: userLng
    });
  };

  const handleCaptureClick = () => {
    if (isSubmitting || countdown !== null) return;
    const isEmpMatched = liveMatch && liveMatch.matched && liveMatch.employee;
    if (!isEmpMatched) {
      alert("❌ Không nhận diện được khuôn mặt nhân viên! Người lạ không được phép điểm danh.");
      return;
    }

    if (useCountdown) {
      setCountdown(3); playBeep(500, 0.1);
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev === null) { clearInterval(interval); return null; }
          if (prev <= 1) { clearInterval(interval); setTimeout(() => { setCountdown(null); executeCapture(); }, 300); return '📸'; }
          playBeep(500 + (4 - prev) * 100, 0.1); return prev - 1;
        });
      }, 900);
    } else { executeCapture(); }
  };

  return (
    <div className="glass-card camera-card">
      <div className="card-heading">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <h2 className="card-title" style={{ margin: 0 }}><Camera size={18} color="#FD6900" /> Camera Điểm Danh</h2>
          <span style={{
            fontSize: '0.72rem',
            color: '#10b981',
            background: 'rgba(16, 185, 129, 0.12)',
            padding: '2px 8px',
            borderRadius: 6,
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4
          }}>
            <MapPin size={11} /> Bắt buộc GPS
          </span>
        </div>
        {devices.length > 1 && (
          <button type="button" className="btn-icon" onClick={handleSwitchCamera} title="Đổi camera" style={{ width: 34, height: 34 }}>
            <SwitchCamera size={15} />
          </button>
        )}
      </div>

      {/* 
        VIEWFINDER: Dùng aspect-ratio: 1/1 (vuông) + object-fit: cover.
        Cover sẽ lấp đầy 100% khung vuông, crop 2 cạnh thừa nhưng khuôn mặt ở giữa luôn hiện đầy đủ.
        Canvas overlay cũng dùng object-fit: cover => khớp chính xác với video.
      */}
      <div className="camera-viewfinder">
        <video ref={videoRef} autoPlay playsInline muted className="camera-video" />
        <canvas ref={canvasOverlayRef} className="camera-canvas-overlay" />
        <canvas ref={hiddenCanvasRef} style={{ display: 'none' }} />

        <div className="scanner-overlay">
          <div className="scanner-laser" />
          <div className="reticle-corner reticle-tl" />
          <div className="reticle-corner reticle-tr" />
          <div className="reticle-corner reticle-bl" />
          <div className="reticle-corner reticle-br" />
        </div>

        {liveMatch && (
          <div className="live-match-hud">
            {liveMatch.matched && liveMatch.employee ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden', minWidth: 0 }}>
                  <ShieldCheck size={18} color="#FD6900" style={{ flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div className="hud-match-title">{liveMatch.employee.full_name}</div>
                    <div className="hud-match-code">{liveMatch.employee.employee_code} • {liveMatch.employee.department}</div>
                  </div>
                </div>
                <div className="hud-confidence-badge">{liveMatch.confidence}%</div>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#ef4444', fontSize: '0.78rem', fontWeight: 600 }}>
                  <AlertCircle size={14} /> <span>Người lạ (Không thể điểm danh)</span>
                </div>
              </div>
            )}
          </div>
        )}

        <div className={`camera-flash ${flashActive ? 'active' : ''}`} />
        {countdown !== null && <div className="countdown-badge">{countdown}</div>}

        {cameraError && (
          <div className="camera-error-overlay">
            <AlertCircle size={32} style={{ marginBottom: 6 }} />
            <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>{cameraError}</p>
            <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 4 }}>Vui lòng cho phép quyền Camera trên trình duyệt.</p>
          </div>
        )}
      </div>

      <div className="camera-actions">
        <button type="button" className="btn-primary camera-capture-btn" onClick={handleCaptureClick}
          disabled={isSubmitting || !!cameraError || countdown !== null}>
          <Sparkles size={16} />
          <span>{isSubmitting ? 'Đang điểm danh...' : 'Điểm Danh Ngay'}</span>
        </button>
        <button type="button" className={`btn-icon ${useCountdown ? 'active' : ''}`}
          onClick={() => setUseCountdown(!useCountdown)} title={useCountdown ? 'Bật hẹn giờ 3s' : 'Hẹn giờ chụp 3s'}
          style={{ width: 40, height: 40, flexShrink: 0 }}>
          <Timer size={16} />
        </button>
      </div>
    </div>
  );
}
