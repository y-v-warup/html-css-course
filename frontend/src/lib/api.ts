import type {
  AnalyzePayload,
  AnalysisResult,
  HealthResponse,
} from "../types";

export const FRIENDLY_ANALYZE_ERROR =
  "Analysis could not be completed. Please try again.";

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch("/health", { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("health check failed");
  return (await res.json()) as HealthResponse;
}

/**
 * POST /analyze with real upload progress (XHR, because fetch has no upload
 * progress events). Server errors are mapped to friendly copy — internal
 * details are never surfaced to the user.
 */
export function analyze(
  payload: AnalyzePayload,
  onProgress?: (percent: number, phase: "upload" | "analyze") => void,
): Promise<AnalysisResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/analyze");
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.timeout = 180_000;

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100), "upload");
      }
    };
    xhr.upload.onload = () => onProgress?.(100, "analyze");

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as AnalysisResult);
        } catch {
          reject(new Error(FRIENDLY_ANALYZE_ERROR));
        }
        return;
      }
      let message = FRIENDLY_ANALYZE_ERROR;
      try {
        const detail = JSON.parse(xhr.responseText)?.detail;
        if (typeof detail === "string" && detail.trim()) message = detail;
      } catch {
        // keep friendly default
      }
      reject(new Error(message));
    };

    xhr.onerror = () => reject(new Error(FRIENDLY_ANALYZE_ERROR));
    xhr.ontimeout = () => reject(new Error(FRIENDLY_ANALYZE_ERROR));
    xhr.onabort = () => reject(new Error(FRIENDLY_ANALYZE_ERROR));

    xhr.send(JSON.stringify(payload));
  });
}
