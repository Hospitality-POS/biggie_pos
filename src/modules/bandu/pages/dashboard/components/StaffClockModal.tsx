import React from "react";
import { Modal, Space, Typography, Tabs, Button, Input, message } from "antd";
import {
  QrcodeOutlined,
  DownloadOutlined,
  CopyOutlined,
} from "@ant-design/icons";
import { QRCodeCanvas } from "qrcode.react";

const { Text } = Typography;

export interface StaffClockModalProps {
  open: boolean;
  onClose: () => void;
  clockLinkUrl: string;
  primaryColor: string;
}

export const StaffClockModal: React.FC<StaffClockModalProps> = ({
  open,
  onClose,
  clockLinkUrl,
  primaryColor,
}) => {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={420}
      title={
        <Space size={8}>
          <div
            style={{
              background: `${primaryColor}15`,
              borderRadius: 8,
              padding: "4px 8px",
              color: primaryColor,
              fontSize: 16,
              lineHeight: 1,
              display: "inline-flex",
            }}
          >
            <QrcodeOutlined />
          </div>
          <span>Staff Clock-In Kiosk & QR</span>
        </Space>
      }
    >
      <Text style={{ fontSize: 13, color: "#64748b", display: "block", marginBottom: 14 }}>
        Staff can clock in or out by opening this kiosk link or scanning the QR code and entering their 4-digit PIN.
      </Text>
      <Tabs
        defaultActiveKey="qr"
        items={[
          {
            key: "qr",
            label: (
              <Space size={5}>
                <QrcodeOutlined />
                QR Code
              </Space>
            ),
            children: (
              <Space direction="vertical" align="center" style={{ width: "100%" }} size={16}>
                <div
                  style={{
                    padding: 20,
                    background: "#fff",
                    borderRadius: 12,
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                  }}
                >
                  <QRCodeCanvas id="bandu-clock-qr" value={clockLinkUrl || " "} size={200} level="H" />
                </div>
                <Button
                  icon={<DownloadOutlined />}
                  type="primary"
                  onClick={() => {
                    const canvas = document.getElementById("bandu-clock-qr") as HTMLCanvasElement;
                    if (canvas) {
                      const a = document.createElement("a");
                      a.href = canvas.toDataURL("image/png");
                      a.download = "staff-clock-in-qr.png";
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      message.success("QR code downloaded");
                    }
                  }}
                  disabled={!clockLinkUrl}
                >
                  Download QR Code
                </Button>
              </Space>
            ),
          },
          {
            key: "copy",
            label: (
              <Space size={5}>
                <CopyOutlined />
                Copy URL
              </Space>
            ),
            children: (
              <Space direction="vertical" style={{ width: "100%", paddingTop: 8 }} size="middle">
                <div style={{ display: "flex", gap: 8 }}>
                  <Input
                    value={clockLinkUrl}
                    readOnly
                    style={{ flex: 1, fontFamily: "monospace", fontSize: 12, background: "#f8fafc" }}
                  />
                  <Button
                    icon={<CopyOutlined />}
                    type="primary"
                    onClick={() =>
                      navigator.clipboard
                        .writeText(clockLinkUrl)
                        .then(() => message.success("Link copied to clipboard"))
                        .catch(() => message.error("Failed to copy link"))
                    }
                  >
                    Copy
                  </Button>
                </div>
              </Space>
            ),
          },
        ]}
      />
    </Modal>
  );
};
