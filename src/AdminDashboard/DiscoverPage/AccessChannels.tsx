import React, { useEffect, useState } from "react";
import { Button, Grid, Typography, message } from "antd";
import {
  AndroidOutlined,
  CopyOutlined,
  DesktopOutlined,
  DownloadOutlined,
  GlobalOutlined,
  MobileOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { QRCodeSVG } from "qrcode.react";
import { THEME_C } from "@utils/getPrimaryColor";
import { BASE_ONE_PLAY_STORE_URL } from "@utils/appLinks";

const { Text, Title } = Typography;
const C = THEME_C;

const BASE_DOMAIN = "basepoint.co.ke";
const BASE_ONE_COLOR = "#10b981";

// What each role does in Base One (it follows the products and permissions they have)
const BASE_ONE_ROLES: { who: string; what: string }[] = [
  { who: "Owners & managers", what: "Sales, branch performance, P&L and business health" },
  { who: "Cashiers & waiters", what: "Sell, take table orders, receive payments and manage stock" },
  { who: "Every staff member", what: "Clock in, request leave and download payslips" },
  { who: "Sales & property teams", what: "WhatsApp chats and targets in Mteja, rent and meter readings in Dala" },
];

interface Channel {
  key: string;
  icon: React.ReactNode;
  color: string;
  title: string;
  who: string;
  text: string;
  steps: string[];
  action?: React.ReactNode;
}

// The tenant's own address when we're on it, otherwise the pattern to use
const webAddress = () => {
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  return host.endsWith(`.${BASE_DOMAIN}`) ? host : `yourbusiness.${BASE_DOMAIN}`;
};

/** "Ways to access Basepoint": the Base One mobile app, web, PWA and desktop. */
const AccessChannels: React.FC = () => {
  const screens = Grid.useBreakpoint();
  const isPhone = !screens.md;
  const address = webAddress();
  const isOwnAddress = !address.startsWith("yourbusiness.");

  // Chrome/Edge offer an install prompt for the PWA; keep it for the Install button
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [installed, setInstalled] = useState(
    () => typeof window !== "undefined" && window.matchMedia?.("(display-mode: standalone)").matches
  );
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setInstallPrompt(null);
  };

  const copyAddress = () => {
    navigator.clipboard?.writeText(`https://${address}`).then(
      () => message.success("Link copied"),
      () => message.error("Couldn't copy the link")
    );
  };

  const CHANNELS: Channel[] = [
    {
      key: "web",
      icon: <GlobalOutlined />,
      color: "#3b82f6",
      title: "Web",
      who: "Everyone, on any device",
      text: "Open your business in any browser — nothing to install.",
      steps: [
        `Go to ${address}`,
        "Sign in with your staff details",
        "Bookmark it for next time",
      ],
      action: isOwnAddress ? (
        <Button icon={<CopyOutlined />} onClick={copyAddress}>Copy link</Button>
      ) : undefined,
    },
    {
      key: "pwa",
      icon: <MobileOutlined />,
      color: "#8b5cf6",
      title: "Installed web app (PWA)",
      who: "Tills, tablets & phones",
      text: "Add Basepoint to the home screen or desktop so it opens full-screen like an app.",
      steps: [
        "Chrome / Edge: click Install in the address bar",
        "Android: menu ⋮ → Add to Home screen",
        "iPhone / iPad (Safari): Share → Add to Home Screen",
      ],
      action: installed ? (
        <Text style={{ color: "#10b981", fontWeight: 600 }}><CheckCircleOutlined /> Installed on this device</Text>
      ) : installPrompt ? (
        <Button type="primary" icon={<DownloadOutlined />} onClick={install}>Install now</Button>
      ) : undefined,
    },
    {
      key: "desktop",
      icon: <DesktopOutlined />,
      color: "#0ea5e9",
      title: "Desktop app",
      who: "Windows POS counters",
      text: "A dedicated Windows app for the counter, with direct receipt printing.",
      steps: [
        "Download the installer",
        "Run it and follow the setup",
        "Open Basepoint from the Start menu",
      ],
      action: (
        <Button icon={<DownloadOutlined />} href="/download" target="_blank" rel="noopener noreferrer">
          Download for Windows
        </Button>
      ),
    },
  ];

  const baseOne = (
    <div
      style={{
        background: `linear-gradient(135deg, ${BASE_ONE_COLOR}10 0%, #fff 60%)`,
        border: `1px solid ${BASE_ONE_COLOR}40`,
        borderTop: `3px solid ${BASE_ONE_COLOR}`,
        borderRadius: 14,
        padding: isPhone ? 14 : 20,
        marginBottom: 16,
        display: "flex",
        flexDirection: isPhone ? "column" : "row",
        gap: isPhone ? 14 : 24,
        alignItems: isPhone ? "stretch" : "center",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ background: `${BASE_ONE_COLOR}15`, color: BASE_ONE_COLOR, borderRadius: 10, padding: "7px 9px", fontSize: 18, lineHeight: 1 }}>
            <AndroidOutlined />
          </div>
          <div style={{ minWidth: 0 }}>
            <Text strong style={{ fontSize: 16, color: C.darkText, display: "block", lineHeight: 1.25 }}>
              Base One app <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: BASE_ONE_COLOR, borderRadius: 999, padding: "1px 8px", marginLeft: 6, verticalAlign: 2 }}>NEW</span>
            </Text>
            <Text style={{ fontSize: 12, color: BASE_ONE_COLOR, fontWeight: 600 }}>One app for owners and every staff member</Text>
          </div>
        </div>

        <Text style={{ fontSize: 13, color: C.subText, display: "block", marginBottom: 12 }}>
          Your whole business on Android. Everyone signs in with their staff details and sees only the products and
          tools their role allows. It replaces the separate Owner and Waiter apps.
        </Text>

        <div style={{ display: "grid", gridTemplateColumns: isPhone ? "1fr" : "1fr 1fr", gap: 8, marginBottom: 14 }}>
          {BASE_ONE_ROLES.map((r) => (
            <div key={r.who} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 10px" }}>
              <Text strong style={{ fontSize: 12.5, color: C.darkText, display: "block" }}>{r.who}</Text>
              <Text style={{ fontSize: 12, color: C.subText, lineHeight: 1.4 }}>{r.what}</Text>
            </div>
          ))}
        </div>

        <ol style={{ paddingLeft: 18, margin: "0 0 14px", color: C.darkText, fontSize: 12.5, lineHeight: 1.7 }}>
          <li>Get Base One from Google Play</li>
          <li>Enter your company code</li>
          <li>Sign in with your password, PIN or email code</li>
        </ol>

        <Button
          type="primary"
          icon={<DownloadOutlined />}
          href={BASE_ONE_PLAY_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{ background: BASE_ONE_COLOR, borderColor: BASE_ONE_COLOR }}
        >
          Get it on Google Play
        </Button>
      </div>

      {!isPhone && (
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, display: "inline-block" }}>
            <QRCodeSVG value={BASE_ONE_PLAY_STORE_URL} size={148} level="M" />
          </div>
          <Text style={{ fontSize: 12, color: C.subText, display: "block", marginTop: 6 }}>Scan with your phone</Text>
        </div>
      )}
    </div>
  );

  return (
    <section>
      <div style={{ marginBottom: 16 }}>
        <Title level={isPhone ? 5 : 4} style={{ margin: 0, color: C.darkText, letterSpacing: -0.3 }}>
          One account, every screen
        </Title>
        <Text style={{ fontSize: 13, color: C.subText }}>
          Your team can reach Basepoint in four ways. Pick what suits each person and device.
        </Text>
      </div>

      {baseOne}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isPhone ? "1fr" : screens.xl ? "repeat(3, 1fr)" : "repeat(2, 1fr)",
          gap: 16,
        }}
      >
        {CHANNELS.map((ch) => (
          <div
            key={ch.key}
            style={{
              background: "#fff",
              border: `1px solid ${C.border}`,
              borderTop: `3px solid ${ch.color}`,
              borderRadius: 14,
              padding: isPhone ? 14 : 18,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ background: `${ch.color}15`, color: ch.color, borderRadius: 10, padding: "7px 9px", fontSize: 18, lineHeight: 1 }}>
                {ch.icon}
              </div>
              <div style={{ minWidth: 0 }}>
                <Text strong style={{ fontSize: 15, color: C.darkText, display: "block", lineHeight: 1.25 }}>{ch.title}</Text>
                <Text style={{ fontSize: 12, color: ch.color, fontWeight: 600 }}>{ch.who}</Text>
              </div>
            </div>

            <Text style={{ fontSize: 13, color: C.subText, marginBottom: 12 }}>{ch.text}</Text>

            {ch.key === "web" && (
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 13,
                  background: C.bg,
                  border: `1px dashed ${C.border}`,
                  borderRadius: 8,
                  padding: "8px 10px",
                  marginBottom: 12,
                  wordBreak: "break-all",
                }}
              >
                https://<strong style={{ color: ch.color }}>{address.replace(`.${BASE_DOMAIN}`, "")}</strong>.{BASE_DOMAIN}
              </div>
            )}

            <ol style={{ paddingLeft: 18, margin: "0 0 14px", color: C.darkText, fontSize: 12.5, lineHeight: 1.7 }}>
              {ch.steps.map((s) => <li key={s}>{s}</li>)}
            </ol>

            {ch.action && <div style={{ marginTop: "auto" }}>{ch.action}</div>}
          </div>
        ))}
      </div>
    </section>
  );
};

export default AccessChannels;
