// Compresses an uploaded image client-side before it goes into the Realtime Database.
// Ported from the original single-file tool's setupDrop()/loadImage(), with a smaller
// target size (600px / ~80KB) since Realtime DB (unlike IndexedDB) has real quota limits.
const MAX_DIMENSION = 600;
const TARGET_BYTES = 80000;

function approxBytes(dataUrl) {
  return Math.max(0, Math.round((dataUrl.length * 3) / 4));
}

export function readImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Please choose an image file.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          resolve(compressImage(img));
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error('Could not decode image.'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.readAsDataURL(file);
  });
}

function compressImage(img) {
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  const scale = Math.min(1, MAX_DIMENSION / Math.max(srcW, srcH));
  const w = Math.max(1, Math.round(srcW * scale));
  const h = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);

  let quality = 0.82;
  let out = canvas.toDataURL('image/webp', quality);
  if (!out.startsWith('data:image/webp')) out = canvas.toDataURL('image/jpeg', quality);

  while (approxBytes(out) > TARGET_BYTES && quality > 0.35) {
    quality = Math.max(0.35, quality - 0.08);
    const webp = canvas.toDataURL('image/webp', quality);
    out = webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', quality);
  }
  return out;
}
