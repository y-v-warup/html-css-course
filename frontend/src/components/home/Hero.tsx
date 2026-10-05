import { Link } from "react-router-dom";

export default function Hero() {
  return (
    <section className="hero">
      <div className="container hero-grid">
        <div className="hero-copy">
          <span className="eyebrow">Scan. Verify. Understand.</span>
          <h1>
            Check Product Labels <em>Before They Reach the Shelf.</em>
          </h1>
          <p className="hero-sub">
            Scan packaged-product labels with your camera and use AI-powered
            information extraction plus rule-based compliance validation to
            identify missing or potentially incorrect mandatory declarations.
          </p>

          <div className="hero-actions">
            <Link to="/scanner" className="btn btn-gradient btn-lg">
              Start Scanner
            </Link>
            <Link
              to={{ pathname: "/", hash: "#how" }}
              className="btn btn-outline btn-lg"
            >
              How It Works
            </Link>
          </div>

          <ul className="hero-trust">
            <li>Camera-first mobile scanning</li>
            <li>Optional QR decoding</li>
            <li>Deterministic rule engine</li>
          </ul>

          <p className="hero-note">
            AI-assisted declaration checks — not an official government
            certification.
          </p>
        </div>

        <div className="hero-visual">
          <div className="phone-scene" aria-hidden="true">
            <div className="phone">
              <div className="phone-notch" />
              <div className="phone-screen">
                <div className="scan-scene">
                  <div className="pack">
                    <div className="pack-band" />
                    <div className="pack-lines">
                      <i />
                      <i />
                      <i />
                    </div>
                    <div className="pack-meta">
                      <span className="pack-mrp">MRP ₹120</span>
                      <span className="pack-qr" />
                    </div>
                  </div>

                  <div className="scan-frame">
                    <span className="corner tl" />
                    <span className="corner tr" />
                    <span className="corner bl" />
                    <span className="corner br" />
                  </div>
                  <div className="scan-line" />

                  <span className="scan-status-mini">Scanning label…</span>
                  <span className="qr-badge">✓ QR detected</span>

                  <div className="ai-chips">
                    <span className="ok">AI · MRP ₹120 detected</span>
                    <span className="ok">AI · Net quantity 500 g</span>
                    <span className="warn">AI · Batch → review</span>
                  </div>

                  <div className="phone-result-chip">
                    <b>REVIEW REQUIRED</b>
                    <span>78% coverage</span>
                  </div>
                </div>
              </div>
            </div>

            <span className="float-badge float-1">Vision OCR extracted</span>
            <span className="float-badge float-2">Rule engine checked</span>
          </div>
        </div>
      </div>
    </section>
  );
}
