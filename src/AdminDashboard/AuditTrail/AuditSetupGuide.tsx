import React, { useState } from "react";
import { Alert, Button, Modal, Segmented, Typography } from "antd";
import { PoweroffOutlined, QuestionCircleOutlined, SafetyCertificateOutlined } from "@ant-design/icons";

const { Text, Paragraph } = Typography;

const C = { text: "#0f172a", sub: "#64748b", border: "#e2e8f0", codeBg: "#0f172a", codeText: "#e2e8f0" };

type Mode = "on" | "off";

/** This business's company code, as used in AUDIT_TENANTS. */
const getCompanyCode = (): string => {
  try {
    const stored = localStorage.getItem("companyCode");
    if (stored) return stored;
    return JSON.parse(localStorage.getItem("tenant") || "null")?.tenant_code || "YOUR-COMPANY-CODE";
  } catch {
    return "YOUR-COMPANY-CODE";
  }
};

const CodeBlock: React.FC<{ code: string }> = ({ code }) => (
  <div style={{ position: "relative", margin: "6px 0 10px" }}>
    <pre
      style={{
        background: C.codeBg,
        color: C.codeText,
        borderRadius: 8,
        padding: "10px 44px 10px 12px",
        margin: 0,
        fontSize: 12.5,
        lineHeight: 1.6,
        overflowX: "auto",
        whiteSpace: "pre",
      }}
    >
      {code}
    </pre>
    <Paragraph
      copyable={{ text: code, tooltips: ["Copy", "Copied"] }}
      style={{ position: "absolute", top: 6, right: 8, margin: 0 }}
    />
  </div>
);

const Step: React.FC<{ n: number; title: React.ReactNode; children?: React.ReactNode }> = ({ n, title, children }) => (
  <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
    <span
      style={{
        flexShrink: 0,
        width: 22,
        height: 22,
        borderRadius: 999,
        background: "#eef2ff",
        color: "#4f46e5",
        fontSize: 12,
        fontWeight: 600,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 1,
      }}
    >
      {n}
    </span>
    <div style={{ minWidth: 0, flex: 1 }}>
      <Text style={{ color: C.text }}>{title}</Text>
      {children}
    </div>
  </div>
);

/** Step-by-step instructions for switching the audit trail on or off. */
export const AuditSetupSteps: React.FC<{ mode: Mode }> = ({ mode }) => {
  const code = getCompanyCode();

  if (mode === "on") {
    return (
      <div>
        <Step n={1} title={<>Open the <Text code>.env</Text> file of the Base API server (biggie_api), or its environment settings on your host.</>} />
        <Step n={2} title="Add these two lines:">
          <CodeBlock code={`AUDIT_ENABLED=true\nAUDIT_TENANTS=${code}`} />
          <Text style={{ fontSize: 12, color: C.sub }}>
            To include more businesses, separate their codes with commas (<Text code>{`${code},BP-000000`}</Text>). Use{" "}
            <Text code>*</Text> for every business.
          </Text>
        </Step>
        <Step n={3} title="Restart the API server." />
        <Step n={4} title="Make a change in Base (for example, edit a product), wait a few seconds, then click Refresh on this page." />
        <Text style={{ fontSize: 12, color: C.sub, display: "block", marginTop: 4 }}>
          Optional: <Text code>AUDIT_CAPTURE_BEFORE=true</Text> also records the old value of each change (one extra database
          read per update on products, payments, staff and settings). Activity is kept for 90 days.
        </Text>
      </div>
    );
  }

  return (
    <div>
      <Step n={1} title={<>Open the <Text code>.env</Text> file of the Base API server (biggie_api), or its environment settings on your host.</>} />
      <Step n={2} title="Choose who to turn it off for:">
        <Text strong style={{ display: "block", fontSize: 12.5, marginTop: 6 }}>
          Only this business
        </Text>
        <Text style={{ fontSize: 12.5, color: C.sub }}>
          Remove <Text code>{code}</Text> from <Text code>AUDIT_TENANTS</Text>. If it was the only code, use the line below instead.
        </Text>
        <Text strong style={{ display: "block", fontSize: 12.5, marginTop: 8 }}>
          Every business
        </Text>
        <CodeBlock code="AUDIT_ENABLED=false" />
      </Step>
      <Step n={3} title="Restart the API server." />
      <Text style={{ fontSize: 12, color: C.sub, display: "block", marginTop: 4 }}>
        Recording stops straight away. Activity already recorded stays visible here until it expires after 90 days.
      </Text>
    </div>
  );
};

/** Shown on both tabs while this business isn't in the rollout. */
export const AuditOffNotice: React.FC = () => {
  const [showSteps, setShowSteps] = useState(true);
  return (
    <Alert
      type="info"
      showIcon
      icon={<PoweroffOutlined />}
      message={<Text strong>The audit trail isn't switched on for this business yet</Text>}
      description={
        <div>
          <Text style={{ color: C.sub }}>
            Nothing new is being recorded. Activity recorded earlier still shows below. It's a server setting, so someone
            with access to the Base API server needs to turn it on.
          </Text>
          <div style={{ marginTop: 8 }}>
            <Button type="link" size="small" onClick={() => setShowSteps((v) => !v)} style={{ padding: 0 }}>
              {showSteps ? "Hide instructions" : "How to turn it on"}
            </Button>
          </div>
          {showSteps && (
            <div
              style={{
                marginTop: 10,
                background: "#fff",
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: 14,
              }}
            >
              <AuditSetupSteps mode="on" />
            </div>
          )}
        </div>
      }
    />
  );
};

/** Header button: how to turn the audit trail on or off. */
export const AuditSetupButton: React.FC<{ enabled?: boolean }> = ({ enabled }) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>(enabled === false ? "on" : "off");

  return (
    <>
      <Button
        icon={<QuestionCircleOutlined />}
        onClick={() => {
          setMode(enabled === false ? "on" : "off");
          setOpen(true);
        }}
      >
        Turn on/off
      </Button>
      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        footer={<Button onClick={() => setOpen(false)}>Close</Button>}
        title={
          <span>
            <SafetyCertificateOutlined style={{ color: "#4f46e5", marginRight: 8 }} />
            Turn the audit trail on or off
          </span>
        }
        width={560}
      >
        <div style={{ marginBottom: 14 }}>
          <Text style={{ color: C.sub }}>
            Status for this business:{" "}
            {enabled === undefined ? (
              <Text strong>checking…</Text>
            ) : enabled ? (
              <Text strong style={{ color: "#047857" }}>On</Text>
            ) : (
              <Text strong style={{ color: "#b45309" }}>Off</Text>
            )}
            . These are server settings, so changing them needs access to the Base API server.
          </Text>
        </div>
        <Segmented
          block
          value={mode}
          onChange={(v) => setMode(v as Mode)}
          options={[
            { label: "Turn on", value: "on" },
            { label: "Turn off", value: "off" },
          ]}
          style={{ marginBottom: 16 }}
        />
        <AuditSetupSteps mode={mode} />
      </Modal>
    </>
  );
};
