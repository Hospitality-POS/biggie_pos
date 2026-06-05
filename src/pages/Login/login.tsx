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
import { sendOtp, loginWithMethod } from "../../services/authentication";
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
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
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
    
    // New state for enhanced authentication
    const [authMethod, setAuthMethod] = useState<'pin' | 'password' | '2fa' | 'otp'>('pin');
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [totpCode, setTotpCode] = useState<string>("");
    const [otpCode, setOtpCode] = useState<string>("");
    const [otpSent, setOtpSent] = useState<boolean>(false);
    const [otpExpiresIn, setOtpExpiresIn] = useState<number>(0);
    const [showPasswordOptions, setShowPasswordOptions] = useState<boolean>(false);
    const [currentAuthMethod, setCurrentAuthMethod] = useState<'pin' | 'password' | '2fa' | 'otp'>('pin');
    const [authMethodLoading, setAuthMethodLoading] = useState(false);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Auto-focus first OTP input when OTP is sent
    useEffect(() => {
        if (otpSent) {
            // Small delay to ensure the DOM is updated
            setTimeout(() => {
                const firstInput = document.getElementById('otp-input-0');
                if (firstInput) {
                    firstInput.focus();
                }
            }, 100);
        }
    }, [otpSent]);

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
                
                // Fetch current authentication method
                fetchCurrentAuthMethod();
            } catch (error) {
                console.error("Error parsing tenant:", error);
            }
        }
    }, [refreshPrimaryColor]);

    const fetchCurrentAuthMethod = async () => {
        // Only fetch auth methods if we have a valid user context
        // For login page, we don't have a user ID yet, so we'll skip this
        // and default to PIN authentication
        try {
            setAuthMethodLoading(true);
            
            // For login page, we don't fetch auth methods since we don't have a user yet
            // Users will select their preferred auth method from the UI
            // This prevents the "Failed to fetch auth method" error
            
            // Default to PIN authentication for login page
            setCurrentAuthMethod('pin');
            setAuthMethod('pin');
            
        } catch (error) {
            // Silently handle any errors and default to PIN
            setCurrentAuthMethod('pin');
            setAuthMethod('pin');
        } finally {
            setAuthMethodLoading(false);
        }
    };

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

    // Helper function to determine redirect path based on enabled modules
    const getRedirectPath = () => {
        // All non-admin users should redirect to home-dashboard
        return "/home-dashboard";
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
            navigate(getRedirectPath());
        } else {
            setError(loginError);
        }

        setLoading(false);
    };

    const handleSendOtp = async () => {
        if (!email) {
            setError("Please enter your email address first");
            return;
        }

        setAuthMethodLoading(true);
        setError(null);

        try {
            const response = await sendOtp({ email });
            setOtpSent(true);
            setOtpExpiresIn(response.expiresIn);
            
            // Start countdown timer
            let countdown = response.expiresIn;
            const timer = setInterval(() => {
                countdown--;
                setOtpExpiresIn(countdown);
                if (countdown <= 0) {
                    clearInterval(timer);
                    setOtpSent(false);
                }
            }, 1000);

        } catch (error: any) {
            setError(error.response?.data?.message || "Failed to send OTP. Please try again.");
        } finally {
            setAuthMethodLoading(false);
        }
    };

    const handleEnhancedLogin = async () => {
        setLoading(true);
        setError(null);

        try {
            let loginData: any = {};

            switch (currentAuthMethod) {
                case 'pin':
                    if (!pin || pin.length !== 4) {
                        setError("Please enter a 4-digit PIN");
                        setLoading(false);
                        return;
                    }
                    loginData = { pin };
                    break;
                case 'password':
                    if (!email || !password) {
                        setError("Please enter email and password");
                        setLoading(false);
                        return;
                    }
                    loginData = { method: 'password', email, credential: password };
                    break;
                case '2fa':
                    if (!totpCode) {
                        setError("Please enter authenticator code");
                        setLoading(false);
                        return;
                    }
                    loginData = { method: '2fa', credential: totpCode };
                    break;
                case 'otp':
                    if (!email || !otpCode) {
                        setError("Please enter email and OTP code");
                        setLoading(false);
                        return;
                    }
                    loginData = { method: 'otp', email, credential: otpCode };
                    console.log('OTP Login Data being sent:', loginData);
                    break;
            }

            // Use existing login hook for PIN, or enhanced login for other methods
            if (currentAuthMethod === 'pin') {
                const { success, error: loginError, user: userPayload } = await handleLogin(pin);
                if (success && userPayload?.role === "admin") {
                    navigate("/admin/dashboard");
                } else if (success) {
                    navigate(getRedirectPath());
                } else {
                    setError(loginError);
                }
            } else {
                // For password and 2FA, use enhanced authentication
                try {
                    const user = await loginWithMethod(loginData);
                    console.log('OTP Login Success - User data:', user);

                    // Store user data in localStorage (like loginUser action does)
                    localStorage.setItem('user', JSON.stringify(user));

                    // Also store shopId in localStorage (like loginUser action does)
                    if (user?.shopId) {
                        localStorage.setItem("shopId", user.shopId);
                    }

                    // Update Redux state manually (like loginUser action does)
                    dispatch({
                        type: 'authUser/loginUser/fulfilled',
                        payload: user
                    });

                    // Navigate based on user role
                    if (user?.role === "admin") {
                        console.log('Navigating to admin dashboard');
                        navigate("/admin/dashboard");
                    } else {
                        console.log('Navigating to appropriate dashboard based on modules');
                        navigate(getRedirectPath());
                    }
                } catch (fetchError) {
                    console.error('OTP Login Error:', fetchError);
                    setError(fetchError?.response?.data?.message || "Authentication failed. Please try again.");
                }
            }
        } catch (error: any) {
            setError(error.message || "Login failed. Please try again.");
        } finally {
            setLoading(false);
        }
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
                    Basepoint Cloud — Duka (Store Front), Pesa (Accounting), Mteja (CRM), and Bandu (HR),
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
                                                )}
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
                                
                                    {/* Dynamic Authentication Input */}
                                    {currentAuthMethod === 'pin' && (
                                        <Input.Password
                                            prefix={<KeyOutlined />}
                                            value={pin}
                                            size="large"
                                            readOnly
                                            placeholder="····"
                                            style={{ textAlign: "center", letterSpacing: "0.5em" }}
                                        />
                                    )}

                                    {currentAuthMethod === 'password' && (
                                        <div>
                                            <Input
                                                prefix={<MailOutlined />}
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                size="large"
                                                placeholder="Enter your email"
                                                style={{ marginBottom: "12px" }}
                                            />
                                            <Input.Password
                                                prefix={<KeyOutlined />}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                size="large"
                                                placeholder="Enter your password"
                                                onPressEnter={() => handleEnhancedLogin()}
                                            />
                                        </div>
                                    )}

                                    {currentAuthMethod === '2fa' && (
                                        <div>
                                            <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                                                {[0, 1, 2, 3, 4, 5].map((index) => (
                                                    <Input
                                                        key={index}
                                                        value={totpCode[index] || ''}
                                                        onChange={(e) => {
                                                            const value = e.target.value;
                                                            if (value.length <= 1) {
                                                                const newTotpCode = totpCode.split('');
                                                                newTotpCode[index] = value;
                                                                const updatedCode = newTotpCode.join('');
                                                                setTotpCode(updatedCode);
                                                            
                                                                // Auto-focus next input
                                                                if (value && index < 5) {
                                                                    const nextInput = document.getElementById(`totp-input-${index + 1}`);
                                                                    if (nextInput) {
                                                                        nextInput.focus();
                                                                    }
                                                                }
                                                            }
                                                        }}
                                                        onKeyDown={(e) => {
                                                            // Handle backspace
                                                            if (e.key === 'Backspace' && !totpCode[index] && index > 0) {
                                                                const prevInput = document.getElementById(`totp-input-${index - 1}`);
                                                                if (prevInput) {
                                                                    prevInput.focus();
                                                                }
                                                            }
                                                        }}
                                                        onPaste={(e) => {
                                                            e.preventDefault();
                                                            const pastedData = e.clipboardData.getData('text');
                                                            const totpNumbers = pastedData.replace(/\D/g, '').slice(0, 6);
                                                            if (totpNumbers.length === 6) {
                                                                setTotpCode(totpNumbers);
                                                            }
                                                        }}
                                                        size="large"
                                                        style={{ 
                                                            width: "48px", 
                                                            textAlign: "center",
                                                            fontSize: "18px",
                                                            fontWeight: "bold"
                                                        }}
                                                        maxLength={1}
                                                        id={`totp-input-${index}`}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {currentAuthMethod === 'otp' && (
                                        <div>
                                            {!otpSent ? (
                                                // Show email input and send button first
                                                <div>
                                                    <Input
                                                        prefix={<MailOutlined />}
                                                        value={email}
                                                        onChange={(e) => setEmail(e.target.value)}
                                                        size="large"
                                                        placeholder="Enter your email"
                                                        style={{ marginBottom: "12px" }}
                                                        onPressEnter={() => email && handleSendOtp()}
                                                    />
                                                    <Button
                                                        type="primary"
                                                        block
                                                        size="large"
                                                        onClick={handleSendOtp}
                                                        loading={authMethodLoading}
                                                        disabled={!email}
                                                    >
                                                        {authMethodLoading ? "Sending..." : "Send OTP"}
                                                    </Button>
                                                </div>
                                            ) : (
                                                // Show OTP input after sending
                                                <div>
                                                    <div style={{ fontSize: "12px", color: "#52c41a", marginBottom: "12px" }}>
                                                        ✓ OTP sent to {email}. Valid for 5 minutes.
                                                    </div>
                                                    <div style={{ marginBottom: "12px" }}>
                                                        <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginBottom: "12px" }}>
                                                            {[0, 1, 2, 3, 4, 5].map((index) => (
                                                                <Input
                                                                    key={index}
                                                                    value={otpCode[index] || ''}
                                                                    onChange={(e) => {
                                                                        const value = e.target.value;
                                                                        if (value.length <= 1) {
                                                                            const newOtpCode = otpCode.split('');
                                                                            newOtpCode[index] = value;
                                                                            const updatedCode = newOtpCode.join('');
                                                                            setOtpCode(updatedCode);
                                                                            
                                                                            // Auto-focus next input
                                                                            if (value && index < 5) {
                                                                                const nextInput = document.getElementById(`otp-input-${index + 1}`);
                                                                                if (nextInput) {
                                                                                    nextInput.focus();
                                                                                }
                                                                            }
                                                                        }
                                                                    }}
                                                                    onKeyDown={(e) => {
                                                                        // Handle backspace
                                                                        if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
                                                                            const prevInput = document.getElementById(`otp-input-${index - 1}`);
                                                                            if (prevInput) {
                                                                                prevInput.focus();
                                                                            }
                                                                        }
                                                                    }}
                                                                    onPaste={(e) => {
                                                                        e.preventDefault();
                                                                        const pastedData = e.clipboardData.getData('text');
                                                                        const otpNumbers = pastedData.replace(/\D/g, '').slice(0, 6);
                                                                        if (otpNumbers.length === 6) {
                                                                            setOtpCode(otpNumbers);
                                                                        }
                                                                    }}
                                                                    size="large"
                                                                    style={{ 
                                                                        width: "48px", 
                                                                        textAlign: "center",
                                                                        fontSize: "18px",
                                                                        fontWeight: "bold"
                                                                    }}
                                                                    maxLength={1}
                                                                    id={`otp-input-${index}`}
                                                                />
                                                            ))}
                                                        </div>
                                                        <div style={{ display: "flex", justifyContent: "center" }}>
                                                            <Button
                                                                type="default"
                                                                size="large"
                                                                onClick={handleSendOtp}
                                                                loading={authMethodLoading}
                                                                style={{ minWidth: "120px" }}
                                                            >
                                                                {otpSent ? `Resend (${Math.floor(otpExpiresIn / 60)}:${(otpExpiresIn % 60).toString().padStart(2, '0')})` : 'Resend'}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Alternative Authentication Methods Divider */}
                                    {currentAuthMethod !== 'pin' && (
                                        <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "4px 0" }}>
                                            <div style={{ flex: 1, height: "1px", background: "#f0f0f0" }} />
                                            <span style={{ fontSize: "12px", color: "#bbb", whiteSpace: "nowrap" }}>
                                                or sign in another way
                                            </span>
                                            <div style={{ flex: 1, height: "1px", background: "#f0f0f0" }} />
                                        </div>
                                    )}

                                    {/* Alternative Authentication Methods - Side by Side */}
                                    <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
                                        {/* PIN Login Option */}
                                        {currentAuthMethod !== 'pin' && (
                                            <div
                                                style={{
                                                    flex: 1,
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    alignItems: "center",
                                                    gap: "8px",
                                                    padding: "16px 12px",
                                                    borderRadius: "10px",
                                                    border: "1px solid #1890ff",
                                                    background: "#f0f9ff",
                                                    cursor: "pointer",
                                                    transition: "all 0.2s ease",
                                                    textAlign: "center",
                                                    position: "relative",
                                                    zIndex: 10,
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.transform = "translateY(-2px)";
                                                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.transform = "translateY(0)";
                                                    e.currentTarget.style.boxShadow = "none";
                                                }}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    console.log('PIN option clicked');
                                                    setCurrentAuthMethod('pin');
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        width: "40px",
                                                        height: "40px",
                                                        borderRadius: "8px",
                                                        background: "linear-gradient(135deg, #f0f9ff 0%, #e6f7ff 100%)",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                    }}
                                                >
                                                    <KeyOutlined style={{ fontSize: "20px", color: "#1890ff" }} />
                                                </div>
                                                <div>
                                                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#1890ff", display: "block" }}>
                                                        PIN
                                                    </span>
                                                    <span style={{ fontSize: "10px", color: "#8c8c8c", display: "block" }}>
                                                        4-Digit Code
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Password Login Option */}
                                        {currentAuthMethod !== 'password' && (
                                            <div
                                                style={{
                                                    flex: 1,
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    alignItems: "center",
                                                    gap: "8px",
                                                    padding: "16px 12px",
                                                    borderRadius: "10px",
                                                    border: "1px solid #d9f7be",
                                                    background: "#f6ffed",
                                                    cursor: "pointer",
                                                    transition: "all 0.2s ease",
                                                    textAlign: "center",
                                                    position: "relative",
                                                    zIndex: 10,
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.transform = "translateY(-2px)";
                                                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.transform = "translateY(0)";
                                                    e.currentTarget.style.boxShadow = "none";
                                                }}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    console.log('Password option clicked');
                                                    setCurrentAuthMethod('password');
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        width: "40px",
                                                        height: "40px",
                                                        borderRadius: "8px",
                                                        background: "linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                    }}
                                                >
                                                    <MailOutlined style={{ fontSize: "20px", color: "#52c41a" }} />
                                                </div>
                                                <div>
                                                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#52c41a", display: "block" }}>
                                                        Password
                                                    </span>
                                                    <span style={{ fontSize: "10px", color: "#8c8c8c", display: "block" }}>
                                                        Email & Password
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {/* 2FA Login Option */}
                                        {currentAuthMethod !== '2fa' && (
                                            <div
                                                style={{
                                                    flex: 1,
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    alignItems: "center",
                                                    gap: "8px",
                                                    padding: "16px 12px",
                                                    borderRadius: "10px",
                                                    border: "1px solid #f9f0ff",
                                                    background: "#faf5ff",
                                                    cursor: "pointer",
                                                    transition: "all 0.2s ease",
                                                    textAlign: "center",
                                                    position: "relative",
                                                    zIndex: 10,
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.transform = "translateY(-2px)";
                                                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.transform = "translateY(0)";
                                                    e.currentTarget.style.boxShadow = "none";
                                                }}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    console.log('2FA option clicked');
                                                    setCurrentAuthMethod('2fa');
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        width: "40px",
                                                        height: "40px",
                                                        borderRadius: "8px",
                                                        background: "linear-gradient(135deg, #faf5ff 0%, #f9f0ff 100%)",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                    }}
                                                >
                                                    <SafetyCertificateOutlined style={{ fontSize: "20px", color: "#722ed1" }} />
                                                </div>
                                                <div>
                                                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#722ed1", display: "block" }}>
                                                        2FA
                                                    </span>
                                                    <span style={{ fontSize: "10px", color: "#8c8c8c", display: "block" }}>
                                                        Authenticator App
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {/* OTP Login Option */}
                                        {currentAuthMethod !== 'otp' && (
                                            <div
                                                style={{
                                                    flex: 1,
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    alignItems: "center",
                                                    gap: "8px",
                                                    padding: "16px 12px",
                                                    borderRadius: "10px",
                                                    border: "1px solid #ff7a45",
                                                    background: "#fff2e8",
                                                    cursor: "pointer",
                                                    transition: "all 0.2s ease",
                                                    textAlign: "center",
                                                    position: "relative",
                                                    zIndex: 10,
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.transform = "translateY(-2px)";
                                                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.transform = "translateY(0)";
                                                    e.currentTarget.style.boxShadow = "none";
                                                }}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    console.log('OTP option clicked');
                                                    setCurrentAuthMethod('otp');
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        width: "40px",
                                                        height: "40px",
                                                        borderRadius: "8px",
                                                        background: "linear-gradient(135deg, #fff2e8 0%, #ffe7d6 100%)",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                    }}
                                                >
                                                    <SafetyCertificateOutlined style={{ fontSize: "20px", color: "#ff7a45" }} />
                                                </div>
                                                <div>
                                                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#ff7a45", display: "block" }}>
                                                        OTP
                                                    </span>
                                                    <span style={{ fontSize: "10px", color: "#8c8c8c", display: "block" }}>
                                                        Email OTP Code
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* PIN Keypad - Only show for PIN authentication */}
                                    {currentAuthMethod === 'pin' && (
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
                                    )}

                                    {/* Dynamic Login Button */}
                                    {currentAuthMethod === 'pin' && (
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
                                    )}

                                    {currentAuthMethod === 'password' && (
                                        <Button
                                            type="primary"
                                            block
                                            size="large"
                                            onClick={() => handleEnhancedLogin()}
                                            disabled={!email || !password || loading}
                                            loading={loading}
                                        >
                                            {loading ? "Logging in..." : "Login with Password"}
                                        </Button>
                                    )}

                                    {currentAuthMethod === '2fa' && (
                                        <Button
                                            type="primary"
                                            block
                                            size="large"
                                            onClick={() => handleEnhancedLogin()}
                                            disabled={!totpCode || totpCode.length !== 6 || loading}
                                            loading={loading}
                                        >
                                            {loading ? "Verifying..." : "Verify Code"}
                                        </Button>
                                    )}

                                    {currentAuthMethod === 'otp' && otpSent && (
                                        <Button
                                            type="primary"
                                            block
                                            size="large"
                                            onClick={() => handleEnhancedLogin()}
                                            disabled={!otpCode || otpCode.length !== 6 || loading}
                                            loading={loading}
                                        >
                                            {loading ? "Verifying..." : "Verify OTP"}
                                        </Button>
                                    )}
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