import React, { useState } from "react";
import { Button, Typography, Space, message, Modal, Tabs, Input } from "antd";
import { CopyOutlined, DownloadOutlined, QrcodeOutlined } from "@ant-design/icons";
import { QRCodeCanvas } from "qrcode.react";

const { Text } = Typography;

// ── URL Share Modal ───────────────────────────────────────────────────────────
// Shared "Copy URL / QR Code" modal used across module dashboards (Duka, Mteja,
// Pesa, Dala, Bandu…) to share staff clock-in links, customer order links, etc.
interface URLShareModalProps {
  open: boolean;
  onClose: () => void;
  url: string;
  title: string;
  shopLogo?: string;
  primaryColor?: string;
}

const URLShareModal: React.FC<URLShareModalProps> = ({ open, onClose, url, title, shopLogo, primaryColor = "#1890ff" }) => {
  const [modalMessage, modalContextHolder] = message.useMessage();
  const [activeTab, setActiveTab] = useState("copy");
  const [qrUrl, setQrUrl] = useState(url);

  React.useEffect(() => {
    setQrUrl(url);
    setActiveTab("copy");
  }, [url, open]);

  const [tenantLogo, setTenantLogo] = React.useState<string | undefined>(shopLogo);
  const [tenantName, setTenantName] = React.useState("");

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem("tenant");
      const t = stored ? JSON.parse(stored) : null;
      setTenantLogo(t?.tenant_logo?.url || shopLogo);
      setTenantName(t?.name || "");
    } catch {
      setTenantLogo(shopLogo);
      setTenantName("");
    }
  }, [shopLogo, open]);

  const handleCopy = () => {
    navigator.clipboard.writeText(url)
      .then(() => modalMessage.success({ content: "URL copied!", duration: 2 }))
      .catch(() => modalMessage.error({ content: "Failed to copy URL", duration: 2 }));
  };

  const handleDownload = () => {
    const canvas = document.getElementById("url-qr-canvas") as HTMLCanvasElement;
    if (canvas) {
      const imageUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = imageUrl;
      a.download = `${title.replace(/\s+/g, "-").toLowerCase()}-qr.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      modalMessage.success({ content: "QR Code downloaded!", duration: 2 });
    }
  };

  const tabItems = [
    {
      key: "copy",
      label: <Space size={5}><CopyOutlined />Copy URL</Space>,
      children: (
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Text type="secondary" style={{ fontSize: 13 }}>
            Share this link so users can access the portal directly.
          </Text>
          <div style={{ display: "flex", gap: 8 }}>
            <Input
              value={url}
              readOnly
              style={{ flex: 1, fontFamily: "monospace", fontSize: 12, background: "#f8fafc" }}
            />
            <Button icon={<CopyOutlined />} type="primary" onClick={handleCopy}>
              Copy
            </Button>
          </div>
        </Space>
      ),
    },
    {
      key: "qr",
      label: <Space size={5}><QrcodeOutlined />QR Code</Space>,
      children: (
        <Space direction="vertical" align="center" style={{ width: "100%" }} size={16}>
          <div style={{ width: "100%" }}>
            <Text style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 6, fontWeight: 500 }}>
              URL — edit to generate a custom QR code
            </Text>
            <Input
              value={qrUrl}
              onChange={(e) => setQrUrl(e.target.value)}
              placeholder="Enter a URL to generate QR code..."
              style={{ fontFamily: "monospace", fontSize: 12 }}
              allowClear
            />
          </div>

          <div style={{
            padding: 20,
            background: "#fff",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            display: "inline-flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
          }}>
            <QRCodeCanvas
              id="url-qr-canvas"
              value={qrUrl || " "}
              size={220}
              level="H"
              includeMargin={false}
              imageSettings={tenantLogo ? {
                src: tenantLogo,
                width: 52,
                height: 52,
                excavate: true,
              } : undefined}
            />
            {tenantName && (
              <Text style={{
                fontSize: 12, fontWeight: 600, color: "#0f172a",
                letterSpacing: 0.5, textAlign: "center",
              }}>
                {tenantName}
              </Text>
            )}
          </div>

          {tenantLogo && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              Business logo embedded in QR code center
            </Text>
          )}

          <Button
            icon={<DownloadOutlined />}
            type="primary"
            onClick={handleDownload}
            disabled={!qrUrl?.trim()}
            style={{ minWidth: 190 }}
          >
            Download QR Code
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <Space size={8}>
          <div style={{
            background: "#eff6ff", borderRadius: 8, padding: "4px 8px",
            color: primaryColor, fontSize: 16, lineHeight: 1, display: "inline-flex",
          }}>
            <QrcodeOutlined />
          </div>
          <span style={{ fontWeight: 600 }}>{title}</span>
        </Space>
      }
      footer={null}
      width={520}
      destroyOnClose
      styles={{ body: { paddingTop: 8 } }}
    >
      {modalContextHolder}
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} size="middle" />
    </Modal>
  );
};

export default URLShareModal;
