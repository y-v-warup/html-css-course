import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeftIcon,
  DownloadIcon,
  ShareIcon,
  ShieldLogo,
} from "../components/Icons";
import { formatScanDate, printReport, shareReport } from "../lib/report";
import { useAnalysis } from "../store";
import type { FieldResult } from "../types";

const STATE_GLYPH: Record<FieldResult["state"], string> = {
  detected: "✓",
  review: "⚠",
  missing: "✕",
  not_applicable: "—",
};

const STATE_LABEL: Record<FieldResult["state"], string> = {
  detected: "Detected",
  review: "Review",
  missing: "Missing",
  not_applicable: "Not applicable",
};

export default function ReportPage() {
  const { result } = useAnalysis();
  const [toast, setToast] = useState<string | null>(null);

  if (!result) return null; // guarded route

  const detected = result.fields.filter((f) => f.state === "detected");
  const flagged = result.fields.filter(
    (f) => f.state === "missing" || f.state === "review",
  );

  async function onShare() {
    const outcome = await shareReport(result!);
    if (outcome === "copied") setToast("Report summary copied to clipboard");
    else if (outcome === "unsupported")
      setToast("Sharing is not supported here — use Download PDF");
    if (outcome !== "unsupported") {
      setTimeout(() => setToast(null), 2600);
    }
  }

  return (
    <main className="report-page">
      <div className="container">
        <div className="report-toolbar no-print">
          <Link to="/result" className="btn btn-outline">
            <ArrowLeftIcon /> Back to result
          </Link>
          <button className="btn btn-primary" onClick={printReport}>
            <DownloadIcon /> Download PDF
          </button>
          <button className="btn btn-dark" onClick={() => void onShare()}>
            <ShareIcon /> Share Report
          </button>
        </div>

        <article className="report-sheet">
          <header className="report-head">
            <span className="brand">
              <span className="brand-mark">
                <ShieldLogo size={19} />
              </span>
              <span>
                LabelGuard AI
                <small style={{ color: "rgba(255,255,255,.75)" }}>
                  Scan. Verify. Understand.
                </small>
              </span>
            </span>
            <span className="report-tag">
              {result.mode === "demo" ? "Demo · Declaration Check" : "Declaration Check Report"}
            </span>
          </header>

          <div className="report-body">
            <div className="report-meta-grid">
              <div>
                <small>Scan date & time</small>
                <b>{formatScanDate(result.analyzed_at)}</b>
              </div>
              <div>
                <small>Product</small>
                <b>{result.product_name}</b>
              </div>
              <div>
                <small>Overall status</small>
                <b>{result.status}</b>
              </div>
              <div>
                <small>Detected declaration coverage</small>
                <b>{result.coverage}%</b>
              </div>
              <div>
                <small>Source</small>
                <b>{result.source}</b>
              </div>
              <div>
                <small>QR code</small>
                <b>{result.qr_detected ? "Detected (payload used)" : "Not detected"}</b>
              </div>
            </div>

            <section className="report-section">
              <h3>Detected declarations</h3>
              {detected.length ? (
                <table className="report-table">
                  <tbody>
                    {detected.map((f) => (
                      <tr key={f.key}>
                        <td>{f.label}</td>
                        <td>
                          <span className="st detected">✓</span>
                          {f.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="muted small">No declarations detected in this scan.</p>
              )}
            </section>

            <section className="report-section">
              <h3>Missing / review items</h3>
              {flagged.length ? (
                <table className="report-table">
                  <tbody>
                    {flagged.map((f) => (
                      <tr key={f.key}>
                        <td>{f.label}</td>
                        <td>
                          <span className={`st ${f.state}`}>
                            {STATE_GLYPH[f.state]}
                          </span>
                          {STATE_LABEL[f.state]}
                          {f.note ? ` — ${f.note}` : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="muted small">
                  No missing applicable declarations detected in this scan.
                </p>
              )}
            </section>

            {result.issues.length > 0 && (
              <section className="report-section">
                <h3>Issues requiring review</h3>
                <ol className="issue-list">
                  {result.issues.map((issue, i) => (
                    <li className={`issue-item sev-${issue.severity}`} key={`${issue.field}-${i}`}>
                      <span className="issue-no" aria-hidden="true">
                        {i + 1}
                      </span>
                      <div>
                        <b>{issue.message}</b>
                        <div className="issue-action">{issue.action}</div>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            <section className="report-section">
              <h3>Suggested corrections</h3>
              <ul className="suggestion-list">
                {result.suggestions.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </section>

            <section className="report-section">
              <h3>QR information</h3>
              <p className="small">
                {result.qr_detected
                  ? "A QR code was detected during scanning. Its payload was decoded locally and used as an information source. It has NOT been verified against any government database."
                  : "No QR code was detected. The analysis continued using the captured label image(s)."}
              </p>
              {result.qr_detected && result.qr_details && (
                <p className="small muted" style={{ marginTop: 8, wordBreak: "break-all" }}>
                  Payload: {result.qr_details}
                </p>
              )}
            </section>

            <div className="report-disclaimer">
              <b>Disclaimer</b>
              This report is an AI-assisted declaration check based on the
              supplied package images and/or QR data. It does not physically
              measure product quantity, establish legal authenticity, or
              constitute an official government certification. LabelGuard AI
              provides AI-assisted label information extraction and rule-based
              declaration checks. Results depend on image quality and the
              applicable product requirements.
            </div>

            <div className="report-foot">
              <span>Generated by LabelGuard AI · Scan. Verify. Understand.</span>
              <span>
                {result.mode === "demo"
                  ? "Sample/demo dataset — not a real package scan"
                  : `Source: ${result.source}`}
              </span>
            </div>
          </div>
        </article>
      </div>

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </main>
  );
}
