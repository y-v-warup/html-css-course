import { useEffect, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import Scanner from "./pages/Scanner";
import Result from "./pages/Result";
import ReportPage from "./pages/ReportPage";
import { AnalysisProvider, useAnalysis } from "./store";

function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

/** Result and report routes need an analysis to show. */
function RequireAnalysis({ children }: { children: ReactNode }) {
  const { result } = useAnalysis();
  if (!result) return <Navigate to="/scanner" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AnalysisProvider>
      <ScrollManager />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/scanner" element={<Scanner />} />
        <Route
          path="/result"
          element={
            <RequireAnalysis>
              <Result />
            </RequireAnalysis>
          }
        />
        <Route
          path="/report"
          element={
            <RequireAnalysis>
              <ReportPage />
            </RequireAnalysis>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnalysisProvider>
  );
}
