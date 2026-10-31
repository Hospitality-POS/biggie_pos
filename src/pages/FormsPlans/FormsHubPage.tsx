import React, { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Grid, Result, Spin, Typography } from "antd";
import {
  FormOutlined,
  SolutionOutlined,
  ScheduleOutlined,
  AppstoreOutlined,
  RightOutlined,
  TeamOutlined,
  BarChartOutlined,
  ContactsOutlined,
} from "@ant-design/icons";
import { THEME_C } from "@utils/getPrimaryColor";
import { usePermissions } from "@hooks/usePermissions";
import { useFormsSettings } from "@hooks/useFormsSettings";
import { fetchFormTemplates } from "@services/formTemplates";
import { fetchFormSubmissions } from "@services/formSubmissions";
import FormLibrary from "@pages/FormsPlans/forms/FormLibrary";
import FilledFormsList from "@pages/FormsPlans/forms/fill/FilledFormsList";
import HubAnalytics from "@pages/FormsPlans/HubAnalytics";
import PlansList from "@pages/FormsPlans/plans/PlansList";
import PlanTemplates from "@pages/FormsPlans/plans/PlanTemplates";
import type { Audience } from "@pages/FormsPlans/forms/types";
import { AudienceContext, audienceConfig, type HubTab } from "@pages/FormsPlans/audience";

const { Text, Title } = Typography;
const C = THEME_C;

interface Section {
  key: HubTab;
  label: string;
  description: string;
  group: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  badge?: number;
  render: () => React.ReactNode;
}

/**
 * Forms & Plans for one audience on one page, with a side menu on desktop /
 * tablet and scrollable tabs on phones:
 *  - client   → /forms?tab=…     (customers: consent forms, treatment plans)
 *  - employee → /hr/forms?tab=…  (Bandu HR: onboarding, NDAs…, onboarding & training plans)
 *  - contact  → /crm/forms?tab=… (Mteja: consent, privacy, waivers… for leads and non-customers)
 */
