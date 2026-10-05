import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AnalysisResult } from "./types";

export interface CapturedImages {
  front?: string;
  back?: string;
}

interface AnalysisContextValue {
  result: AnalysisResult | null;
  saveResult: (result: AnalysisResult) => void;
  clearResult: () => void;
  images: CapturedImages;
  setImages: (images: CapturedImages) => void;
  qrData: string;
  setQrData: (qr: string) => void;
}

const STORAGE_KEY = "labelguard.analysis.v1";

const AnalysisContext = createContext<AnalysisContextValue | null>(null);

interface StoredState {
  result?: AnalysisResult | null;
  images?: CapturedImages;
  qrData?: string;
}

function readStored(): StoredState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as StoredState;
  } catch {
    return {};
  }
}

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(readStored, []);
  const [result, setResult] = useState<AnalysisResult | null>(
    initial.result ?? null,
  );
  const [images, setImagesState] = useState<CapturedImages>(
    initial.images ?? {},
  );
  const [qrData, setQrData] = useState<string>(initial.qrData ?? "");

  useEffect(() => {
    try {
      const payload: StoredState = { result, images, qrData };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Storage full / unavailable — the in-memory state still works.
    }
  }, [result, images, qrData]);

  const saveResult = useCallback((next: AnalysisResult) => setResult(next), []);
  const clearResult = useCallback(() => {
    setResult(null);
    setImagesState({});
    setQrData("");
  }, []);

  const value = useMemo<AnalysisContextValue>(
    () => ({
      result,
      saveResult,
      clearResult,
      images,
      setImages: setImagesState,
      qrData,
      setQrData,
    }),
    [result, saveResult, clearResult, images, qrData],
  );

  return (
    <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>
  );
}

export function useAnalysis(): AnalysisContextValue {
  const ctx = useContext(AnalysisContext);
  if (!ctx) throw new Error("useAnalysis must be used inside AnalysisProvider");
  return ctx;
}
