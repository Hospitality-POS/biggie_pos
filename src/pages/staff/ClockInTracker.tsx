import React, { useState } from "react";
import { Row, Col, Typography, Button, Space, Result, Modal } from "antd";
import { ClockCircleOutlined, DeleteOutlined, LeftOutlined } from "@ant-design/icons";
import { ProCard } from "@ant-design/pro-components";
import { staffClockInOut } from "@services/customers";

const { Title, Text, Paragraph } = Typography;

const StaffClockTracker = () => {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [clockStatus, setClockStatus] = useState({
    isClockIn: undefined,
    timestamp: "",
    staffName: "",
    message: "",
  });
  const [isModalVisible, setIsModalVisible] = useState(false); // State for modal visibility

  const storedTenant = localStorage.getItem("tenant");
  const tenant = storedTenant ? JSON.parse(storedTenant) : null;
  const clientName = tenant ? tenant.name : "Relia";

  const params = new URLSearchParams(window.location.search);
  const tenantId = params.get("tenant_id");
  const shopId = params.get("shop_id");

  const handlePinSubmit = async () => {
    setLoading(true);
    try {
      const payload = {
        pin: pin,
        tenant_id: tenantId,
        shop_id: shopId,
      };

      const response = await staffClockInOut(payload);

      if (
        response.message === "You have already clocked in and out for today"
      ) {
        setClockStatus({
          isClockIn: false,
          timestamp: new Date().toLocaleString(),
          staffName: response.staffClockRecord?.staff_id?.username || "",
          message: response?.message,
        });
        setIsModalVisible(true); // Show modal for warning
      } else {
        const isClockIn = response.message.includes("Clocked in");
        setClockStatus({
          isClockIn,
          timestamp: new Date().toLocaleString(),
          staffName: response.staffClockRecord.staff_id.username,
          message: response.message,
        });
        setIsModalVisible(true); // Show modal for success
      }
    } catch (error) {
      console.error("Clock in/out failed", error);
      setClockStatus({
        isClockIn: undefined,
        timestamp: "",
        staffName: "",
        message: error.message,
      });
      setIsModalVisible(true); // Show modal for error
    } finally {
      setLoading(false);
      setPin(""); // Reset PIN after submission
    }
  };

  const resetPinState = () => {
    setClockStatus({
      isClockIn: undefined,
      timestamp: "",
      staffName: "",
      message: "",
    });
    setPin("");
    setIsModalVisible(false); // Close modal
  };

  const handleModalClose = () => {
    setIsModalVisible(false); // Close modal
  };

  const MobileHeader = () => (
    <div
      style={{
        padding: "24px",
        textAlign: "center",
        background: "linear-gradient(135deg, #2c3e50 0%, #6c1c2c 100%)",
        borderRadius: "16px 16px 0 0",
      }}
    >
      <img
        src="/relia.png"
        alt="store-logo"
        style={{
          width: "128px",
          height: "auto",
          marginBottom: "16px",
          margin: "0 auto",
        }}
      />
      <Title
        level={4}
        style={{
          color: "white",
          margin: 0,
          fontSize: "18px",
        }}
      >
        Welcome to {clientName}
      </Title>
      <Text style={{ color: "#e0e0e0", fontSize: "14px" }}>
        Clock In to Start Your Day or Clock Out to End Your Day
      </Text>
    </div>
  );

  const DesktopSidebar = () => (
    <div
      style={{
        position: "relative",
        height: "500px",
        minHeight: "500px",
        background: "linear-gradient(135deg, #2c3e50 0%, #6c1c2c 100%)",
        padding: "32px",
        borderRadius: "16px 0 0 16px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          textAlign: "center",
        }}
      >
        <div
          style={{
            background: "rgba(255, 255, 255, 0.1)",
            backdropFilter: "blur(10px)",
            padding: "40px",
            borderRadius: "24px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
          }}
        >
          <img
            src="/relia.png"
            alt="store-logo"
            style={{
              width: "192px",
              height: "auto",
              marginBottom: "24px",
              margin: "0 auto",
            }}
          />
          <Title
            level={2}
            style={{
              color: "white",
              fontSize: "24px",
              fontWeight: 600,
              marginBottom: "24px",
              textShadow: "0 2px 4px rgba(0,0,0,0.2)",
            }}
          >
            Secure Access
          </Title>
          <Paragraph
            style={{
              color: "rgba(255, 255, 255, 0.9)",
              fontSize: "16px",
              lineHeight: 1.8,
              maxWidth: "400px",
              margin: "0 auto",
              textShadow: "0 1px 2px rgba(0,0,0,0.1)",
            }}
          >
            Clock In to Start Your Day or Clock Out to End Your Day
          </Paragraph>
        </div>
      </div>
    </div>
  );

  const MainContent = () => (
    <div style={{ maxWidth: "400px", width: "100%", margin: "0 auto" }}>
      <div>
        <div style={{ marginBottom: "24px", textAlign: "center" }}>
          <Text style={{ fontSize: "16px", color: "#666" }}>
            Enter your 4-digit pin to proceed:
          </Text>
        </div>
        <div style={{ textAlign: "center", marginBottom: "16px" }}>
          <Text style={{ fontSize: "24px", fontWeight: "bold" }}>
            {pin.padEnd(4, "*")}
          </Text>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "16px",
          }}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => (
            <Button
              key={number}
              size="large"
              onClick={() =>
                setPin((prevPin) =>
                  prevPin.length < 4 ? prevPin + number : prevPin
                )
              }
              disabled={pin.length >= 4}
            >
              {number}
            </Button>
          ))}
          <Button
            type="primary"
            size="large"
            onClick={() => setPin("")}
            disabled={pin.length === 0}
            icon={<DeleteOutlined />}
          >
            Clear
          </Button>
          <Button
            size="large"
            onClick={() =>
              setPin((prevPin) =>
                prevPin.length < 4 ? prevPin + "0" : prevPin
              )
            }
            disabled={pin.length >= 4}
          >
            0
          </Button>
          <Button
            type="primary"
            size="large"
            onClick={handlePinSubmit}
            disabled={pin.length !== 4}
            loading={loading}
            icon={<ClockCircleOutlined />}
          >
            In/Out
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        backgroundSize: "cover",
        backgroundImage: `url("/try.png")`,
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <ProCard
        ghost
        style={{
          width: "100%",
          maxWidth: "1200px",
          background: "rgba(255, 255, 255, 0.95)",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 4px 24px rgba(0, 0, 0, 0.1)",
        }}
      >
        <Row>
          {/* Desktop Sidebar - Hidden on Mobile */}
          <Col xs={0} md={12} style={{ height: "500px" }}>
            <DesktopSidebar />
          </Col>

          {/* Mobile Header - Shown only on Mobile */}
          <Col xs={24} md={0}>
            <MobileHeader />
          </Col>

          {/* Main Content */}
          <Col xs={24} md={12}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "16px",
                flexDirection: "column",
                height: "100%",
              }}
            >
              <MainContent />
            </div>
          </Col>
        </Row>
      </ProCard>

      {/* Modal for Feedback */}
      <Modal
        open={isModalVisible}
        onCancel={handleModalClose}
        footer={[
          <Button
            key="back"
            onClick={resetPinState}
            block
            size="large"
            icon={<ClockCircleOutlined />}
            type="primary"
          >
            Back to Clock In/Out
          </Button>,
        ]}
        centered
        style={{
          borderRadius: "16px",
          maxWidth: "90%", 
        }}
        styles={{
          body: { padding: "24px" },
          mask: { backdropFilter: "blur(5px)" },
        }}
        width={400}
      >
        <Result
          status={
            clockStatus.message.includes("successfully")
              ? "success"
              : clockStatus.message.includes("already")
              ? "warning"
              : "error"
          }
          title={
            <Text
              style={{
                fontSize: "20px",
                fontWeight: 600,
                color: clockStatus.message.includes("successfully")
                  ? "#52c41a"
                  : clockStatus.message.includes("already")
                  ? "#faad14"
                  : "#ff4d4f",
              }}
            >
              {clockStatus.message}
            </Text>
          }
          subTitle={
            clockStatus.staffName && (
              <Text
                style={{ fontSize: "16px", color: "#666", marginTop: "8px" }}
              >
                {clockStatus.staffName} at {clockStatus.timestamp}
              </Text>
            )
          }
          style={{ padding: 0 }}
        />
      </Modal>
    </div>
  );
};

export default StaffClockTracker;
