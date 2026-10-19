import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Checkbox, Empty, InputNumber, Modal, Radio, Select, Space, Spin, Typography, message } from "antd";
import { DeleteOutlined, PrinterOutlined, TagOutlined } from "@ant-design/icons";
import { fetchAllInventory } from "@services/inventory";
import {
  type LabelElement,
  type LabelJob,
  detectLocalAgent,
  fetchDeviceAgents,
  localPrintLabel,
  printAgentLabel,
} from "@services/hardware";
import { formatCurrency } from "@utils/formatters";

const { Text } = Typography;

// ── Label layout ───────────────────────────────────────────────────────────

const SIZES = [
  { key: "50x30", w: 50, h: 30 },
  { key: "40x30", w: 40, h: 30 },
  { key: "58x40", w: 58, h: 40 },
  { key: "38x25", w: 38, h: 25 },
] as const;

const DOTS_PER_MM = 203 / 25.4;

/** EAN/UPC check digit is valid (so the printer won't reject the barcode). */
function validGtin(code: string): boolean {
  if (!/^\d+$/.test(code)) return false;
  const digits = code.split("").map(Number);
  const check = digits.pop()!;
  const sum = digits
    .reverse()
    .reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

function barcodeFor(data: string, maxWidthMm: number): Extract<LabelElement, { type: "barcode" }> | null {
  const code = data.trim();
  if (!code) return null;
  let symbology: "ean13" | "ean8" | "upca" | "code128" = "code128";
  let modules = 11 * (code.length + 3) + 2; // Code 128 estimate
  if (code.length === 13 && validGtin(code)) [symbology, modules] = ["ean13", 95];
  else if (code.length === 12 && validGtin(code)) [symbology, modules] = ["upca", 95];
  else if (code.length === 8 && validGtin(code)) [symbology, modules] = ["ean8", 67];
  // Widest bars that still fit the label.
  const moduleWidth = [3, 2, 1].find((mw) => (modules * mw) / DOTS_PER_MM <= maxWidthMm);
  if (!moduleWidth) return null;
  return { type: "barcode", x: 0, y: 0, data: code, symbology, moduleWidth, showText: true };
}

const fit = (text: string, widthMm: number, sizeMm: number) => {
  const max = Math.max(4, Math.floor(widthMm / (sizeMm * 0.6)));
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

interface LabelItem {
  key: string;
  name: string;
  price: number | null;
  barcode: string;
  copies: number;
}

function buildLabel(item: LabelItem, w: number, h: number, opts: { shopName?: string; showPrice: boolean }): LabelJob {
  const m = 2; // margin
  const inner = w - m * 2;
  const elements: LabelElement[] = [];
  let y = 1.5;
  if (opts.shopName) {
    elements.push({ type: "text", x: m, y, text: fit(opts.shopName.toUpperCase(), inner, 2.4), sizeMm: 2.4 });
    y += 3.3;
  }
  elements.push({ type: "text", x: m, y, text: fit(item.name, inner, 3.2), sizeMm: 3.2 });
  y += 4.3;
  if (opts.showPrice && item.price != null) {
    elements.push({ type: "text", x: m, y, text: formatCurrency(item.price), sizeMm: 4.5 });
    y += 6;
  }
  const barHeight = h - y - 4.5; // leave room for the human-readable digits
  const bar = barHeight >= 5 ? barcodeFor(item.barcode, inner) : null;
  if (bar) elements.push({ ...bar, x: m, y, heightMm: Math.min(barHeight, 12) });
  return { widthMm: w, heightMm: h, copies: item.copies, elements };
}

// ── Printers ───────────────────────────────────────────────────────────────

interface PrinterOption {
  value: string; // "local:<agentId>" | "cloud:<agentId>"
  label: string;
}

const PRINTER_KEY = "label_printer_choice";
const SIZE_KEY = "label_size_choice";

const read = (k: string) => {
  try {
    return localStorage.getItem(k) ?? "";
  } catch {
    return "";
  }
};
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    // ignore
  }
};

// ── Component ──────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  shopName?: string;
}

