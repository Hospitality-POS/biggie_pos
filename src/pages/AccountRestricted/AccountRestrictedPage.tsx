import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Typography } from "antd";
import { LockOutlined, PauseCircleOutlined, StopOutlined } from "@ant-design/icons";
import { THEME_C } from "@utils/getPrimaryColor";

const { Title, Text } = Typography;
const C = THEME_C;

/**
 * Shown when the API rejects a staff member whose account is suspended or
 * terminated (403, code ACCOUNT_INACTIVE) — at sign-in or mid-session. The
 * request interceptor has already signed them out before sending them here.
 */
const CONTENT = {
  suspended: {
    icon: <PauseCircleOutlined />,
    color: "#f59e0b",
    bg: "#fffbeb",
    title: "Your account is suspended",
    body: "Your access has been paused by an administrator. You can't sign in or use the system until your account is reactivated.",
    points: [
      "Your records and history are kept as they were.",
      "Access comes back as soon as an administrator reactivates you.",
    ],
  },
  terminated: {
    icon: <StopOutlined />,
    color: "#ef4444",
    bg: "#fef2f2",
    title: "Your account has been terminated",
    body: "This account has been closed by an administrator and can no longer be used to sign in.",
    points: [
      "If you think this is a mistake, speak to your administrator.",
      "Work you recorded stays in the system for the business.",
    ],
  },
} as const;

const getCompanyName = () => {
  try {
    const tenant = JSON.parse(localStorage.getItem("tenant") || "null");
    return tenant?.name || tenant?.company_name || tenant?.tenant_name || "";
  } catch {
    return "";
  }
};

const AccountRestrictedPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const status = params.get("status") === "terminated" ? "terminated" : "suspended";
  const content = CONTENT[status];
  const company = getCompanyName();

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: C.bg,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          background: "#ffffff",
          border: `1px solid ${C.border}`,
          borderTop: `4px solid ${content.color}`,
          borderRadius: 14,
          padding: "32px 28px 28px",
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            margin: "0 auto 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: content.bg,
            color: content.color,
            fontSize: 30,
          }}
        >
          {content.icon}
        </div>

        <Title level={4} style={{ margin: 0, color: C.darkText }}>{content.title}</Title>
        {company && (
          <Text style={{ fontSize: 12, color: C.subText, display: "block", marginTop: 4 }}>{company}</Text>
        )}

        <Text style={{ fontSize: 14, color: "#475569", display: "block", margin: "16px 0 18px", lineHeight: 1.6 }}>
          {content.body}
        </Text>

        <div
          style={{
            textAlign: "left",
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "12px 14px",
            marginBottom: 22,
          }}
        >
          {content.points.map((p) => (
            <div key={p} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "3px 0" }}>
              <LockOutlined style={{ color: content.color, fontSize: 12, marginTop: 4 }} />
              <Text style={{ fontSize: 13, color: "#475569" }}>{p}</Text>
            </div>
          ))}
        </div>

        <Button type="primary" block size="large" onClick={() => navigate("/login", { replace: true })}
          style={{ borderRadius: 8, fontWeight: 500 }}>
          Back to sign in
        </Button>
        <Text style={{ fontSize: 12, color: C.subText, display: "block", marginTop: 12 }}>
          Signing in as someone else? Use their PIN or email on the sign-in page.
        </Text>
      </div>
    </div>
  );
};

export default AccountRestrictedPage;
