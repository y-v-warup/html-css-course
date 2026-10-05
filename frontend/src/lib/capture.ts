// Label capture: crop the scan-frame region out of the live video, then
// resize / enhance / compress before upload (mobile performance requirement).

export interface FrameRect {
  /** Fractions (0..1) of the rendered video element. */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ProcessedCapture {
  dataUrl: string;
  width: number;
  height: number;
  bytes: number;
  luminance: number;
  sharpness: number;
}

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

/**
 * Crop the region inside the scan frame from the live video.
 * The video element uses object-fit: cover, so we map container pixels back
 * to video pixels through the cover scale/offset.
 */
export function captureRegion(
  video: HTMLVideoElement,
  rect: FrameRect,
): HTMLCanvasElement | null {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const cw = video.clientWidth;
  const ch = video.clientHeight;
  if (!vw || !vh || !cw || !ch) return null;

  const scale = Math.max(cw / vw, ch / vh); // object-fit: cover
  const offX = (cw - vw * scale) / 2;
  const offY = (ch - vh * scale) / 2;

  const rx = rect.x * cw;
  const ry = rect.y * ch;
  const rw = rect.w * cw;
  const rh = rect.h * ch;

  const sx = clamp(Math.round((rx - offX) / scale), 0, vw - 1);
  const sy = clamp(Math.round((ry - offY) / scale), 0, vh - 1);
  const sw = clamp(Math.round(rw / scale), 1, vw - sx);
  const sh = clamp(Math.round(rh / scale), 1, vh - sy);

  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);
  return canvas;
}

function applyContrast(data: ImageData, factor: number) {
  const d = data.data;
  const intercept = 128 * (1 - factor);
  for (let i = 0; i < d.length; i += 4) {
    d[i] = clamp(d[i] * factor + intercept, 0, 255);
    d[i + 1] = clamp(d[i + 1] * factor + intercept, 0, 255);
    d[i + 2] = clamp(d[i + 2] * factor + intercept, 0, 255);
  }
}

/** Light 3x3 unsharp mask — makes small print on labels easier for OCR. */
function applySharpen(data: ImageData) {
  const { width, height, data: src } = data;
  const copy = new Uint8ClampedArray(src);
  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        let k = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const p = ((y + ky) * width + (x + kx)) * 4 + c;
            sum += copy[p] * kernel[k++];
          }
        }
        src[idx + c] = clamp(sum, 0, 255);
      }
    }
  }
}

function measure(canvas: HTMLCanvasElement): {
  luminance: number;
  sharpness: number;
} {
  // Metrics on a small grayscale copy — cheap even on mid-range phones.
  const w = Math.min(canvas.width, 480);
  const h = Math.max(1, Math.round((canvas.height / canvas.width) * w));
  const small = document.createElement("canvas");
  small.width = w;
  small.height = h;
  const sctx = small.getContext("2d");
  if (!sctx) return { luminance: 128, sharpness: 100 };
  sctx.drawImage(canvas, 0, 0, w, h);
  const { data } = sctx.getImageData(0, 0, w, h);

  const gray = new Float32Array(w * h);
  let sum = 0;
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    gray[p] = g;
    sum += g;
  }
  const luminance = sum / gray.length;

  // Variance of a simple Laplacian — low values mean a blurry frame.
  let lapSum = 0;
  let lapSq = 0;
  let count = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap =
        gray[i - 1] + gray[i + 1] + gray[i - w] + gray[i + w] - 4 * gray[i];
      lapSum += lap;
      lapSq += lap * lap;
      count++;
    }
  }
  const mean = lapSum / Math.max(1, count);
  const sharpness = lapSq / Math.max(1, count) - mean * mean;
  return { luminance, sharpness };
}

/**
 * Resize (max 1600px), optionally enhance (contrast + sharpen), measure image
 * quality and compress to JPEG for upload.
 */
export function preprocess(
  source: HTMLCanvasElement,
  options: { enhance?: boolean; maxDim?: number; quality?: number } = {},
): ProcessedCapture | null {
  const { enhance = true, maxDim = 1600, quality = 0.82 } = options;
  const sw = source.width;
  const sh = source.height;
  if (!sw || !sh) return null;

  const factor = Math.min(1, maxDim / Math.max(sw, sh));
  const w = Math.max(1, Math.round(sw * factor));
  const h = Math.max(1, Math.round(sh * factor));

  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0, w, h);

  if (enhance) {
    try {
      const img = ctx.getImageData(0, 0, w, h);
      applyContrast(img, 1.14);
      if (w * h <= 2_400_000) applySharpen(img);
      ctx.putImageData(img, 0, 0);
    } catch {
      // Canvas tainted or unsupported — continue with the plain image.
    }
  }

  const { luminance, sharpness } = measure(out);
  const dataUrl = out.toDataURL("image/jpeg", quality);
  return {
    dataUrl,
    width: w,
    height: h,
    bytes: Math.round((dataUrl.length - dataUrl.indexOf(",") - 1) * 0.75),
    luminance,
    sharpness,
  };
}
