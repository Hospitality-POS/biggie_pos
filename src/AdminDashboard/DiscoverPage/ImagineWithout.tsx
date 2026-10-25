import React, { useEffect, useRef, useState } from "react";
import { Grid, Typography } from "antd";
import { ArrowRightOutlined } from "@ant-design/icons";
import { THEME_C } from "@utils/getPrimaryColor";

const { Text, Title } = Typography;
const C = THEME_C;

type Mode = "without" | "with";

interface Piece {
  key: string;
  /** Basepoint integration it becomes (opens its Learn More) */
  integrationId: string;
  emoji: string;
  without: { title: string; pain: string };
  with: { app: string; text: string; color: string };
  /** Scattered position (centre, % of the stage) and tilt */
  mess: { x: number; y: number; r: number };
  /** Tidy position around the hub (centre, % of the stage) */
  tidy: { x: number; y: number };
}

// Eight tools a growing business juggles, and what each becomes in Basepoint
const PIECES: Piece[] = [
  {
    key: "stock",
    integrationId: "relia_pos",
    emoji: "📊",
    without: { title: "Stock in a spreadsheet", pain: "Counted by hand, never matches the shelf" },
    with: { app: "Duka", text: "Live stock on every sale", color: "#3b82f6" },
    mess: { x: 20, y: 18, r: -7 },
    tidy: { x: 50, y: 11 },
  },
  {
    key: "receipts",
    integrationId: "relia_pos",
    emoji: "🧾",
    without: { title: "Paper receipt books", pain: "End-of-day totals added up on a calculator" },
    with: { app: "Duka", text: "POS, tables, rooms & receipts", color: "#3b82f6" },
    mess: { x: 76, y: 16, r: 6 },
    tidy: { x: 78, y: 25 },
  },
  {
    key: "books",
    integrationId: "relia_accounting",
    emoji: "🧮",
    without: { title: "Accountant re-types sales", pain: "Books are weeks behind the till" },
    with: { app: "Pesa", text: "Sales post to the books automatically", color: "#10b981" },
    mess: { x: 47, y: 38, r: 4 },
    tidy: { x: 84, y: 50 },
  },
  {
    key: "payroll",
    integrationId: "relia_payroll",
    emoji: "💼",
    without: { title: "Payroll in Excel", pain: "PAYE, NSSF & SHA worked out by hand every month" },
    with: { app: "Bandu HR", text: "Payroll, payslips, P9s & leave", color: "#f59e0b" },
    mess: { x: 80, y: 48, r: -5 },
    tidy: { x: 78, y: 76 },
  },
  {
    key: "forms",
    integrationId: "relia_payroll",
    emoji: "📝",
    without: { title: "Paper forms in a drawer", pain: "Consent, onboarding & NDA forms lost or unsigned" },
    with: { app: "Forms & Plans", text: "E-signed forms, onboarding & treatment plans", color: "#8b5cf6" },
    mess: { x: 18, y: 56, r: 8 },
    tidy: { x: 50, y: 88 },
  },
  {
    key: "chats",
    integrationId: "mteja",
    emoji: "💬",
    without: { title: "Orders in personal WhatsApp", pain: "Messages missed when the phone walks out the door" },
    with: { app: "Mteja", text: "One shared WhatsApp inbox that sells", color: "#6366f1" },
    mess: { x: 56, y: 68, r: -4 },
    tidy: { x: 22, y: 76 },
  },
  {
    key: "rent",
    integrationId: "dala",
    emoji: "🏠",
    without: { title: "Rent in a notebook", pain: "Who paid? Who's late? Nobody's sure" },
    with: { app: "Dala", text: "Units, tenants & rent collection", color: "#14b8a6" },
    mess: { x: 28, y: 84, r: 5 },
    tidy: { x: 16, y: 50 },
  },
  {
    key: "kra",
    integrationId: "etims",
    emoji: "🏛️",
    without: { title: "KRA invoices done separately", pain: "Re-keyed into the portal, penalties if late" },
    with: { app: "eTIMS", text: "Tax invoices sent to KRA as you sell", color: "#4f46e5" },
    mess: { x: 78, y: 82, r: -8 },
    tidy: { x: 22, y: 25 },
  },
];

// Tangled links between the scattered tools (indexes into PIECES)
const TANGLE: [number, number][] = [
  [0, 2], [1, 3], [2, 5], [0, 6], [3, 4], [1, 5], [4, 7], [6, 2], [7, 0], [5, 3],
];

const STATS: Record<Mode, { value: string; label: string }[]> = {
  without: [
    { value: "8+", label: "separate tools & notebooks" },
    { value: "Hours", label: "of re-typing every week" },
    { value: "?", label: "numbers that never match" },
  ],
  with: [
    { value: "1", label: "login for the whole business" },
    { value: "0", label: "re-typing between apps" },
    { value: "Live", label: "reports across every branch" },
  ],
};

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * "Imagine without Basepoint": a business's scattered tools (spreadsheets,
 * paper books, personal WhatsApp…) snap into one connected suite when the
 * toggle flips to "With Basepoint". Cards open that app's Learn More.
 */
