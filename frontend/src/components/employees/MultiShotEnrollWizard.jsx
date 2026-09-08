import React, { useState, useRef, useEffect } from 'react';
import { CheckCircle2, Sparkles, X, ShieldCheck, RotateCcw, Loader2 } from 'lucide-react';
import {
  detectFaceAndExtract,
  loadFaceModels,
  estimatePoseAngles,
  assessFaceQuality,
  checkFaceCentering,
  snapshotFace,
  checkPoseMatch,
  drawFaceCanvas
} from '../../utils/faceEngine';
import { playShutterSound, playSuccessChime, playBeep } from '../../utils/audio';

const REQUIRED_SAMPLES = 5;
const MIN_QUALITY = 0.62;
const CAPTURE_COOLDOWN_MS = 400;

const POSES = [
  { key: 'front', title: 'Nhìn thẳng vào camera', hint: 'Giữ đầu thẳng và nhìn vào tâm vòng quét.', icon: '◎', label: 'Thẳng' },
  { key: 'left',  title: 'Quay nhẹ sang trái', hint: 'Xoay chậm khoảng 15–30°, không di chuyển camera.', icon: '←', label: 'Trái' },
  { key: 'right', title: 'Quay nhẹ sang phải', hint: 'Xoay sang phía đối diện và giữ yên một chút.', icon: '→', label: 'Phải' },
  { key: 'up',    title: 'Ngẩng nhẹ khuôn mặt', hint: 'Chỉ ngẩng nhẹ, vẫn giữ mắt gần camera.', icon: '↑', label: 'Ngẩng' },
  { key: 'down',  title: 'Cúi nhẹ khuôn mặt', hint: 'Cúi nhẹ khuôn mặt để hoàn tất.', icon: '↓', label: 'Cúi' },
];

const TOTAL_SAMPLES = POSES.length * REQUIRED_SAMPLES;

