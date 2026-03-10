import { useCallback, useMemo, useState } from "react";
import {
  Button, Form, Input, message, Rate, Result, Typography,
} from "antd";
import {
  CheckCircleOutlined, CommentOutlined, CopyOutlined, LeftOutlined,
  MailOutlined, PhoneOutlined, QrcodeOutlined, SaveOutlined,
  StarOutlined, UserAddOutlined, UserOutlined,
} from "@ant-design/icons";
import { logCustomerVisit, addNewCustomer } from "@services/customers";
import { PhoneInput } from "@components/PhoneNumber/PhoneNumber";
import { getPhoneNumber } from "@components/PhoneNumber/utils/formatPhoneNumberUtil";
import { fetchTenantById } from "@services/users";
import { useQuery } from "@tanstack/react-query";

const { Title, Text, Paragraph } = Typography;

// ── Palette ────────────────────────────────────────────────────────────────
const C = {
  primary: "#6c1c2c",
  primaryLight: "#f9f0f2",
  green: "#10b981",
  subText: "#64748b",
  darkText: "#0f172a",
  border: "#e2e8f0",
  bg: "#f8fafc",
};

// ── Welcome messages ───────────────────────────────────────────────────────
const WELCOME_MSGS = [
  "🎉 Great to see you again! 🙌",
  "We missed you, welcome back! ❤️",
  "Hello again, ready for something new? 🚀",
  "It's awesome to have you back! 😄",
  "You're back! Let's get started! 💪",
  "Back at it again! We've got more in store for you! 🎁",
  "Welcome back, your favourite spot is waiting! 🏆",
  "Always a pleasure to see you return! 🌟",
  "We're thrilled to have you back! 💙",
];

// ── Field label helper ─────────────────────────────────────────────────────
const FieldLabel = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
    <span style={{ color: C.primary, fontSize: 16 }}>{icon}</span>
    <Text strong style={{ fontSize: 13 }}>{text}</Text>
  </div>
);

// ── Decorative SVG bg ──────────────────────────────────────────────────────
const RetailBg = () => (
  <svg
    style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0.1, zIndex: 0 }}
    viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice"
  >
    <defs>
      <pattern id="retail-grid" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5" />
        <path d="M 10 5 L 15 5 L 15 8 L 12.5 10 L 10 8 Z" fill="white" />
        <path d="M 5 15 C 5 15 6 12 8 12 C 10 12 10 15 10 15" fill="none" stroke="white" strokeWidth="0.5" />
      </pattern>
    </defs>
    <rect width="100" height="100" fill="url(#retail-grid)" />
  </svg>
);

// ── Logo ───────────────────────────────────────────────────────────────────
const Logo = ({ tenantCode, size = 160, filter }: { tenantCode?: string; size?: number; filter?: string }) => (
  <img
    src={tenantCode === "RPOS-000004" ? "/logo.png" : "/relia.png"}
    alt="store-logo"
    loading="lazy"
    style={{ width: size, height: "auto", display: "block", margin: "0 auto", filter }}
  />
);

// ── Desktop sidebar ────────────────────────────────────────────────────────
const DesktopSidebar = ({ tenantCode, clientName, randomMessage }: {
  tenantCode?: string; clientName: string; randomMessage: string;
}) => (
  <div style={{
    position: "relative", height: "100%", minHeight: 560,
    background: "linear-gradient(135deg, #2c3e50 0%, #6c1c2c 100%)",
    padding: 24, borderRadius: "16px 0 0 16px", overflow: "hidden",
  }}>
    <RetailBg />
    <div style={{
      position: "relative", zIndex: 1,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      height: "100%", textAlign: "center",
    }}>
      <div style={{
        background: "rgba(255,255,255,0.1)", backdropFilter: "blur(10px)",
        padding: "40px 32px", borderRadius: 24,
        boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
      }}>
        <Logo tenantCode={tenantCode} size={190} />
        <Title level={2} style={{
          color: "white", fontSize: 24, fontWeight: 600,
          margin: "24px 0 16px", textShadow: "0 2px 4px rgba(0,0,0,0.2)",
        }}>
          Welcome to {clientName}
        </Title>
        <Paragraph style={{
          color: "rgba(255,255,255,0.9)", fontSize: 16,
          lineHeight: 1.8, maxWidth: 360, margin: "0 auto",
          textShadow: "0 1px 2px rgba(0,0,0,0.1)",
        }}>
          {randomMessage}
        </Paragraph>
      </div>
    </div>
  </div>
);

// ── Mobile header ──────────────────────────────────────────────────────────
const MobileHeader = ({ tenantCode, clientName, randomMessage }: {
  tenantCode?: string; clientName: string; randomMessage: string;
}) => (
  <div style={{
    padding: "24px 20px 20px", textAlign: "center",
    background: "linear-gradient(135deg, #2c3e50 0%, #6c1c2c 100%)",
    borderRadius: "16px 16px 0 0",
  }}>
    <Logo tenantCode={tenantCode} size={120} />
    <Title level={4} style={{ color: "white", margin: "12px 0 4px", fontSize: 18 }}>
      Welcome to {clientName}
    </Title>
    <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 13 }}>{randomMessage}</Text>
  </div>
);

