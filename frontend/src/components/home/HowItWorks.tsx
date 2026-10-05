import { CheckIcon, ExtractIcon, ReportIcon, ScanIcon } from "../Icons";

const STEPS = [
  {
    no: "01",
    title: "Scan",
    icon: <ScanIcon size={26} />,
    copy: "Capture the product label using your phone camera.",
  },
  {
    no: "02",
    title: "Extract",
    icon: <ExtractIcon size={26} />,
    copy: "AI vision/OCR identifies visible label information.",
  },
  {
    no: "03",
    title: "Check",
    icon: <CheckIcon size={26} />,
    copy: "A deterministic compliance engine evaluates applicable declarations.",
  },
  {
    no: "04",
    title: "Report",
    icon: <ReportIcon size={26} />,
    copy: "View detected information, review items and suggested corrections.",
  },
];

export default function HowItWorks() {
  return (
    <section className="section" id="how">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">How it works</span>
          <h2 className="section-title">From camera to report in four steps</h2>
          <p className="section-sub">
            One continuous workflow — open the scanner, capture a label, and get
            a structured declaration check with corrections.
          </p>
        </div>

        <div className="steps">
          {STEPS.map((step, i) => (
            <article
              className="step reveal"
              key={step.no}
              style={{ animationDelay: `${i * 90}ms` }}
            >
              <span className="step-num">{step.no}</span>
              <div className="step-icon">{step.icon}</div>
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
