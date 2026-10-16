import React from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Avatar, Tag, Tooltip, Typography } from "antd";
import { RightOutlined, RobotOutlined, ShopOutlined, UserOutlined } from "@ant-design/icons";
import type { AuditLog } from "@services/audit";
import { ValueText } from "./AuditDetailDrawer";
import {
  METHOD_VERBS,
  OP_LABELS,
  actionStyle,
  avatarColor,
  entityLabel,
  humanize,
  initials,
  shortId,
  shortenPath,
  statusColor,
} from "./auditFormat";

dayjs.extend(relativeTime);

const { Text } = Typography;

const C = { text: "#0f172a", sub: "#64748b", border: "#e2e8f0", faint: "#94a3b8" };

const MAX_INLINE_CHANGES = 3;

// ── One line in the feed ────────────────────────────────────────────────────

export const ActivityRow: React.FC<{
  log: AuditLog;
  shopName?: string;
  onOpen: () => void;
}> = ({ log, shopName, onOpen }) => {
  const style = actionStyle(log);
  const isHttp = log.kind === "http";
  const actorName = log.actor?.name || (log.actor?.id ? "Unknown user" : "System");
  const changes = log.changes || [];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen()}
      className="audit-row"
      style={{
        display: "flex",
        gap: 12,
        padding: "12px 16px",
        cursor: "pointer",
        borderTop: `1px solid ${C.border}`,
        alignItems: "flex-start",
      }}
    >
      {/* When */}
      <Tooltip title={dayjs(log.ts).format("ddd D MMM YYYY, HH:mm:ss")}>
        <div style={{ width: 62, flexShrink: 0, paddingTop: 6 }}>
          <Text style={{ fontVariantNumeric: "tabular-nums", color: C.text, fontSize: 13, fontWeight: 500 }}>
            {dayjs(log.ts).format("HH:mm:ss")}
          </Text>
        </div>
      </Tooltip>

      {/* Who */}
      <Avatar
        size={32}
        style={{ background: avatarColor(log.actor?.id || log.actor?.name), flexShrink: 0, fontSize: 13 }}
        icon={!log.actor?.name ? (log.actor?.id ? <UserOutlined /> : <RobotOutlined />) : undefined}
      >
        {log.actor?.name ? initials(log.actor.name) : null}
      </Avatar>

      {/* What */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, color: C.text, lineHeight: 1.5 }}>
          <Text strong>{actorName}</Text>
          {log.actor?.role && (
            <Tag bordered={false} style={{ marginInline: 6, fontSize: 11, lineHeight: "18px" }}>
              {humanize(log.actor.role)}
            </Tag>
          )}{" "}
          {isHttp ? (
            <>
              <span style={{ color: C.sub }}>{METHOD_VERBS[log.method || ""] || "Request"} via</span>{" "}
              <Text code style={{ fontSize: 12 }}>
                {log.method} {shortenPath(log.path)}
              </Text>
            </>
          ) : (
            <>
              <span
                style={{
                  color: style.color,
                  background: style.bg,
                  fontWeight: 600,
                  padding: "1px 8px",
                  borderRadius: 999,
                  fontSize: 12,
                }}
              >
                {style.verb}
              </span>{" "}
              <span>{entityLabel(log.entity).toLowerCase()}</span>{" "}
              <Text strong>{log.entity_label || shortId(log.entity_id)}</Text>
              {(log.action === "update_many" || log.action === "delete_many") && (
                <Text type="secondary"> ({log.meta?.modified ?? log.meta?.deleted ?? "?"} records)</Text>
              )}
            </>
          )}
        </div>

        {/* Inline preview of changed fields */}
        {changes.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
            {changes.slice(0, MAX_INLINE_CHANGES).map((change, i) => (
              <span
                key={`${change.f}-${i}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  background: "#f8fafc",
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  padding: "2px 8px",
                  maxWidth: "100%",
                }}
              >
                <Text style={{ fontSize: 12, color: C.sub }}>{humanize(change.f)}:</Text>
                {"from" in change && (
                  <>
                    <span style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <ValueText value={change.from} strike />
                    </span>
                    <span style={{ color: C.faint }}>→</span>
                  </>
                )}
                {change.op && OP_LABELS[change.op] && !("from" in change) && (
                  <Text type="secondary" style={{ fontSize: 12 }}>{OP_LABELS[change.op]}</Text>
                )}
                <span style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <ValueText value={change.to} />
                </span>
              </span>
            ))}
            {changes.length > MAX_INLINE_CHANGES && (
              <Text type="secondary" style={{ fontSize: 12, alignSelf: "center" }}>
                +{changes.length - MAX_INLINE_CHANGES} more
              </Text>
            )}
          </div>
        )}

        {/* Context */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 4, fontSize: 12, color: C.faint }}>
          <span>{dayjs(log.ts).fromNow()}</span>
          {shopName && (
            <span>
              <ShopOutlined /> {shopName}
            </span>
          )}
          {isHttp && log.status && (
            <Tag color={statusColor(log.status)} bordered={false} style={{ margin: 0, fontSize: 11, lineHeight: "18px" }}>
              {log.status}
            </Tag>
          )}
        </div>
      </div>

      <RightOutlined style={{ color: C.faint, fontSize: 12, paddingTop: 8 }} />
    </div>
  );
};


export default ActivityRow;
