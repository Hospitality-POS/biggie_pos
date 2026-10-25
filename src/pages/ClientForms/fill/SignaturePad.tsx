import React, { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import { Button, Checkbox, Input, Segmented, Typography } from "antd";
import { CheckCircleFilled, EditOutlined, FontSizeOutlined, HistoryOutlined, ReloadOutlined } from "@ant-design/icons";
import type { SavedSignatureOption, SignatureInput } from "./types";

const { Text } = Typography;

export interface SignaturePadHandle {
  /** The signature to send, or null when nothing has been drawn/typed/picked. */
  value: () => SignatureInput | null;
  clear: () => void;
}

type Mode = "saved" | "draw" | "type";

interface Props {
  signerName: string;
  onSignerNameChange: (name: string) => void;
  /** Called whenever the pad goes from empty to signed or back */
  onChange?: (hasSignature: boolean) => void;
  height?: number;
  nameLabel?: string;
  /** Signatures that can be reused (the client's kept one, or a staff member's library) */
  savedOptions?: SavedSignatureOption[];
  /**
   * "reference": send { method: "saved" } and let the server use the stored
   * copy (client). "inline": send the saved image / typed name itself (staff).
   */
  savedAs?: "reference" | "inline";
  /** Shows a "keep this signature" tick box with this label */
  saveLabel?: string;
}

const INK = "#0f172a";
const SCRIPT_FONT = '"Brush Script MT", "Segoe Script", "Lucida Handwriting", cursive';

/**
 * Signature capture that works with a finger, stylus or mouse (pointer
 * events), stays sharp on high-density tablet screens, offers typing the
 * name instead, and can reuse a saved signature.
 */
const SignaturePad = forwardRef<SignaturePadHandle, Props>(
  (
    { signerName, onSignerNameChange, onChange, height = 180, nameLabel = "Full name", savedOptions = [], savedAs = "inline", saveLabel },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const wrapRef = useRef<HTMLDivElement>(null);
    const drawing = useRef(false);
    const last = useRef<{ x: number; y: number } | null>(null);
    const [mode, setMode] = useState<Mode>(savedOptions.length ? "saved" : "draw");
    const [hasInk, setHasInk] = useState(false);
    const [pickedId, setPickedId] = useState<string | null>(savedOptions[0]?.id ?? null);
    const [keep, setKeep] = useState(true);
    const touched = useRef(false);

    const picked = savedOptions.find((o) => o.id === pickedId) ?? null;

    // Saved signatures usually arrive after the pad mounts — offer them first
    // unless the person has already started drawing or typing.
    useEffect(() => {
      if (savedOptions.length && !touched.current) {
        setMode("saved");
        setPickedId((id) => id ?? savedOptions[0].id);
      }
      if (!savedOptions.length && mode === "saved") setMode("draw");
    }, [savedOptions, mode]);

    const setInk = useCallback(
      (v: boolean) => {
        setHasInk(v);
        onChange?.(v);
      },
      [onChange]
    );

    const sizedWidth = useRef(0);

    // Match the canvas backing store to its on-screen size × devicePixelRatio.
    // Resizing wipes the canvas, so only do it when the width really changed
    // (not on every re-layout, e.g. the phone keyboard opening) or on Clear.
    const resize = useCallback(
      (force = false) => {
        const canvas = canvasRef.current;
        const wrap = wrapRef.current;
        if (!canvas || !wrap) return;
        const dpr = window.devicePixelRatio || 1;
        const width = wrap.clientWidth;
        if (!force && width === sizedWidth.current) return;
        sizedWidth.current = width;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.scale(dpr, dpr);
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.strokeStyle = INK;
        }
        setInk(false);
      },
      [height, setInk]
    );

    useEffect(() => {
      if (mode !== "draw") return;
      sizedWidth.current = 0;
      resize(true);
      const observer = new ResizeObserver(() => resize());
      if (wrapRef.current) observer.observe(wrapRef.current);
      return () => observer.disconnect();
    }, [mode, resize]);

    // Report whether there's something to sign with in the current mode
    useEffect(() => {
      if (mode === "type") onChange?.(!!signerName.trim());
      if (mode === "saved") onChange?.(!!picked);
    }, [mode, signerName, picked, onChange]);

    const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
      touched.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      drawing.current = true;
      last.current = point(e);
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx && last.current) {
        // A dot for a single tap
        ctx.beginPath();
        ctx.arc(last.current.x, last.current.y, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = INK;
        ctx.fill();
      }
    };

    const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!drawing.current || !last.current) return;
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      const p = point(e);
      // Pen pressure when the device reports it; steady width otherwise
      ctx.lineWidth = e.pressure > 0 && e.pointerType === "pen" ? 1.2 + e.pressure * 2.6 : 2.4;
      ctx.beginPath();
      ctx.moveTo(last.current.x, last.current.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      last.current = p;
      if (!hasInk) setInk(true);
    };

    const endStroke = () => {
      drawing.current = false;
      last.current = null;
    };

    const clear = () => {
      if (mode === "draw") resize(true);
      else setInk(false);
    };

    useImperativeHandle(ref, () => ({
      value: () => {
        const name = signerName.trim();
        const keepFlag = saveLabel ? { save_for_later: keep } : {};
        if (mode === "saved") {
          if (!picked) return null;
          if (savedAs === "reference") return { signer_name: picked.signer_name, method: "saved" };
          const who = name || picked.signer_name;
          return picked.method === "draw" && picked.data
            ? { signer_name: who, method: "draw", data: picked.data }
            : { signer_name: who, method: "type", typed_name: picked.typed_name || who };
        }
        if (!name) return null;
        if (mode === "type") return { signer_name: name, method: "type", typed_name: name, ...keepFlag };
        if (!hasInk || !canvasRef.current) return null;
        return { signer_name: name, method: "draw", data: canvasRef.current.toDataURL("image/png"), ...keepFlag };
      },
      clear,
    }));

    const modeOptions = [
      ...(savedOptions.length ? [{ value: "saved", label: "Use saved", icon: <HistoryOutlined /> }] : []),
      { value: "draw", label: "Draw", icon: <EditOutlined /> },
      { value: "type", label: "Type", icon: <FontSizeOutlined /> },
    ];

    // The client's kept signature carries its own name; staff can still edit theirs
    const showName = !(mode === "saved" && savedAs === "reference");

    return (
      <div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
          {showName ? (
            <div style={{ flex: "1 1 220px" }}>
              <Text style={{ fontSize: 12.5, color: "#64748b", display: "block", marginBottom: 4 }}>{nameLabel}</Text>
              <Input
                size="large"
                value={signerName}
                onChange={(e) => {
                  touched.current = true;
                  onSignerNameChange(e.target.value);
                }}
                placeholder="Your full name"
                autoComplete="name"
              />
            </div>
          ) : (
            <div style={{ flex: "1 1 220px" }} />
          )}
          <Segmented
            value={mode}
            onChange={(v) => {
              touched.current = true;
              setMode(v as Mode);
            }}
            options={modeOptions}
          />
        </div>

        {mode === "saved" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {savedOptions.map((o) => {
              const on = o.id === pickedId;
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setPickedId(o.id)}
                  aria-pressed={on}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    width: "100%",
                    minHeight: savedOptions.length > 1 ? 72 : height - 40,
                    padding: "8px 14px",
                    borderRadius: 12,
                    border: `1.5px solid ${on ? "#8b5cf6" : "#e2e8f0"}`,
                    background: on ? "#faf5ff" : "#fff",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center", height: savedOptions.length > 1 ? 56 : height - 70 }}>
                    {o.method === "draw" && o.data ? (
                      <img src={o.data} alt={`Saved signature: ${o.label}`} style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }} />
                    ) : (
                      <span style={{ fontFamily: SCRIPT_FONT, fontSize: 32, color: INK, whiteSpace: "nowrap", overflow: "hidden" }}>
                        {o.typed_name || o.signer_name}
                      </span>
                    )}
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0 }}>
                    {on && <CheckCircleFilled style={{ color: "#8b5cf6", fontSize: 18 }} />}
                    <Text style={{ fontSize: 11.5, color: "#64748b" }}>{o.label}</Text>
                  </span>
                </button>
              );
            })}
            <Text style={{ fontSize: 11.5, color: "#94a3b8" }}>Tap Draw or Type to sign differently this time.</Text>
          </div>
        )}

        {mode === "draw" && (
          <div ref={wrapRef} style={{ position: "relative" }}>
            <canvas
              ref={canvasRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endStroke}
              onPointerCancel={endStroke}
              onPointerLeave={endStroke}
              aria-label="Signature area — draw your signature"
              style={{
                display: "block",
                borderRadius: 12,
                border: "1.5px dashed #cbd5e1",
                background: "#fcfcfd",
                touchAction: "none", // stop the page scrolling while signing
                cursor: "crosshair",
              }}
            />
            <div style={{ position: "absolute", left: 20, right: 20, bottom: 34, borderBottom: "1px solid #e2e8f0", pointerEvents: "none" }} />
            {!hasInk && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#cbd5e1",
                  fontSize: 15,
                  pointerEvents: "none",
                }}
              >
                Sign here with your finger
              </div>
            )}
          </div>
        )}

        {mode === "type" && (
          <div
            style={{
              height,
              borderRadius: 12,
              border: "1.5px dashed #cbd5e1",
              background: "#fcfcfd",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 16px",
              fontFamily: SCRIPT_FONT,
              fontSize: 40,
              color: signerName.trim() ? INK : "#cbd5e1",
              overflow: "hidden",
              whiteSpace: "nowrap",
            }}
          >
            {signerName.trim() || "Your name"}
          </div>
        )}

        {mode !== "saved" && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, gap: 8, flexWrap: "wrap" }}>
            <Text style={{ fontSize: 11.5, color: "#94a3b8" }}>
              {mode === "type" ? "Typing your name counts as your signature." : "Use your finger, a stylus or the mouse."}
            </Text>
            {mode === "draw" && (
              <Button size="small" type="text" icon={<ReloadOutlined />} onClick={clear} style={{ color: "#64748b" }}>
                Clear
              </Button>
            )}
          </div>
        )}

        {saveLabel && mode !== "saved" && (
          <Checkbox checked={keep} onChange={(e) => setKeep(e.target.checked)} style={{ marginTop: 10 }}>
            <span style={{ fontSize: 13 }}>{saveLabel}</span>
          </Checkbox>
        )}
      </div>
    );
  }
);

SignaturePad.displayName = "SignaturePad";

export default SignaturePad;
