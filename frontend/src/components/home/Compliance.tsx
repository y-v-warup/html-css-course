const LEGEND = [
  {
    glyph: "✓",
    cls: "ok",
    title: "Declarations detected",
    copy: "The declaration was found in the label image or QR payload.",
  },
  {
    glyph: "⚠",
    cls: "warn",
    title: "Review required",
    copy: "An applicable declaration was not detected — verify it on the package.",
  },
  {
    glyph: "✕",
    cls: "bad",
    title: "Missing declarations",
    copy: "A core applicable declaration (name, net quantity, MRP, manufacturer) was not detected.",
  },
  {
    glyph: "—",
    cls: "na",
    title: "Not applicable / not assessed",
    copy: "The rule does not apply to this product category, or the field is informational only.",
  },
];

const CHECKED = [
  "Product name",
  "Net quantity",
  "MRP",
  "Manufacturer / Packer / Importer",
  "Consumer care details",
  "Country of origin",
  "Batch / Lot number",
  "Manufacturing / Packing date",
  "Expiry / Best Before",
  "FSSAI number (food)",
  "Barcode / GTIN (informational)",
  "QR payload (optional)",
];

export default function Compliance() {
  return (
    <section className="section" id="compliance">
      <div className="container">
        <div className="comply-grid">
          <div>
            <span className="eyebrow">Compliance engine</span>
            <h2 className="section-title">
              Deterministic rules, not AI opinions
            </h2>
            <p className="section-sub" style={{ marginTop: 14 }}>
              Extraction and judgement are kept separate. AI only reads what is
              visible on the label and returns structured fields — a
              rule-based engine then checks which declarations are applicable,
              which were detected and which need human review.
            </p>

            <div className="check-cloud" aria-label="Declarations checked">
              {CHECKED.map((c) => (
                <span className="check-chip" key={c}>
                  {c}
                </span>
              ))}
            </div>

            <p className="disclaimer-text" style={{ marginTop: 20 }}>
              Not every declaration is mandatory for every product category.
              Barcode/GTIN absence is displayed but never classified as a legal
              violation, and no result constitutes official certification.
            </p>
          </div>

          <div className="legend-card reveal">
            <h3 style={{ fontSize: 17, marginBottom: 6 }}>
              Result states used across the app
            </h3>
            {LEGEND.map((row) => (
              <div className="legend-row" key={row.title}>
                <span className={`legend-icon ${row.cls}`} aria-hidden="true">
                  {row.glyph}
                </span>
                <div>
                  <b>{row.title}</b>
                  <span>{row.copy}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
