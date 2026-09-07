// AI Face Recognition Engine using @vladmandic/face-api
import * as faceapi from '@vladmandic/face-api';

let modelsLoaded = false;
let isModelLoading = false;

/**
 * Tải toàn bộ AI weights từ thư mục /models/ hoặc CDN fallback
 */
export async function loadFaceModels() {
  if (modelsLoaded) return true;
  if (isModelLoading) {
    while (isModelLoading) {
      await new Promise(resolve => setTimeout(resolve, 80));
    }
    return modelsLoaded;
  }

  isModelLoading = true;
  const localUrl = '/models';
  const cdnUrl = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';

  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(localUrl),
      faceapi.nets.faceLandmark68Net.loadFromUri(localUrl),
      faceapi.nets.faceRecognitionNet.loadFromUri(localUrl)
    ]);
    modelsLoaded = true;
    return true;
  } catch (localErr) {
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(cdnUrl),
        faceapi.nets.faceLandmark68Net.loadFromUri(cdnUrl),
        faceapi.nets.faceRecognitionNet.loadFromUri(cdnUrl)
      ]);
      modelsLoaded = true;
      return true;
    } catch (cdnErr) {
      console.error("❌ Lỗi tải AI Models:", cdnErr);
      modelsLoaded = false;
      return false;
    }
  } finally {
    isModelLoading = false;
  }
}

/**
 * Thuật toán nhận diện siêu nhẹ (Ultra-Fast) cho vòng lặp realtime trên Điện thoại & Web (Không lag)
 */
export async function detectFaceFast(inputElement) {
  if (!modelsLoaded) {
    const ok = await loadFaceModels();
    if (!ok) return null;
  }

  if (!inputElement) return null;

  try {
    // Kích thước 224 tối ưu cao cho GPU điện thoại, chạy cực mượt 60fps
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.22 });
    const detection = await faceapi
      .detectSingleFace(inputElement, options)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (detection && detection.descriptor && detection.descriptor.length === 128) {
      return {
        box: detection.detection.box,
        score: detection.detection.score,
        descriptor: Array.from(detection.descriptor),
        landmarks: detection.landmarks
      };
    }
  } catch (err) {
    // Bỏ qua nếu khung hình chưa sẵn sàng
  }

  return null;
}

/**
 * Phát hiện khuôn mặt độ chính xác cao đa tầng (Dành cho chụp ảnh điểm danh & nạp mẫu nhân viên)
 */
export async function detectFaceAndExtract(inputElement) {
  if (!modelsLoaded) {
    const ok = await loadFaceModels();
    if (!ok) return null;
  }

  if (!inputElement) return null;

  const detectorConfigs = [
    { inputSize: 320, scoreThreshold: 0.20 },
    { inputSize: 224, scoreThreshold: 0.15 },
    { inputSize: 416, scoreThreshold: 0.25 }
  ];

  for (const cfg of detectorConfigs) {
    try {
      const options = new faceapi.TinyFaceDetectorOptions(cfg);
      const detection = await faceapi
        .detectSingleFace(inputElement, options)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection && detection.descriptor && detection.descriptor.length === 128) {
        return {
          box: detection.detection.box,
          score: detection.detection.score,
          descriptor: Array.from(detection.descriptor),
          landmarks: detection.landmarks
        };
      }
    } catch (err) {
      // Thử config tiếp theo
    }
  }

  return null;
}

/**
 * Tính khoảng cách Euclidean giữa 2 vector 128D
 */