export default function MultiShotEnrollWizard({ onComplete, onCancel }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const loopActiveRef = useRef(false);
  const lastCaptureRef = useRef(0);

  const sideSignRef = useRef(null);
  const pitchSignRef = useRef(null);

  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [poseIndex, setPoseIndex] = useState(0);
  const [poseSamples, setPoseSamples] = useState(0);
  const [capturedTemplates, setCapturedTemplates] = useState([]);
  
  const [qualityBadgeText, setQualityBadgeText] = useState('Chờ camera');
  const [qualityBadgeType, setQualityBadgeType] = useState('warn'); // 'good' | 'warn'
  const [cameraLabelText, setCameraLabelText] = useState('Đưa khuôn mặt vào vùng quét');
  
  const [statusMessage, setStatusMessage] = useState('Đang khởi tạo AI...');
  const [statusType, setStatusType] = useState('loading'); // 'loading' | 'info' | 'warn' | 'capturing' | 'success' | 'done'
  const [metrics, setMetrics] = useState({ yaw: '—', pitch: '—', quality: '—' });
  const [isComplete, setIsComplete] = useState(false);

  // Start camera
  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24, max: 30 } },
          audio: false
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await new Promise(resolve => {
            if (videoRef.current.readyState >= 2) return resolve();
            videoRef.current.onloadedmetadata = resolve;
          });
          await videoRef.current.play();
        }
        setIsCameraReady(true);
      } catch (err) {
        console.error('Camera error:', err);
        setStatusMessage('Không thể mở camera: ' + (err.message || 'Chưa cấp quyền'));
        setStatusType('warn');
        setQualityBadgeText('Không mở được camera');
        setQualityBadgeType('warn');
      }
    }
    startCamera();
    return () => {
      loopActiveRef.current = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Load AI model
  useEffect(() => {
    async function initModel() {
      const ok = await loadFaceModels();
      setIsModelReady(ok);
      if (!ok) {
        setStatusMessage('Lỗi tải AI model. Kiểm tra kết nối mạng.');
        setStatusType('warn');
      }
    }
    initModel();
  }, []);

  // Main detection loop
  useEffect(() => {
    if (!isCameraReady || !isModelReady || isComplete) return;

    loopActiveRef.current = true;
    setStatusMessage(`${POSES[0].icon} ${POSES[0].title}`);
    setStatusType('info');

    let currentPoseIdx = 0;
    let currentPoseSamples = 0;
    let templates = [];

    async function detectionLoop() {
      while (loopActiveRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || video.readyState < 2 || video.paused) {
          await sleep(80);
          continue;
        }

        try {
          const result = await detectFaceAndExtract(video);

          if (!result || !result.descriptor || result.descriptor.length !== 128) {
            setCameraLabelText('Đưa khuôn mặt vào hình bầu dục chính giữa');
            setQualityBadgeText('Chờ khuôn mặt');
            setQualityBadgeType('warn');
            setStatusMessage('Chưa thấy khuôn mặt trong khung...');
            setStatusType('info');
            setMetrics({ yaw: '—', pitch: '—', quality: '—' });
            if (canvas) drawFaceCanvas(canvas, video, null);
            await sleep(100);
            continue;
          }

          const angles = estimatePoseAngles(result.landmarks);
          const quality = assessFaceQuality(video, result.box, result.score);
          const centering = checkFaceCentering(video, result.box);

          setMetrics({
            yaw: `${angles.yaw.toFixed(1)}°`,
            pitch: `${angles.pitch.toFixed(1)}°`,
            quality: `${Math.round(quality * 100)}/100`
          });

          const pose = POSES[currentPoseIdx];
          if (!pose) break;

          const poseOk = checkPoseMatch(
            pose.key,
            angles.yaw,
            angles.pitch,
            angles.roll,
            sideSignRef.current,
            pitchSignRef.current
          );
          const qualityOk = quality >= MIN_QUALITY && centering.isCentered && centering.isSizeOk;
          const cooldownOk = Date.now() - lastCaptureRef.current >= CAPTURE_COOLDOWN_MS;

          let reason = '';
          if (!centering.isCentered || !centering.isSizeOk) reason = centering.reason;
          else if (quality < MIN_QUALITY) reason = 'Tiến gần hơn / thêm sáng';
          else if (!poseOk) reason = pose.title;

          setQualityBadgeText(reason || 'Chất lượng tốt');
          setQualityBadgeType(qualityOk && poseOk ? 'good' : 'warn');

          const isCapturing = poseOk && qualityOk;
          const labelTag = isCapturing ? 'ĐANG THU MẪU' : 'ĐANG CĂN CHỈNH';
          const drawColor = isCapturing ? '#73f1cf' : '#ffbe5c';

          if (canvas) {
            drawFaceCanvas(canvas, video, result.box, labelTag, drawColor);
          }

          if (isCapturing) {
            setCameraLabelText(`Giữ yên · ${currentPoseSamples + 1}/${REQUIRED_SAMPLES}`);
            setStatusMessage(`Giữ yên · Đang thu mẫu ${currentPoseSamples + 1}/${REQUIRED_SAMPLES}`);
            setStatusType('capturing');

            if (cooldownOk) {
              lastCaptureRef.current = Date.now();
              const thumbnail = snapshotFace(video, result.box);

              // Store sideSign / pitchSign for symmetry checks
              if (pose.key === 'left' && sideSignRef.current === null) {
                sideSignRef.current = Math.sign(angles.yaw);
              }
              if (pose.key === 'up' && pitchSignRef.current === null) {
                pitchSignRef.current = Math.sign(angles.pitch);
              }

              const newTemplate = {
                pose: pose.key,
                poseTitle: pose.label,
                quality: Math.round(quality * 100),
                yaw: angles.yaw,
                pitch: angles.pitch,
                descriptor: result.descriptor,
                thumbnail
              };

              templates = [...templates, newTemplate];
              currentPoseSamples += 1;

              setCapturedTemplates([...templates]);
              setPoseSamples(currentPoseSamples);

              playShutterSound();
              if (navigator.vibrate) navigator.vibrate(35);

              if (currentPoseSamples >= REQUIRED_SAMPLES) {
                currentPoseIdx += 1;
                currentPoseSamples = 0;
                setPoseIndex(currentPoseIdx);
                setPoseSamples(0);

                lastCaptureRef.current = Date.now() + 350;

                if (currentPoseIdx >= POSES.length) {
                  loopActiveRef.current = false;
                  setIsComplete(true);
                  setCameraLabelText('Đăng ký hoàn tất');
                  setQualityBadgeText('Đã thu đủ mẫu');
                  setQualityBadgeType('good');
                  setStatusMessage(`🎉 Hoàn tất! Đã lưu ${templates.length} face templates.`);
                  setStatusType('done');
                  if (canvas) drawFaceCanvas(canvas, video, null);
                  playSuccessChime();
                  break;
                } else {
                  const nextPose = POSES[currentPoseIdx];
                  setStatusMessage(`✅ Xong góc ${pose.label}! Tiếp: ${nextPose.icon} ${nextPose.title}`);
                  setStatusType('success');
                  playBeep(700, 0.12);
                }
              }
            }
          } else {
            setCameraLabelText(reason);
            setStatusMessage(`${pose.icon} ${pose.title}: ${pose.hint}`);
            setStatusType('info');
          }
        } catch (err) {
          console.error('Detection loop error:', err);
        }

        await sleep(90);
      }
    }

    detectionLoop();

    return () => {
      loopActiveRef.current = false;
    };
  }, [isCameraReady, isModelReady, isComplete]);

  const handleFinish = () => {
    if (capturedTemplates.length < TOTAL_SAMPLES || !isComplete) {
      alert(`❌ Bắt buộc phải quét đủ ${TOTAL_SAMPLES} ảnh mẫu (5 góc x 5 mẫu) trước khi áp dụng! Hiện tại bạn mới quét được ${capturedTemplates.length}/${TOTAL_SAMPLES} ảnh.`);
      return;
    }
    const descriptors = capturedTemplates.map(t => t.descriptor);
    const frontSample = capturedTemplates.find(t => t.pose === 'front');
    const primaryAvatar = frontSample ? frontSample.thumbnail : capturedTemplates[0].thumbnail;

    onComplete({
      descriptors,
      avatarImage: primaryAvatar,
      sampleCount: capturedTemplates.length
    });
  };

  const handleReset = () => {
    sideSignRef.current = null;
    pitchSignRef.current = null;
    setPoseIndex(0);
    setPoseSamples(0);
    setCapturedTemplates([]);
    setIsComplete(false);
    setMetrics({ yaw: '—', pitch: '—', quality: '—' });
    lastCaptureRef.current = 0;
  };

  const currentPose = POSES[poseIndex] || POSES[POSES.length - 1];
  const progressPercent = Math.round((capturedTemplates.length / TOTAL_SAMPLES) * 100);

  return (
    <div className="wizard-container enroll-5angle">
      {/* Header */}
      <div className="wizard-header">
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3 className="wizard-title">
            <Sparkles size={18} color="var(--brand-orange)" />
            <span>Quét Khuôn Mặt AI — 5 Góc Tự Động</span>
          </h3>
        </div>
        <button type="button" className="btn-icon" onClick={onCancel} style={{ width: 32, height: 32, flexShrink: 0 }}>
          <X size={16} />
        </button>
      </div>

      {/* Overall Progress Bar */}
      <div className="enroll-progress-track">
        <div className="enroll-progress-fill" style={{ width: `${progressPercent}%` }} />
        <span className="enroll-progress-label">{capturedTemplates.length}/{TOTAL_SAMPLES} mẫu</span>
      </div>

      {/* Main Grid */}
      <div className="wizard-grid enroll-5angle-grid">
        {/* Left: Camera Pane */}
        <div className="wizard-camera-pane">
          <div className="wizard-camera-frame enroll-camera-frame">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="wizard-video"
            />
            <canvas ref={canvasRef} className="enroll-canvas" />

            {/* Oval Face Guide with Scan Line */}
            <div className="face-guide" aria-hidden="true">
              <div className="scan-line" />
            </div>

            {/* Top-Right Quality Badge */}
            <div className={`quality-badge ${qualityBadgeType}`}>
              <span />
              <b>{qualityBadgeText}</b>
            </div>

            {/* Bottom-Center Camera Label */}
            <div className="camera-label">
              {cameraLabelText}
            </div>

            {/* Loading overlay */}
            {(!isCameraReady || !isModelReady) && (
              <div className="enroll-loading-overlay">
                <Loader2 size={32} className="enroll-spinner" />
                <span>{!isModelReady ? 'Đang nạp AI Model...' : 'Đang mở camera...'}</span>
              </div>
            )}
          </div>

          {/* 5 Pose Steps Bar */}
          <ol className="pose-progress" aria-label="Tiến độ quét 5 góc">
            {POSES.map((pose, idx) => {
              const isDone = poseIndex > idx || isComplete;
              const isCurrent = poseIndex === idx && !isComplete;
              return (
                <li
                  key={pose.key}
                  className={`${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}`}
                >
                  <span>{isDone ? '✓' : idx + 1}</span>
                  <b>{pose.label}</b>
                </li>
              );
            })}
          </ol>

          {/* Status Message */}
          <div className={`enroll-status enroll-status--${statusType}`}>
            {statusMessage}
          </div>

          {/* Realtime Metrics */}
          <div className="enroll-metrics">
            <div className="enroll-metric">
              <span className="metric-label">Góc ngang (Yaw)</span>
              <span className="metric-value">{metrics.yaw}</span>
            </div>
            <div className="enroll-metric">
              <span className="metric-label">Góc dọc (Pitch)</span>
              <span className="metric-value">{metrics.pitch}</span>
            </div>
            <div className="enroll-metric">
              <span className="metric-label">Chất lượng</span>
              <span className="metric-value">{metrics.quality}</span>
            </div>
            <div className="enroll-metric">
              <span className="metric-label">Mẫu đã thu</span>
              <span className="metric-value metric-value--highlight">{capturedTemplates.length}/{TOTAL_SAMPLES}</span>
            </div>
          </div>
        </div>

        {/* Right: Captured Samples Pane */}
        <div className="wizard-samples-pane">
          <div className="samples-header">
            <span>Mẫu Đã Thu ({capturedTemplates.length})</span>
            <span className="ai-badge">128D AI</span>
          </div>

          <div className="samples-list enroll-samples-scroll">
            {capturedTemplates.length === 0 ? (
              <div className="samples-empty">
                Vui lòng xoay đầu nhẹ theo hướng dẫn để AI tự động thu mẫu...
              </div>
            ) : (
              capturedTemplates.map((sample, idx) => (
                <div key={idx} className="sample-item">
                  <img src={sample.thumbnail} alt={`Mẫu ${idx + 1}`} className="sample-thumb" />
                  <div className="sample-info">
                    <div className="sample-name">{sample.poseTitle} #{(idx % REQUIRED_SAMPLES) + 1}</div>
                    <div className="sample-badge">
                      <ShieldCheck size={12} />
                      Q{sample.quality}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Action Buttons */}
          <div className="enroll-wizard-actions">
            {capturedTemplates.length > 0 && !isComplete && (
              <button type="button" className="btn-secondary" onClick={handleReset}>
                <RotateCcw size={14} />
                <span>Làm Lại</span>
              </button>
            )}
            <button
              type="button"
              className="btn-primary wizard-finish-btn"
              onClick={handleFinish}
              disabled={capturedTemplates.length < TOTAL_SAMPLES || !isComplete}
              title={capturedTemplates.length < TOTAL_SAMPLES ? `Bắt buộc phải thu thập đủ ${TOTAL_SAMPLES} ảnh mẫu (Hiện có ${capturedTemplates.length}/${TOTAL_SAMPLES})` : "Áp dụng đủ 25 mẫu ảnh khuôn mặt"}
              style={capturedTemplates.length < TOTAL_SAMPLES ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
            >
              <CheckCircle2 size={16} />
              <span>
                {capturedTemplates.length >= TOTAL_SAMPLES && isComplete
                  ? `Hoàn Tất (Đủ ${TOTAL_SAMPLES} Mẫu)`
                  : `Chưa đủ 25 ảnh (${capturedTemplates.length}/${TOTAL_SAMPLES})`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