const LabelPrintModal: React.FC<Props> = ({ open, onClose, shopName }) => {
  const shopId = localStorage.getItem("shopId") ?? "";

  const [printers, setPrinters] = useState<PrinterOption[] | null>(null);
  const [printer, setPrinter] = useState<string>(read(PRINTER_KEY));
  const [sizeKey, setSizeKey] = useState<string>(read(SIZE_KEY) || "50x30");
  const [showPrice, setShowPrice] = useState(true);
  const [showShop, setShowShop] = useState(true);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<LabelItem & { label: string }>>([]);
  const [searching, setSearching] = useState(false);
  const [items, setItems] = useState<LabelItem[]>([]);
  const [printing, setPrinting] = useState(false);
  const searchSeq = useRef(0);

  // Label printers: this computer's PrintAgent first (fastest), then any
  // connected label printer in the shop through the server.
  const loadPrinters = useCallback(async () => {
    setPrinters(null);
    const [local, cloud] = await Promise.all([
      detectLocalAgent(),
      fetchDeviceAgents(shopId).catch(() => ({ agents: [] })),
    ]);
    const opts: PrinterOption[] = [];
    const localIds = new Set<string>();
    for (const p of local?.devices.printers ?? []) {
      if (p.language !== "zpl" && p.language !== "tspl") continue;
      localIds.add(p.agentId);
      opts.push({ value: `local:${p.agentId}`, label: `${p.name} · this computer (${p.language.toUpperCase()})` });
    }
    for (const a of cloud.agents) {
      if (localIds.has(a.agent_id) || !a.connected) continue;
      if (a.printer_language !== "zpl" && a.printer_language !== "tspl") continue;
      opts.push({ value: `cloud:${a.agent_id}`, label: `${a.device_name} (${a.printer_language.toUpperCase()})` });
    }
    setPrinters(opts);
    setPrinter((cur) => (opts.some((o) => o.value === cur) ? cur : opts[0]?.value ?? ""));
  }, [shopId]);

  useEffect(() => {
    if (open) loadPrinters();
  }, [open, loadPrinters]);

  // Product search (debounced). Variants become their own label rows.
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const seq = ++searchSeq.current;
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await fetchAllInventory({ name: q, shop_id: shopId });
        if (seq !== searchSeq.current) return;
        const list: any[] = Array.isArray(data) ? data : data?.data ?? [];
        const rows: Array<LabelItem & { label: string }> = [];
        for (const p of list.slice(0, 30)) {
          const base = {
            name: String(p.name ?? ""),
            price: typeof p.price === "number" ? p.price : null,
            barcode: String(p.barcode || p.code || ""),
          };
          if (p.has_variants && Array.isArray(p.variants) && p.variants.length) {
            p.variants.forEach((v: any, i: number) => {
              const name = `${base.name} — ${v.name ?? `Variant ${i + 1}`}`;
              rows.push({
                key: `${p._id}:${i}`,
                label: name,
                name,
                price: typeof v.price === "number" ? v.price : base.price,
                barcode: String(v.sku || base.barcode),
                copies: 1,
              });
            });
          } else {
            rows.push({ key: String(p._id), label: base.name, ...base, copies: 1 });
          }
        }
        setResults(rows);
      } catch {
        if (seq === searchSeq.current) setResults([]);
      } finally {
        if (seq === searchSeq.current) setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [query, open, shopId]);

  const addItem = (key: string) => {
    const r = results.find((x) => x.key === key);
    if (!r) return;
    setItems((cur) =>
      cur.some((i) => i.key === key)
        ? cur.map((i) => (i.key === key ? { ...i, copies: i.copies + 1 } : i))
        : [...cur, { key: r.key, name: r.name, price: r.price, barcode: r.barcode, copies: 1 }]
    );
    setQuery("");
    setResults([]);
  };

  const size = SIZES.find((s) => s.key === sizeKey) ?? SIZES[0];
  const totalLabels = useMemo(() => items.reduce((n, i) => n + i.copies, 0), [items]);

  const print = async () => {
    if (!printer) return message.warning("Choose a label printer");
    if (items.length === 0) return message.warning("Add at least one product");
    write(PRINTER_KEY, printer);
    write(SIZE_KEY, sizeKey);
    const [via, agentId] = [printer.slice(0, printer.indexOf(":")), printer.slice(printer.indexOf(":") + 1)];
    setPrinting(true);
    let done = 0;
    try {
      for (const item of items) {
        const label = buildLabel(item, size.w, size.h, { shopName: showShop ? shopName : undefined, showPrice });
        if (via === "local") await localPrintLabel(agentId, label);
        else await printAgentLabel(agentId, label);
        done += item.copies;
      }
      message.success(`Sent ${done} label${done === 1 ? "" : "s"} to the printer`);
      setItems([]);
      onClose();
    } catch (e) {
      message.error(
        `${done ? `${done} label(s) sent, then: ` : ""}${e instanceof Error ? e.message : String(e)}`
      );
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={() => !printing && onClose()}
      title={
        <Space>
          <TagOutlined />
          Print labels
        </Space>
      }
      width={640}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={printing}>
          Cancel
        </Button>,
        <Button
          key="print"
          type="primary"
          icon={<PrinterOutlined />}
          loading={printing}
          disabled={!printer || items.length === 0}
          onClick={print}
        >
          {totalLabels ? `Print ${totalLabels} label${totalLabels === 1 ? "" : "s"}` : "Print"}
        </Button>,
      ]}
    >
      <Space direction="vertical" size={14} style={{ width: "100%" }}>
        {/* Printer */}
        <div>
          <Text strong style={{ display: "block", marginBottom: 6, fontSize: 13 }}>
            Label printer
          </Text>
          {printers === null ? (
            <Spin size="small" />
          ) : printers.length === 0 ? (
            <Alert
              type="warning"
              showIcon
              message="No label printer is connected"
              description="In PrintAgent, add the label printer and set its kind to ZPL or TSPL. It shows here once it's online."
              action={
                <Button size="small" onClick={loadPrinters}>
                  Retry
                </Button>
              }
            />
          ) : (
            <Select value={printer || undefined} onChange={setPrinter} options={printers} style={{ width: "100%" }} />
          )}
        </div>

        {/* Size + options */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end" }}>
          <div>
            <Text strong style={{ display: "block", marginBottom: 6, fontSize: 13 }}>
              Label size (mm)
            </Text>
            <Radio.Group
              size="small"
              value={sizeKey}
              onChange={(e) => setSizeKey(e.target.value)}
              optionType="button"
              options={SIZES.map((s) => ({ label: `${s.w}×${s.h}`, value: s.key }))}
            />
          </div>
          <Space size={12}>
            <Checkbox checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)}>
              Price
            </Checkbox>
            <Checkbox checked={showShop} onChange={(e) => setShowShop(e.target.checked)} disabled={!shopName}>
              Shop name
            </Checkbox>
          </Space>
        </div>

        {/* Product search */}
        <div>
          <Text strong style={{ display: "block", marginBottom: 6, fontSize: 13 }}>
            Products
          </Text>
          <Select
            showSearch
            value={null as unknown as string}
            placeholder="Search products by name…"
            filterOption={false}
            searchValue={query}
            onSearch={setQuery}
            onSelect={(key: string) => addItem(key)}
            notFoundContent={
              searching ? <Spin size="small" /> : query.trim().length < 2 ? "Type at least 2 letters" : "No products found"
            }
            options={results.map((r) => ({
              value: r.key,
              label: (
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{r.label}</span>
                  <span style={{ color: "#94a3b8", fontSize: 12, flexShrink: 0 }}>
                    {r.price != null ? formatCurrency(r.price) : ""} {r.barcode ? `· ${r.barcode}` : ""}
                  </span>
                </div>
              ),
            }))}
            style={{ width: "100%" }}
          />
        </div>

        {items.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Search for a product to add its label" />
        ) : (
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 8 }}>
            {items.map((item, idx) => (
              <div
                key={item.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  borderTop: idx ? "1px solid #f1f5f9" : undefined,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text strong style={{ fontSize: 13, display: "block" }} ellipsis>
                    {item.name}
                  </Text>
                  <Text style={{ fontSize: 12, color: "#64748b" }}>
                    {item.price != null ? formatCurrency(item.price) : "No price"} ·{" "}
                    {item.barcode ? item.barcode : <span style={{ color: "#f59e0b" }}>no barcode</span>}
                  </Text>
                </div>
                <InputNumber
                  size="small"
                  min={1}
                  max={500}
                  value={item.copies}
                  onChange={(v) =>
                    setItems((cur) => cur.map((i) => (i.key === item.key ? { ...i, copies: Number(v) || 1 } : i)))
                  }
                  addonAfter="×"
                  style={{ width: 90 }}
                />
                <Button
                  size="small"
                  type="text"
                  icon={<DeleteOutlined />}
                  onClick={() => setItems((cur) => cur.filter((i) => i.key !== item.key))}
                  aria-label="Remove"
                />
              </div>
            ))}
          </div>
        )}
      </Space>
    </Modal>
  );
};

export default LabelPrintModal;
