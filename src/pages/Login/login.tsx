import React, { useEffect, useState } from "react";
import { Button, Input, Card, Space, Row, Col, Typography } from "antd";
import {
    StockOutlined,
    KeyOutlined,
    DeleteOutlined,
    ShoppingCartOutlined,
    UserOutlined,
    UsergroupAddOutlined,
    SwapOutlined,
} from "@ant-design/icons";
import { useAppDispatch, useAppSelector } from "src/store";
import { verifyCompanyCode } from "@services/users";
import { useLogin } from "@components/staffCard/hook/useLogin";
import { useNavigate } from "react-router-dom";
import { ProCard } from "@ant-design/pro-components";

const { Text } = Typography;

const StaffLoginPage = () => {
    const { handleLogin } = useLogin();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { user } = useAppSelector((state) => state.auth);

    const [companyCode, setCompanyCode] = useState<string | null>(null);
    const [companyName, setCompanyName] = useState<string>("");
    const [step, setStep] = useState<"companyCode" | "pin">("companyCode");
    const [loading, setLoading] = useState<boolean>(false);
    const [pin, setPin] = useState("");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const storedCode = localStorage.getItem("companyCode");
        const storedTenant = localStorage.getItem("tenant");

        if (storedCode && storedTenant) {
            const tenant = JSON.parse(storedTenant);
            setCompanyCode(storedCode);
            setCompanyName(tenant.name || "");
            setStep("pin");
        }
    }, []);

    const handleCompanyCodeSubmit = async (code: string) => {
        setError(null);
        setLoading(true);
        dispatch({ type: "VERIFY_COMPANY_CODE_REQUEST" });

        try {
            const result = await verifyCompanyCode({ companyCode: code });
            localStorage.setItem("tenant", JSON.stringify(result.data));
            localStorage.setItem("companyCode", code);

            setCompanyName(result.data.name || "");
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

    const handlePinClick = (number: number) => {
        if (pin.length < 4) {
            setPin((prev) => prev + number);
        }
    };

    const handleClearPin = () => setPin("");
    const handleBackspace = () => setPin((prev) => prev.slice(0, -1));

    const handleSwitchCompany = () => {
        // Clear local storage
        localStorage.removeItem("companyCode");
        localStorage.removeItem("tenant");

        // Reset state
        setCompanyCode(null);
        setCompanyName("");
        setStep("companyCode");
        setPin("");
        setError(null);
    };

    const handleLoginWithNavigation = async (enteredPin: string) => {
        setLoading(true);
        setError(null);

        const { success, error, user: userPayload } = await handleLogin(enteredPin);
        console.log('user info', success, user);
        if (success && userPayload?.role === "admin") {
            navigate("/admin/dashboard");
        } else if (success) {
            navigate("/tables");
        } else {
            setError(error);
        }

        setLoading(false);
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
                <pattern
                    id="retail-grid"
                    width="20"
                    height="20"
                    patternUnits="userSpaceOnUse"
                >
                    <path
                        d="M 20 0 L 0 0 0 20"
                        fill="none"
                        stroke="white"
                        strokeWidth="0.5"
                    />
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
            }}
        >
            <ProCard
                boxShadow
                style={{
                    maxWidth: "1000px",
                    width: "100%",
                    padding: 0,
                    borderRadius: "8px",
                }}
                bodyStyle={{ padding: 0 }}
            >
                <Row>
                    <Col
                        xs={24}
                        md={12}
                        style={{
                            background: "linear-gradient(135deg, #2c3e50 0%, #6c1c2c 100%)",
                            padding: "2rem",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            minHeight: "400px",
                            position: "relative",
                            overflow: "hidden",
                            borderRadius: "8px 0 0 8px",
                        }}
                    >
                        <RetailBackground />
                        <div
                            style={{
                                position: "relative",
                                zIndex: 1,
                                textAlign: "center",
                                background: "rgba(255, 255, 255, 0.1)",
                                padding: "2rem",
                                borderRadius: "16px",
                                backdropFilter: "blur(10px)",
                                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
                            }}
                        >
                            <div
                                style={{
                                    padding: "1.5rem",
                                    marginBottom: "1.5rem",
                                    display: "inline-block",
                                }}
                            >
                                <img
                                    src="/relia.png"
                                    alt="relia-logo"
                                    width="100%"
                                    height="auto"
                                />
                            </div>
                            <h2
                                style={{
                                    color: "white",
                                    fontSize: "28px",
                                    marginBottom: "1rem",
                                    fontWeight: "600",
                                    textShadow: "0 2px 4px rgba(0,0,0,0.2)",
                                }}
                            >
                                Hospitality POS Portal
                            </h2>
                            {companyName && (
                                <Text
                                    style={{
                                        color: "white",
                                        fontSize: "20px",
                                        marginBottom: "1rem",
                                        display: "block",
                                        fontWeight: "500",
                                        textShadow: "0 2px 4px rgba(0,0,0,0.2)",
                                    }}
                                >
                                    {companyName}
                                </Text>
                            )}
                            <p
                                style={{
                                    color: "rgba(255, 255, 255, 0.9)",
                                    textAlign: "center",
                                    textShadow: "0 2px 4px rgba(0,0,0,0.2)",
                                    lineHeight: "1.6",
                                    fontSize: "16px",
                                    maxWidth: "280px",
                                    margin: "0 auto",
                                }}
                            >
                                Access your point-of-sale system to manage sales, inventory, and
                                customer transactions.
                            </p>
                        </div>
                    </Col>
                    <Col
                        xs={24}
                        md={12}
                        style={{
                            padding: "2rem",
                        }}
                    >
                        <div
                            style={{
                                maxWidth: "360px",
                                margin: "0 auto",
                                justifyContent: "center",
                                flexDirection: "column",
                                display: "flex",
                            }}
                        >
                            <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                                {companyName && step === "pin" && (
                                    <>
                                        <Typography.Title level={4}>
                                            Hi {companyName}, Welcome back!
                                        </Typography.Title>
                                        <Button
                                            icon={<SwapOutlined />}
                                            onClick={handleSwitchCompany}
                                            style={{ marginBottom: '1rem' }}
                                        >
                                            Switch Company
                                        </Button>
                                    </>
                                )}
                                <h3 style={{ fontSize: "24px", marginBottom: "0.5rem" }}>
                                    {step === "companyCode" ? "Enter Company Code" : "Enter PIN"}
                                </h3>
                                <p style={{ color: "#666" }}>
                                    {step === "companyCode"
                                        ? "Please enter your company code to continue"
                                        : "Enter your 4-digit PIN to access your account"}
                                </p>
                            </div>

                            {error && (
                                <p
                                    style={{
                                        color: "red",
                                        textAlign: "center",
                                        marginBottom: "1rem",
                                    }}
                                >
                                    {error}
                                </p>
                            )}

                            {step === "companyCode" ? (
                                <Space
                                    direction="vertical"
                                    size="large"
                                    style={{ width: "100%" }}
                                >
                                    <Input
                                        autoFocus
                                        prefix={<UsergroupAddOutlined />}
                                        placeholder="Company Code"
                                        onChange={(e) => setCompanyCode(e.target.value)}
                                        size="large"
                                        value={companyCode || ""}
                                        autoComplete="off"
                                    />
                                    <Button
                                        type="primary"
                                        block
                                        size="large"
                                        disabled={!companyCode || loading}
                                        onClick={() => handleCompanyCodeSubmit(companyCode!)}
                                        loading={loading}
                                    >
                                        {loading ? "Verifying..." : "Continue"}
                                    </Button>
                                </Space>
                            ) : (
                                <Space
                                    direction="vertical"
                                    size="large"
                                    style={{ width: "100%" }}
                                >
                                    <Input.Password
                                        prefix={<KeyOutlined />}
                                        value={pin}
                                        size="large"
                                        readOnly
                                        placeholder="••••"
                                        style={{ textAlign: "center", letterSpacing: "0.5em" }}
                                    />

                                    <Row gutter={[12, 12]} justify="center">
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => (
                                            <Col key={number} span={8}>
                                                <Button
                                                    size="large"
                                                    style={{ width: "100%", height: "48px" }}
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
                                                style={{ width: "100%", height: "48px" }}
                                                onClick={handleClearPin}
                                                danger
                                            >
                                                <DeleteOutlined />
                                            </Button>
                                        </Col>
                                        <Col span={8}>
                                            <Button
                                                size="large"
                                                style={{ width: "100%", height: "48px" }}
                                                onClick={() => handlePinClick(0)}
                                                disabled={pin.length >= 4}
                                            >
                                                0
                                            </Button>
                                        </Col>
                                        <Col span={8}>
                                            <Button
                                                size="large"
                                                style={{ width: "100%", height: "48px" }}
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