// Optional QR decoding. jsQR is loaded lazily (dynamic import) so the first
// paint of the landing page never waits for it.

let jsqrLoader: Promise<typeof import("jsqr")> | null = null;

export function loadJsQR(): Promise<typeof import("jsqr")> {
  if (!jsqrLoader) jsqrLoader = import("jsqr");
  return jsqrLoader;
}

/**
 * Decode a QR code from the current video frame. Returns the raw payload or
 * null. The payload is treated as *information only* — never as proof of
 * authenticity or government verification.
 */
export async function decodeQRFromVideo(
  video: HTMLVideoElement,
): Promise<string | null> {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh || video.readyState < 2) return null;

  try {
    const [{ default: jsQR }] = await Promise.all([
      loadJsQR(),
      Promise.resolve(),
    ]);

    // Downscale for speed; QR codes survive the reduction easily.
    const w = Math.min(560, vw);
    const h = Math.max(1, Math.round((vh / vw) * w));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, w, h);
    const image = ctx.getImageData(0, 0, w, h);
    const code = jsQR(image.data, w, h, {
      inversionAttempts: "attemptBoth",
    });
    return code && code.data ? code.data : null;
  } catch {
    // Decoder chunk failed to load — QR stays optional, scanning continues.
    return null;
  }
}
