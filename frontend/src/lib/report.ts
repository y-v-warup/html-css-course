import type { AnalysisResult } from "../types";

export function formatScanDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function buildReportSummary(result: AnalysisResult): string {
  const detected = result.fields.filter((f) => f.state === "detected");
  const flagged = result.fields.filter(
    (f) => f.state === "missing" || f.state === "review",
  );

  const lines = [
    "LabelGuard AI — Compliance Analysis Report",
    `Scanned: ${formatScanDate(result.analyzed_at)}`,
    `Product: ${result.product_name}`,
    `Overall status: ${result.status}`,
    `Detected declaration coverage: ${result.coverage}%`,
    `Source: ${result.source}`,
    `QR: ${result.qr_detected ? "detected (payload used as information)" : "not detected"}`,
    "",
    "Detected declarations:",
    ...detected.map((f) => `  ✓ ${f.label}: ${f.value}`),
    "",
    "Missing / review items:",
    ...(flagged.length
      ? flagged.map((f) => `  ${f.state === "missing" ? "✕" : "⚠"} ${f.label}`)
      : ["  None detected"]),
    "",
    "Suggested corrections:",
    ...result.suggestions.map((s) => `  • ${s}`),
    "",
    "This report is an AI-assisted declaration check based on the supplied package images and/or QR data. It does not physically measure product quantity, establish legal authenticity, or constitute an official government certification.",
  ];
  return lines.join("\n");
}

export type ShareOutcome = "shared" | "copied" | "unsupported";

export async function shareReport(
  result: AnalysisResult,
): Promise<ShareOutcome> {
  const text = buildReportSummary(result);
  const nav = navigator as Navigator & {
    share?: (data: { title?: string; text?: string }) => Promise<void>;
  };
  if (typeof nav.share === "function") {
    try {
      await nav.share({ title: "LabelGuard AI report", text });
      return "shared";
    } catch (err) {
      // User dismissed the share sheet — fall through to clipboard.
      if (err instanceof DOMException && err.name === "AbortError") {
        return "unsupported";
      }
    }
  }
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return "copied";
    }
  } catch {
    // clipboard unavailable
  }
  return "unsupported";
}

export function printReport(): void {
  window.print();
}
