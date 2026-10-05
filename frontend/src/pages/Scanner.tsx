import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeftIcon,
  CameraIcon,
  FlashIcon,
  SwitchIcon,
} from "../components/Icons";
import {
  analyze,
  fetchHealth,
  FRIENDLY_ANALYZE_ERROR,
} from "../lib/api";
import {
  captureRegion,
  preprocess,
  type FrameRect,
} from "../lib/capture";
import { decodeQRFromVideo } from "../lib/qr";
import { DEMO_SAMPLES } from "../lib/samples";
import { useAnalysis } from "../store";
import type { AnalyzePayload, HealthResponse } from "../types";

/** Must match the .frame CSS box (left/right 7%, top 12%, height 56%). */
const FRAME_RECT: FrameRect = { x: 0.07, y: 0.12, w: 0.86, h: 0.56 };

type CamState = "starting" | "live" | "denied" | "error";
type Tone = "neutral" | "good" | "warn" | "bad";
type Slot = "front" | "back";

interface DeckStatus {
  text: string;
  tone: Tone;
}

interface OverlayState {
  phase: string;
  percent: number;
  error?: string;
}

export default function Scanner() {
  const navigate = useNavigate();
  const { images, setImages, qrData, setQrData, saveResult, clearResult } =
    useAnalysis();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const aliveRef = useRef(false);
  const qrFoundRef = useRef(false);
  const qrLoopRef = useRef<number | null>(null);
  const lastPayloadRef = useRef<AnalyzePayload | null>(null);

  const [camState, setCamState] = useState<CamState>("starting");
  const [cameraMsg, setCameraMsg] = useState("");
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const [qrFound, setQrFound] = useState(() => Boolean(qrData));
  const [deck, setDeck] = useState<DeckStatus>({
    text: "Starting camera and requesting permission…",
    tone: "neutral",
  });
  const [slot, setSlot] = useState<Slot>("front");
  const [qualityWarn, setQualityWarn] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [overlay, setOverlay] = useState<OverlayState | null>(null);

  /* ---------------- camera lifecycle ---------------- */

  function stopQrLoop() {
    if (qrLoopRef.current !== null) {
      clearInterval(qrLoopRef.current);
      qrLoopRef.current = null;
    }
  }

  function stopCamera() {
    stopQrLoop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    trackRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  function startQrLoop() {
    stopQrLoop();
    qrLoopRef.current = window.setInterval(() => {
      const video = videoRef.current;
      if (!video || qrFoundRef.current) return;
      void decodeQRFromVideo(video).then((payload) => {
        if (payload && !qrFoundRef.current) {
          qrFoundRef.current = true;
          setQrFound(true);
          setQrData(payload);
          setDeck({
            text: "QR detected ✓ — QR information is available and will be used as the first information source with the label scan. You can also analyse now using QR data alone.",
            tone: "good",
          });
          stopQrLoop();
        }
      });
    }, 700);
  }

  async function startCamera(mode: "environment" | "user") {
    stopCamera();
    setCamState("starting");
    setCameraMsg("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setCamState("error");
      setCameraMsg(
        "Camera access is required for live scanning. This browser does not support camera capture — try a modern mobile browser over HTTPS.",
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
        audio: false,
      });

      if (!aliveRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      const track = stream.getVideoTracks()[0];
      trackRef.current = track;

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        try {
          await video.play();
        } catch {
          // Autoplay is allowed for muted inline video; ignore.
        }
      }

      setFacing(mode);
      setCamState("live");
      setDeck({
        text: "Camera live. Position the package inside the frame.",
        tone: "good",
      });

      const caps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities & {
        torch?: boolean;
      };
      setTorchAvailable(Boolean(caps.torch));
      setTorchOn(false);
      startQrLoop();
    } catch (err) {
      if (!aliveRef.current) return;
      const name = err instanceof DOMException ? err.name : "";
      const denied =
        name === "NotAllowedError" ||
        name === "SecurityError" ||
        name === "PermissionDeniedError";
      setCamState(denied ? "denied" : "error");
      setCameraMsg(
        denied
          ? "Camera access is required for live scanning. You can enable camera permission in your browser settings."
          : name === "NotFoundError" || name === "OverconstrainedError"
            ? "No usable camera was found on this device."
            : name === "NotReadableError"
              ? "Your camera is busy in another app. Close it and try again."
              : "Camera could not be started. Please try again.",
      );
    }
  }

  async function toggleTorch() {
    const track = trackRef.current;
    if (!track) return;
    try {
      const constraints = {
        advanced: [{ torch: !torchOn }],
      } as unknown as MediaTrackConstraints;
      await track.applyConstraints(constraints);
      setTorchOn((v) => !v);
    } catch {
      setTorchAvailable(false);
    }
  }

  useEffect(() => {
    aliveRef.current = true;
    qrFoundRef.current = Boolean(qrData);
    void startCamera("environment");

    fetchHealth()
      .then((h) => {
        if (aliveRef.current) setHealth(h);
      })
      .catch(() => {
        // Backend unreachable — the analyse step reports a friendly error.
      });

    return () => {
      aliveRef.current = false;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- capture ---------------- */

  function doCapture() {
    const video = videoRef.current;
    if (!video) return;

    const frame = captureRegion(video, FRAME_RECT);
    if (!frame) {
      setDeck({ text: "Could not read the camera frame. Please try again.", tone: "bad" });
      return;
    }
    const processed = preprocess(frame);
    if (!processed) {
      setDeck({ text: "Could not process the image. Please try again.", tone: "bad" });
      return;
    }

    let warn: string | null = null;
    if (processed.luminance < 52) {
      warn = "Improve lighting for better label recognition.";
    } else if (processed.sharpness < 24) {
      warn = "Image is unclear. Please hold the phone steady and capture again.";
    }
    setQualityWarn(warn);

    setImages({ ...images, [slot]: processed.dataUrl });

    const noQr = qrFoundRef.current
      ? ""
      : " No QR detected — label scanning will be used.";
    if (slot === "front") {
      setSlot("back");
      setDeck({
        text: `Front label captured ✓ — capture the back/side label (optional) or analyse now.${noQr}`,
        tone: "good",
      });
    } else {
      setDeck({
        text: "Back label captured ✓ — ready to analyse.",
        tone: "good",
      });
    }
  }

  function clearSlot(which: Slot) {
    setImages({ ...images, [which]: undefined });
    setSlot(which);
    setQualityWarn(null);
    setDeck({
      text: `${which === "front" ? "Front" : "Back"} label cleared — capture it again.`,
      tone: "neutral",
    });
  }

  /* ---------------- analysis ---------------- */

  async function runAnalysis(payload: AnalyzePayload) {
    lastPayloadRef.current = payload;
    clearResult();
    const isDemo = Boolean(payload.demo_sample);
    setOverlay({
      phase: isDemo ? "Loading demo dataset…" : "Uploading label…",
      percent: 5,
    });

    try {
      const result = await analyze(payload, (percent, phase) => {
        setOverlay((current) => {
          if (!current || current.error) return current;
          if (phase === "upload") {
            return {
              ...current,
              phase: "Uploading label…",
              percent: Math.max(5, Math.min(60, Math.round(percent * 0.6))),
            };
          }
          return { ...current, phase: "AI extracting declarations…", percent: 68 };
        });
      });

      setOverlay({ phase: "Applying compliance rules…", percent: 94 });
      saveResult(result);
      setOverlay(null);
      navigate("/result");
    } catch (err) {
      setOverlay({
        phase: "",
        percent: 0,
        error:
          err instanceof Error && err.message ? err.message : FRIENDLY_ANALYZE_ERROR,
      });
    }
  }

  function analyseCaptures() {
    const payload: AnalyzePayload = {};
    if (images.front) payload.front_image = images.front;
    if (images.back) payload.back_image = images.back;
    if (qrData) payload.qr_data = qrData;
    void runAnalysis(payload);
  }

  const hasImages = Boolean(images.front || images.back);
  // QR is an optional *first* information source: if one was decoded, the
  // analysis can run even before a label photo is captured.
  const canAnalyse = hasImages || Boolean(qrData);

  /* ---------------- render ---------------- */

  const qrPill = qrFound
    ? { cls: "cam-pill qr-found", text: "✓ QR detected" }
    : { cls: "cam-pill rec", text: "Live · QR optional" };

  return (
    <div className="scan-page">
      <div className="scan-top">
        <button
          className="back-btn"
          onClick={() => navigate("/")}
          aria-label="Back to home"
        >
          <ArrowLeftIcon />
        </button>
        <div>
          <h1>Product Label Scanner</h1>
          <p>Position the package inside the frame.</p>
        </div>
      </div>

      {health && !health.ai_configured && (
        <div className="demo-panel" role="region" aria-label="Demo mode">
          <h3>Demo Mode</h3>
          <p>
            AI analysis service is not configured — the sample products below
            run through the same rule engine using clearly-labelled demo data
            (not a real package scan).
          </p>
          <div className="demo-chips">
            {DEMO_SAMPLES.map((sample) => (
              <button
                key={sample.id}
                className="demo-chip"
                onClick={() => void runAnalysis({ demo_sample: sample.id })}
              >
                {sample.name}
                <small>{sample.hint}</small>
              </button>
            ))}
          </div>
        </div>
      )}

      {(camState === "denied" || camState === "error") && (
        <div className={`scan-notice ${camState === "denied" ? "danger" : "warn"}`} role="alert">
          <span aria-hidden="true">⚠</span>
          <div>
            {cameraMsg}
            <br />
            <button className="btn" onClick={() => void startCamera(facing)}>
              Try again
            </button>
          </div>
        </div>
      )}

      {qualityWarn && (
        <div className="scan-notice warn" role="status">
          <span aria-hidden="true">⚠</span>
          <div>
            {qualityWarn}
            <br />
            <button className="btn" onClick={() => clearSlot(slot)}>
              Retake
            </button>
          </div>
        </div>
      )}

      <div className="stage-wrap">
        <div className="stage">
          <video ref={videoRef} autoPlay muted playsInline />

          {camState === "live" && (
            <>
              <div className="frame">
                <span className="corner tl" />
                <span className="corner tr" />
                <span className="corner bl" />
                <span className="corner br" />
              </div>
              <div className="scanline" />
            </>
          )}

          <div className="stage-status" aria-live="polite">
            <span className={qrPill.cls}>{qrPill.text}</span>
            <span className="cam-tip">
              {qrFound
                ? "QR information available — decoded locally, not verified against any government database."
                : "No QR yet — that's fine. Label scanning continues either way."}
            </span>
          </div>

          <div className="stage-controls">
            <button
              className="round-btn"
              aria-label="Switch camera"
              title="Switch camera"
              disabled={camState === "starting"}
              onClick={() => void startCamera(facing === "environment" ? "user" : "environment")}
            >
              <SwitchIcon />
            </button>
            {torchAvailable && (
              <button
                className={`round-btn${torchOn ? " active" : ""}`}
                aria-label={torchOn ? "Turn flash off" : "Turn flash on"}
                aria-pressed={torchOn}
                title="Flash"
                onClick={() => void toggleTorch()}
              >
                <FlashIcon />
              </button>
            )}
          </div>

          {camState !== "live" && (
            <div className="stage-placeholder">
              <span className="ph-icon" aria-hidden="true">
                <CameraIcon size={28} />
              </span>
              <h2>
                {camState === "starting"
                  ? "Requesting camera access…"
                  : "Camera not available"}
              </h2>
              <p>
                {camState === "starting"
                  ? "Approve the browser prompt to start live scanning."
                  : cameraMsg}
              </p>
              {camState !== "starting" && (
                <button
                  className="btn btn-gradient"
                  onClick={() => void startCamera(facing)}
                >
                  Start camera
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="deck">
        <div className={`deck-status ${deck.tone}`} aria-live="polite">
          {deck.text}
        </div>

        <div className="shot-row">
          <button
            className={`shot${images.front ? " filled" : ""}`}
            onClick={() =>
              images.front
                ? clearSlot("front")
                : setSlot("front")
            }
            aria-label={
              images.front
                ? "Front label captured — tap to clear and retake"
                : "Select front label slot"
            }
          >
            {images.front ? <img src={images.front} alt="" /> : "Front"}
            <span className="shot-label">
              FRONT{slot === "front" ? " · NEXT" : ""}
            </span>
          </button>

          <button
            className="capture-btn"
            onClick={doCapture}
            disabled={camState !== "live"}
            aria-label="Capture label"
          >
            CAPTURE
          </button>

          <button
            className={`shot${images.back ? " filled" : ""}`}
            onClick={() =>
              images.back ? clearSlot("back") : setSlot("back")
            }
            aria-label={
              images.back
                ? "Back label captured — tap to clear and retake"
                : "Select back label slot"
            }
          >
            {images.back ? <img src={images.back} alt="" /> : "Back"}
            <span className="shot-label">
              BACK{slot === "back" ? " · NEXT" : ""}
            </span>
          </button>
        </div>

        <div className="deck-actions">
          <button
            className="btn"
            onClick={() => clearSlot(slot)}
            disabled={!images[slot]}
          >
            Retake
          </button>
          <button
            className="btn analyze"
            onClick={analyseCaptures}
            disabled={!canAnalyse}
          >
            Analyse Label
          </button>
        </div>
      </div>

      {overlay && (
        <div className="analyzing" role="status" aria-live="assertive">
          <div className="analyzing-card">
            {overlay.error ? (
              <>
                <h3>Analysis interrupted</h3>
                <p>{overlay.error}</p>
                <button
                  className="btn btn-gradient btn-block"
                  onClick={() =>
                    lastPayloadRef.current &&
                    void runAnalysis(lastPayloadRef.current)
                  }
                >
                  Try again
                </button>
                <button
                  className="btn btn-ghost btn-block"
                  style={{ color: "#9db0cf", marginTop: 10 }}
                  onClick={() => setOverlay(null)}
                >
                  Back to scanner
                </button>
              </>
            ) : (
              <>
                <div className="orbit" aria-hidden="true" />
                <h3>Analysing label…</h3>
                <p>{overlay.phase}</p>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${overlay.percent}%` }}
                  />
                </div>
                <div className="progress-label">
                  <span>Extraction → rule engine → report</span>
                  <span>{overlay.percent}%</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
