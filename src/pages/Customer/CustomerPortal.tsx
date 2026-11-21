/**
 * Customer QR page — public, no login.
 *
 * Reached from the shop's "Customer Link & QR" (/admin/customers?tenant_id&tenant_code&shop_id).
 * A customer enters their phone number and can:
 *   • check in and leave feedback (the original visit log)
 *   • subscribe to a package, paying with one of the shop's payment methods
 *     → creates a Subscription_Purchase order
 *   • redeem a visit on an active package → creates a Subscription_Visit order
 *   • renew a package once its visits are used up or it has expired
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert, Button, Empty, Form, Input, Modal, Progress, Radio, Rate, Result, Skeleton, Space, Tag, Typography, message,
} from "antd";
import {
  CheckCircleOutlined, CommentOutlined, CreditCardOutlined, GiftOutlined, LeftOutlined, LogoutOutlined,
  MailOutlined, PhoneOutlined, ReloadOutlined, SaveOutlined, StarOutlined, UserAddOutlined, UserOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import {
  fetchPortalContext, logCustomerVisit, lookupPortalCustomer, portalErrorMessage,
  redeemPortalVisit, registerFromPortal, subscribeFromPortal,
  type PortalPackage, type PortalPhone, type PortalSubscription,
} from "@services/customers";
import { PhoneInput } from "@components/PhoneNumber/PhoneNumber";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import { formatCurrency } from "@utils/formatters";

const { Title, Text, Paragraph } = Typography;

const C = {
  green: "#10b981",
  amber: "#f59e0b",
  subText: "#64748b",
  darkText: "#0f172a",
  border: "#e2e8f0",
  bg: "#f8fafc",
};

const WELCOME_MSGS = [
  "Great to see you again!",
  "We missed you, welcome back!",
  "It's awesome to have you back!",
  "Welcome back, your favourite spot is waiting!",
  "Always a pleasure to see you return!",
];

type View = "home" | "register" | "account" | "done";
type Done = {
  title: string;
  subtitle: string;
  lines?: string[];
  renewPackage?: PortalPackage | null;
};

// antd-country-phone-input value → what the API expects (local digits + dialling code)
const toPortalPhone = (v: any): PortalPhone | null => {
  const phone = String(v?.phone ?? "").replace(/\D/g, "").replace(/^0+/, "");
  if (!phone) return null;
  return { phone, phone_code: v?.code ?? 254 };
};

const readStoredTenant = () => {
  try { return JSON.parse(localStorage.getItem("tenant") || "null"); } catch { return null; }
};

const FieldLabel = ({ icon, text, color }: { icon: React.ReactNode; text: string; color: string }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
    <span style={{ color, fontSize: 16 }}>{icon}</span>
    <Text strong style={{ fontSize: 13 }}>{text}</Text>
  </span>
);

const Logo = ({ tenant, size }: { tenant: any; size: number }) => (
  <img
    src={tenant?.tenant_logo?.url || "/logo.png"}
    alt="store logo"
    style={{ width: size, maxHeight: size, objectFit: "contain", display: "block", margin: "0 auto" }}
  />
);

const packageSummary = (p: PortalPackage) =>
  `${p.total_visits} visit${p.total_visits === 1 ? "" : "s"}` +
  (p.validity_days ? ` · valid ${p.validity_days} days` : "");

// ── Subscription card ─────────────────────────────────────────────────────
const SubscriptionCard = ({ sub, primary, onRedeem, onRenew }: {
  sub: PortalSubscription; primary: string;
  onRedeem: (s: PortalSubscription) => void;
  onRenew: (p: PortalPackage) => void;
}) => {
  const pct = sub.total_visits_allowed ? Math.round((sub.visits_used / sub.total_visits_allowed) * 100) : 0;
  const ended = sub.status === "Exhausted" || sub.status === "Expired";
  return (
    <div style={{ border: `1px solid ${ended ? "#fde68a" : C.border}`, background: ended ? "#fffbeb" : "#fff", borderRadius: 12, padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <Text strong style={{ fontSize: 15 }}>{sub.package?.name || "Package"}</Text>
          <div><Text type="secondary" style={{ fontSize: 12 }}>{sub.subscription_code}</Text></div>
        </div>
        {sub.can_redeem && <Tag color="green">Active</Tag>}
        {sub.status === "Exhausted" && <Tag color="orange">All visits used</Tag>}
        {sub.status === "Expired" && <Tag color="orange">Expired</Tag>}
        {sub.status === "Active" && !sub.can_redeem && <Tag>{sub.payment_status}</Tag>}
      </div>

      <Progress percent={pct} showInfo={false} strokeColor={ended ? C.amber : primary} style={{ margin: "10px 0 4px" }} />
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 4 }}>
        <Text style={{ fontSize: 13 }}>
          <b>{sub.visits_remaining}</b> of {sub.total_visits_allowed} visits left
        </Text>
        {sub.end_date && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {ended && sub.status === "Expired" ? "Expired" : "Valid until"} {dayjs(sub.end_date).format("D MMM YYYY")}
          </Text>
        )}
      </div>

      {sub.can_redeem && (
        <Button type="primary" block icon={<CheckCircleOutlined />} onClick={() => onRedeem(sub)}
          style={{ marginTop: 12, background: primary, borderColor: primary, borderRadius: 10, height: 40 }}>
          Redeem a visit
        </Button>
      )}
      {sub.needs_renewal && sub.package && (
        <Button block icon={<ReloadOutlined />} onClick={() => onRenew(sub.package!)}
          style={{ marginTop: 12, borderRadius: 10, height: 40, borderColor: C.amber, color: "#b45309", fontWeight: 500 }}>
          Renew {sub.package.name} · {formatCurrency(sub.package.price)}
        </Button>
      )}
    </div>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────
const CustomerPortal = () => {
  const primary = usePrimaryColor() || "#10b981";

  const [view, setView] = useState<View>("home");
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState<PortalPhone | null>(null);
  const [account, setAccount] = useState<Awaited<ReturnType<typeof lookupPortalCustomer>> | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [redeeming, setRedeeming] = useState<PortalSubscription | null>(null);
  const [buying, setBuying] = useState<PortalPackage | null>(null);
  const [methodId, setMethodId] = useState<string | null>(null);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [prefillPhone, setPrefillPhone] = useState<any>(undefined);

  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const tenantId = params.get("tenant_id");
  const shopId = params.get("shop_id") || "";

  // On a customer's own phone nothing about the business is stored, so its
  // name and logo come from the public portal context (by tenant_code). A
  // staff device that opens the link may already have the tenant stored.
  const storedTenant = useMemo(readStoredTenant, []);
  const storedMatches = !!storedTenant && (!tenantId || storedTenant._id === tenantId);
  const tenant = storedMatches ? storedTenant : null;
  const tenantCode: string | null = params.get("tenant_code") || tenant?.tenant_code || null;
  const welcome = useMemo(() => WELCOME_MSGS[Math.floor(Math.random() * WELCOME_MSGS.length)], []);

  const { data: context, isLoading: contextLoading } = useQuery({
    queryKey: ["portal-context", tenantCode, shopId],
    queryFn: () => fetchPortalContext(tenantCode, shopId),
    enabled: !!tenantCode && !!shopId,
    staleTime: 60 * 1000,
  });
  const clientName: string | null = context?.business?.name || tenant?.name || null;
  const logoTenant = { tenant_logo: { url: context?.business?.logo || tenant?.tenant_logo?.url || null } };

  // Browser tab shows the business, not the app
  useEffect(() => {
    if (clientName) document.title = clientName;
  }, [clientName]);
  const packages = context?.packages ?? [];
  const paymentMethods = context?.payment_methods ?? [];

  useEffect(() => {
    if (buying) setMethodId(paymentMethods.length === 1 ? paymentMethods[0]._id : null);
  }, [buying, paymentMethods]);

  // ── Data ────────────────────────────────────────────────────────────
  const loadAccount = useCallback(async (p: PortalPhone) => {
    const data = await lookupPortalCustomer(tenantCode, { ...p, shop_id: shopId });
    setAccount(data);
    setPhone(p);
    return data;
  }, [tenantCode, shopId]);

  const handleContinue = useCallback(async (values: any) => {
    const p = toPortalPhone(values.phoneNumber);
    if (!p) return message.warning("Please enter your phone number");
    setLoading(true);
    try {
      await loadAccount(p);
      setView("account");
    } catch (e: any) {
      if (e?.response?.status === 404) {
        message.info("Looks like you're new here — let's get you registered.");
        setPrefillPhone(values.phoneNumber);
        setView("register");
      } else {
        message.error(portalErrorMessage(e, "Couldn't load your account. Please try again."));
      }
    } finally {
      setLoading(false);
    }
  }, [loadAccount]);

  const handleRegister = useCallback(async (values: any) => {
    const p = toPortalPhone(values.phoneNumber);
    if (!p) return message.warning("Please enter your phone number");
    setLoading(true);
    try {
      // Public sign-up endpoint: works on a customer's phone with no login
      await registerFromPortal(tenantCode, {
        customer_name: values.name,
        email: values.email || undefined,
        phone: p.phone,
        phone_code: Number(p.phone_code) || 254,
        shop_id: shopId,
      });
      await loadAccount(p);
      message.success("You're registered!");
      setView("account");
    } catch (e: any) {
      if (e?.response?.status === 409) {
        // Already registered at this branch — just open their account.
        try { await loadAccount(p); setView("account"); return; } catch { /* fall through */ }
      }
      message.error(portalErrorMessage(e, "Registration failed. Please try again."));
    } finally {
      setLoading(false);
    }
  }, [loadAccount, shopId, tenantCode]);

  const handleSubscribe = useCallback(async () => {
    if (!buying || !phone) return;
    if (!methodId) return message.warning("Choose how you'll pay");
    setLoading(true);
    try {
      const res = await subscribeFromPortal(tenantCode, {
        ...phone, shop_id: shopId, package_id: buying._id, payment_method_id: methodId,
      });
      const method = paymentMethods.find((m) => m._id === methodId);
      const renewed = account?.subscriptions.some((s) => s.package?._id === buying._id);
      setDone({
        title: renewed ? `${buying.name} renewed!` : `You're subscribed to ${buying.name}!`,
        subtitle: `${packageSummary(buying)}. You can redeem your first visit right away.`,
        lines: [
          `Order ${res.order?.order_no ?? ""}`.trim(),
          `${formatCurrency(buying.price)} via ${method?.name ?? "selected method"}`,
        ],
      });
      setBuying(null);
      await loadAccount(phone).catch(() => undefined);
      setView("done");
    } catch (e: any) {
      message.error(portalErrorMessage(e, "Couldn't complete the subscription. Please try again."));
    } finally {
      setLoading(false);
    }
  }, [buying, phone, methodId, tenantCode, shopId, paymentMethods, account, loadAccount]);

  const handleRedeem = useCallback(async (values: any) => {
    if (!redeeming || !phone) return;
    setLoading(true);
    try {
      const res = await redeemPortalVisit(tenantCode, {
        ...phone, shop_id: shopId, subscription_id: redeeming._id,
        rating: values.rating || undefined, review: values.review || undefined,
      });
      const s = res.subscription;
      setDone({
        title: "Visit redeemed!",
        subtitle: s.visits_remaining > 0
          ? `You have ${s.visits_remaining} of ${s.total_visits_allowed} visits left on ${s.package_name ?? "your package"}.`
          : `That was the last visit on ${s.package_name ?? "your package"}.`,
        lines: [`Order ${res.order.order_no}`],
        renewPackage: s.needs_renewal ? redeeming.package : null,
      });
      setRedeeming(null);
      await loadAccount(phone).catch(() => undefined);
      setView("done");
    } catch (e: any) {
      message.error(portalErrorMessage(e, "Couldn't redeem the visit. Please try again."));
      if (e?.response?.data?.needs_renewal) {
        setRedeeming(null);
        await loadAccount(phone).catch(() => undefined);
      }
    } finally {
      setLoading(false);
    }
  }, [redeeming, phone, tenantCode, shopId, loadAccount]);

  const handleCheckIn = useCallback(async (values: any) => {
    if (!phone) return;
    setLoading(true);
    try {
      await logCustomerVisit({
        customerCode: phone.phone, tenant_id: tenantId, shop_id: shopId,
        rating: values.rating, review: values.review,
      });
      setCheckInOpen(false);
      setDone({ title: "Checked in!", subtitle: "Thank you for your feedback and for visiting us today." });
      setView("done");
    } catch {
      // logCustomerVisit already shows the error
    } finally {
      setLoading(false);
    }
  }, [phone, tenantId, shopId]);

  const signOut = useCallback(() => {
    setAccount(null);
    setPhone(null);
    setDone(null);
    setPrefillPhone(undefined);
    setView("home");
  }, []);

  // ── Derived ─────────────────────────────────────────────────────────
  const subs = account?.subscriptions ?? [];
  const visibleSubs = subs.filter((s) => s.can_redeem || s.needs_renewal);
  const ownedPackageIds = new Set(subs.filter((s) => s.can_redeem || s.needs_renewal).map((s) => s.package?._id));
  const newPackages = packages.filter((p) => !ownedPackageIds.has(p._id));
  const btnStyle = { background: primary, borderColor: primary, borderRadius: 10, height: 44, fontWeight: 500 };

  // ── Views ───────────────────────────────────────────────────────────
  const renderHome = () => (
    <Form layout="vertical" size="large" onFinish={handleContinue}>
      <Title level={4} style={{ marginTop: 0 }}>Check in, redeem or subscribe</Title>
      <Paragraph type="secondary" style={{ marginTop: -4 }}>Enter your phone number to see your packages.</Paragraph>
      <PhoneInput label={<FieldLabel icon={<PhoneOutlined />} text="Phone number" color={primary} />} owner="phoneNumber" />
      <Space direction="vertical" style={{ width: "100%" }} size={10}>
        <Button type="primary" htmlType="submit" block loading={loading} style={btnStyle}>Continue</Button>
        <Button block icon={<UserAddOutlined />} disabled={loading} onClick={() => setView("register")} style={{ borderRadius: 10, height: 44 }}>
          First time? Register here
        </Button>
      </Space>
    </Form>
  );

  const renderRegister = () => (
    <Form initialValues={prefillPhone ? { phoneNumber: prefillPhone } : undefined} layout="vertical" size="large" onFinish={handleRegister}>
      <Title level={4} style={{ marginTop: 0 }}>Create your account</Title>
      <Form.Item name="name" label="Full name" rules={[{ required: true, message: "Please enter your name" }]}>
        <Input prefix={<UserOutlined style={{ color: C.subText }} />} placeholder="Your full name" />
      </Form.Item>
      <PhoneInput label="Phone number" owner="phoneNumber" />
      <Form.Item name="email" label="Email (optional)" rules={[{ type: "email", message: "Please enter a valid email" }]}>
        <Input prefix={<MailOutlined style={{ color: C.subText }} />} placeholder="you@example.com" />
      </Form.Item>
      <Space direction="vertical" style={{ width: "100%" }} size={10}>
        <Button type="primary" htmlType="submit" block icon={<SaveOutlined />} loading={loading} style={btnStyle}>Register</Button>
        <Button block icon={<LeftOutlined />} disabled={loading} onClick={() => setView("home")} style={{ borderRadius: 10, height: 44 }}>Back</Button>
      </Space>
    </Form>
  );

  const renderAccount = () => (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <Title level={4} style={{ margin: 0 }}>Hi {account?.customer.customer_name?.split(" ")[0] || "there"} 👋</Title>
          {account?.customer.code && <Text type="secondary" style={{ fontSize: 12 }}>{account.customer.code}</Text>}
        </div>
        <Button type="text" icon={<LogoutOutlined />} onClick={signOut}>Not you?</Button>
      </div>

      <Button block icon={<StarOutlined />} onClick={() => setCheckInOpen(true)}
        style={{ margin: "16px 0", borderRadius: 10, height: 44 }}>
        Just check in & leave feedback
      </Button>

      <Text strong style={{ display: "block", marginBottom: 8 }}>Your packages</Text>
      {visibleSubs.length === 0 ? (
        <Text type="secondary" style={{ display: "block", marginBottom: 16, fontSize: 13 }}>
          You don't have any packages yet.
        </Text>
      ) : (
        <Space direction="vertical" style={{ width: "100%", marginBottom: 20 }} size={10}>
          {visibleSubs.map((s) => (
            <SubscriptionCard key={s._id} sub={s} primary={primary} onRedeem={setRedeeming} onRenew={setBuying} />
          ))}
        </Space>
      )}

      <Text strong style={{ display: "block", marginBottom: 8 }}>
        <GiftOutlined style={{ color: primary }} /> {visibleSubs.length ? "More packages" : "Subscribe to a package"}
      </Text>
      {contextLoading ? <Skeleton active paragraph={{ rows: 2 }} /> : newPackages.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No other packages available right now" />
      ) : (
        <Space direction="vertical" style={{ width: "100%" }} size={10}>
          {newPackages.map((p) => (
            <div key={p._id} style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text strong>{p.name}</Text>
                <div><Text type="secondary" style={{ fontSize: 12 }}>{packageSummary(p)}</Text></div>
                {p.desc && <div><Text type="secondary" style={{ fontSize: 12 }}>{p.desc}</Text></div>}
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <Text strong style={{ display: "block" }}>{formatCurrency(p.price)}</Text>
                <Button size="small" type="primary" onClick={() => setBuying(p)} style={{ background: primary, borderColor: primary, marginTop: 4 }}>
                  Subscribe
                </Button>
              </div>
            </div>
          ))}
        </Space>
      )}
    </div>
  );

  const renderDone = () => done && (
    <Result
      status="success"
      title={done.title}
      subTitle={done.subtitle}
      extra={
        <Space direction="vertical" style={{ width: "100%" }} size={10}>
          {done.lines?.filter(Boolean).map((l) => (
            <div key={l} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 12px" }}>
              <Text>{l}</Text>
            </div>
          ))}
          {done.renewPackage && (
            <Button block icon={<ReloadOutlined />} onClick={() => { setBuying(done.renewPackage!); setView("account"); }}
              style={{ borderRadius: 10, height: 44, borderColor: C.amber, color: "#b45309", fontWeight: 500 }}>
              Renew {done.renewPackage.name} · {formatCurrency(done.renewPackage.price)}
            </Button>
          )}
          {account && (
            <Button type="primary" block onClick={() => setView("account")} style={btnStyle}>Back to my account</Button>
          )}
          <Button block onClick={signOut} style={{ borderRadius: 10, height: 44 }}>Done</Button>
        </Space>
      }
    />
  );

  const missingParams = !shopId || (!tenantId && !params.get("tenant_code"));

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      backgroundColor: "#f5f5f5", backgroundImage: `url("/try.png")`, backgroundSize: "cover", backgroundPosition: "center",
    }}>
      <div className="cp-card" style={{
        width: "100%", maxWidth: 1000, background: "rgba(255,255,255,0.98)", borderRadius: 16, overflow: "hidden",
        boxShadow: "0 4px 32px rgba(0,0,0,0.12)", display: "flex",
      }}>
        <div className="cp-side" style={{
          flex: "0 0 40%", padding: 32, color: "#fff", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", textAlign: "center",
          background: `linear-gradient(135deg, ${primary} 0%, ${primary}cc 100%)`,
        }}>
          {/* Wait for the business's own logo rather than flashing the default */}
          <div className="cp-logo">
            {contextLoading && !logoTenant.tenant_logo.url
              ? <div style={{ height: 120 }} />
              : <Logo tenant={logoTenant} size={150} />}
          </div>
          <Title level={3} style={{ color: "#fff", margin: "20px 0 8px" }}>
            {clientName ? `Welcome to ${clientName}` : "Welcome"}
          </Title>
          <Text style={{ color: "rgba(255,255,255,0.9)" }}>{welcome}</Text>
        </div>

        <div style={{ flex: 1, minWidth: 0, padding: "28px 24px", maxHeight: "92vh", overflowY: "auto" }}>
          <div style={{ maxWidth: 440, margin: "0 auto" }}>
            {missingParams ? (
              <Alert type="warning" showIcon message="This link is incomplete"
                description="Please scan the shop's QR code again or ask a staff member for help." />
            ) : (
              <>
                {view === "home" && renderHome()}
                {view === "register" && renderRegister()}
                {view === "account" && renderAccount()}
                {view === "done" && renderDone()}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Subscribe / renew */}
      <Modal
        open={!!buying}
        title={buying && account?.subscriptions.some((s) => s.package?._id === buying._id) ? `Renew ${buying.name}` : `Subscribe to ${buying?.name ?? ""}`}
        onCancel={() => !loading && setBuying(null)}
        footer={[
          <Button key="cancel" onClick={() => setBuying(null)} disabled={loading}>Cancel</Button>,
          <Button key="ok" type="primary" icon={<CreditCardOutlined />} loading={loading} disabled={!methodId}
            onClick={handleSubscribe} style={{ background: primary, borderColor: primary }}>
            Pay {buying ? formatCurrency(buying.price) : ""}
          </Button>,
        ]}
        destroyOnHidden
      >
        {buying && (
          <>
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, marginBottom: 16 }}>
              <Text strong>{buying.name}</Text>
              <div><Text type="secondary">{packageSummary(buying)}</Text></div>
              <Text strong style={{ fontSize: 18 }}>{formatCurrency(buying.price)}</Text>
            </div>
            <Text strong>How will you pay?</Text>
            {paymentMethods.length === 0 ? (
              <Alert style={{ marginTop: 8 }} type="info" showIcon message="No payment methods are set up for this shop yet. Please ask a staff member." />
            ) : (
              <Radio.Group value={methodId} onChange={(e) => setMethodId(e.target.value)} style={{ width: "100%", marginTop: 8 }}>
                <Space direction="vertical" style={{ width: "100%" }}>
                  {paymentMethods.map((m) => (
                    <Radio key={m._id} value={m._id} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", width: "100%" }}>
                      {m.name}
                    </Radio>
                  ))}
                </Space>
              </Radio.Group>
            )}
          </>
        )}
      </Modal>

      {/* Redeem */}
      <Modal
        open={!!redeeming}
        title={`Redeem a visit — ${redeeming?.package?.name ?? ""}`}
        onCancel={() => !loading && setRedeeming(null)}
        footer={null}
        destroyOnHidden
      >
        {redeeming && (
          <Form layout="vertical" onFinish={handleRedeem}>
            <Paragraph>
              This uses 1 of your <b>{redeeming.visits_remaining}</b> remaining visits.
              {redeeming.visits_remaining === 1 && " It's your last one — you can renew afterwards."}
            </Paragraph>
            <Form.Item name="rating" label={<FieldLabel icon={<StarOutlined />} text="Rate today's visit (optional)" color={primary} />}>
              <Rate allowClear style={{ fontSize: 26 }} />
            </Form.Item>
            <Form.Item name="review" label={<FieldLabel icon={<CommentOutlined />} text="Feedback (optional)" color={primary} />}>
              <Input.TextArea rows={3} maxLength={500} showCount placeholder="Tell us about your visit…" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading} style={btnStyle}>Redeem visit</Button>
          </Form>
        )}
      </Modal>

      {/* Plain check-in with feedback */}
      <Modal open={checkInOpen} title="Check in" onCancel={() => !loading && setCheckInOpen(false)} footer={null} destroyOnHidden>
        <Form layout="vertical" onFinish={handleCheckIn}>
          <Form.Item name="rating" label={<FieldLabel icon={<StarOutlined />} text="Rate your experience" color={primary} />}
            rules={[{ required: true, message: "Please rate your experience" }]}>
            <Rate allowClear tooltips={["Okay", "Good", "Pretty good", "Great", "Amazing"]} style={{ fontSize: 26 }} />
          </Form.Item>
          <Form.Item name="review" label={<FieldLabel icon={<CommentOutlined />} text="Share your feedback (optional)" color={primary} />}>
            <Input.TextArea rows={3} maxLength={500} showCount placeholder="Tell us about your experience…" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading} style={btnStyle}>Check in</Button>
        </Form>
      </Modal>

      <style>{`
        @media (max-width: 720px) {
          .cp-card { flex-direction: column; }
          .cp-side { flex: none !important; padding: 20px !important; }
          .cp-side h3 { font-size: 18px !important; margin: 10px 0 4px !important; }
          .cp-logo img { width: 90px !important; }
        }
      `}</style>
    </div>
  );
};

export default CustomerPortal;
