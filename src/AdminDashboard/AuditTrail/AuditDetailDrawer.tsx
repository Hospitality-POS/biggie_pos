import React from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Avatar, Button, Descriptions, Drawer, Empty, Space, Tag, Typography } from "antd";
import { HistoryOutlined, LockOutlined, RobotOutlined, UserOutlined } from "@ant-design/icons";
import type { AuditChange, AuditLog } from "@services/audit";
import {
  OP_LABELS,
  actionStyle,
  avatarColor,
  entityLabel,
  formatValue,
  humanize,
  initials,
  shortenPath,
  statusColor,
} from "./auditFormat";

dayjs.extend(relativeTime);

const { Text } = Typography;

const C = { text: "#0f172a", sub: "#64748b", border: "#e2e8f0", faint: "#94a3b8" };

export const ValueText: React.FC<{ value: unknown; strike?: boolean }> = ({ value, strike }) => {
  const formatted = formatValue(value);
  if (formatted.redacted) {
    return (
      <Tag icon={<LockOutlined />} style={{ margin: 0 }}>
        hidden
      </Tag>
    );
  }
  return (
    <Text
      delete={strike && !formatted.muted}
      italic={formatted.muted}
      style={{ color: formatted.muted ? C.faint : undefined, wordBreak: "break-word" }}
    >
      {formatted.text}
    </Text>
  );
};

const ChangesTable: React.FC<{ changes: AuditChange[] }> = ({ changes }) => (
  <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(110px, 0.9fr) 1fr 1fr",
        background: "#f8fafc",
        padding: "8px 12px",
        fontSize: 12,
        fontWeight: 600,
        color: C.sub,
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      <span>Field</span>
      <span>Before</span>
      <span>After</span>
    </div>
    {changes.map((change, i) => (
      <div
        key={`${change.f}-${i}`}
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(110px, 0.9fr) 1fr 1fr",
          gap: 8,
          padding: "10px 12px",
          fontSize: 13,
          borderTop: i ? `1px solid ${C.border}` : undefined,
          alignItems: "start",
        }}
      >
        <Text strong style={{ color: C.text }}>
          {humanize(change.f)}
          {change.op && OP_LABELS[change.op] && (
            <Text type="secondary" style={{ display: "block", fontSize: 11, fontWeight: 400 }}>
              {OP_LABELS[change.op]}
            </Text>
          )}
        </Text>
        <span style={{ background: "#fef2f2", borderRadius: 6, padding: "2px 6px" }}>
          {"from" in change ? <ValueText value={change.from} strike /> : <Text type="secondary" italic>not recorded</Text>}
        </span>
        <span style={{ background: "#ecfdf5", borderRadius: 6, padding: "2px 6px" }}>
          <ValueText value={change.to} />
        </span>
      </div>
    ))}
  </div>
);

const SnapshotTable: React.FC<{ snapshot: Record<string, unknown> }> = ({ snapshot }) => {
  const entries = Object.entries(snapshot).filter(([key]) => !["_id", "createdAt", "updatedAt"].includes(key));
  return (
    <Descriptions
      size="small"
      column={1}
      bordered
      labelStyle={{ width: 160, color: C.sub }}
      items={entries.map(([key, value]) => ({ key, label: humanize(key), children: <ValueText value={value} /> }))}
    />
  );
};

interface Props {
  log: AuditLog | null;
  shopName: (id?: string) => string | undefined;
  onClose: () => void;
  onShowRecordHistory: (log: AuditLog) => void;
  onShowUserActivity: (log: AuditLog) => void;
}