// ── Success view ───────────────────────────────────────────────────────────
const SuccessView = ({ visitType, generatedCode, onCopy, onReset }: {
  visitType: string | null;
  generatedCode: string | null;
  onCopy: () => void;
  onReset: () => void;
}) => (
  <Result
    icon={<CheckCircleOutlined style={{ color: C.green }} />}
    title={
      <Title level={3} style={{ color: C.darkText }}>
        {visitType === "registration" ? "Registration Successful!" : "Visit Logged!"}
      </Title>
    }
    subTitle={
      <Text style={{ fontSize: 15, color: C.subText }}>
        {visitType === "registration"
          ? "Welcome to our community!"
          : "Thank you for your feedback and for visiting us today!"}
      </Text>
    }
    extra={
      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
        {generatedCode && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            background: C.bg, border: `1px solid ${C.border}`,
            borderRadius: 10, padding: "12px 16px",
          }}>
            <Text strong style={{ fontSize: 20, color: C.primary, letterSpacing: 2 }}>
              {generatedCode}
            </Text>
            <Button type="text" size="small" icon={<CopyOutlined />} onClick={onCopy}
              style={{ color: C.subText }} />
          </div>
        )}
        <Button type="primary" size="large" block onClick={onReset}
          style={{ background: C.primary, borderColor: C.primary, borderRadius: 10, height: 44 }}>
          Back to Home
        </Button>
      </div>
    }
  />
);

// ── Log visit form ─────────────────────────────────────────────────────────
const LogVisitForm = ({ form, loading, onRegister }: {
  form: any; loading: boolean; onRegister: () => void;
}) => (
  <Form form={form} layout="vertical" size="large" style={{ width: "100%" }}>
    <PhoneInput
      label={<FieldLabel icon={<PhoneOutlined />} text="Enter your phone number" />}
      owner="phoneNumber"
    />

    <Form.Item
      name="rating"
      label={<FieldLabel icon={<StarOutlined />} text="Rate your experience" />}
      rules={[{ required: true, message: "Please rate your experience" }]}
    >
      <Rate
        allowClear
        tooltips={["Okay", "Good", "Pretty good", "Great", "Amazing"]}
        style={{ fontSize: 28 }}
      />
    </Form.Item>

    <Form.Item
      name="review"
      label={<FieldLabel icon={<CommentOutlined />} text="Share your feedback (optional)" />}
    >
      <Input.TextArea
        placeholder="Tell us about your experience…"
        rows={4} showCount maxLength={500}
        style={{ borderRadius: 8 }}
      />
    </Form.Item>

    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
      <Button type="primary" htmlType="submit" block size="large" icon={<QrcodeOutlined />} loading={loading}
        style={{ background: C.primary, borderColor: C.primary, borderRadius: 10, height: 44, fontWeight: 500 }}>
        Log Visit & Submit Feedback
      </Button>
      <Button block size="large" icon={<UserAddOutlined />} onClick={onRegister} disabled={loading}
        style={{ borderRadius: 10, height: 44 }}>
        First Time? Register Here
      </Button>
    </div>
  </Form>
);

// ── Register form ──────────────────────────────────────────────────────────
const RegisterForm = ({ form, loading, onBack }: {
  form: any; loading: boolean; onBack: () => void;
}) => (
  <Form form={form} layout="vertical" size="large" style={{ width: "100%" }}>
    <Form.Item name="name" label="Full Name"
      rules={[{ required: true, message: "Please enter your name" }]}>
      <Input prefix={<UserOutlined style={{ color: C.subText }} />}
        placeholder="Enter your full name" style={{ borderRadius: 8 }} />
    </Form.Item>

    <PhoneInput label="Phone Number" owner="phoneNumber" />

    <Form.Item name="email" label="Email Address"
      rules={[
        { required: true, message: "Please enter email" },
        { type: "email", message: "Please enter a valid email" },
      ]}>
      <Input prefix={<MailOutlined style={{ color: C.subText }} />}
        placeholder="Enter your email address" style={{ borderRadius: 8 }} />
    </Form.Item>

    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
      <Button type="primary" htmlType="submit" block size="large" icon={<SaveOutlined />} loading={loading}
        style={{ background: C.primary, borderColor: C.primary, borderRadius: 10, height: 44, fontWeight: 500 }}>
        Register & Log Visit
      </Button>
      <Button block size="large" icon={<LeftOutlined />} onClick={onBack} disabled={loading}
        style={{ borderRadius: 10, height: 44 }}>
        Go Back
      </Button>
    </div>
  </Form>
);

