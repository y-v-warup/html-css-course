// Small inline SVG icon set — stroke based, inherits currentColor.

interface IconProps {
  size?: number;
  className?: string;
}

function attrs(size: number, className?: string) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    focusable: false as const,
    className,
  };
}

export function ShieldLogo({ size = 20, className }: IconProps) {
  return (
    <svg {...attrs(size, className)} fill="none" stroke="currentColor">
      <path
        d="M12 3l7 3v5.2c0 4.4-2.9 7.9-7 8.8-4.1-.9-7-4.4-7-8.8V6l7-3z"
        strokeWidth={2}
      />
      <path d="M9 12l2.2 2.2L15.5 10" strokeWidth={2} />
    </svg>
  );
}

export function ScanIcon({ size = 24, className }: IconProps) {
  return (
    <svg {...attrs(size, className)}>
      <path d="M4 8V6a2 2 0 012-2h2M16 4h2a2 2 0 012 2v2M20 16v2a2 2 0 01-2 2h-2M8 20H6a2 2 0 01-2-2v-2" />
      <path d="M4 12h16" />
    </svg>
  );
}

export function ExtractIcon({ size = 24, className }: IconProps) {
  return (
    <svg {...attrs(size, className)}>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8 9h8M8 13h5" />
      <path d="M17.5 14.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8z" />
    </svg>
  );
}

export function CheckIcon({ size = 24, className }: IconProps) {
  return (
    <svg {...attrs(size, className)}>
      <path d="M9 5h9a2 2 0 012 2v11a2 2 0 01-2 2H9" />
      <path d="M9 5a2 2 0 00-2 2v2h4" />
      <path d="M4 12l2.4 2.4L11 10" />
      <path d="M11 16.5h6" />
    </svg>
  );
}

export function ReportIcon({ size = 24, className }: IconProps) {
  return (
    <svg {...attrs(size, className)}>
      <path d="M7 3h7l4 4v12a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" />
      <path d="M14 3v4h4" />
      <path d="M9 13h6M9 17h4" />
    </svg>
  );
}

export function CameraIcon({ size = 24, className }: IconProps) {
  return (
    <svg {...attrs(size, className)}>
      <path d="M4 8.5A2.5 2.5 0 016.5 6h1.2l1.2-1.8h6.2L16.3 6h1.2A2.5 2.5 0 0120 8.5v8A2.5 2.5 0 0117.5 19h-11A2.5 2.5 0 014 16.5v-8z" />
      <circle cx="12" cy="12.5" r="3.2" />
    </svg>
  );
}

export function SparkIcon({ size = 24, className }: IconProps) {
  return (
    <svg {...attrs(size, className)}>
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
      <path d="M18.5 15.5l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9.9-2.3z" />
    </svg>
  );
}

export function BoxIcon({ size = 24, className }: IconProps) {
  return (
    <svg {...attrs(size, className)}>
      <path d="M12 3l8 4.2v9.6L12 21l-8-4.2V7.2L12 3z" />
      <path d="M4.3 7.3L12 11.4l7.7-4.1M12 11.4V21" />
    </svg>
  );
}

export function QrIcon({ size = 24, className }: IconProps) {
  return (
    <svg {...attrs(size, className)}>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <path d="M14 14h2.5v2.5H14zM19.5 14H20v2.5h-.5M14 19.5h2.5V20H14zM19.5 19.5H20V20h-.5z" />
    </svg>
  );
}

export function GearIcon({ size = 24, className }: IconProps) {
  return (
    <svg {...attrs(size, className)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13.5a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.9 2.9l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5v.2a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.9-2.9l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H2.7a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.9-2.9l.1.1a1.7 1.7 0 001.9.3h.1a1.7 1.7 0 001-1.5V2.7a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.9 2.9l-.1.1a1.7 1.7 0 00-.3 1.9v.1a1.7 1.7 0 001.5 1h.2a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
    </svg>
  );
}

export function ChartIcon({ size = 24, className }: IconProps) {
  return (
    <svg {...attrs(size, className)}>
      <path d="M4 20V10M10 20V5M16 20v-7M21 20H3.5" />
    </svg>
  );
}

export function WarnIcon({ size = 24, className }: IconProps) {
  return (
    <svg {...attrs(size, className)}>
      <path d="M10.3 4.2L2.9 17a2 2 0 001.7 3h14.8a2 2 0 001.7-3L13.7 4.2a2 2 0 00-3.4 0z" />
      <path d="M12 9.5V14M12 17.4h.01" />
    </svg>
  );
}

export function MenuIcon({ size = 22, className }: IconProps) {
  return (
    <svg {...attrs(size, className)}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function CloseIcon({ size = 22, className }: IconProps) {
  return (
    <svg {...attrs(size, className)}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function SwitchIcon({ size = 20, className }: IconProps) {
  return (
    <svg {...attrs(size, className)}>
      <path d="M4.5 9A8 8 0 0118 6.5M19.5 15A8 8 0 016 17.5" />
      <path d="M4 5v4h4M20 19v-4h-4" />
    </svg>
  );
}

export function FlashIcon({ size = 20, className }: IconProps) {
  return (
    <svg {...attrs(size, className)}>
      <path d="M13 3L5.5 13.5H11L10 21l7.5-10.5H12L13 3z" />
    </svg>
  );
}

export function ArrowLeftIcon({ size = 20, className }: IconProps) {
  return (
    <svg {...attrs(size, className)}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  );
}

export function ShareIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...attrs(size, className)}>
      <path d="M12 15V4M8.5 7.5L12 4l3.5 3.5" />
      <path d="M5 13v5a2 2 0 002 2h10a2 2 0 002-2v-5" />
    </svg>
  );
}

export function DownloadIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...attrs(size, className)}>
      <path d="M12 4v11M8.5 11.5L12 15l3.5-3.5" />
      <path d="M5 19h14" />
    </svg>
  );
}
