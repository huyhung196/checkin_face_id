// Script download model weights cho face-api vào frontend/public/models/
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const targetDir = path.join(__dirname, 'public', 'models');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const BASE_URL = 'https://raw.githubusercontent.com/vladmandic/face-api/master/model';

const files = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model.bin',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model.bin',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model.bin',
  'face_expression_model-weights_manifest.json',
  'face_expression_model.bin'
];

async function downloadModels() {
  console.log('Downloading face-api models to:', targetDir);
  for (const file of files) {
    const dest = path.join(targetDir, file);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
      console.log(`[EXISTS] ${file}`);
      continue;
    }
    const url = `${BASE_URL}/${file}`;
    console.log(`[DOWNLOADING] ${file} from ${url}...`);
    try {
      const res = await fetch(url);
      if (!res.ok) {
        // Try fallback to justadudewhohacks face-api weights
        const fallbackUrl = `https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/${file.replace('.bin', '-shard1')}`;
        console.log(`Retrying fallback: ${fallbackUrl}`);
        const fbRes = await fetch(fallbackUrl);
        if (fbRes.ok) {
          const buffer = await fbRes.arrayBuffer();
          fs.writeFileSync(dest, Buffer.from(buffer));
          console.log(`[SUCCESS] ${file}`);
          continue;
        }
        console.warn(`Failed ${file}: ${res.status}`);
        continue;
      }
      const buffer = await res.arrayBuffer();
      fs.writeFileSync(dest, Buffer.from(buffer));
      console.log(`[SUCCESS] ${file} (${buffer.byteLength} bytes)`);
    } catch (e) {
      console.error(`[ERROR] ${file}:`, e.message);
    }
  }
  console.log('All models downloaded successfully!');
}

downloadModels();
