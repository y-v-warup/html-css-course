import { Link } from "react-router-dom";

export default function CtaBand() {
  return (
    <section className="section" style={{ paddingTop: 20 }}>
      <div className="container">
        <div className="cta-band reveal">
          <span className="eyebrow">Ready when you are</span>
          <h2 style={{ marginTop: 14 }}>Scan your first label in seconds</h2>
          <p>
            Open the scanner, point your camera at a packaged product and get a
            structured declaration check with review items and suggested
            corrections.
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
          <p className="disclaimer-text" style={{ marginTop: 18 }}>
            AI-assisted declaration checking. Not a government certification or
            legal opinion.
          </p>
        </div>
      </div>
    </section>
  );
}
