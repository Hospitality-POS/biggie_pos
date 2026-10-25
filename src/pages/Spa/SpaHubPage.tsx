import React, { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Grid, Result, Spin, Typography } from "antd";
import {
  FormOutlined,
  SolutionOutlined,
  ScheduleOutlined,
  AppstoreOutlined,
  HeartOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { THEME_C } from "@utils/getPrimaryColor";
import { usePermissions } from "@hooks/usePermissions";
import { useSpaSettings } from "@hooks/useSpaSettings";
import { fetchClientForms } from "@services/clientForms";
import { fetchFormSubmissions } from "@services/formSubmissions";
import ClientFormsLibrary from "@pages/ClientForms/ClientFormsLibrary";
import FilledFormsList from "@pages/ClientForms/fill/FilledFormsList";
import PlansList from "@pages/TreatmentPlans/PlansList";
import PlanTemplates from "@pages/TreatmentPlans/PlanTemplates";
import type { SpaHubTab } from "@pages/ClientForms/constants";

const { Text, Title } = Typography;
const C = THEME_C;

interface Section {
  key: SpaHubTab;
  label: string;
  description: string;
  group: "Client forms" | "Treatment plans";
  icon: React.ReactNode;
  color: string;
  bg: string;
  badge?: number;
  render: () => React.ReactNode;
}

/**
 * Spa & Wellness: client forms and treatment plans on one page, with a
 * side menu on desktop / tablet and scrollable tabs on phones.
 * Route: /spa?tab=forms|filled|plans|templates
 */
const SpaHubPage: React.FC = () => {
  const screens = Grid.useBreakpoint();
  const isPhone = !screens.md; // < 768
  const isDesktop = !!screens.lg; // ≥ 992; tablets get a slimmer side menu
  const { can } = usePermissions();
  const spa = useSpaSettings();
  const [params, setParams] = useSearchParams();

  const showForms = spa.clientForms && can("CLIENT_FORMS_VIEW");
  const showFilled = spa.clientForms && can("CLIENT_FORMS_VIEW_FILLED");
  const showPlans = spa.treatmentPlans && can("TREATMENT_PLANS_VIEW");

  // Badges: forms waiting for approval, filled forms waiting for a countersign
  const { data: formCounts } = useQuery({
    queryKey: ["client-forms", "counts"],
    queryFn: () => fetchClientForms({ status: "pending_approval" }),
    enabled: showForms && can("CLIENT_FORMS_APPROVE"),
    staleTime: 30_000,
  });
  const { data: toCountersign } = useQuery({
    queryKey: ["form-submissions", "all", "awaiting_therapist"],
    queryFn: () => fetchFormSubmissions({ status: "awaiting_therapist", limit: 200 }),
    enabled: showFilled && can("CLIENT_FORMS_COUNTERSIGN"),
    staleTime: 30_000,
  });

  const sections = useMemo<Section[]>(() => {
    const list: Section[] = [];
    if (showForms)
      list.push({
        key: "forms",
        label: "Form library",
        description: "Upload, review & approve forms",
        group: "Client forms",
        icon: <FormOutlined />,
        color: "#ec4899",
        bg: "#fdf2f8",
        badge: formCounts?.counts.pending_approval,
        render: () => <ClientFormsLibrary />,
      });
    if (showFilled)
      list.push({
        key: "filled",
        label: "Filled by clients",
        description: "Signed forms, links & countersigning",
        group: "Client forms",
        icon: <SolutionOutlined />,
        color: "#8b5cf6",
        bg: "#f5f3ff",
        badge: toCountersign?.length,
        render: () => <FilledFormsList showCustomer />,
      });
    if (showPlans)
      list.push(
        {
          key: "plans",
          label: "Client plans",
          description: "Sessions, products used & progress",
          group: "Treatment plans",
          icon: <ScheduleOutlined />,
          color: "#0d9488",
          bg: "#f0fdfa",
          render: () => <PlansList showCustomer />,
        },
        {
          key: "templates",
          label: "Plan templates",
          description: "Reusable treatment courses",
          group: "Treatment plans",
          icon: <AppstoreOutlined />,
          color: "#f59e0b",
          bg: "#fffbeb",
          render: () => <PlanTemplates />,
        }
      );
    return list;
  }, [showForms, showFilled, showPlans, formCounts, toCountersign]);

  const requested = params.get("tab") as SpaHubTab | null;
  const active = sections.find((s) => s.key === requested) ?? sections[0];

  // Keep the URL pointing at a tab the user can actually see
  useEffect(() => {
    if (active && requested !== active.key) setParams({ tab: active.key }, { replace: true });
  }, [active, requested, setParams]);

  const select = (key: SpaHubTab) => setParams({ tab: key }, { replace: true });

  if (spa.isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!active) {
    return (
      <Result
        icon={<HeartOutlined style={{ color: "#ec4899" }} />}
        title="Spa & Wellness isn't available"
        subTitle={
          spa.enabled
            ? "You don't have permission to view client forms or treatment plans. Ask an admin for access."
            : "Switch it on in System Setup → Spa & Wellness."
        }
      />
    );
  }

  const groups = sections.reduce<Record<string, Section[]>>((acc, s) => {
    (acc[s.group] ??= []).push(s);
    return acc;
  }, {});

  const badge = (n?: number, activeItem?: boolean) =>
    n ? (
      <span
        style={{
          minWidth: 20,
          height: 20,
          padding: "0 6px",
          borderRadius: 10,
          background: activeItem ? C.primary : "#fef3c7",
          color: activeItem ? "#fff" : "#b45309",
          fontSize: 11,
          fontWeight: 700,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {n}
      </span>
    ) : null;

  const iconChip = (s: Section, size: number) => (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: 9,
        background: s.bg,
        color: s.color,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.5,
        flexShrink: 0,
      }}
    >
      {s.icon}
    </span>
  );

  return (
    <div style={{ padding: isPhone ? 12 : "16px 24px", background: C.bg, minHeight: "100%" }}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: isPhone ? 12 : 18 }}>
        <div
          style={{
            width: isPhone ? 40 : 46,
            height: isPhone ? 40 : 46,
            borderRadius: 12,
            background: "linear-gradient(135deg, #fdf2f8 0%, #f0fdfa 100%)",
            color: "#ec4899",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: isPhone ? 19 : 22,
            flexShrink: 0,
          }}
        >
          <HeartOutlined />
        </div>
        <div style={{ minWidth: 0 }}>
          <Title level={isPhone ? 5 : 4} style={{ margin: 0, letterSpacing: -0.3 }}>
            Spa &amp; Wellness
          </Title>
          <Text style={{ fontSize: isPhone ? 11.5 : 13, color: C.subText }}>
            Client forms, e-signatures and treatment plans
          </Text>
        </div>
      </div>

      {/* ── Phone: scrollable tabs ─────────────────────────────────────── */}
      {isPhone && (
        <div
          className="spa-hub-pills"
          role="tablist"
          style={{ display: "flex", gap: 8, overflowX: "auto", padding: "2px 2px 10px", marginBottom: 2, WebkitOverflowScrolling: "touch" }}
        >
          <style>{`.spa-hub-pills::-webkit-scrollbar{display:none}.spa-hub-pills{scrollbar-width:none}`}</style>
          {sections.map((s) => {
            const on = s.key === active.key;
            return (
              <button
                key={s.key}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => select(s.key)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderRadius: 999,
                  border: `1px solid ${on ? C.primary : "#e2e8f0"}`,
                  background: on ? C.primary : "#fff",
                  color: on ? "#fff" : "#334155",
                  fontSize: 13,
                  fontWeight: on ? 600 : 500,
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  cursor: "pointer",
                }}
              >
                <span style={{ display: "inline-flex", fontSize: 14 }}>{s.icon}</span>
                {s.label}
                {s.badge ? (
                  <span style={{ fontSize: 11, fontWeight: 700, background: on ? "rgba(255,255,255,.25)" : "#fef3c7", color: on ? "#fff" : "#b45309", borderRadius: 999, padding: "0 6px" }}>
                    {s.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}

      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        {/* ── Tablet & desktop: side menu ──────────────────────────────── */}
        {!isPhone && (
          <nav
            aria-label="Spa & Wellness sections"
            style={{
              width: isDesktop ? 260 : 208,
              flexShrink: 0,
              position: "sticky",
              top: 12,
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: "8px 8px 10px",
            }}
          >
            {Object.entries(groups).map(([group, items]) => (
              <div key={group} style={{ marginTop: 4 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: "#94a3b8", padding: "8px 10px 4px" }}>
                  {group}
                </div>
                {items.map((s) => {
                  const on = s.key === active.key;
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => select(s.key)}
                      aria-current={on ? "page" : undefined}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        width: "100%",
                        textAlign: "left",
                        padding: isDesktop ? "9px 10px" : "8px 8px",
                        borderRadius: 10,
                        border: `1px solid ${on ? `${C.primary}40` : "transparent"}`,
                        background: on ? C.primaryLight : "transparent",
                        cursor: "pointer",
                        transition: "background .15s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (!on) e.currentTarget.style.background = "#f1f5f9";
                      }}
                      onMouseLeave={(e) => {
                        if (!on) e.currentTarget.style.background = "transparent";
                      }}
                    >
                      {iconChip(s, isDesktop ? 32 : 28)}
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span
                          style={{
                            display: "block",
                            fontSize: 13,
                            fontWeight: on ? 600 : 500,
                            color: on ? C.primary : "#0f172a",
                            lineHeight: 1.3,
                            // Tablets have no room for descriptions; let labels wrap instead of cutting off
                            whiteSpace: isDesktop ? "nowrap" : "normal",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {s.label}
                        </span>
                        {isDesktop && (
                          <span style={{ display: "block", fontSize: 11, color: C.subText, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {s.description}
                          </span>
                        )}
                      </span>
                      {badge(s.badge, on)}
                      {isDesktop && on && !s.badge && <RightOutlined style={{ fontSize: 10, color: C.primary }} />}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        )}

        {/* ── Content ──────────────────────────────────────────────────── */}
        <section
          key={active.key}
          style={{
            flex: 1,
            minWidth: 0,
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            overflow: "hidden",
            animation: "spaHubFade .2s ease",
          }}
        >
          <style>{`@keyframes spaHubFade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}`}</style>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: isPhone ? "12px 14px" : "16px 20px", borderBottom: "1px solid #f1f5f9" }}>
            {iconChip(active, isPhone ? 32 : 38)}
            <div style={{ minWidth: 0 }}>
              <Text strong style={{ fontSize: isPhone ? 14.5 : 16, display: "block" }}>
                {active.label}
              </Text>
              <Text style={{ fontSize: 12, color: C.subText }}>{active.description}</Text>
            </div>
          </div>
          <div style={{ padding: isPhone ? 12 : 20 }}>{active.render()}</div>
        </section>
      </div>
    </div>
  );
};

export default SpaHubPage;
