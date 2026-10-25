import React, { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import { Button, Input, Segmented, Typography } from "antd";
import { EditOutlined, FontSizeOutlined, ReloadOutlined } from "@ant-design/icons";
import type { SignatureInput } from "./types";

const { Text } = Typography;

export interface SignaturePadHandle {
  /** The signature to send, or null when nothing has been drawn/typed. */
  value: () => SignatureInput | null;
  clear: () => void;
}

interface Props {
  signerName: string;
  onSignerNameChange: (name: string) => void;
  /** Called whenever the pad goes from empty to signed or back */
  onChange?: (hasSignature: boolean) => void;
  height?: number;
  nameLabel?: string;
}

const INK = "#0f172a";

/**
 * Signature capture that works with a finger, stylus or mouse (pointer
 * events), stays sharp on high-density tablet screens, and offers typing
 * the name instead of drawing.
 */
const SignaturePad = forwardRef<SignaturePadHandle, Props>(
  ({ signerName, onSignerNameChange, onChange, height = 180, nameLabel = "Full name" }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const wrapRef = useRef<HTMLDivElement>(null);
    const drawing = useRef(false);
    const last = useRef<{ x: number; y: number } | null>(null);
    const [mode, setMode] = useState<"draw" | "type">("draw");
    const [hasInk, setHasInk] = useState(false);

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
    const resize = useCallback((force = false) => {
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
    }, [height, setInk]);

    useEffect(() => {
      if (mode !== "draw") return;
      resize(true);
      const observer = new ResizeObserver(() => resize());
      if (wrapRef.current) observer.observe(wrapRef.current);
      return () => observer.disconnect();
    }, [mode, resize]);

    const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
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
        if (!name) return null;
        if (mode === "type") return { signer_name: name, method: "type", typed_name: name };
        if (!hasInk || !canvasRef.current) return null;
        return { signer_name: name, method: "draw", data: canvasRef.current.toDataURL("image/png") };
      },
      clear,
    }));

    useEffect(() => {
      if (mode === "type") onChange?.(!!signerName.trim());
    }, [mode, signerName, onChange]);

    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 220px" }}>
            <Text style={{ fontSize: 12.5, color: "#64748b", display: "block", marginBottom: 4 }}>{nameLabel}</Text>
            <Input
              size="large"
              value={signerName}
              onChange={(e) => onSignerNameChange(e.target.value)}
              placeholder="Your full name"
              autoComplete="name"
            />
          </div>
          <Segmented
            value={mode}
            onChange={(v) => setMode(v as "draw" | "type")}
            options={[
              { value: "draw", label: "Draw", icon: <EditOutlined /> },
              { value: "type", label: "Type", icon: <FontSizeOutlined /> },
            ]}
            style={{ alignSelf: "flex-end" }}
          />
        </div>

        {mode === "draw" ? (
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
            <div
              style={{
                position: "absolute",
                left: 20,
                right: 20,
                bottom: 34,
                borderBottom: "1px solid #e2e8f0",
                pointerEvents: "none",
              }}
            />
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
        ) : (
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
              fontFamily: '"Brush Script MT", "Segoe Script", "Lucida Handwriting", cursive',
              fontSize: 40,
              color: signerName.trim() ? INK : "#cbd5e1",
              overflow: "hidden",
              whiteSpace: "nowrap",
            }}
          >
            {signerName.trim() || "Your name"}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
          <Text style={{ fontSize: 11.5, color: "#94a3b8" }}>
            {mode === "type" ? "Typing your name counts as your signature." : "Use your finger, a stylus or the mouse."}
          </Text>
          {mode === "draw" && (
            <Button size="small" type="text" icon={<ReloadOutlined />} onClick={clear} style={{ color: "#64748b" }}>
              Clear
            </Button>
          )}
        </div>
      </div>
    );
  }
);

SignaturePad.displayName = "SignaturePad";

export default SignaturePad;