const ImagineWithout: React.FC<{ onLearnMore: (integrationId: string) => void }> = ({ onLearnMore }) => {
  const screens = Grid.useBreakpoint();
  const isPhone = !screens.md;
  const [mode, setMode] = useState<Mode>("without");
  const touched = useRef(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const tidy = mode === "with";

  // Play the transformation once, the first time the section scrolls into view
  useEffect(() => {
    const el = stageRef.current;
    if (!el || reducedMotion() || typeof IntersectionObserver === "undefined") return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          io.disconnect();
          timer = setTimeout(() => {
            if (!touched.current) setMode("with");
          }, 2200);
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, []);

  const choose = (m: Mode) => {
    touched.current = true;
    setMode(m);
  };

  const ease = reducedMotion() ? "none" : "all .9s cubic-bezier(.2,.8,.2,1)";

  const toggle = (
    <div
      role="tablist"
      aria-label="Imagine without Basepoint"
      style={{ display: "inline-flex", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 999, padding: 4, gap: 4 }}
    >
      {(["without", "with"] as Mode[]).map((m) => {
        const on = mode === m;
        return (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => choose(m)}
            style={{
              border: "none",
              cursor: "pointer",
              borderRadius: 999,
              padding: isPhone ? "7px 14px" : "8px 18px",
              fontSize: 13,
              fontWeight: 600,
              background: on ? (m === "with" ? C.primary : "#334155") : "transparent",
              color: on ? "#fff" : C.subText,
              transition: "background .2s ease, color .2s ease",
              whiteSpace: "nowrap",
            }}
          >
            {m === "without" ? "Without Basepoint" : "With Basepoint"}
          </button>
        );
      })}
    </div>
  );

  // ── Phone: a grid of cards that flip between the two worlds ────────────────
  const phoneGrid = (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      {PIECES.map((p, i) => (
        <button
          key={p.key}
          type="button"
          onClick={() => tidy && onLearnMore(p.integrationId)}
          style={{
            textAlign: "left",
            border: `1px ${tidy ? "solid" : "dashed"} ${tidy ? `${p.with.color}40` : "#cbd5e1"}`,
            background: tidy ? "#fff" : "#fffdf7",
            borderRadius: 12,
            padding: "10px 11px",
            cursor: tidy ? "pointer" : "default",
            transform: tidy ? "none" : `rotate(${i % 2 ? 1.5 : -1.5}deg)`,
            transition: ease,
            minHeight: 92,
          }}
        >
          <div style={{ fontSize: 18, marginBottom: 4 }}>{p.emoji}</div>
          {tidy ? (
            <>
              <Text strong style={{ fontSize: 12.5, color: p.with.color, display: "block" }}>{p.with.app}</Text>
              <Text style={{ fontSize: 11.5, color: C.subText, lineHeight: 1.4 }}>{p.with.text}</Text>
            </>
          ) : (
            <>
              <Text strong style={{ fontSize: 12.5, color: "#334155", display: "block" }}>{p.without.title}</Text>
              <Text style={{ fontSize: 11.5, color: "#b45309", lineHeight: 1.4 }}>{p.without.pain}</Text>
            </>
          )}
        </button>
      ))}
    </div>
  );

  // ── Tablet & desktop: scattered pieces snap into a ring around the hub ────
  const stage = (
    <div
      style={{
        position: "relative",
        height: screens.lg ? 480 : 440,
        borderRadius: 16,
        overflow: "hidden",
        background: tidy
          ? `radial-gradient(circle at 50% 50%, ${C.primary}14 0%, #f8fafc 55%)`
          : "repeating-linear-gradient(0deg, #fffdf5, #fffdf5 27px, #f1ece0 28px)",
        border: `1px solid ${C.border}`,
        transition: reducedMotion() ? "none" : "background .9s ease",
      }}
    >
      {/* Links: tangled dashes without, clean spokes with */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} aria-hidden>
        {TANGLE.map(([a, b], i) => (
          <path
            key={`t${i}`}
            d={`M ${PIECES[a].mess.x} ${PIECES[a].mess.y} Q ${(PIECES[a].mess.x + PIECES[b].mess.x) / 2 + (i % 2 ? 14 : -14)} ${(PIECES[a].mess.y + PIECES[b].mess.y) / 2 + (i % 3 ? 10 : -10)} ${PIECES[b].mess.x} ${PIECES[b].mess.y}`}
            fill="none"
            stroke="#ef4444"
            strokeOpacity={tidy ? 0 : 0.35}
            strokeWidth={0.35}
            strokeDasharray="1.2 1"
            vectorEffect="non-scaling-stroke"
            style={{ transition: reducedMotion() ? "none" : "stroke-opacity .5s ease" }}
          />
        ))}
        {PIECES.map((p) => (
          <line
            key={`s${p.key}`}
            x1={50}
            y1={50}
            x2={p.tidy.x}
            y2={p.tidy.y}
            stroke={p.with.color}
            strokeOpacity={tidy ? 0.45 : 0}
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
            style={{ transition: reducedMotion() ? "none" : "stroke-opacity .6s ease .4s" }}
          />
        ))}
      </svg>

      {/* The hub */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: `translate(-50%, -50%) scale(${tidy ? 1 : 0.4})`,
          opacity: tidy ? 1 : 0,
          transition: ease,
          width: 150,
          height: 150,
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${C.primary} 0%, #6366f1 100%)`,
          boxShadow: `0 16px 40px ${C.primary}55`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          textAlign: "center",
          zIndex: 2,
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>Basepoint</div>
        <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>one system, one login</div>
      </div>

      {/* The pieces */}
      {PIECES.map((p, i) => {
        const pos = tidy ? p.tidy : p.mess;
        return (
          <button
            key={p.key}
            type="button"
            onClick={() => tidy && onLearnMore(p.integrationId)}
            aria-label={tidy ? `${p.with.app}: ${p.with.text}. Learn more` : `${p.without.title}: ${p.without.pain}`}
            style={{
              position: "absolute",
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: tidy ? "translate(-50%, -50%)" : `translate(-50%, -50%) rotate(${p.mess.r}deg)`,
              width: screens.lg ? 196 : 172,
              textAlign: "left",
              padding: "10px 12px",
              borderRadius: 12,
              border: `1px ${tidy ? "solid" : "dashed"} ${tidy ? `${p.with.color}55` : "#d6cdb8"}`,
              background: tidy ? "#fff" : i % 3 === 0 ? "#fff9c4" : i % 3 === 1 ? "#fff" : "#ecfccb",
              boxShadow: tidy ? "0 6px 18px rgba(15,23,42,.08)" : "2px 4px 0 rgba(0,0,0,.06)",
              cursor: tidy ? "pointer" : "default",
              transition: `${ease}, transform .9s cubic-bezier(.2,.8,.2,1)`,
              transitionDelay: reducedMotion() ? "0s" : `${tidy ? i * 0.05 : 0}s`,
              zIndex: 3,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 20, lineHeight: 1 }}>{p.emoji}</span>
              <div style={{ minWidth: 0 }}>
                {tidy ? (
                  <>
                    <Text strong style={{ fontSize: 13, color: p.with.color, display: "block", lineHeight: 1.25 }}>{p.with.app}</Text>
                    <Text style={{ fontSize: 11.5, color: C.subText, lineHeight: 1.35, display: "block" }}>{p.with.text}</Text>
                  </>
                ) : (
                  <>
                    <Text strong style={{ fontSize: 12.5, color: "#334155", display: "block", lineHeight: 1.25 }}>{p.without.title}</Text>
                    <Text style={{ fontSize: 11.5, color: "#b45309", lineHeight: 1.35, display: "block" }}>{p.without.pain}</Text>
                  </>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );

  return (
    <section
      style={{
        background: "#fff",
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: isPhone ? 14 : 22,
        marginBottom: 24,
      }}
    >
      <div style={{ display: "flex", alignItems: isPhone ? "flex-start" : "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ minWidth: 0 }}>
          <Title level={isPhone ? 5 : 4} style={{ margin: 0, color: C.darkText, letterSpacing: -0.3 }}>
            Imagine {tidy ? "with" : "without"} <span style={{ color: tidy ? C.primary : "#ef4444", transition: "color .4s ease" }}>Basepoint</span>
          </Title>
          <Text style={{ fontSize: 13, color: C.subText }}>
            {tidy
              ? "Every part of the business in one place — tap an app to see what it does."
              : "Spreadsheets, paper books and chats that don't talk to each other."}
          </Text>
        </div>
        {toggle}
      </div>

      <div ref={stageRef}>{isPhone ? phoneGrid : stage}</div>

      <div style={{ display: "grid", gridTemplateColumns: `repeat(3, 1fr)`, gap: isPhone ? 8 : 14, marginTop: 16 }}>
        {STATS[mode].map((s) => (
          <div
            key={s.label}
            style={{
              background: tidy ? C.primaryLight : "#fef2f2",
              border: `1px solid ${tidy ? `${C.primary}25` : "#fecaca"}`,
              borderRadius: 12,
              padding: isPhone ? "10px 8px" : "12px 16px",
              transition: "background .4s ease, border-color .4s ease",
            }}
          >
            <div style={{ fontSize: isPhone ? 18 : 22, fontWeight: 800, color: tidy ? C.primary : "#dc2626", lineHeight: 1.1 }}>{s.value}</div>
            <Text style={{ fontSize: isPhone ? 11 : 12, color: C.subText }}>{s.label}</Text>
          </div>
        ))}
      </div>

      {!tidy && (
        <div style={{ textAlign: "center", marginTop: 14 }}>
          <button
            type="button"
            onClick={() => choose("with")}
            style={{ border: "none", background: "none", color: C.primary, fontWeight: 600, fontSize: 13, cursor: "pointer" }}
          >
            See it with Basepoint <ArrowRightOutlined />
          </button>
        </div>
      )}
    </section>
  );
};

export default ImagineWithout;
