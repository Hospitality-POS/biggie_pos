import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Button, Empty, Grid, Space, Spin, Tag, Tooltip, Typography, message } from "antd";
import { ProCard } from "@ant-design/pro-components";
import {
  ApiOutlined,
  DesktopOutlined,
  DollarOutlined,
  InfoCircleOutlined,
  PrinterOutlined,
  ReloadOutlined,
  TagOutlined,
} from "@ant-design/icons";
import {
  type DeviceAgent,
  type LocalDevices,
  type PrinterStatus,
  type WeightReading,
  LOCAL_AGENT_URL,
  detectLocalAgent,
  fetchDeviceAgents,
  formatWeight,
  localOpenDrawer,
  localReadScale,
  localScaleCommand,
  openCashDrawer,
  printTestLabel,
  readAgentScale,
  refreshPrinterStatus,
  sendScaleCommand,
} from "../../../services/hardware";
import { THEME_C } from "../../../utils/getPrimaryColor";

const { Text } = Typography;
const C = THEME_C;

const STATUS_TAG: Record<PrinterStatus["state"], { color: string; label: string }> = {
  ok: { color: "success", label: "Ready" },
  warning: { color: "warning", label: "Paper low" },
  error: { color: "error", label: "Needs attention" },
  offline: { color: "error", label: "Unreachable" },
  unknown: { color: "default", label: "Status unknown" },
};

