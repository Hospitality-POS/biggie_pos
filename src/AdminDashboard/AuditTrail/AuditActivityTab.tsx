import React, { useMemo } from "react";
import dayjs from "dayjs";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Alert, Button, Card, Empty, Segmented, Select, Skeleton, Tag, Typography } from "antd";
import { ApiOutlined, CloseOutlined, EditOutlined, UnorderedListOutlined, UserOutlined } from "@ant-design/icons";
import { fetchAuditLogs, AuditLog, AuditLogFilters } from "@services/audit";
import { fetchAllUsersFlat } from "@services/users";
import ActivityRow from "./ActivityRow";
import { AUDIT_OFF_DESCRIPTION, AUDIT_OFF_MESSAGE, ENTITY_OPTIONS, dayHeading, entityLabel } from "./auditFormat";

const { Text } = Typography;

const C = { text: "#0f172a", sub: "#64748b", border: "#e2e8f0", faint: "#94a3b8" };

export type Kind = "all" | "data" | "http";
export type RecordFilter = { entity: string; id: string; label: string } | null;

interface Props {
  from: string;
  to: string;
  shopId?: string;
  kind: Kind;
  setKind: (kind: Kind) => void;
  userId?: string;
  setUserId: (id?: string) => void;
  entity?: string;
  setEntity: (entity?: string) => void;
  record: RecordFilter;
  setRecord: (record: RecordFilter) => void;
  shopName: (id?: string) => string | undefined;
  onOpenLog: (log: AuditLog) => void;
  onRetention: (days: number) => void;
}

