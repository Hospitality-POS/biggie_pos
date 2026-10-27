import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Empty, Progress, Spin, Typography } from "antd";
import { PlusOutlined, CalendarOutlined, MedicineBoxOutlined, UserOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { usePermissions } from "@hooks/usePermissions";
import { fetchPlans, planAudience } from "@services/plans";
import { audienceConfig, useAudience } from "@pages/FormsPlans/audience";
import type { PersonLite } from "@pages/FormsPlans/forms/person";
import PlanDrawer from "./PlanDrawer";
import NewPlanModal from "./NewPlanModal";
import { PLAN_STATUS_META, type PlanStatus, type TreatmentPlan } from "./types";
import { useCategories } from "../forms/categories";

const { Text } = Typography;

type Filter = "active" | "completed" | "cancelled" | "all";

interface Props {
  /** Only this customer's / employee's plans (their profile) */
  person?: PersonLite | null;
  /** Show the person's name on each card (everyone view) */
  showCustomer?: boolean;
}

const PlanCard: React.FC<{ plan: TreatmentPlan; showCustomer?: boolean; onOpen: () => void }> = ({ plan, showCustomer, onOpen }) => {
  const meta = PLAN_STATUS_META[plan.status];
  const step = audienceConfig(planAudience(plan)).stepNoun.toLowerCase();
  const cat = useCategories().meta(plan.category);
  const pct = plan.progress.total ? Math.round((plan.progress.done / plan.progress.total) * 100) : 0;
  const next = plan.progress.next_session;
  const overdue = plan.status === "active" && next?.planned_date && dayjs(next.planned_date).isBefore(dayjs(), "day");
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      style={{
        display: "flex",
        gap: 12,
        alignItems: "center",
        padding: "12px 14px",
        borderRadius: 12,
        border: "1px solid #e8edf3",
        background: "#fff",
        cursor: "pointer",
        opacity: plan.status === "cancelled" ? 0.65 : 1,
      }}
    >
      <div style={{ width: 40, height: 40, borderRadius: 11, background: cat.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, flexShrink: 0 }}>
        {cat.emoji}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text strong style={{ fontSize: 14, display: "block" }} ellipsis>
          {plan.title}
        </Text>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 12, color: "#64748b", marginTop: 1 }}>
          {showCustomer && (
            <span>
              <UserOutlined /> {plan.subject_snapshot.name}
            </span>
          )}
          <span style={{ fontWeight: 600, color: meta.color }}>{meta.label}</span>
          {plan.status === "active" && next && (
            <span style={{ color: overdue ? "#dc2626" : "#64748b" }}>
              <CalendarOutlined /> Next: {next.title}
              {next.planned_date ? ` · ${dayjs(next.planned_date).format("D MMM")}` : ""}
              {overdue ? " (overdue)" : ""}
            </span>
          )}
          {plan.precautions.length > 0 && (
            <span style={{ color: "#dc2626" }}>
              <MedicineBoxOutlined /> {plan.precautions.length}
            </span>
          )}
        </div>
      </div>
      <div style={{ width: 120, flexShrink: 0, textAlign: "right" }}>
        <Text style={{ fontSize: 12, color: "#64748b" }}>
          {plan.progress.done}/{plan.progress.total} {step}s
        </Text>
        <Progress percent={pct} showInfo={false} size="small" strokeColor={{ from: "#ec4899", to: "#8b5cf6" }} style={{ margin: 0 }} />
      </div>
    </div>
  );
};

const PlansList: React.FC<Props> = ({ person, showCustomer }) => {
  const { can } = usePermissions();
  const a = useAudience();
  const personKey = a.audience === "employee" ? "employee_id" : "customer_id";
  const [filter, setFilter] = useState<Filter>("active");
  const [openId, setOpenId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["plans", a.audience, person?._id ?? "all", filter],
    queryFn: () =>
      fetchPlans(a.audience, { [personKey]: person?._id, status: filter === "all" ? undefined : (filter as PlanStatus) }),
    enabled: can(a.perms.plansView),
  });

  if (!can(a.perms.plansView)) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`You don't have permission to view ${a.planNoun}s.`} />;
  }

  const filters: { key: Filter; label: string }[] = [
    { key: "active", label: "Active" },
    { key: "completed", label: "Completed" },
    { key: "cancelled", label: "Cancelled" },
    { key: "all", label: "All" },
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6, flex: 1, overflowX: "auto" }}>
          {filters.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 999,
                  border: `1px solid ${active ? "#0f172a" : "#e2e8f0"}`,
                  background: active ? "#0f172a" : "#fff",
                  color: active ? "#fff" : "#334155",
                  fontSize: 12.5,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
        {can(a.perms.plansManage) && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setNewOpen(true)}>
            New plan
          </Button>
        )}
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: 32 }}>
          <Spin />
        </div>
      ) : plans.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={filter === "active" ? (person ? `No active plans for this ${a.person.toLowerCase()}` : "No active plans") : "Nothing here"}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {plans.map((p) => (
            <PlanCard key={p._id} plan={p} showCustomer={showCustomer} onOpen={() => setOpenId(p._id)} />
          ))}
        </div>
      )}

      <NewPlanModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        person={person}
        onCreated={(plan) => {
          setNewOpen(false);
          setFilter("active");
          setOpenId(plan._id);
        }}
      />
      <PlanDrawer planId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
};

export default PlansList;
