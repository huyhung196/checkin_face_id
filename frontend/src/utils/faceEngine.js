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
export function matchLiveFace(liveDescriptor, employees = [], threshold = 0.52) {
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
    return {
      matched: true,
      employee: bestMatch,
      confidence: confidence,
      distance: Math.round(minDistance * 1000) / 1000
    };
  }

  return {
    matched: false,
    employee: null,
    confidence: 0,
    distance: minDistance === Infinity ? 1.0 : Math.round(minDistance * 1000) / 1000
  };
}