// ── Main ───────────────────────────────────────────────────────────────────
const CustomerVisitTracker = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [registrationMode, setRegistrationMode] = useState(false);
  const [visitCompleted, setVisitCompleted] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [visitType, setVisitType] = useState<string | null>(null);

  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const tenantId = useMemo(() => params.get("tenant_id"), [params]);
  const shopId = useMemo(() => params.get("shop_id"), [params]);

  const storedTenant = useMemo(() => {
    const s = localStorage.getItem("tenant");
    return s ? JSON.parse(s) : null;
  }, []);

  const { data: tenantData } = useQuery({
    queryKey: ["tenant", tenantId],
    queryFn: () => fetchTenantById(tenantId),
    retry: 1,
    enabled: !storedTenant && !!tenantId,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });

  const tenant = useMemo(() => storedTenant || tenantData, [storedTenant, tenantData]);
  const clientName = useMemo(() => tenant?.name || "Relia", [tenant]);
  const randomMsg = useMemo(() => WELCOME_MSGS[Math.floor(Math.random() * WELCOME_MSGS.length)], []);

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleVisitLog = useCallback(async (values: any) => {
    if (loading) return;
    setLoading(true);
    try {
      const resp = await logCustomerVisit({
        customerCode: getPhoneNumber(values.phoneNumber),
        tenant_id: tenantId, shop_id: shopId,
        rating: values.rating, review: values.review,
      });
      if (resp?.status === 200) {
        setVisitType("visit");
        setVisitCompleted(true);
        message.success("Visit logged successfully!");
      }
    } catch {
      message.error("Failed to log visit. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [loading, tenantId, shopId]);

  const handleRegistration = useCallback(async (values: any) => {
    if (loading) return;
    setLoading(true);
    try {
      const response = await addNewCustomer({
        customer_name: values.name,
        email: values.email,
        phone: getPhoneNumber(values.phoneNumber),
        tenant_id: tenantId, shop_id: shopId,
      });
      if (response?.status === 201) {
        setGeneratedCode(response.data.customer.code);
        setVisitType("registration");
        setVisitCompleted(true);
        message.success("Registration successful!");
      }
    } catch {
      message.error("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [loading, tenantId, shopId]);

  const copyCode = useCallback(() => {
    if (!generatedCode) return;
    navigator.clipboard.writeText(generatedCode)
      .then(() => message.success("Code copied to clipboard"))
      .catch(() => message.error("Failed to copy code"));
  }, [generatedCode]);

  const reset = useCallback(() => {
    setRegistrationMode(false);
    setVisitCompleted(false);
    setGeneratedCode(null);
    setVisitType(null);
    form.resetFields();
  }, [form]);

  // ── Inner form routing ─────────────────────────────────────────────────
  const formContent = () => {
    if (visitCompleted) {
      return (
        <SuccessView
          visitType={visitType} generatedCode={generatedCode}
          onCopy={copyCode} onReset={reset}
        />
      );
    }
    if (registrationMode) {
      return (
        <Form form={form} onFinish={handleRegistration}>
          <RegisterForm form={form} loading={loading} onBack={() => setRegistrationMode(false)} />
        </Form>
      );
    }
    return (
      <Form form={form} onFinish={handleVisitLog}>
        <LogVisitForm form={form} loading={loading} onRegister={() => setRegistrationMode(true)} />
      </Form>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16, backgroundColor: "#f5f5f5",
      backgroundImage: `url("/try.png")`, backgroundSize: "cover",
      backgroundPosition: "center", backgroundRepeat: "no-repeat",
    }}>
      <div style={{
        width: "100%", maxWidth: 1100,
        background: "rgba(255,255,255,0.97)",
        borderRadius: 16, overflow: "hidden",
        boxShadow: "0 4px 32px rgba(0,0,0,0.12)",
        display: "flex", flexDirection: "row",
        flexWrap: "wrap",
      }}>
        {/* Desktop sidebar — hidden on mobile via minWidth trick */}
        <div style={{ flex: "1 1 380px", minWidth: 0, display: "flex" }}>
          <div style={{ display: "none" }} className="mobile-header-slot">
            <MobileHeader tenantCode={tenant?.tenant_code} clientName={clientName} randomMessage={randomMsg} />
          </div>
          <div className="desktop-sidebar-slot" style={{ flex: 1 }}>
            <DesktopSidebar tenantCode={tenant?.tenant_code} clientName={clientName} randomMessage={randomMsg} />
          </div>
        </div>

        {/* Form panel */}
        <div style={{
          flex: "1 1 340px", minWidth: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "32px 24px",
        }}>
          <div style={{ maxWidth: 400, width: "100%" }}>
            {formContent()}
          </div>
        </div>
      </div>

      {/* Responsive CSS */}
      <style>{`
        @media (max-width: 640px) {
          .desktop-sidebar-slot { display: none !important; }
          .mobile-header-slot   { display: block !important; }
        }
      `}</style>
    </div>
  );
};

export default CustomerVisitTracker;