export function calculateEuclideanDistance(desc1, desc2) {
  if (!desc1 || !desc2 || desc1.length !== desc2.length) return 1.0;
  let sum = 0;
  for (let i = 0; i < desc1.length; i++) {
    const diff = desc1[i] - desc2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * So khớp khuôn mặt thời gian thực với danh sách nhân viên đã đăng ký (Hỗ trợ đa vector góc mặt)
 */
export function matchLiveFace(liveDescriptor, employees = [], threshold = 0.40) {
  if (!liveDescriptor || !employees || employees.length === 0) {
    return { matched: false, employee: null, confidence: 0, distance: 1.0 };
  }

  let bestMatch = null;
  let minDistance = Infinity;

  for (const emp of employees) {
    const descriptorsList = [];
    if (Array.isArray(emp.face_descriptors) && emp.face_descriptors.length > 0) {
      for (const d of emp.face_descriptors) {
        if (Array.isArray(d) && d.length === 128) descriptorsList.push(d);
      }
    } else if (Array.isArray(emp.face_descriptor) && emp.face_descriptor.length === 128) {
      descriptorsList.push(emp.face_descriptor);
    }

    if (descriptorsList.length === 0) continue;

    for (const enrolledDesc of descriptorsList) {
      const dist = calculateEuclideanDistance(liveDescriptor, enrolledDesc);
      if (dist < minDistance) {
        minDistance = dist;
        bestMatch = emp;
      }
    }
  }

  if (bestMatch && minDistance < threshold) {
    const confidence = Math.max(0, Math.min(100, Math.round((1 - minDistance / 0.6) * 1000) / 10));
    if (confidence >= 50.0) {
      return {
        matched: true,
        employee: bestMatch,
        confidence: confidence,
        distance: Math.round(minDistance * 1000) / 1000
      };
    }
  }

  return {
    matched: false,
    employee: null,
    confidence: 0,
    distance: minDistance === Infinity ? 1.0 : Math.round(minDistance * 1000) / 1000
  };
}

/**
 * Ước lượng Yaw (quay trái/phải) và Pitch (ngẩng/cúi) từ 68 landmarks.
 * face-api.js trả về landmarks 68 điểm, không có rotation angle trực tiếp.
 * Ta tính toán dựa trên tỷ lệ khoảng cách giữa các điểm mốc trên khuôn mặt.
 */
export function estimatePoseAngles(landmarks) {
  if (!landmarks) return { yaw: 0, pitch: 0, roll: 0 };

  const positions = landmarks.positions || landmarks._positions || [];
  if (positions.length < 68) return { yaw: 0, pitch: 0, roll: 0 };

  const noseTip = positions[30];
  const leftEyeOuter = positions[36];
  const rightEyeOuter = positions[45];
  const noseBridgeTop = positions[27];
  const chin = positions[8];

  // --- YAW estimation ---
  const noseToLeft = Math.abs(noseTip.x - leftEyeOuter.x);
  const noseToRight = Math.abs(noseTip.x - rightEyeOuter.x);
  const eyeSpan = Math.abs(leftEyeOuter.x - rightEyeOuter.x) || 1;

  const yawRatio = (noseToRight - noseToLeft) / eyeSpan;
  const yaw = yawRatio * 48; // Calibrated scale

  // --- PITCH estimation ---
  const eyeCenterY = (leftEyeOuter.y + rightEyeOuter.y) / 2;
  const faceHeight = Math.abs(chin.y - noseBridgeTop.y) || 1;
  const noseRelative = (noseTip.y - eyeCenterY) / faceHeight;

  // Baseline: noseRelative ~ 0.43 when looking straight at camera -> pitch ~ 0°
  const pitchRatio = noseRelative - 0.43;
  const pitch = pitchRatio * 65;

  // --- ROLL estimation ---
  const eyeDeltaY = rightEyeOuter.y - leftEyeOuter.y;
  const eyeDeltaX = rightEyeOuter.x - leftEyeOuter.x || 1;
  const roll = Math.atan2(eyeDeltaY, eyeDeltaX) * (180 / Math.PI);

  return {
    yaw: Math.round(yaw * 10) / 10,
    pitch: Math.round(pitch * 10) / 10,
    roll: Math.round(roll * 10) / 10
  };
}

/**
 * Đánh giá chất lượng khuôn mặt trong khung hình video.
 * Trả về giá trị 0-1.
 */
export function assessFaceQuality(video, box, detectionScore = 0.5) {
  if (!video || !box) return 0;

  const vw = video.videoWidth || 640;
  const vh = video.videoHeight || 480;
  const { x, y, width: w, height: h } = box;

  const faceRatio = Math.min(w / vw, h / vh);
  const sizeScore = clamp((faceRatio - 0.12) / 0.28);

  const centerX = (x + w / 2) / vw;
  const centerY = (y + h / 2) / vh;
  const centerDist = Math.hypot(centerX - 0.50, centerY - 0.46);
  const centerScore = clamp(1 - centerDist / 0.22);

  const modelScore = clamp(detectionScore);

  return clamp(modelScore * 0.35 + sizeScore * 0.30 + centerScore * 0.35);
}

/**
 * Kiểm tra khuôn mặt có nằm chính xác trong vùng khung bầu dục (Oval Guide) ở tâm video hay không.
 */
export function checkFaceCentering(video, box) {
  if (!video || !box) return { isCentered: false, isSizeOk: false, reason: 'Chưa thấy khuôn mặt' };
  
  const vw = video.videoWidth || 640;
  const vh = video.videoHeight || 480;
  const cx = (box.x + box.width / 2) / vw;
  const cy = (box.y + box.height / 2) / vh;
  const faceWidthRatio = box.width / vw;

  // Giới hạn nghiêm ngặt vùng Oval chính giữa
  const isCentered = cx >= 0.36 && cx <= 0.64 && cy >= 0.25 && cy <= 0.65;
  const isSizeOk = faceWidthRatio >= 0.18 && faceWidthRatio <= 0.65;

  let reason = '';
  if (!isCentered) {
    if (cy > 0.65) reason = 'Đưa khuôn mặt lên cao hơn vào hình bầu dục';
    else if (cy < 0.25) reason = 'Hạ khuôn mặt xuống một chút vào hình bầu dục';
    else if (cx < 0.36) reason = 'Di chuyển sang phải vào hình bầu dục';
    else if (cx > 0.64) reason = 'Di chuyển sang trái vào hình bầu dục';
    else reason = 'Đưa khuôn mặt vào ô bầu dục chính giữa';
  } else if (!isSizeOk) {
    if (faceWidthRatio < 0.18) reason = 'Tiến lại gần camera hơn';
    else reason = 'Lùi ra xa camera một chút';
  }

  return { isCentered, isSizeOk, reason };
}

/**
 * Cắt thumbnail khuôn mặt từ video frame (có padding).
 */
export function snapshotFace(video, box) {
  if (!video || !box) return '';
  const { x, y, width: w, height: h } = box;
  const padX = w * 0.18;
  const padY = h * 0.16;
  const sx = Math.max(0, x - padX);
  const sy = Math.max(0, y - padY);
  const sw = Math.min(video.videoWidth - sx, w + padX * 2);
  const sh = Math.min(video.videoHeight - sy, h + padY * 2);
  const canvas = document.createElement('canvas');
  canvas.width = 180;
  canvas.height = 210;
  const ctx = canvas.getContext('2d');
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.70);
}

/**
 * Kiểm tra góc mặt hiện tại có khớp với pose yêu cầu hay không.
 */
export function checkPoseMatch(poseKey, yaw, pitch, roll, sideSign = null, pitchSign = null) {
  const ay = Math.abs(yaw);
  const ap = Math.abs(pitch);
  const ar = Math.abs(roll);

  if (ar > 22) return false;

  const signOf = (v) => (v >= 0 ? 1 : -1);

  if (poseKey === 'front') return ay < 15 && ap < 12;
  if (poseKey === 'left') return ay >= 7 && ay <= 42 && ap < 24 && yaw <= -4;
  if (poseKey === 'right') return ay >= 7 && ay <= 42 && ap < 24 && yaw >= 4 && (sideSign === null || signOf(yaw) !== sideSign);
  if (poseKey === 'up') return ap >= 13 && ap <= 42 && ay < 24 && pitch <= -13;
  if (poseKey === 'down') return ap >= 8 && ap <= 38 && ay < 24 && pitch >= 7 && (pitchSign === null || signOf(pitch) !== pitchSign);
  return false;
}

/**
 * Vẽ khung căn chỉnh góc mặt (Corner Brackets ┌ ┐ └ ┘) và Tag nhãn (ĐANG CĂN CHỈNH / ĐANG THU MẪU).
 * Tham khảo 100% từ drawFace() trong Face-Enrollment/app.js.
 */
export function drawFaceCanvas(canvas, video, box, label, color = '#73f1cf') {
  if (!canvas || !video) return;
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!box) return;

  const x = box.x ?? box._x ?? box[0] ?? 0;
  const y = box.y ?? box._y ?? box[1] ?? 0;
  const w = box.width ?? box._width ?? box[2] ?? 100;
  const h = box.height ?? box._height ?? box[3] ?? 100;

  const mirrorX = canvas.width - x - w;
  const corner = Math.max(15, Math.min(w, h) * 0.15);

  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, canvas.width / 360);
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;

  ctx.beginPath();
  // Top-left corner
  ctx.moveTo(mirrorX, y + corner); ctx.lineTo(mirrorX, y); ctx.lineTo(mirrorX + corner, y);
  // Top-right corner
  ctx.moveTo(mirrorX + w - corner, y); ctx.lineTo(mirrorX + w, y); ctx.lineTo(mirrorX + w, y + corner);
  // Bottom-left corner
  ctx.moveTo(mirrorX, y + h - corner); ctx.lineTo(mirrorX, y + h); ctx.lineTo(mirrorX + corner, y + h);
  // Bottom-right corner
  ctx.moveTo(mirrorX + w - corner, y + h); ctx.lineTo(mirrorX + w, y + h); ctx.lineTo(mirrorX + w, y + h - corner);
  ctx.stroke();
  ctx.shadowBlur = 0;

  if (label) {
    ctx.font = `700 ${Math.max(13, Math.round(canvas.width / 44))}px "IBM Plex Mono", monospace, sans-serif`;
    const textWidth = ctx.measureText(label).width;
    const ty = Math.max(26, y - 10);
    ctx.fillStyle = 'rgba(2, 15, 16, .85)';
    ctx.fillRect(mirrorX, ty - 22, textWidth + 20, 28);
    ctx.fillStyle = color;
    ctx.fillText(label, mirrorX + 10, ty - 3);
  }
}

/** Helper: clamp value between min and max */
function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

