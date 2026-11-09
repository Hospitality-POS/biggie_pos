import React, { useState } from "react";
import { Typography, Space, Badge, Segmented, Empty, Tabs } from "antd";
import { ProCard } from "@ant-design/pro-components";
import { TeamOutlined, MessageOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { C, CH_COLORS, ST_COLORS } from "./constants";
import { HubRow, Pill } from "./SharedUI";

const { Text } = Typography;

export interface CustomersHubTabProps {
  customerList: any[];
  conversations: any[];
  totalConversations: number;
  convCounts: {
    open: number;
    pending: number;
    resolved: number;
    closed: number;
  };
  hasChatChannel: boolean;
  dateRangeLabel: string;
  isMobile: boolean;
  navTo: (path: string) => void;
}

export const CustomersHubTab: React.FC<CustomersHubTabProps> = ({
  customerList,
  conversations,
  totalConversations,
  convCounts,
  hasChatChannel,
  dateRangeLabel,
  isMobile,
  navTo,
}) => {
  const [convStatus, setConvStatus] = useState<"all" | "open" | "pending" | "resolved">("all");

  const customerHealth = (c: any) => {
    const v = c.visits || [];
    if (!v.length) return { label: "NEW", color: C.blue };
    const last = v.reduce((p: any, x: any) => (new Date(x.createdAt) > new Date(p.createdAt) ? x : p)).createdAt;
    const days = (Date.now() - new Date(last).getTime()) / 86400000;
    return days <= 14 ? { label: "ACTIVE", color: C.success } : { label: "OVERDUE", color: C.warning };
  };

  const filteredConversations = conversations.filter((c: any) => {
    if (convStatus === "all") return true;
    return (c.status || "").toLowerCase() === convStatus;
  });

  const hubGrid: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
    gap: isMobile ? 8 : 10,
  };

  const hubTabLabel = (icon: React.ReactNode, label: string, count: number, color: string) => (
    <Space size={6}>
      {icon}
      <span>{label}</span>
      {count > 0 && <Pill label={count > 99 ? "99+" : String(count)} color={color} bg={color + "18"} />}
    </Space>
  );

  return (
    <ProCard
      bordered
      headerBordered
      size="small"
      style={{ borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", width: "100%", maxWidth: "100%", overflow: "hidden" }}
      title={
        <Space size={8} align="center">
          <div
            style={{
              background: C.blueLight,
              borderRadius: 8,
              padding: isMobile ? "3px 6px" : "4px 8px",
              color: C.blue,
              display: "inline-flex",
              fontSize: isMobile ? 12 : 14,
            }}
          >
            <TeamOutlined />
          </div>
          <div>
            <Text strong style={{ fontSize: isMobile ? 13 : 14, display: "block", lineHeight: 1.2 }}>
              Customer &amp; Contact Records
            </Text>
            {!isMobile && <Text style={{ fontSize: 11, color: C.subtext }}>Active clients and inbox conversations · {dateRangeLabel}</Text>}
          </div>
        </Space>
      }
      bodyStyle={{ padding: isMobile ? "4px 10px 14px" : "4px 16px 16px", width: "100%", maxWidth: "100%" }}
    >
      <Tabs
        defaultActiveKey="customers"
        size={isMobile ? "small" : "middle"}
        items={[
          {
            key: "customers",
            label: hubTabLabel(<TeamOutlined />, "Customers", customerList.length, C.success),
            children: (
              <div>
                {customerList.length === 0 ? (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="No customers recorded in this period"
                    style={{ padding: "20px 0" }}
                  />
                ) : (
                  <div style={hubGrid}>
                    {customerList.slice(0, 10).map((c: any) => {
                      const health = customerHealth(c);
                      const name = c.customer_name || "Unnamed customer";
                      return (
                        <HubRow
                          key={c._id}
                          accent={health.color}
                          avatar={name[0].toUpperCase()}
                          title={name}
                          subtitle={[c.phone ? String(c.phone) : null, c.email].filter(Boolean).join(" · ") || "No contact details"}
                          right={<Pill label={health.label} color={health.color} bg={health.color + "15"} />}
                          rightSub={c.createdAt ? `Joined ${dayjs(c.createdAt).fromNow()}` : undefined}
                          onClick={() => navTo("/customers")}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            ),
          },
          ...(hasChatChannel
            ? [
                {
                  key: "chats",
                  label: hubTabLabel(<MessageOutlined />, "Conversations", totalConversations, C.blue),
                  children: (
                    <div>
                      <div style={{ marginBottom: 12 }}>
                        <Segmented
                          size="small"
                          value={convStatus}
                          onChange={(v) => setConvStatus(v as typeof convStatus)}
                          options={[
                            { label: "All", value: "all" },
                            { label: `Open${convCounts.open ? ` · ${convCounts.open}` : ""}`, value: "open" },
                            { label: `Pending${convCounts.pending ? ` · ${convCounts.pending}` : ""}`, value: "pending" },
                            { label: "Resolved", value: "resolved" },
                          ]}
                        />
                      </div>
                      {filteredConversations.length === 0 ? (
                        <Empty
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                          description="No conversations found"
                          style={{ padding: "20px 0" }}
                        />
                      ) : (
                        <div style={hubGrid}>
                          {filteredConversations.slice(0, 10).map((c: any) => {
                            const accent = CH_COLORS[c.channel] || C.gray;
                            const name = c.external_contact_name || c.external_contact_phone || "Unknown contact";
                            return (
                              <HubRow
                                key={c._id}
                                accent={accent}
                                avatar={(name || "?")[0].toUpperCase()}
                                title={name}
                                subtitle={c.last_message_preview || <span style={{ textTransform: "capitalize" }}>{c.channel}</span>}
                                right={
                                  <Space size={4}>
                                    {c.unread_count > 0 && <Badge count={c.unread_count} size="small" style={{ backgroundColor: C.orange }} />}
                                    <Pill
                                      label={(c.status || "—").toUpperCase()}
                                      color={ST_COLORS[c.status] || C.gray}
                                      bg={(ST_COLORS[c.status] || C.gray) + "15"}
                                    />
                                  </Space>
                                }
                                rightSub={c.last_message_at ? dayjs(c.last_message_at).fromNow() : undefined}
                                onClick={() => navTo("/omnichannel")}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ),
                },
              ]
            : []),
        ]}
      />
    </ProCard>
  );
};
