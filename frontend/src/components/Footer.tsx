import { Link } from "react-router-dom";
import { ShieldLogo } from "./Icons";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <span className="brand">
              <span className="brand-mark">
                <ShieldLogo size={19} />
              </span>
              <span>
                LabelGuard AI
                <small>Scan. Verify. Understand.</small>
              </span>
            </span>
            <p>
              AI-powered packaged product label compliance checking — camera-first
              scanning, AI/OCR extraction and deterministic declaration rules.
            </p>
          </div>

          <div className="footer-col">
            <h4>Product</h4>
            <Link to="/">Home</Link>
            <Link to={{ pathname: "/", hash: "#how" }}>How It Works</Link>
            <Link to={{ pathname: "/", hash: "#compliance" }}>Compliance</Link>
            <Link to="/scanner">Scanner</Link>
          </div>

          <div className="footer-col">
            <h4>Project</h4>
            <Link to={{ pathname: "/", hash: "#features" }}>Features</Link>
            <Link to={{ pathname: "/", hash: "#tech" }}>Technology</Link>
            <Link to={{ pathname: "/", hash: "#about" }}>About</Link>
          </div>
        </div>

        <p className="footer-disclaimer">
          LabelGuard AI provides AI-assisted label information extraction and
          rule-based declaration checks. Results depend on image quality and the
          applicable product requirements. The system does not physically measure
          quantity, verify legal authenticity, or provide official government
          certification.
        </p>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} LabelGuard AI</span>
          <span>Scan. Verify. Understand.</span>
        </div>
      </div>
    </footer>
  );
}
