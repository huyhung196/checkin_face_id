import React, { useState, useRef, useEffect } from 'react';
import { Camera, CheckCircle2, RotateCcw, Sparkles, Upload, X, ShieldCheck, AlertCircle, Trash2 } from 'lucide-react';
import { detectFaceAndExtract } from '../../utils/faceEngine';
import { playShutterSound, playSuccessChime } from '../../utils/audio';

const ENROLL_STEPS = [
  { id: 'front', label: '1. Nhìn Thẳng', fullLabel: 'Nhìn Thẳng (Chính diện)', tip: 'Nhìn thẳng vào giữa camera, giữ mặt tự nhiên' },
  { id: 'left', label: '2. Nghiêng Trái', fullLabel: 'Nghiêng Trái Nhẹ (~15°)', tip: 'Quay đầu sang trái một chút' },
  { id: 'right', label: '3. Nghiêng Phải', fullLabel: 'Nghiêng Phải Nhẹ (~15°)', tip: 'Quay đầu sang phải một chút' },
  { id: 'smile', label: '4. Cười/Ngước', fullLabel: 'Cười hoặc Ngước Nhẹ', tip: 'Cười nhẹ hoặc hơi ngước cằm' }
];

export default function MultiShotEnrollWizard({ onComplete, onCancel }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [capturedSamples, setCapturedSamples] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);

  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsCameraActive(true);
        setStatusMessage('Căn chỉnh khuôn mặt vào khung và bấm "📸 Chụp Mẫu"');
      } catch (err) {
        console.error("Camera error:", err);
        setStatusMessage('Không thể mở camera: ' + (err.message || 'Chưa cấp quyền'));
      }
    }

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const captureCurrentAngle = async () => {
    if (!videoRef.current || isProcessing) return;

    setIsProcessing(true);
    setStatusMessage('⏳ AI đang trích xuất đặc trưng 128D...');

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, width, height);

      const base64Image = canvas.toDataURL('image/jpeg', 0.95);
      const faceRes = await detectFaceAndExtract(canvas);

      if (faceRes && faceRes.descriptor && faceRes.descriptor.length === 128) {
        playShutterSound();
        setTimeout(() => playSuccessChime(), 100);

        const currentStep = ENROLL_STEPS[currentStepIndex];
        const newSample = {
          angleId: currentStep.id,
          label: currentStep.label,
          image: base64Image,
          descriptor: faceRes.descriptor
        };

        const updated = [...capturedSamples, newSample];
        setCapturedSamples(updated);

        if (currentStepIndex < ENROLL_STEPS.length - 1) {
          setCurrentStepIndex(currentStepIndex + 1);
          setStatusMessage(`✅ Đã lưu ${currentStep.label}! Chuyển góc tiếp theo.`);
        } else {
          setStatusMessage('🎉 Đã hoàn tất 4/4 góc mặt! Bạn có thể nhấn "Áp Dụng".');
        }
      } else {
        setStatusMessage('⚠️ Không nhận diện rõ khuôn mặt. Hãy nhìn vào camera và thử lại!');
      }
    } catch (err) {
      setStatusMessage('Lỗi nhận diện: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUploadFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setStatusMessage('⏳ Đang phân tích ảnh...');

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target.result;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = base64;
      img.onload = async () => {
        const faceRes = await detectFaceAndExtract(img);
        if (faceRes && faceRes.descriptor) {
          const newSample = {
            angleId: `upload_${Date.now()}`,
            label: `Mẫu #${capturedSamples.length + 1}`,
            image: base64,
            descriptor: faceRes.descriptor
          };
          setCapturedSamples(prev => [...prev, newSample]);
          setStatusMessage('✅ Đã nhận diện khuôn mặt từ ảnh!');
        } else {
          setStatusMessage('⚠️ Không tìm thấy khuôn mặt trong ảnh!');
        }
        setIsProcessing(false);
      };
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveSample = (index) => {
    const updated = capturedSamples.filter((_, i) => i !== index);
    setCapturedSamples(updated);
    if (index <= currentStepIndex && currentStepIndex > 0) {
      setCurrentStepIndex(updated.length);
    }
  };

  const handleFinish = () => {
    if (capturedSamples.length === 0) {
      alert('Vui lòng chụp ít nhất 1 góc khuôn mặt!');
      return;
    }

    const descriptors = capturedSamples.map(s => s.descriptor);
    const primaryAvatar = capturedSamples[0].image;

    onComplete({
      descriptors: descriptors,
      avatarImage: primaryAvatar,
      sampleCount: capturedSamples.length
    });
  };

  const currentStep = ENROLL_STEPS[currentStepIndex] || ENROLL_STEPS[0];

  return (
    <div className="wizard-container">
      {/* Wizard Header */}
      <div className="wizard-header">
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3 className="wizard-title">
            <Sparkles size={18} color="var(--brand-orange)" />
            <span>Huấn Luyện AI Đa Góc Mặt</span>
          </h3>
          <p className="wizard-subtitle">
            Chụp 1-4 góc giúp AI nhận diện cực nhạy &gt;99%
          </p>
        </div>
        <button type="button" className="btn-icon" onClick={onCancel} style={{ width: 32, height: 32, flexShrink: 0 }}>
          <X size={16} />
        </button>
      </div>

      {/* Steps Progress Tabs */}
      <div className="wizard-steps-bar">
        {ENROLL_STEPS.map((step, idx) => {
          const isDone = capturedSamples.length > idx;
          const isCurrent = currentStepIndex === idx && !isDone;
          return (
            <div 
              key={step.id}
              className={`wizard-step-chip ${isDone ? 'done' : ''} ${isCurrent ? 'active' : ''}`}
            >
              {isDone ? <CheckCircle2 size={13} /> : <span>{idx + 1}.</span>}
              <span className="step-label">{step.label}</span>
            </div>
          );
        })}
      </div>

      {/* Main Content Layout (Desktop 2-col, Mobile 1-col) */}
      <div className="wizard-grid">
        {/* Left: Camera Frame */}
        <div className="wizard-camera-pane">
          <div className="wizard-camera-frame">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="wizard-video"
            />
            {/* Guide Step Banner */}
            <div className="wizard-guide-pill">
              <span className="guide-text">👉 <strong>{currentStep.label}</strong>: {currentStep.tip}</span>
              <span className="guide-count">{capturedSamples.length}/4</span>
            </div>
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div className={`wizard-status ${statusMessage.includes('✅') || statusMessage.includes('🎉') ? 'success' : ''}`}>
              {statusMessage}
            </div>
          )}

          {/* Capture Actions */}
          <div className="wizard-actions">
            <button
              type="button"
              className="btn-primary wizard-capture-btn"
              onClick={captureCurrentAngle}
              disabled={isProcessing || !isCameraActive}
            >
              <Camera size={16} />
              <span>{isProcessing ? 'Đang xử lý...' : `Chụp Mẫu ${currentStepIndex + 1}/4`}</span>
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => fileInputRef.current?.click()}
              title="Tải ảnh từ máy"
            >
              <Upload size={15} />
              <span>Tải Ảnh</span>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              accept="image/*" 
              style={{ display: 'none' }} 
              onChange={handleUploadFile} 
            />
          </div>
        </div>

        {/* Right / Bottom: Captured Samples Pane */}
        <div className="wizard-samples-pane">
          <div className="samples-header">
            <span>Mẫu Đã Thu ({capturedSamples.length})</span>
            <span className="ai-badge">128D AI</span>
          </div>

          <div className="samples-list">
            {capturedSamples.length === 0 ? (
              <div className="samples-empty">
                Chưa có mẫu nào. Bấm "Chụp Mẫu" để bắt đầu!
              </div>
            ) : (
              capturedSamples.map((sample, idx) => (
                <div key={idx} className="sample-item">
                  <img src={sample.image} alt={`Mẫu ${idx + 1}`} className="sample-thumb" />
                  <div className="sample-info">
                    <div className="sample-name">{sample.label}</div>
                    <div className="sample-badge"><ShieldCheck size={12} /> 128D OK</div>
                  </div>
                  <button 
                    type="button" 
                    className="btn-del" 
                    onClick={() => handleRemoveSample(idx)}
                    title="Xóa mẫu này"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>

          <button
            type="button"
            className="btn-primary wizard-finish-btn"
            onClick={handleFinish}
            disabled={capturedSamples.length === 0}
          >
            <CheckCircle2 size={16} />
            <span>Áp Dụng ({capturedSamples.length} Mẫu)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
