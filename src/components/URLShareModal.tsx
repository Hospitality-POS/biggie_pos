import React, { useState } from "react";
import {
  Button,
  Typography,
  Space,
  message,
  Modal,
  Tabs,
  Input,
} from "antd";
import {
  CopyOutlined,
  DownloadOutlined,
  QrcodeOutlined,
} from "@ant-design/icons";
import { QRCodeCanvas } from "qrcode.react";

const { Text } = Typography;

interface URLShareModalProps {
  open: boolean;
  onClose: () => void;
  url: string;
  title: string;
  shopLogo?: string;
  showCopy?: boolean;
}

const URLShareModal: React.FC<URLShareModalProps> = ({ open, onClose, url, title, shopLogo, showCopy = true }) => {
  const [modalMessage, modalContextHolder] = message.useMessage();
  const [activeTab, setActiveTab] = useState("copy");
  const [qrUrl, setQrUrl] = useState(url);

  React.useEffect(() => {
    setQrUrl(url);
    setActiveTab("copy");
  }, [url, open]);

  const [tenantLogo, setTenantLogo] = React.useState<string | undefined>(shopLogo);
  const [tenantName, setTenantName] = React.useState("");
  const [tenantCode, setTenantCode] = React.useState("");

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem("tenant");
      const t = stored ? JSON.parse(stored) : null;
      setTenantLogo(t?.tenant_logo?.url || shopLogo);
      setTenantName(t?.name || "");
      setTenantCode(t?.tenant_code || "");
    } catch {
      setTenantLogo(shopLogo);
      setTenantName("");
      setTenantCode("");
    }
  }, [shopLogo, open]);

  const handleCopy = () => {
    navigator.clipboard
      .writeText(url)
      .then(() => modalMessage.success({ content: "URL copied to clipboard!", duration: 2 }))
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

  const qrContent = (
    <Space direction="vertical" align="center" style={{ width: "100%" }} size={16}>
      <div style={{
        padding: 20,
        background: "#fff",
        borderRadius: 12,
        border: "1px solid #e2e8f0",
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      }}>
        {tenantCode && (
          <Text style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, color: "#0f172a" }}>
            Business Code: {tenantCode}
          </Text>
        )}
        <QRCodeCanvas
          id="url-qr-canvas"
          value={qrUrl || " "}
          size={200}
          level="H"
          includeMargin={false}
          imageSettings={tenantLogo ? {
            src: tenantLogo,
            width: 48,
            height: 48,
            excavate: true,
          } : undefined}
        />
        {tenantName && (
          <Text style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", textAlign: "center" }}>
            {tenantName}
          </Text>
        )}
      </div>

      <Button
        icon={<DownloadOutlined />}
        type="primary"
        onClick={handleDownload}
        disabled={!qrUrl?.trim()}
        style={{ minWidth: 180 }}
      >
        Download QR Code
      </Button>
    </Space>
  );

  const tabItems = [
    {
      key: "copy",
      label: (
        <Space size={5}>
          <CopyOutlined />
          Copy URL
        </Space>
      ),
      children: (
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Text type="secondary" style={{ fontSize: 13 }}>
            Share this link directly with customers or staff.
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
      label: (
        <Space size={5}>
          <QrcodeOutlined />
          QR Code
        </Space>
      ),
      children: qrContent,
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <div style={{
            background: "#eff6ff", borderRadius: 8, padding: "4px 8px",
            color: "#3b82f6", fontSize: 16, lineHeight: 1, display: "inline-flex",
          }}>
            <QrcodeOutlined />
          </div>
          <span style={{ fontWeight: 600 }}>{title}</span>
        </div>
      }
      footer={null}
      width={480}
      destroyOnClose
      styles={{ body: { paddingTop: 8 } }}
    >
      {modalContextHolder}
      {showCopy ? (
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} size="middle" />
      ) : (
        qrContent
      )}
    </Modal>
  );
};

export default URLShareModal;