const AuditDetailDrawer: React.FC<Props> = ({ log, shopName, onClose, onShowRecordHistory, onShowUserActivity }) => {
  const style = log ? actionStyle(log) : null;
  const isHttp = log?.kind === "http";
  const actorName = log?.actor?.name || (log?.actor?.id ? "Unknown user" : "System");

  return (
    <Drawer
      open={!!log}
      onClose={onClose}
      width={Math.min(620, typeof window !== "undefined" ? window.innerWidth : 620)}
      title="Activity details"
      destroyOnClose
    >
      {log && style && (
        <Space direction="vertical" size={20} style={{ width: "100%" }}>
          {/* Who / what / when */}
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <Avatar
              size={44}
              style={{ background: avatarColor(log.actor?.id || log.actor?.name), flexShrink: 0 }}
              icon={!log.actor?.name ? (log.actor?.id ? <UserOutlined /> : <RobotOutlined />) : undefined}
            >
              {log.actor?.name ? initials(log.actor.name) : null}
            </Avatar>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 16, color: C.text, lineHeight: 1.4 }}>
                <Text strong>{actorName}</Text>{" "}
                {isHttp ? (
                  <>made a <Text code>{log.method}</Text> request</>
                ) : (
                  <>
                    <span style={{ color: style.color, fontWeight: 600 }}>{style.verb}</span>{" "}
                    {entityLabel(log.entity).toLowerCase()}
                    {log.entity_label && <Text strong> {log.entity_label}</Text>}
                  </>
                )}
              </div>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {dayjs(log.ts).format("dddd, D MMMM YYYY [at] HH:mm:ss")} · {dayjs(log.ts).fromNow()}
              </Text>
            </div>
          </div>

          <Descriptions
            size="small"
            column={1}
            bordered
            labelStyle={{ width: 140, color: C.sub }}
            items={[
              {
                key: "who",
                label: "Who",
                children: (
                  <Space size={6} wrap>
                    <span>{actorName}</span>
                    {log.actor?.role && <Tag style={{ margin: 0 }}>{humanize(log.actor.role)}</Tag>}
                    {log.actor?.is_admin && <Tag color="gold" style={{ margin: 0 }}>Admin</Tag>}
                  </Space>
                ),
              },
              ...(log.shop_id
                ? [{ key: "branch", label: "Branch", children: shopName(log.shop_id) || <Text code>{log.shop_id}</Text> }]
                : []),
              ...(!isHttp
                ? [
                    { key: "record", label: "Record", children: entityLabel(log.entity) },
                    ...(log.entity_id
                      ? [{ key: "id", label: "Record ID", children: <Text copyable code>{log.entity_id}</Text> }]
                      : []),
                  ]
                : [
                    { key: "endpoint", label: "Endpoint", children: <Text code copyable={{ text: log.path }}>{log.method} {shortenPath(log.path)}</Text> },
                    {
                      key: "result",
                      label: "Result",
                      children: (
                        <Space size={6}>
                          <Tag color={statusColor(log.status)} style={{ margin: 0 }}>{log.status}</Tag>
                          {log.duration_ms !== undefined && <Text type="secondary">{log.duration_ms} ms</Text>}
                        </Space>
                      ),
                    },
                  ]),
              ...(log.ip ? [{ key: "ip", label: "IP address", children: log.ip }] : []),
              ...(log.request_id
                ? [{ key: "req", label: "Request ID", children: <Text copyable type="secondary" style={{ fontSize: 12 }}>{log.request_id}</Text> }]
                : []),
            ]}
          />

          {/* What happened */}
          {!!log.changes?.length && (
            <div>
              <Text strong style={{ display: "block", marginBottom: 8 }}>
                What changed ({log.changes.length})
              </Text>
              <ChangesTable changes={log.changes} />
            </div>
          )}

          {log.meta?.snapshot && (
            <div>
              <Text strong style={{ display: "block", marginBottom: 8 }}>
                What was deleted
              </Text>
              <SnapshotTable snapshot={log.meta.snapshot} />
            </div>
          )}

          {(log.action === "update_many" || log.action === "delete_many") && (
            <div>
              <Text strong style={{ display: "block", marginBottom: 8 }}>
                Bulk operation
              </Text>
              <Descriptions
                size="small"
                column={1}
                bordered
                labelStyle={{ width: 140, color: C.sub }}
                items={[
                  {
                    key: "count",
                    label: log.action === "update_many" ? "Records updated" : "Records deleted",
                    children: log.meta?.modified ?? log.meta?.deleted ?? "—",
                  },
                  { key: "filter", label: "Matched by", children: <ValueText value={log.meta?.filter} /> },
                  ...(log.meta?.update ? [{ key: "update", label: "Change", children: <ValueText value={log.meta.update} /> }] : []),
                ]}
              />
            </div>
          )}

          {!isHttp && !log.changes?.length && !log.meta && (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={log.action === "create" ? "New record created" : "No field details recorded"} />
          )}

          <Space wrap>
            {log.entity && log.entity_id && (
              <Button icon={<HistoryOutlined />} onClick={() => onShowRecordHistory(log)}>
                Full history of this {entityLabel(log.entity).toLowerCase()}
              </Button>
            )}
            {log.actor?.id && (
              <Button icon={<UserOutlined />} onClick={() => onShowUserActivity(log)}>
                Everything {actorName} did
              </Button>
            )}
          </Space>
        </Space>
      )}
    </Drawer>
  );
};

export default AuditDetailDrawer;
