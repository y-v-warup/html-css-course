const FLOW = [
  "Camera",
  "QR (if available)",
  "Label image",
  "AI / OCR",
  "Structured information",
  "Compliance rules",
  "Issues",
  "Suggestions",
  "Report",
];

export default function About() {
  return (
    <section className="section about" id="about">
      <div className="container">
        <div className="section-head left">
          <span className="eyebrow" style={{ background: "rgba(22,104,227,.28)", color: "#bcd5ff" }}>
            About
          </span>
          <h2 className="section-title">Built for smarter label compliance.</h2>
          <p className="section-sub">
            LabelGuard AI combines AI-based image understanding, OCR, optional
            QR decoding and deterministic compliance rules into one
            camera-first workflow.
          </p>
        </div>

        <div className="about-grid">
          <div>
            <div className="flow" aria-label="Core architecture flow">
              {FLOW.map((step, i) => (
                <span key={step} style={{ display: "contents" }}>
                  <span
                    className={`flow-chip${step === "Compliance rules" ? " accent" : ""}`}
                  >
                    {step}
                  </span>
                  {i < FLOW.length - 1 && (
                    <span className="flow-arrow" aria-hidden="true">
                      →
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>

          <div className="about-points">
            <div className="about-point">
              <span aria-hidden="true">📷</span>
              <div>
                <b>Camera-first.</b> The primary journey is a phone camera:
                scan, capture, analyse — no data entry required.
              </div>
            </div>
            <div className="about-point">
              <span aria-hidden="true">⚙️</span>
              <div>
                <b>Separated concerns.</b> Extraction returns structured fields;
                a deterministic rule engine owns every compliance judgement.
              </div>
            </div>
            <div className="about-point">
              <span aria-hidden="true">⚖️</span>
              <div>
                <b>Honest limits.</b> Results depend on image quality and
                applicable requirements — the system never claims legal
                certification or physical verification.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
