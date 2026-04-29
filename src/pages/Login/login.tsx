import { useEffect, useState } from "react";
import { Button, Input, Space, Row, Col, Typography, Segmented } from "antd";
import {
    KeyOutlined,
    DeleteOutlined,
    UsergroupAddOutlined,
    SwapOutlined,
    EyeInvisibleOutlined,
    EyeOutlined,
    MailOutlined,
    SafetyCertificateOutlined,
} from "@ant-design/icons";
import { useAppDispatch, useAppSelector } from "src/store";
import { verifyCompanyCode, verifyBusinessEmail } from "@services/users";
import { useLogin } from "@components/staffCard/hook/useLogin";
import { useNavigate } from "react-router-dom";
import { ProCard } from "@ant-design/pro-components";
import { useRefreshPrimaryColor } from "@context/PrimaryColorContext";

const { Text } = Typography;

type LoginMethod = "companyCode" | "businessEmail";

const StaffLoginPage = () => {
    const { handleLogin } = useLogin();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { user } = useAppSelector((state) => state.auth);
    const refreshPrimaryColor = useRefreshPrimaryColor();

    const [companyCode, setCompanyCode] = useState<string | null>(null);
    const [companyName, setCompanyName] = useState<string>("");
    const [step, setStep] = useState<"companyCode" | "pin">("companyCode");
    const [loading, setLoading] = useState<boolean>(false);
    const [pin, setPin] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [tenant, setTenant] = useState<any>(null);
    const [visible, setVisible] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    // New state for email login
    const [loginMethod, setLoginMethod] = useState<LoginMethod>("companyCode");
    const [businessEmail, setBusinessEmail] = useState<string>("");

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        const storedCode = localStorage.getItem("companyCode");
        const storedTenant = localStorage.getItem("tenant");

        if (storedCode && storedTenant) {
            try {
                const parsedTenant = JSON.parse(storedTenant);
                setCompanyCode(storedCode);
                setCompanyName(parsedTenant?.name || "");
                setTenant(parsedTenant);
                setStep("pin");
                refreshPrimaryColor();
            } catch (error) {
                console.error("Error parsing tenant:", error);
            }
        }
    }, [refreshPrimaryColor]);

    const handleCompanyCodeSubmit = async (code: string) => {
        setError(null);
        setLoading(true);
        dispatch({ type: "VERIFY_COMPANY_CODE_REQUEST" });

        try {
            const result = await verifyCompanyCode({ companyCode: code });

            localStorage.setItem("tenant", JSON.stringify(result.data));
            localStorage.setItem("companyCode", code);

            window.dispatchEvent(new CustomEvent("tenantUpdated"));

            setCompanyName(result.data.name || "");
            setTenant(result.data);
            dispatch({ type: "VERIFY_COMPANY_CODE_SUCCESS", payload: result });
            setCompanyCode(code);
            setStep("pin");
        } catch (error) {
            dispatch({ type: "VERIFY_COMPANY_CODE_FAILURE", payload: error });
            setError("Failed to verify company code. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleBusinessEmailSubmit = async (email: string) => {
        setError(null);
        setLoading(true);
        dispatch({ type: "VERIFY_BUSINESS_EMAIL_REQUEST" });

        try {
            const result = await verifyBusinessEmail({ businessEmail: email });

            // CRITICAL: Extract tenant_code from response and store it as companyCode
            const tenantCode = result.data?.tenant_code || result.data?.code;

            if (!tenantCode) {
                throw new Error("No tenant code found in response");
            }

            localStorage.setItem("tenant", JSON.stringify(result.data));
            localStorage.setItem("businessEmail", email);
            localStorage.setItem("companyCode", tenantCode); // Store tenant_code as companyCode

            window.dispatchEvent(new CustomEvent("tenantUpdated"));

            setCompanyName(result.data.name || "");
            setTenant(result.data);
            setCompanyCode(tenantCode); // Set the tenant_code as companyCode
            dispatch({ type: "VERIFY_BUSINESS_EMAIL_SUCCESS", payload: result });
            setStep("pin");
        } catch (error: any) {
            dispatch({ type: "VERIFY_BUSINESS_EMAIL_FAILURE", payload: error });
            setError(error?.message || "Failed to verify business email. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handlePinClick = (number: number) => {
        if (pin.length < 4) {
            setPin((prev) => prev + number);
        }
    };

    const handleClearPin = () => setPin("");
    const handleBackspace = () => setPin((prev) => prev.slice(0, -1));

    const handleSwitchCompany = () => {
        localStorage.removeItem("companyCode");
        localStorage.removeItem("businessEmail");
        localStorage.removeItem("tenant");
        refreshPrimaryColor();
        setCompanyCode(null);
        setBusinessEmail("");
        setCompanyName("");
        setTenant(null);
        setStep("companyCode");
        setPin("");
        setError(null);
        setLoginMethod("companyCode");
    };

    const handleLoginWithNavigation = async (enteredPin: string) => {
        setLoading(true);
        setError(null);

        // Ensure companyCode is available for the login API
        const currentCompanyCode = companyCode || localStorage.getItem("companyCode");

        if (!currentCompanyCode) {
            setError("Company code not found. Please restart the login process.");
            setLoading(false);
            return;
        }

        const { success, error: loginError, user: userPayload } = await handleLogin(enteredPin);

        if (success && userPayload?.role === "admin") {
            navigate("/admin/dashboard");
        } else if (success) {
            navigate("/tables");
        } else {
            setError(loginError);
        }

        setLoading(false);
    };

    const handleVerifySubmit = () => {
        if (loginMethod === "companyCode" && companyCode) {
            handleCompanyCodeSubmit(companyCode);
        } else if (loginMethod === "businessEmail" && businessEmail) {
            handleBusinessEmailSubmit(businessEmail);
        }
    };

    const getBackgroundGradient = () => {
        if (tenant?.color_scheme?.primary) {
            const secondary = tenant.color_scheme.secondary || "#c26d2e";
            return `linear-gradient(135deg, ${tenant.color_scheme.primary} 0%, ${secondary} 100%)`;
        }
        if (tenant?.primary_color) {
            return `linear-gradient(135deg, ${tenant.color_scheme.primary} 0%, #c26d2e 100%)`;
        }
        return "linear-gradient(135deg, #2c3e50 0%, #6c1c2c 100%)";
    };

    const RetailBackground = () => (
        <svg
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                opacity: 0.08,
            }}
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid slice"
        >
            <defs>
                <pattern id="retail-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5" />
                    <path d="M 10 5 L 15 5 L 15 8 L 12.5 10 L 10 8 Z" fill="white" />
                    <path
                        d="M 5 15 C 5 15 6 12 8 12 C 10 12 10 15 10 15"
                        fill="none"
                        stroke="white"
                        strokeWidth="0.5"
                    />
                </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#retail-grid)" />
        </svg>
    );

    const brandPanelContent = (
        <div
            style={{
                position: "relative",
                zIndex: 1,
                textAlign: "center",
                background: "rgba(255, 255, 255, 0.1)",
                padding: isMobile ? "1.25rem" : "2rem",
                borderRadius: "16px",
                backdropFilter: "blur(10px)",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
                width: "100%",
                maxWidth: isMobile ? "100%" : "320px",
            }}
        >
            <div style={{ marginBottom: "1.25rem", display: "inline-block" }}>
                {tenant?.tenant_logo?.url ? (
                    <img
                        src={tenant.tenant_logo.url}
                        alt="tenant-logo"
                        style={{
                            width: isMobile ? "120px" : "100%",
                            height: "auto",
                            transition: "all 0.3s ease",
                            maxHeight: isMobile ? "80px" : "120px",
                            objectFit: "contain",
                        }}
                    />
                ) : (
                    <img
                        src="/relia.png"
                        alt="relia-logo"
                        style={{
                            width: isMobile ? "140px" : "45%",
                            height: "auto",
                            transition: "all 0.3s ease",
                        }}
                    />
                )}
            </div>
            {!companyName && (
                <h2
                    style={{
                        color: "white",
                        fontSize: isMobile ? "18px" : "24px",
                        marginBottom: "0.75rem",
                        fontWeight: "600",
                        textShadow: "0 2px 4px rgba(0,0,0,0.2)",
                    }}
                >
                    Business Management Suite
                </h2>
            )}

            {companyName && (
                <Text
                    style={{
                        color: "white",
                        fontSize: isMobile ? "15px" : "18px",
                        marginBottom: "0.75rem",
                        display: "block",
                        fontWeight: "500",
                        textShadow: "0 2px 4px rgba(0,0,0,0.2)",
                    }}
                >
                    {companyName}
                </Text>
            )}

            {!isMobile && (
                <p
                    style={{
                        color: "rgba(255, 255, 255, 0.9)",
                        textAlign: "center",
                        textShadow: "0 2px 4px rgba(0,0,0,0.2)",
                        lineHeight: "1.6",
                        fontSize: "15px",
                        maxWidth: "280px",
                        margin: "0 auto",
                    }}
                >
                    Basepoint Cloud — POS, accounting, CRM, and team management,
                    all unified in one smarter platform built for your business.
                </p>
            )}
        </div>
    );

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundImage: "url(/try.png)",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                padding: isMobile ? "1rem" : "1.5rem",
            }}
        >
            <ProCard
                boxShadow
                style={{
                    maxWidth: "1000px",
                    width: "100%",
                    padding: 0,
                    borderRadius: "12px",
                    overflow: "hidden",
                }}
                bodyStyle={{ padding: 0 }}
            >
                <Row>
                    {/* Brand Panel */}
                    <Col
                        xs={24}
                        md={12}
                        style={{
                            background: getBackgroundGradient(),
                            transition: "background 0.3s ease",
                            padding: isMobile ? "1.5rem 1rem" : "2rem",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            minHeight: isMobile ? "auto" : "400px",
                            position: "relative",
                            overflow: "hidden",
                            borderRadius: isMobile ? "12px 12px 0 0" : "12px 0 0 12px",
                        }}
                    >
                        <RetailBackground />
                        {brandPanelContent}
                    </Col>

                    {/* Login Panel */}
                    <Col
                        xs={24}
                        md={12}
                        style={{
                            padding: isMobile ? "1.5rem 1rem" : "2rem",
                            background: "#fff",
                            borderRadius: isMobile ? "0 0 12px 12px" : "0 12px 12px 0",
                        }}
                    >
                        <div
                            style={{
                                maxWidth: "360px",
                                margin: "0 auto",
                                display: "flex",
                                justifyContent: "center",
                                flexDirection: "column",
                            }}
                        >
                            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
                                {companyName && step === "pin" && (
                                    <>
                                        <Typography.Title level={5} style={{ marginBottom: "0.5rem" }}>
                                            Hi {companyName}, Welcome back!
                                        </Typography.Title>
                                        <Button
                                            icon={<SwapOutlined />}
                                            onClick={handleSwitchCompany}
                                            size="small"
                                            style={{ marginBottom: "1rem" }}
                                        >
                                            Switch Company
                                        </Button>
                                    </>
                                )}
                                <h3
                                    style={{
                                        fontSize: isMobile ? "20px" : "24px",
                                        marginBottom: "0.4rem",
                                        fontWeight: 600,
                                    }}
                                >
                                    {step === "companyCode" ? "Access Your Account" : "Enter PIN"}
                                </h3>
                                <p style={{ color: "#666", fontSize: "14px", margin: 0 }}>
                                    {step === "companyCode"
                                        ? "Choose your preferred way to access your account"
                                        : "Enter your 4-digit PIN to access your account"}
                                </p>
                            </div>

                            {error && (
                                <p
                                    style={{
                                        color: "red",
                                        textAlign: "center",
                                        marginBottom: "1rem",
                                        fontSize: "13px",
                                    }}
                                >
                                    {error}
                                </p>
                            )}

                            {step === "companyCode" ? (
                                <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                                    {/* Login Method Selector */}
                                    <Segmented
                                        block
                                        value={loginMethod}
                                        onChange={(value) => {
                                            setLoginMethod(value as LoginMethod);
                                            setError(null);
                                        }}
                                        options={[
                                            {
                                                label: (
                                                    <span>
                                                        <UsergroupAddOutlined /> Company Code
                                                    </span>
                                                ),
                                                value: "companyCode",
                                            },
                                            {
                                                label: (
                                                    <span>
                                                        <MailOutlined /> Business Email
                                                    </span>
                                                ),
                                                value: "businessEmail",
                                            },
                                        ]}
                                        style={{ marginBottom: "8px" }}
                                    />

                                    {loginMethod === "companyCode" ? (
                                        <Input
                                            autoFocus
                                            onPressEnter={() => handleVerifySubmit()}
                                            prefix={<UsergroupAddOutlined />}
                                            placeholder="Enter Company Code"
                                            onChange={(e) => setCompanyCode(e.target.value)}
                                            size="large"
                                            value={companyCode || ""}
                                            autoComplete="off"
                                            type={visible ? "text" : "password"}
                                            suffix={
                                                visible ? (
                                                    <EyeOutlined
                                                        onClick={() => setVisible(false)}
                                                        style={{ cursor: "pointer" }}
                                                    />
                                                ) : (
                                                    <EyeInvisibleOutlined
                                                        onClick={() => setVisible(true)}
                                                        style={{ cursor: "pointer" }}
                                                    />
                                                )
                                            }
                                        />
                                    ) : (
                                        <Input
                                            autoFocus
                                            onPressEnter={() => handleVerifySubmit()}
                                            prefix={<MailOutlined />}
                                            placeholder="business@company.com"
                                            onChange={(e) => setBusinessEmail(e.target.value)}
                                            size="large"
                                            value={businessEmail}
                                            autoComplete="off"
                                            type="email"
                                        />
                                    )}

                                    <Button
                                        type="primary"
                                        block
                                        size="large"
                                        disabled={
                                            loading ||
                                            (loginMethod === "companyCode" && !companyCode) ||
                                            (loginMethod === "businessEmail" && !businessEmail)
                                        }
                                        onClick={handleVerifySubmit}
                                        loading={loading}
                                    >
                                        {loading ? "Verifying..." : "Continue"}
                                    </Button>
                                </Space>
                            ) : (
                                <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                                    <Input.Password
                                        prefix={<KeyOutlined />}
                                        value={pin}
                                        size="large"
                                        readOnly
                                        placeholder="••••"
                                        style={{ textAlign: "center", letterSpacing: "0.5em" }}
                                    />

                                    {/* 2FA Alternative Divider */}
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "4px 0" }}>
                                        <div style={{ flex: 1, height: "1px", background: "#f0f0f0" }} />
                                        <span style={{ fontSize: "12px", color: "#bbb", whiteSpace: "nowrap" }}>
                                            or sign in another way
                                        </span>
                                        <div style={{ flex: 1, height: "1px", background: "#f0f0f0" }} />
                                    </div>

                                    {/* 2FA Coming Soon Card */}
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "12px",
                                            padding: "12px 14px",
                                            borderRadius: "10px",
                                            border: "1.5px dashed #e8e8e8",
                                            background: "#fafafa",
                                            cursor: "not-allowed",
                                            opacity: 0.75,
                                            userSelect: "none",
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: "38px",
                                                height: "38px",
                                                borderRadius: "8px",
                                                background: "linear-gradient(135deg, #e6f4ff 0%, #f0f5ff 100%)",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                flexShrink: 0,
                                            }}
                                        >
                                            <SafetyCertificateOutlined style={{ fontSize: "18px", color: "#91caff" }} />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                <span style={{ fontSize: "13px", fontWeight: 600, color: "#bbb" }}>
                                                    Two-Factor Authentication
                                                </span>
                                                <span
                                                    style={{
                                                        fontSize: "10px",
                                                        fontWeight: 700,
                                                        letterSpacing: "0.5px",
                                                        background: "linear-gradient(135deg, #e6f4ff, #f0f5ff)",
                                                        color: "#91caff",
                                                        border: "1px solid #bae0ff",
                                                        borderRadius: "4px",
                                                        padding: "1px 6px",
                                                        lineHeight: "1.8",
                                                        whiteSpace: "nowrap",
                                                    }}
                                                >
                                                    COMING SOON
                                                </span>
                                            </div>
                                            <p style={{ fontSize: "11px", color: "#ccc", margin: 0, marginTop: "2px" }}>
                                                Verify with an authenticator app or SMS code
                                            </p>
                                        </div>
                                    </div>

                                    <Row gutter={[10, 10]} justify="center">
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => (
                                            <Col key={number} span={8}>
                                                <Button
                                                    size="large"
                                                    style={{
                                                        width: "100%",
                                                        height: isMobile ? "52px" : "48px",
                                                        fontSize: isMobile ? "18px" : "16px",
                                                        fontWeight: 500,
                                                    }}
                                                    onClick={() => handlePinClick(number)}
                                                    disabled={pin.length >= 4}
                                                >
                                                    {number}
                                                </Button>
                                            </Col>
                                        ))}
                                        <Col span={8}>
                                            <Button
                                                size="large"
                                                style={{
                                                    width: "100%",
                                                    height: isMobile ? "52px" : "48px",
                                                }}
                                                onClick={handleClearPin}
                                                danger
                                            >
                                                <DeleteOutlined />
                                            </Button>
                                        </Col>
                                        <Col span={8}>
                                            <Button
                                                size="large"
                                                style={{
                                                    width: "100%",
                                                    height: isMobile ? "52px" : "48px",
                                                    fontSize: isMobile ? "18px" : "16px",
                                                    fontWeight: 500,
                                                }}
                                                onClick={() => handlePinClick(0)}
                                                disabled={pin.length >= 4}
                                            >
                                                0
                                            </Button>
                                        </Col>
                                        <Col span={8}>
                                            <Button
                                                size="large"
                                                style={{
                                                    width: "100%",
                                                    height: isMobile ? "52px" : "48px",
                                                    fontSize: "18px",
                                                }}
                                                onClick={handleBackspace}
                                                disabled={pin.length === 0}
                                            >
                                                ←
                                            </Button>
                                        </Col>
                                    </Row>

                                    <Button
                                        type="primary"
                                        block
                                        size="large"
                                        onClick={() => handleLoginWithNavigation(pin)}
                                        disabled={pin.length !== 4 || loading}
                                        loading={loading}
                                    >
                                        {loading ? "Logging in..." : "Login"}
                                    </Button>
                                </Space>
                            )}
                        </div>
                    </Col>
                </Row>
            </ProCard>
        </div>
    );
};

export default StaffLoginPage;