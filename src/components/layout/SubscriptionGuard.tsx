import { useNavigate } from "react-router-dom";
import React from "react";
import { Space, Button, Alert } from "antd";
import { CreditCardOutlined, LogoutOutlined } from "@ant-design/icons";
import { ProCard } from "@ant-design/pro-components";

const SubscriptionGuard: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const navigate = useNavigate();
  const [subscriptionStatus, setSubscriptionStatus] = React.useState<
    string | null
  >(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const checkSubscriptionStatus = () => {
      try {
        const tenantData = localStorage.getItem("tenant");
        const companyCode = localStorage.getItem("companyCode");

        if (!tenantData || !companyCode) {
          setIsLoading(false);
          return;
        }

        const tenant = JSON.parse(tenantData);
        const status = tenant.subscription_status;

        setSubscriptionStatus(status);
      } catch (error) {
        console.error("Error checking subscription status:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSubscriptionStatus();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("tenant");
    localStorage.removeItem("companyCode");
    localStorage.removeItem("shopId");
    localStorage.removeItem("user");

    navigate("/login");
  };

  if (isLoading) {
    return <div />;
  }

  if (subscriptionStatus === "suspended") {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "#e8eaf0",
          backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(255, 152, 0, 0.12) 0%, transparent 40%),
            radial-gradient(circle at 80% 70%, rgba(255, 193, 7, 0.08) 0%, transparent 45%),
            radial-gradient(circle at 50% 90%, rgba(255, 152, 0, 0.06) 0%, transparent 35%),
            repeating-linear-gradient(90deg, transparent 0px, transparent 80px, rgba(0, 0, 0, 0.03) 80px, rgba(0, 0, 0, 0.03) 82px),
            repeating-linear-gradient(0deg, transparent 0px, transparent 80px, rgba(0, 0, 0, 0.03) 80px, rgba(0, 0, 0, 0.03) 82px)
          `,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <ProCard
          style={{
            maxWidth: "540px",
            width: "100%",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
        >
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div
              style={{
                width: "80px",
                height: "80px",
                margin: "0 auto 24px",
                background: "#fff3e0",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CreditCardOutlined
                style={{ fontSize: "36px", color: "#ff9800" }}
              />
            </div>

            <h2
              style={{
                fontSize: "22px",
                fontWeight: 600,
                marginBottom: "24px",
                color: "#262626",
              }}
            >
              Payment Required
            </h2>

            <Alert
              message="Please make payment on time to avoid future disruptions."
              type="warning"
              showIcon
              style={{ marginBottom: "16px" }}
            />

            <p
              style={{
                fontSize: "15px",
                lineHeight: "1.5",
                marginBottom: "24px",
              }}
            >
              Your subscription has been suspended. Contact your administrator
              to restore access.
            </p>

            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              <Button
                icon={<LogoutOutlined />}
                onClick={handleLogout}
                block
                size="large"
              >
                Sign Out
              </Button>
            </Space>
          </div>
        </ProCard>
      </div>
    );
  }

  return <>{children}</>;
};

export default SubscriptionGuard;