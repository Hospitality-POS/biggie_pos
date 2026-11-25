import { useEffect, useMemo, useState } from "react";
import { Alert, Form, Input, InputNumber, Modal, Spin, Tag, Typography } from "antd";
import { CheckCircleFilled, EditOutlined, WarningFilled } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { patchInvoice } from "@services/accounting/invoice";
import { fetchNextInvoiceNumber, fetchShop, formatInvoiceNumber, type ShopInvoiceSettings } from "@services/shops";
import { THEME_C } from "@utils/getPrimaryColor";

const { Text } = Typography;
const C = THEME_C;

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// The shop's numbering format (Invoice Settings), for the invoice's own year
const useFormat = (settings: ShopInvoiceSettings, date: Date) =>
  useMemo(() => {
    const prefix = (settings.number_prefix ?? "INV").trim();
    const sep = settings.number_separator ?? "-";
    const yf = settings.number_year_format ?? "YYYY";
    const pad = Math.min(10, Math.max(1, Math.floor(settings.number_padding ?? 5)));
    const year = yf === "YYYY" ? String(date.getFullYear()) : yf === "YY" ? String(date.getFullYear()).slice(-2) : "";
    const head = [prefix, year].filter(Boolean);
    // Year can be any year (an invoice may be renumbered into another year)
    const yearRe = yf === "YYYY" ? "\\d{4}" : yf === "YY" ? "\\d{2}" : "";
    const headRe = [prefix && escapeRe(prefix), yearRe].filter(Boolean);
    const regex = new RegExp(
      `^${[...headRe, `(\\d{${pad},})`].join(escapeRe(sep))}$`,
      "i"
    );
    const pattern = [...head, "#".repeat(Math.max(pad, 3))].join(sep);
    return { prefix, sep, yf, pad, year, regex, pattern };
  }, [settings, date]);

interface Props {
  invoice: any;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const EditInvoiceNumberModal: React.FC<Props> = ({ invoice, open, onClose, onSuccess }) => {
  const queryClient = useQueryClient();
  const shopId =
    localStorage.getItem("shopId") ||
    (() => {
      try { return JSON.parse(localStorage.getItem("tenant") || "null")?.shop_id; } catch { return null; }
    })();

  const { data: shopData, isLoading } = useQuery({
    queryKey: ["shop", shopId],
    queryFn: () => fetchShop(shopId!),
    enabled: !!shopId && open,
  });
  const { data: nextInfo } = useQuery({
    queryKey: ["shop-invoice-number", shopId],
    queryFn: () => fetchNextInvoiceNumber(shopId!),
    enabled: !!shopId && open,
  });

  const settings = (shopData?.invoice_settings || {}) as ShopInvoiceSettings;
  const issueDate = useMemo(
    () => (invoice?.issue_date ? dayjs(invoice.issue_date).toDate() : new Date()),
    [invoice?.issue_date]
  );
  const fmt = useFormat(settings, issueDate);

  const [value, setValue] = useState<string>(invoice?.order_no || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setValue(invoice?.order_no || "");
  }, [open, invoice?.order_no]);

  const trimmed = value.trim();
  const match = trimmed.match(fmt.regex);
  const matchesFormat = !!match;
  // The number part of what's typed, when it follows the format
  const typedNumber = match ? parseInt(match[1], 10) : null;
  const unchanged = trimmed === (invoice?.order_no || "");

  const example = formatInvoiceNumber(settings, nextInfo?.next_number ?? 229, issueDate);

  const handleSave = async () => {
    if (!trimmed || unchanged) return;
    setSaving(true);
    try {
      await patchInvoice(invoice._id, { order_no: trimmed });
      queryClient.invalidateQueries({ queryKey: ["invoice", invoice._id] });
      queryClient.invalidateQueries({ queryKey: ["shop-invoice-number", shopId] });
      onSuccess();
      onClose();
    } catch {
      // patchInvoice already shows the API's message (e.g. number taken)
    } finally {
      setSaving(false);
    }
  };

  const part = (label: string, val: string) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Text type="secondary" style={{ fontSize: 11 }}>{label}</Text>
      <Tag style={{ margin: 0, fontFamily: "monospace", fontSize: 12 }}>{val}</Tag>
    </div>
  );

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ background: C.primaryLight, borderRadius: 7, padding: "4px 6px", color: C.blue, fontSize: 14, lineHeight: 1 }}>
            <EditOutlined />
          </div>
          <Text strong style={{ fontSize: 14, color: C.darkText }}>Edit Invoice No. — {invoice?.order_no}</Text>
        </div>
      }
      okText="Save number"
      onOk={handleSave}
      okButtonProps={{ disabled: !trimmed || unchanged, loading: saving }}
      destroyOnClose
      width={520}
    >
      <Spin spinning={isLoading}>
        {/* The format from Invoice Settings, as a guide */}
        <div style={{ background: "#f8fafc", border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, marginBottom: 16 }}>
          <Text style={{ fontSize: 12, display: "block", marginBottom: 8 }}>
            Your invoice format (from Invoice Settings): <Text strong code>{fmt.pattern}</Text>
          </Text>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            {fmt.prefix && part("Prefix", fmt.prefix)}
            {fmt.sep && part("Separator", fmt.sep)}
            {fmt.yf !== "none" && part(fmt.yf === "YY" ? "Year (2 digits)" : "Year (4 digits)", fmt.year)}
            {part("Number", fmt.pad > 1 ? `at least ${fmt.pad} digits` : "any digits")}
          </div>
          <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 8 }}>
            e.g. <Text code style={{ fontSize: 11 }}>{example}</Text>
            {nextInfo?.preview && <> · next new invoice gets <Text code style={{ fontSize: 11 }}>{nextInfo.preview}</Text></>}
          </Text>
        </div>

        <Form layout="vertical">
          <Form.Item
            label="Number"
            tooltip="Type just the number and the invoice number is built in your format, using this invoice's year."
            style={{ marginBottom: 12 }}
          >
            <InputNumber
              min={1}
              precision={0}
              style={{ width: "100%" }}
              placeholder="e.g. 229"
              value={typedNumber ?? undefined}
              onChange={(n) => {
                if (typeof n === "number") setValue(formatInvoiceNumber(settings, n, issueDate));
              }}
            />
          </Form.Item>
          <Form.Item label="Invoice number" style={{ marginBottom: 8 }}>
            <Input
              value={value}
              maxLength={50}
              onChange={(e) => setValue(e.target.value)}
              onPressEnter={handleSave}
              placeholder={fmt.pattern}
              style={{ fontFamily: "monospace" }}
            />
          </Form.Item>
          {trimmed && (
            matchesFormat ? (
              <Text style={{ fontSize: 12, color: "#16a34a" }}>
                <CheckCircleFilled /> Follows your format
              </Text>
            ) : (
              <Text style={{ fontSize: 12, color: C.orange }}>
                <WarningFilled /> Doesn't follow your format ({fmt.pattern}). You can still save it.
              </Text>
            )
          )}
        </Form>

        <Alert
          type="info"
          showIcon
          style={{ marginTop: 16, fontSize: 12 }}
          message="Journal entries and credit notes that show this invoice's number are updated too. Each number can only be used once."
        />
      </Spin>
    </Modal>
  );
};

export default EditInvoiceNumberModal;
