import { Fragment, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CloseIcon, MenuIcon, ShieldLogo } from "./Icons";

interface NavItem {
  label: string;
  to?: string;
  hash?: string;
}

const NAV: NavItem[] = [
  { label: "Home", to: "/" },
  { label: "How It Works", hash: "#how" },
  { label: "Compliance", hash: "#compliance" },
  { label: "Scanner", to: "/scanner" },
  { label: "About", hash: "#about" },
];

function navLink(item: NavItem, className?: string) {
  if (item.to) {
    return (
      <Link to={item.to} className={className}>
        {item.label}
      </Link>
    );
  }
  return (
    <Link to={{ pathname: "/", hash: item.hash }} className={className}>
      {item.label}
    </Link>
  );
}

export default function Header() {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.hash]);

  return (
    <header className="site-header">
      <div className="container">
        <Link to="/" className="brand" aria-label="LabelGuard AI home">
          <span className="brand-mark">
            <ShieldLogo size={19} />
          </span>
          <span>
            LabelGuard AI
            <small>Scan. Verify. Understand.</small>
          </span>
        </Link>

        <nav className="nav-links" aria-label="Primary">
          {NAV.map((item) => (
            <Fragment key={item.label}>{navLink(item)}</Fragment>
          ))}
        </nav>

        <Link to="/scanner" className="btn btn-primary header-cta">
          Start Scanning
        </Link>

        <button
          className="menu-toggle"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>

      {open && (
        <div className="mobile-menu">
          {NAV.map((item) => (
            <Fragment key={item.label}>{navLink(item)}</Fragment>
          ))}
          <Link to="/scanner" className="btn btn-primary btn-block">
            Start Scanning
          </Link>
        </div>
      )}
    </header>
  );
}
