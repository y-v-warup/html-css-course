import type { CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { ArrowLeftIcon, DownloadIcon, ShareIcon } from "../components/Icons";
import { formatScanDate } from "../lib/report";
import { useAnalysis } from "../store";
import type { FieldResult, GroupKey, OverallStatus } from "../types";

const GROUP_META: Record<GroupKey, { title: string; mark: string }> = {
  product: { title: "Product Information", mark: "P" },
  manufacturer: { title: "Manufacturer Information", mark: "M" },
  traceability: { title: "Traceability", mark: "T" },
  food: { title: "Food Information", mark: "F" },
  identification: { title: "Identification", mark: "ID" },
};

const GROUP_ORDER: GroupKey[] = [
  "product",
  "manufacturer",
  "traceability",
  "food",
  "identification",
];

const STATUS_META: Record<
  OverallStatus,
  { cls: string; glyph: string; sub: string }
> = {
  "DECLARATIONS DETECTED": {
    cls: "detected",
    glyph: "✓",
    sub: "All applicable declarations were detected in the supplied images and/or QR payload.",
  },
  "REVIEW REQUIRED": {
    cls: "review",
    glyph: "⚠",
    sub: "Some applicable declarations were not detected — verify them on the package.",
  },
  "MISSING DECLARATIONS": {
    cls: "missing",
    glyph: "✕",
    sub: "Core applicable declarations were not detected in the supplied information.",
  },
};

const STATE_GLYPH: Record<FieldResult["state"], string> = {
  detected: "✓",
  review: "⚠",
  missing: "✕",
  not_applicable: "—",
};

const STATE_TEXT: Record<FieldResult["state"], string> = {
  detected: "Detected",
  review: "Review",
  missing: "Missing",
  not_applicable: "Not applicable / not assessed",
};

function FieldRow({ field }: { field: FieldResult }) {
  const absent =
    field.state === "missing" ||
    field.state === "not_applicable" ||
    field.state === "review";
  return (
    <div className="field-row">
      <span
        className={`field-state ${field.state}`}
        aria-label={STATE_TEXT[field.state]}
        title={STATE_TEXT[field.state]}
      >
        {STATE_GLYPH[field.state]}
      </span>
      <div className="field-body">
        <div className="f-label">{field.label}</div>
        <div className={`f-value${absent ? " absent" : ""}`}>{field.value}</div>
        <div className="f-note">
          {field.note ?? STATE_TEXT[field.state]}
        </div>
      </div>
    </div>
  );
}

export default function Result() {
  const navigate = useNavigate();
  const { result, clearResult } = useAnalysis();

  if (!result) return null; // guarded route

  const meta = STATUS_META[result.status];
  const byGroup = GROUP_ORDER.map((key) => ({
    key,
    fields: result.fields.filter((f) => f.group === key),
  })).filter((g) => g.fields.length > 0);

  const triad: { label: string; status: OverallStatus; pill: string }[] = [
    { label: "✓ DECLARATIONS DETECTED", status: "DECLARATIONS DETECTED", pill: "pill-ok" },
    { label: "⚠ REVIEW REQUIRED", status: "REVIEW REQUIRED", pill: "pill-warn" },
    { label: "✕ MISSING DECLARATIONS", status: "MISSING DECLARATIONS", pill: "pill-bad" },
  ];

  return (
    <>
      <Header />
      <main className="result-page">
        <div className="container">
          <div className="result-topline">
            <Link to="/scanner" className="btn btn-ghost" style={{ paddingLeft: 12 }}>
              <ArrowLeftIcon /> Scanner
            </Link>
            <h1>Compliance Analysis</h1>
            <span className={`pill ${result.mode === "demo" ? "pill-warn" : "pill-brand"}`}>
              {result.mode === "demo" ? "Demo data" : "Live analysis"}
            </span>
          </div>

          <section className="result-hero reveal" aria-label="Analysis summary">
            <div>
              <div
                className={`status-banner ${meta.cls}`}
                role="status"
                aria-label={`Overall status: ${result.status}`}
              >
                <span className="status-glyph" aria-hidden="true">
                  {meta.glyph}
                </span>
                <div>
                  <b>{result.status}</b>
                  <span>{meta.sub}</span>
                </div>
              </div>

              <div className="hero-meta" style={{ marginTop: 16 }}>
                <span className="pill pill-neutral">
                  <b>Product:</b>&nbsp;{result.product_name}
                </span>
                <span className="pill pill-neutral">{result.category_label}</span>
                <span className="pill pill-neutral">{result.source}</span>
                <span className={`pill ${result.qr_detected ? "pill-ok" : "pill-neutral"}`}>
                  {result.qr_detected ? "✓ QR detected" : "— No QR detected"}
                </span>
              </div>

              <div className="hero-meta" style={{ marginTop: 10 }}>
                {triad.map((t) => (
                  <span
                    key={t.status}
                    className={`pill ${t.status === result.status ? t.pill : "pill-neutral"}`}
                    style={{ opacity: t.status === result.status ? 1 : 0.55 }}
                    aria-current={t.status === result.status ? "true" : undefined}
                  >
                    {t.label}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <div className="coverage-block">
                <div
                  className="coverage-ring"
                  style={{ "--pct": result.coverage } as CSSProperties}
                  role="img"
                  aria-label={`Detected declaration coverage ${result.coverage} percent`}
                >
                  <b>{result.coverage}%</b>
                </div>
                <div>
                  <h3>Detected declaration coverage</h3>
                  <p>
                    Share of applicable declarations found in the supplied
                    images/QR. This is not an official legal compliance score.
                  </p>
                </div>
              </div>
              <p className="product-line" style={{ marginTop: 16 }}>
                Scanned <b>{formatScanDate(result.analyzed_at)}</b>
                {result.mode === "demo" ? " · demo dataset" : ""}
              </p>
            </div>
          </section>

          <div className="result-grid">
            {byGroup.map((group, gi) => (
              <section
                className="group-card reveal"
                key={group.key}
                style={{ animationDelay: `${gi * 90}ms` }}
              >
                <h2>
                  <span className="g-icon" aria-hidden="true">
                    {GROUP_META[group.key].mark}
                  </span>
                  {GROUP_META[group.key].title}
                </h2>
                {group.fields.map((field) => (
                  <FieldRow key={field.key} field={field} />
                ))}
              </section>
            ))}
          </div>

          <section className="panel-card reveal" style={{ animationDelay: "120ms" }}>
            <h2>
              <span aria-hidden="true">⚠</span> Issues Requiring Review
            </h2>
            <p className="panel-sub">
              Applicable declarations that were not detected in the supplied
              information. Verify them directly on the package.
            </p>
            {result.issues.length === 0 ? (
              <div className="all-clear">
                ✓ No missing applicable declarations detected in this scan.
              </div>
            ) : (
              <ol className="issue-list">
                {result.issues.map((issue, i) => (
                  <li
                    className={`issue-item sev-${issue.severity}`}
                    key={`${issue.field}-${i}`}
                  >
                    <span className="issue-no" aria-hidden="true">
                      {i + 1}
                    </span>
                    <div>
                      <b>
                        {issue.severity === "missing" ? "✕" : "⚠"}{" "}
                        {issue.message}
                      </b>
                      <div className="issue-action">{issue.action}</div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="panel-card reveal" style={{ animationDelay: "180ms" }}>
            <h2>
              <span aria-hidden="true">→</span> Suggested Corrections
            </h2>
            <p className="panel-sub">
              Practical checks to run on the packaging artwork and print.
            </p>
            <ul className="suggestion-list">
              {result.suggestions.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </section>

          {result.notes.length > 0 && (
            <div className="notice notice-info" style={{ marginTop: 16 }}>
              <span aria-hidden="true">ℹ</span>
              <div>
                <strong>Engine notes</strong>
                {result.notes.map((n) => (
                  <div key={n}>{n}</div>
                ))}
              </div>
            </div>
          )}

          <div className="notice notice-warn" style={{ marginTop: 16 }}>
            <span aria-hidden="true">⚖</span>
            <div className="disclaimer-text" style={{ color: "inherit" }}>
              LabelGuard AI provides AI-assisted label information extraction
              and rule-based declaration checks. Results depend on image quality
              and the applicable product requirements. The system does not
              physically measure quantity, verify legal authenticity, or provide
              official government certification.
            </div>
          </div>

          <div className="result-actions">
            <button
              className="btn btn-gradient btn-lg"
              onClick={() => navigate("/report")}
            >
              <DownloadIcon /> Generate Report
            </button>
            <button
              className="btn btn-dark btn-lg"
              onClick={() => navigate("/report")}
            >
              <ShareIcon /> Share / Download
            </button>
            <button
              className="btn btn-outline btn-lg"
              onClick={() => {
                clearResult();
                navigate("/scanner");
              }}
            >
              Scan Another Label
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