const FormsHubPage: React.FC<{ audience?: Audience }> = ({ audience = "client" }) => {
  const screens = Grid.useBreakpoint();
  const isPhone = !screens.md; // < 768
  const isDesktop = !!screens.lg; // ≥ 992; tablets get a slimmer side menu
  const { can } = usePermissions();
  const settings = useFormsSettings();
  const [params, setParams] = useSearchParams();
  const a = audienceConfig(audience);
  const isEmployee = audience === "employee";

  const formsOn = !!settings[a.formsFlag];
  const plansOn = a.hasPlans && !!settings[a.plansFlag];
  const showForms = formsOn && can(a.perms.view);
  const showFilled = formsOn && can(a.perms.viewFilled);
  const showPlans = plansOn && can(a.perms.plansView);
  const showAnalytics = (formsOn || plansOn) && can(a.perms.analytics);

  // Badges: forms waiting for approval, filled forms waiting for a countersign
  const { data: formCounts } = useQuery({
    queryKey: ["form-templates", audience, "counts"],
    queryFn: () => fetchFormTemplates(audience, { status: "pending_approval" }),
    enabled: showForms && can(a.perms.approve),
    staleTime: 30_000,
  });
  const { data: toCountersign } = useQuery({
    queryKey: ["form-submissions", audience, "all", "awaiting_therapist"],
    queryFn: () => fetchFormSubmissions(audience, { status: "awaiting_therapist", limit: 200 }),
    enabled: showFilled && can(a.perms.countersign),
    staleTime: 30_000,
  });

  const sections = useMemo<Section[]>(() => {
    const list: Section[] = [];
    if (showForms)
      list.push({
        key: "forms",
        label: a.formsTitle,
        description: audience === "contact" ? "Start from a template, upload, review & approve" : "Upload, review & approve forms",
        group: a.formsGroup,
        icon: <FormOutlined />,
        color: "#ec4899",
        bg: "#fdf2f8",
        badge: formCounts?.counts.pending_approval,
        render: () => <FormLibrary />,
      });
    if (showFilled)
      list.push({
        key: "filled",
        label: a.filledTitle,
        description: a.filledDescription,
        group: a.formsGroup,
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
          label: isEmployee ? a.plansTitle : "Client plans",
          description: isEmployee ? "Steps with dates, notes & sign-off" : "Sessions, products used & progress",
          group: isEmployee ? "Plans" : "Treatment plans",
          icon: <ScheduleOutlined />,
          color: "#0d9488",
          bg: "#f0fdfa",
          render: () => <PlansList showCustomer />,
        },
        {
          key: "templates",
          label: "Plan templates",
          description: isEmployee ? "Reusable onboarding & training plans" : "Reusable treatment courses",
          group: isEmployee ? "Plans" : "Treatment plans",
          icon: <AppstoreOutlined />,
          color: "#f59e0b",
          bg: "#fffbeb",
          render: () => <PlanTemplates />,
        }
      );
    // Last: one view across signed forms and plans, for whoever has analytics access
    if (showAnalytics)
      list.push({
        key: "analytics",
        label: "Analytics",
        description: plansOn ? "Forms signed, plans & sessions" : "Forms sent, signed & flagged",
        group: "Insights",
        icon: <BarChartOutlined />,
        color: "#2563eb",
        bg: "#eff6ff",
        render: () => <HubAnalytics showForms={formsOn} showPlans={plansOn} />,
      });
    return list;
  }, [showForms, showFilled, showPlans, showAnalytics, formsOn, plansOn, formCounts, toCountersign, a, isEmployee]);

  const requested = params.get("tab") as HubTab | null;
  const active = sections.find((s) => s.key === requested) ?? sections[0];

  // Keep the URL pointing at a tab the user can actually see
  useEffect(() => {
    if (active && requested !== active.key) setParams({ tab: active.key }, { replace: true });
  }, [active, requested, setParams]);

  const select = (key: HubTab) => setParams({ tab: key }, { replace: true });
  const HeaderIcon = isEmployee ? TeamOutlined : audience === "contact" ? ContactsOutlined : FormOutlined;

  if (settings.isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!active) {
    return (
      <Result
        icon={<HeaderIcon style={{ color: "#8b5cf6" }} />}
        title={`${a.title} isn't available`}
        subTitle={
          settings.enabled && (formsOn || plansOn)
            ? `You don't have permission to view ${a.person.toLowerCase()} forms${a.hasPlans ? " or plans" : ""}. Ask an admin for access.`
            : `Switch on ${settings.enabled ? a.formsSettingLabel : `the Forms & Plans add-on and ${a.formsSettingLabel}`} in System Setup → Forms & Plans.`
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
            background: a.headerBg,
            color: a.headerColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: isPhone ? 19 : 22,
            flexShrink: 0,
          }}
        >
          <HeaderIcon />
        </div>
        <div style={{ minWidth: 0 }}>
          <Title level={isPhone ? 5 : 4} style={{ margin: 0, letterSpacing: -0.3 }}>
            {a.title}
          </Title>
          <Text style={{ fontSize: isPhone ? 11.5 : 13, color: C.subText }}>
            {a.tagline}
          </Text>
        </div>
      </div>

      {/* ── Phone: scrollable tabs ─────────────────────────────────────── */}
      {isPhone && (
        <div
          className="forms-hub-pills"
          role="tablist"
          style={{ display: "flex", gap: 8, overflowX: "auto", padding: "2px 2px 10px", marginBottom: 2, WebkitOverflowScrolling: "touch" }}
        >
          <style>{`.forms-hub-pills::-webkit-scrollbar{display:none}.forms-hub-pills{scrollbar-width:none}`}</style>
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
            aria-label={`${a.title} sections`}
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
            animation: "formsHubFade .2s ease",
          }}
        >
          <style>{`@keyframes formsHubFade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}`}</style>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: isPhone ? "12px 14px" : "16px 20px", borderBottom: "1px solid #f1f5f9" }}>
            {iconChip(active, isPhone ? 32 : 38)}
            <div style={{ minWidth: 0 }}>
              <Text strong style={{ fontSize: isPhone ? 14.5 : 16, display: "block" }}>
                {active.label}
              </Text>
              <Text style={{ fontSize: 12, color: C.subText }}>{active.description}</Text>
            </div>
          </div>
          <div style={{ padding: isPhone ? 12 : 20 }}>
            <AudienceContext.Provider value={a}>{active.render()}</AudienceContext.Provider>
          </div>
        </section>
      </div>
    </div>
  );
};

export default FormsHubPage;