const LANGUAGE_LABEL: Record<string, string> = {
  escpos: "Receipt printer",
  zpl: "Label printer · ZPL",
  tspl: "Label printer · TSPL",
};

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Weight readout with stable / moving indicator. */
function WeightBox({ reading, error }: { reading: WeightReading | null; error?: string | null }) {
  return (
    <div
      style={{
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        background: C.bg,
        padding: "6px 12px",
        minWidth: 160,
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <Text style={{ fontFamily: "monospace", fontSize: 18, color: error ? C.subText : C.darkText }}>
        {formatWeight(reading)}
      </Text>
      {reading && !error && (
        <Tag color={reading.overload ? "error" : reading.stable ? "success" : "warning"} style={{ margin: 0 }}>
          {reading.overload ? "Overload" : reading.stable ? "Stable" : "Moving"}
        </Tag>
      )}
    </div>
  );
}

/** One scale with Read / Tare / Zero, through either the local API or the cloud. */
function ScaleRow({
  name,
  protocol,
  read,
  command,
}: {
  name: string;
  protocol: string;
  read: () => Promise<WeightReading>;
  command?: (cmd: "tare" | "zero") => Promise<unknown>;
}) {
  const [reading, setReading] = useState<WeightReading | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const doRead = async () => {
    setBusy(true);
    try {
      setReading(await read());
      setError(null);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const doCommand = async (cmd: "tare" | "zero") => {
    try {
      await command!(cmd);
      message.success(`${cmd === "tare" ? "Tare" : "Zero"} sent to ${name}`);
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 10,
        padding: "8px 0",
        borderTop: `1px dashed ${C.border}`,
      }}
    >
      <div style={{ flex: "1 1 160px", minWidth: 0 }}>
        <Text strong style={{ fontSize: 13 }}>
          ⚖ {name}
        </Text>
        <Text style={{ display: "block", fontSize: 11, color: C.subText }}>{protocol || "scale"}</Text>
      </div>
      <WeightBox reading={reading} error={error} />
      <Space size={4} wrap>
        <Button size="small" onClick={doRead} loading={busy}>
          Read weight
        </Button>
        {command && (
          <>
            <Button size="small" type="text" onClick={() => doCommand("tare")}>
              Tare
            </Button>
            <Button size="small" type="text" onClick={() => doCommand("zero")}>
              Zero
            </Button>
          </>
        )}
      </Space>
      {error && <Text style={{ flexBasis: "100%", fontSize: 11, color: C.red }}>{error}</Text>}
    </div>
  );
}

const HardwareSettings: React.FC = () => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const shopId = localStorage.getItem("shopId") ?? "";

  const [agents, setAgents] = useState<DeviceAgent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [local, setLocal] = useState<{ version: string; devices: LocalDevices } | null | undefined>(undefined);
  const [localChecking, setLocalChecking] = useState(false);
  // Set true on every mount: StrictMode mounts, unmounts and re-mounts in
  // dev, and a ref only cleared on unmount would drop every result.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const loadAgents = useCallback(async () => {
    if (!shopId) return setError("Shop ID is not set. Please log in again.");
    setLoading(true);
    try {
      const { agents: list } = await fetchDeviceAgents(shopId);
      if (mounted.current) {
        setAgents(list);
        setError(null);
      }
    } catch (e) {
      if (mounted.current) setError(errMsg(e));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [shopId]);

  const checkLocal = useCallback(async () => {
    setLocalChecking(true);
    const found = await detectLocalAgent();
    if (mounted.current) {
      setLocal(found);
      setLocalChecking(false);
    }
  }, []);

  useEffect(() => {
    loadAgents();
    checkLocal();
  }, [loadAgents, checkLocal]);

  const run = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key);
    try {
      await fn();
      message.success(ok);
    } catch (e) {
      message.error(errMsg(e));
    } finally {
      setBusy(null);
    }
  };

  const checkStatus = async (a: DeviceAgent) => {
    setBusy(`status:${a.agent_id}`);
    try {
      const { status, checkedAt } = await refreshPrinterStatus(a.agent_id);
      setAgents((list) =>
        list.map((x) => (x.agent_id === a.agent_id ? { ...x, status, status_checked_at: checkedAt } : x))
      );
      const tag = STATUS_TAG[status.state] ?? STATUS_TAG.unknown;
      (status.state === "ok" ? message.success : message.warning)(
        `${a.device_name}: ${status.messages.length ? status.messages.join(", ") : tag.label}`
      );
    } catch (e) {
      message.error(errMsg(e));
    } finally {
      setBusy(null);
    }
  };

  const hasDeviceSupport = (a: DeviceAgent) => a.capabilities.length > 0;

  // ── This computer ────────────────────────────────────────────────────────
  const localCard = (
    <ProCard
      bordered={!isMobile}
      title={
        <Space>
          <DesktopOutlined style={{ color: C.primary }} />
          <Text strong>This computer</Text>
        </Space>
      }
      extra={
        <Button size="small" icon={<ReloadOutlined spin={localChecking} />} onClick={checkLocal} loading={localChecking}>
          {!isMobile && "Detect"}
        </Button>
      }
      style={{ marginBottom: 16 }}
      bodyStyle={{ padding: isMobile ? "12px 10px" : "14px 16px" }}
    >
      {local === undefined ? (
        <Spin size="small" />
      ) : local === null ? (
        <Alert
          type="info"
          showIcon
          message="PrintAgent isn't running on this computer"
          description={
            <>
              Cash drawers and scales on <strong>this</strong> till respond fastest through PrintAgent 0.11 or newer
              running here ({LOCAL_AGENT_URL}). Devices on other computers are still managed below.
            </>
          }
          style={{ borderRadius: 8 }}
        />
      ) : (
        <div>
          <Space wrap size={6} style={{ marginBottom: 8 }}>
            <Tag color="success">PrintAgent v{local.version} detected</Tag>
            <Text style={{ fontSize: 12, color: C.subText }}>
              {local.devices.printers.length} printer(s) · {local.devices.scales.length} scale(s)
            </Text>
          </Space>
          {local.devices.printers.some((p) => p.cashDrawer) && (
            <div style={{ marginBottom: 8 }}>
              <Button
                icon={<DollarOutlined />}
                loading={busy === "local:drawer"}
                onClick={() => run("local:drawer", () => localOpenDrawer(), "Cash drawer opened")}
              >
                Open cash drawer
              </Button>
            </div>
          )}
          {local.devices.scales.map((s) => (
            <ScaleRow
              key={s.id}
              name={s.name}
              protocol={s.protocol}
              read={() => localReadScale(s.id)}
              command={(cmd) => localScaleCommand(cmd, s.id)}
            />
          ))}
        </div>
      )}
    </ProCard>
  );

  // ── Devices in this shop ─────────────────────────────────────────────────
  const agentCard = (a: DeviceAgent) => {
    const tag = a.status ? STATUS_TAG[a.status.state] ?? STATUS_TAG.unknown : null;
    const isLabel = a.printer_language === "zpl" || a.printer_language === "tspl";
    return (
      <div
        key={a.agent_id}
        style={{
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: isMobile ? "10px" : "12px 14px",
          marginBottom: 10,
          background: C.white,
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-start" }}>
          <div style={{ flex: "1 1 220px", minWidth: 0 }}>
            <Space wrap size={6}>
              {isLabel ? <TagOutlined style={{ color: C.primary }} /> : <PrinterOutlined style={{ color: C.primary }} />}
              <Text strong style={{ fontSize: 14 }}>
                {a.device_name || a.agent_id}
              </Text>
              <Tag color={a.connected ? "blue" : "default"} style={{ margin: 0 }}>
                {a.connected ? "Online" : "Offline"}
              </Tag>
              {tag && (
                <Tooltip title={a.status?.messages.join(" · ") || undefined}>
                  <Tag color={tag.color} style={{ margin: 0 }}>
                    {tag.label}
                  </Tag>
                </Tooltip>
              )}
            </Space>
            <Space wrap size={4} style={{ marginTop: 6 }}>
              <Tag style={{ margin: 0 }}>{LANGUAGE_LABEL[a.printer_language] ?? "Receipt printer"}</Tag>
              {a.cash_drawer && (
                <Tag color="green" style={{ margin: 0 }}>
                  Cash drawer
                </Tag>
              )}
              {a.zones.slice(0, 4).map((z) => (
                <Tag key={z} style={{ margin: 0, color: C.subText }}>
                  {z}
                </Tag>
              ))}
            </Space>
            {a.status && a.status.state !== "ok" && a.status.messages.length > 0 && (
              <Text
                style={{
                  display: "block",
                  marginTop: 6,
                  fontSize: 12,
                  color: a.status.state === "warning" || a.status.state === "unknown" ? C.orange : C.red,
                }}
              >
                {a.status.messages.join(" · ")}
              </Text>
            )}
            {a.status_checked_at && (
              <Text style={{ display: "block", marginTop: 2, fontSize: 11, color: C.subText }}>
                Checked {new Date(a.status_checked_at).toLocaleString("en-KE")}
              </Text>
            )}
            {a.connected && !hasDeviceSupport(a) && (
              <Text style={{ display: "block", marginTop: 6, fontSize: 12, color: C.subText }}>
                <InfoCircleOutlined /> Update PrintAgent on this computer to 0.11+ for drawer, status, scale and label
                support.
              </Text>
            )}
          </div>

          <Space wrap size={6}>
            <Button
              size="small"
              icon={<ReloadOutlined />}
              disabled={!a.connected || !hasDeviceSupport(a)}
              loading={busy === `status:${a.agent_id}`}
              onClick={() => checkStatus(a)}
            >
              Check status
            </Button>
            {a.cash_drawer && !isLabel && (
              <Button
                size="small"
                icon={<DollarOutlined />}
                disabled={!a.connected}
                loading={busy === `drawer:${a.agent_id}`}
                onClick={() => run(`drawer:${a.agent_id}`, () => openCashDrawer(a.agent_id), "Cash drawer opened")}
              >
                Open drawer
              </Button>
            )}
            {isLabel && (
              <Button
                size="small"
                icon={<TagOutlined />}
                disabled={!a.connected}
                loading={busy === `label:${a.agent_id}`}
                onClick={() => run(`label:${a.agent_id}`, () => printTestLabel(a.agent_id), "Test label sent")}
              >
                Test label
              </Button>
            )}
          </Space>
        </div>

        {a.scales.length > 0 && (
          <div style={{ marginTop: 8 }}>
            {a.scales.map((s) => (
              <ScaleRow
                key={s.id}
                name={s.name}
                protocol={s.protocol}
                read={async () => (await readAgentScale(a.agent_id, s.id)).reading}
                command={(cmd) => sendScaleCommand(a.agent_id, cmd, s.id)}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  const shopCard = (
    <ProCard
      bordered={!isMobile}
      title={
        <Space>
          <ApiOutlined style={{ color: C.primary }} />
          <Text strong>{isMobile ? "Shop devices" : "Devices in this shop"}</Text>
        </Space>
      }
      extra={
        <Button size="small" icon={<ReloadOutlined spin={loading} />} onClick={loadAgents} loading={loading}>
          {!isMobile && "Refresh"}
        </Button>
      }
      style={{ marginBottom: 16 }}
      bodyStyle={{ padding: isMobile ? "12px 10px" : "14px 16px" }}
    >
      {error && <Alert type="warning" showIcon message={error} style={{ marginBottom: 12, borderRadius: 8 }} />}
      {loading && agents.length === 0 ? (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <Spin />
        </div>
      ) : agents.length === 0 ? (
        !error && (
          <Empty
            description="No print agents yet — add one under Printer Settings."
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )
      ) : (
        agents.map(agentCard)
      )}
    </ProCard>
  );

  const howTo = (
    <ProCard
      bordered={!isMobile}
      title={
        <Space>
          <InfoCircleOutlined style={{ color: C.primary }} />
          <Text strong>Setting up hardware</Text>
        </Space>
      }
      bodyStyle={{ padding: isMobile ? "12px 10px" : "14px 16px" }}
    >
      <ul style={{ margin: 0, paddingLeft: 18, color: C.subText, fontSize: 13, lineHeight: 1.7 }}>
        <li>
          <strong>Cash drawer</strong> — plug it into the receipt printer's drawer port, then in PrintAgent on that
          computer edit the printer and tick <em>A cash drawer is plugged into this printer</em>.
        </li>
        <li>
          <strong>Label printer</strong> — add it in PrintAgent like any printer and set <em>Printer kind</em> to ZPL
          (Zebra) or TSPL (TSC, Xprinter).
        </li>
        <li>
          <strong>Weighing scale</strong> — connect it to a PrintAgent computer (USB/COM or network), then use{" "}
          <em>Add scale</em> in PrintAgent and pick its protocol. Use <em>Test reading</em> with something on the scale.
        </li>
        <li>
          <strong>Printer status</strong> — checked automatically every minute; paper low / out and cover open show
          here.
        </li>
      </ul>
    </ProCard>
  );

  return (
    <div>
      {localCard}
      {shopCard}
      {howTo}
    </div>
  );
};

export default HardwareSettings;