const AuditActivityTab: React.FC<Props> = ({
  from,
  to,
  shopId,
  kind,
  setKind,
  userId,
  setUserId,
  entity,
  setEntity,
  record,
  setRecord,
  shopName,
  onOpenLog,
  onRetention,
}) => {
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["audit-users-flat"],
    queryFn: fetchAllUsersFlat,
    staleTime: 5 * 60000,
  });

  const filters: AuditLogFilters = {
    from,
    to,
    kind: kind === "all" ? undefined : kind,
    user_id: userId,
    shop_id: shopId,
    entity: record?.entity ?? entity,
    entity_id: record?.id,
    limit: 50,
  };

  const query = useInfiniteQuery({
    queryKey: ["audit-logs", filters],
    queryFn: ({ pageParam }) => fetchAuditLogs({ ...filters, cursor: pageParam }),
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    onSuccess: (data) => {
      const days = data.pages[0]?.retention_days;
      if (days) onRetention(days);
    },
    staleTime: 15000,
    retry: false,
  });

  const logs = useMemo(() => query.data?.pages.flatMap((p) => p.data) ?? [], [query.data]);

  const groups = useMemo(() => {
    const out: { day: string; items: AuditLog[] }[] = [];
    logs.forEach((log) => {
      const day = dayjs(log.ts).format("YYYY-MM-DD");
      if (out[out.length - 1]?.day !== day) out.push({ day, items: [] });
      out[out.length - 1].items.push(log);
    });
    return out;
  }, [logs]);

  const selectedUser = users.find((u: any) => String(u._id) === userId);
  const hasFilters = !!(userId || entity || record || kind !== "data");
  const clearFilters = () => {
    setKind("data");
    setUserId(undefined);
    setEntity(undefined);
    setRecord(null);
  };
  const errorStatus = (query.error as any)?.response?.status;

  const auditOff = query.data?.pages[0]?.audit_enabled === false;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {auditOff && <Alert type="info" showIcon message={AUDIT_OFF_MESSAGE} description={AUDIT_OFF_DESCRIPTION} />}

      {/* Feed filters */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <Segmented
          value={kind}
          onChange={(v) => setKind(v as Kind)}
          options={[
            { label: <span><EditOutlined /> Changes</span>, value: "data" },
            { label: <span><ApiOutlined /> Requests</span>, value: "http" },
            { label: <span><UnorderedListOutlined /> All</span>, value: "all" },
          ]}
        />
        <Select
          allowClear
          showSearch
          placeholder="Any employee"
          value={userId}
          onChange={setUserId}
          optionFilterProp="label"
          style={{ minWidth: 180, flex: "1 1 180px", maxWidth: 260 }}
          suffixIcon={<UserOutlined />}
          options={users.map((u: any) => ({
            value: String(u._id),
            label: u.username || [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email || u._id,
          }))}
        />
        <Select
          allowClear
          showSearch
          placeholder="Any record type"
          value={record ? undefined : entity}
          disabled={!!record}
          onChange={setEntity}
          optionFilterProp="label"
          style={{ minWidth: 170, flex: "1 1 170px", maxWidth: 220 }}
          options={ENTITY_OPTIONS}
        />
        {hasFilters && (
          <Button type="link" onClick={clearFilters} style={{ paddingInline: 4 }}>
            Clear filters
          </Button>
        )}
      </div>

      {(record || selectedUser) && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {selectedUser && (
            <Tag closable closeIcon={<CloseOutlined />} onClose={() => setUserId(undefined)} color="purple" style={{ padding: "2px 8px", fontSize: 13 }}>
              Activity by {selectedUser.username || "this employee"}
            </Tag>
          )}
          {record && (
            <Tag closable closeIcon={<CloseOutlined />} onClose={() => setRecord(null)} color="geekblue" style={{ padding: "2px 8px", fontSize: 13 }}>
              History of {entityLabel(record.entity).toLowerCase()} {record.label}
            </Tag>
          )}
        </div>
      )}

      <Card style={{ borderRadius: 12 }} styles={{ body: { padding: 0 } }}>
        {query.isLoading ? (
          <div style={{ padding: 16 }}>
            <Skeleton avatar active paragraph={{ rows: 1 }} />
            <Skeleton avatar active paragraph={{ rows: 1 }} />
            <Skeleton avatar active paragraph={{ rows: 1 }} />
          </div>
        ) : query.isError ? (
          <div style={{ padding: 16 }}>
            <Alert
              type={errorStatus === 403 ? "warning" : "error"}
              showIcon
              message={errorStatus === 403 ? "Only admins can view the audit trail" : "Could not load the audit trail"}
              description={errorStatus === 403 ? undefined : (query.error as any)?.response?.data?.message || (query.error as Error)?.message}
              action={errorStatus === 403 ? undefined : <Button size="small" onClick={() => query.refetch()}>Retry</Button>}
            />
          </div>
        ) : logs.length === 0 ? (
          <Empty
            style={{ padding: "48px 16px" }}
            description={
              <span style={{ color: C.sub }}>
                No activity found for these filters.
                {hasFilters && (
                  <>
                    {" "}
                    <Button type="link" onClick={clearFilters} style={{ padding: 0 }}>
                      Clear filters
                    </Button>
                  </>
                )}
              </span>
            }
          />
        ) : (
          <>
            {groups.map((group, gi) => (
              <div key={group.day}>
                <div
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 1,
                    background: "#f8fafc",
                    padding: "8px 16px",
                    fontSize: 12,
                    fontWeight: 600,
                    color: C.sub,
                    letterSpacing: 0.2,
                    borderTop: gi ? `1px solid ${C.border}` : undefined,
                    borderTopLeftRadius: gi ? 0 : 12,
                    borderTopRightRadius: gi ? 0 : 12,
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>{dayHeading(group.items[0].ts)}</span>
                  <span style={{ fontWeight: 400 }}>
                    {group.items.length}
                    {query.hasNextPage && gi === groups.length - 1 ? "+" : ""} event{group.items.length === 1 ? "" : "s"}
                  </span>
                </div>
                {group.items.map((log) => (
                  <ActivityRow
                    key={log._id}
                    log={log}
                    shopName={log.shop_id ? shopName(log.shop_id) : undefined}
                    onOpen={() => onOpenLog(log)}
                  />
                ))}
              </div>
            ))}

            <div style={{ padding: 16, textAlign: "center", borderTop: `1px solid ${C.border}` }}>
              {query.hasNextPage ? (
                <Button onClick={() => query.fetchNextPage()} loading={query.isFetchingNextPage}>
                  Load older activity
                </Button>
              ) : (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  That's everything for this period.
                </Text>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default AuditActivityTab;
