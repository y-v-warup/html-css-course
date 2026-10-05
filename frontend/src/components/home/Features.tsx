import type { ReactNode } from "react";
import {
  BoxIcon,
  CameraIcon,
  ChartIcon,
  GearIcon,
  QrIcon,
  ReportIcon,
  ScanIcon,
  SparkIcon,
  WarnIcon,
} from "../Icons";

interface Feature {
  icon: ReactNode;
  title: string;
  copy: string;
}

const FEATURES: Feature[] = [
  {
    icon: <CameraIcon size={22} />,
    title: "Camera-first scanning",
    copy: "Rear-camera live preview with a guided scan frame built for phones.",
  },
  {
    icon: <SparkIcon size={22} />,
    title: "AI label understanding",
    copy: "Vision models read MRP, net quantity, dates and declarations.",
  },
  {
    icon: <BoxIcon size={22} />,
    title: "Packaged product analysis",
    copy: "Front and back label captures combined into one structured record.",
  },
  {
    icon: <QrIcon size={22} />,
    title: "Optional QR detection",
    copy: "Decode a QR payload when one is present — never required to scan.",
  },
  {
    icon: <GearIcon size={22} />,
    title: "Rule-based compliance engine",
    copy: "Deterministic checks after extraction — not AI guesswork.",
  },
  {
    icon: <ChartIcon size={22} />,
    title: "Declaration coverage",
    copy: "Detected declarations shown as a share of applicable declarations.",
  },
  {
    icon: <WarnIcon size={22} />,
    title: "Missing declaration detection",
    copy: "Field-level flags for anything not detected on the package.",
  },
  {
    icon: <ReportIcon size={22} />,
    title: "Compliance report",
    copy: "Shareable analysis report with corrections and disclaimers.",
  },
];

export default function Features() {
  return (
    <section className="section features" id="features">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">Features</span>
          <h2 className="section-title">Everything a label check needs</h2>
          <p className="section-sub">
            Built as a real product workflow — camera in, structured compliance
            analysis out.
          </p>
        </div>

        <div className="feature-grid">
          {FEATURES.map((f, i) => (
            <article
              className="feature-card reveal"
              key={f.title}
              style={{ animationDelay: `${(i % 4) * 80}ms` }}
            >
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
