import React, { useEffect, useRef, useState } from "react";
import {
  Card,
  Form,
  Select,
  Space,
  Typography,
  Spin,
  Slider as AntSlider,
  Segmented,
  message,
} from "antd";
import { FontColorsOutlined } from "@ant-design/icons";
import { fetchSystemSetupDetailsById, updateSystemSetup } from "@services/systemsetup";

const { Text } = Typography;

const FONT_SIZE_PRESETS = [
  { label: "Small (10px)", value: 10 },
  { label: "Normal (13px)", value: 13 },
  { label: "Large (15px)", value: 15 },
  { label: "X-Large (17px)", value: 17 },
];

const ReceiptAppearanceSettings: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [systemSettingsId, setSystemSettingsId] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState<number>(13);
  const [isBold, setIsBold] = useState<boolean>(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchSystemSetupDetailsById();
        setSystemSettingsId(data?._id || null);
        setFontSize(data?.receipt_font_size ?? 13);
        setIsBold(data?.receipt_text_bold ?? true);
      } catch {
        message.error("Failed to load receipt appearance settings");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const debouncedSave = (font_size: number, text_bold: boolean) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!systemSettingsId) return;
      setSaving(true);
      try {
        await updateSystemSetup({
          _id: systemSettingsId,
          data: { receipt_font_size: font_size, receipt_text_bold: text_bold },
        });
        message.success("Receipt appearance saved");
      } catch {
        message.error("Failed to save receipt appearance");
      } finally {
        setSaving(false);
      }
    }, 600);
  };

  const handleFontSizeChange = (val: number) => {
    setFontSize(val);
    debouncedSave(val, isBold);
  };

  const handleBoldChange = (val: string | number) => {
    const bold = val === "bold";
    setIsBold(bold);
    debouncedSave(fontSize, bold);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={5} style={{ marginBottom: 20 }}>
        <FontColorsOutlined style={{ marginRight: 8 }} />
        Receipt Print Appearance
      </Typography.Title>

      <Card
        title="Font & Weight"
        size="small"
        style={{ maxWidth: 600 }}
        extra={saving ? <Text type="secondary" style={{ fontSize: 12 }}>Saving…</Text> : null}
      >
        <Form layout="vertical">
          <Form.Item
            label="Font Size"
            extra="Applies to thermal (80mm) receipts. Values above 15px are clamped at print time to prevent overflow."
          >
            <Space align="center" wrap>
              <AntSlider
                min={8}
                max={20}
                value={fontSize}
                onChange={handleFontSizeChange}
                style={{ width: 160 }}
                tooltip={{ formatter: (v) => `${v}px` }}
              />
              <Select
                value={fontSize}
                onChange={handleFontSizeChange}
                style={{ width: 140 }}
                options={FONT_SIZE_PRESETS}
              />
              <Text type="secondary" style={{ minWidth: 36 }}>{fontSize}px</Text>
            </Space>
          </Form.Item>

          <Form.Item label="Text Weight">
            <Segmented
              value={isBold ? "bold" : "normal"}
              onChange={handleBoldChange}
              options={[
                {
                  label: <span style={{ fontWeight: 700 }}>Bold</span>,
                  value: "bold",
                },
                {
                  label: <span style={{ fontWeight: 400 }}>Normal</span>,
                  value: "normal",
                },
              ]}
            />
          </Form.Item>
        </Form>

        <Card
          size="small"
          style={{ background: "#fafafa", marginTop: 8 }}
          bodyStyle={{ padding: "12px 16px" }}
        >
          <Text type="secondary" style={{ fontSize: 12 }}>Preview</Text>
          <div
            style={{
              fontFamily: "'Courier New', Courier, monospace",
              fontSize,
              fontWeight: isBold ? 700 : 400,
              marginTop: 8,
              lineHeight: 1.6,
            }}
          >
            <div>SHOP NAME</div>
            <div>----------------------------</div>
            <div>Item 1 x2 ......... KES 200</div>
            <div>Item 2 x1 ......... KES 150</div>
            <div>----------------------------</div>
            <div style={{ fontWeight: isBold ? 900 : 600 }}>TOTAL ............. KES 350</div>
          </div>
        </Card>
      </Card>

      <Card
        title="How it works"
        size="small"
        style={{ maxWidth: 600, marginTop: 16 }}
      >
        <ul style={{ paddingLeft: 20, color: "#64748b", fontSize: 13, lineHeight: 1.8 }}>
          <li>Settings are saved automatically 600 ms after you stop adjusting.</li>
          <li>These values become the <strong>default</strong> each time the Print modal opens.</li>
          <li>Users can still override them per-print in the Print modal — those changes are not persisted.</li>
        </ul>
      </Card>
    </div>
  );
};

export default ReceiptAppearanceSettings;
