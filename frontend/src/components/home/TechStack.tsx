const TECH = [
  { k: "Frontend", v: "React.js + Vite", mark: "Re" },
  { k: "Backend", v: "Python + FastAPI", mark: "Py" },
  { k: "AI / Vision", v: "OpenAI Vision", mark: "AI" },
  { k: "OCR", v: "Tesseract-ready fallback", mark: "OC" },
  { k: "Image processing", v: "Canvas + Pillow pipeline", mark: "IP" },
  { k: "Compliance", v: "Python rule engine", mark: "RL" },
  { k: "Data layer", v: "Stateless · PostgreSQL-ready", mark: "DB" },
  { k: "Deployment", v: "Docker + Cloud", mark: "DC" },
];

export default function TechStack() {
  return (
    <section className="section" id="tech">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">Technology</span>
          <h2 className="section-title">Built on a pragmatic stack</h2>
          <p className="section-sub">
            Camera and QR in the browser, vision/OCR and deterministic rules on
            the server, secrets never leaving the backend.
          </p>
        </div>

        <div className="tech-grid">
          {TECH.map((t, i) => (
            <div
              className="tech-badge reveal"
              key={t.k}
              style={{ animationDelay: `${(i % 4) * 70}ms` }}
            >
              <span className="tech-dot" aria-hidden="true">
                {t.mark}
              </span>
              <div>
                <small>{t.k}</small>
                <b>{t.v}</b>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
