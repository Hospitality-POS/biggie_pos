import React, { Suspense, lazy } from "react";
import { Spin } from "antd";
import { useQuery } from "@tanstack/react-query";
import {
  ExperimentOutlined,
  FileProtectOutlined,
  MedicineBoxOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import { useSearchParams } from "react-router-dom";
import { useHealthcareSettings } from "@hooks/useHealthcareSettings";
import { useHealthcareAccess } from "@pages/Healthcare/shared";
import { getPermissionChecker } from "@utils/getPermissionChecker";
import { facilityTabOrder } from "@utils/healthcareFacility";
import { fetchAdmissions, fetchLabOrders, fetchPrescriptions, fetchVisits } from "@services/healthcare";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import HospitalPage from "./HospitalPage";

const QueueTab = lazy(() => import("@pages/Healthcare/QueueTab"));
const LabTab = lazy(() => import("@pages/Healthcare/LabTab"));
const PharmacyTab = lazy(() => import("@pages/Healthcare/PharmacyTab"));
const ClaimsTab = lazy(() => import("@pages/Healthcare/ClaimsTab"));
const WardsTab = lazy(() => import("@pages/Healthcare/WardsTab"));

// Height of the tab bar, so the billing screen still fits the window
const TAB_BAR_HEIGHT = 48;
const TAB_BAR_SPACE = TAB_BAR_HEIGHT + 8;

export type WorkspaceTab = "queue" | "lab" | "pharmacy" | "wards" | "billing" | "claims";

/**
 * The one screen for a hospital-mode branch, in the order a patient moves
 * through: queue, lab, pharmacy, wards, billing (the POS), then claims for the office.
 * Reports live on the Reports page (Healthcare tab).
 * Each tab shows only when its Healthcare feature is on and
 * the user's role allows it; with none of the add-on on, this is just the
 * POS as before.
 */
const HospitalWorkspace: React.FC = () => {
  const settings = useHealthcareSettings();
  const access = useHealthcareAccess();
  const canBill = getPermissionChecker()("CART_VIEW_ITEMS");
  const [params, setParams] = useSearchParams();
  const order = facilityTabOrder(settings.facilityType);
  const primaryColor = usePrimaryColor() || "#0ea5e9";

  const tabs = [
    settings.visits && access.viewVisits && { value: "queue", label: "Queue", icon: <TeamOutlined /> },
    settings.diagnostics && access.viewLab && { value: "lab", label: settings.lab ? "Lab" : "Imaging", icon: <ExperimentOutlined /> },
    settings.prescriptions && access.viewPrescriptions && { value: "pharmacy", label: "Pharmacy", icon: <MedicineBoxOutlined /> },
    settings.inpatient && access.viewInpatients && { value: "wards", label: "Wards", icon: <HomeOutlined /> },
    canBill && { value: "billing", label: "Billing", icon: <ShoppingCartOutlined /> },
    settings.insurance && access.viewClaims && { value: "claims", label: "Claims", icon: <FileProtectOutlined /> },
  ]
    .filter(Boolean)
    // Each kind of branch starts at its own desk (a chemist at Billing, a lab at the queue)
    .sort((a, b) => order.indexOf((a as { value: string }).value) - order.indexOf((b as { value: string }).value)) as {
    value: WorkspaceTab;
    label: string;
    icon: React.ReactNode;
  }[];

  // What's waiting at each desk, shown on its tab. Same queries (and cache)
  // as the tabs themselves, so opening a tab doesn't load twice.
  const has = (tab: WorkspaceTab) => tabs.some((t) => t.value === tab);
  const { data: openVisits = [] } = useQuery({
    queryKey: ["healthcare-visits", "open"],
    queryFn: () => fetchVisits({ open: true }),
    enabled: has("queue"),
    refetchInterval: 60_000,
  });
  const { data: openLab = [] } = useQuery({
    queryKey: ["healthcare-lab-orders", "open", undefined],
    queryFn: () => fetchLabOrders({ status: "open" }),
    enabled: has("lab"),
    refetchInterval: 60_000,
  });
  const { data: openRx = [] } = useQuery({
    queryKey: ["healthcare-prescriptions", "open"],
    queryFn: () => fetchPrescriptions({ status: "open" }),
    enabled: has("pharmacy"),
    refetchInterval: 60_000,
  });
  const { data: inWard = [] } = useQuery({
    queryKey: ["healthcare-admissions", "admitted"],
    queryFn: () => fetchAdmissions({ status: "admitted" }),
    enabled: has("wards"),
    refetchInterval: 60_000,
  });
  const counts: Partial<Record<WorkspaceTab, number>> = {
    queue: openVisits.length,
    lab: openLab.length,
    pharmacy: openRx.length,
    wards: inWard.length,
  };

  // Healthcare off (or only billing allowed): the POS exactly as it was
  if (tabs.length <= 1 && canBill) return <HospitalPage />;

  const requested = params.get("tab") as WorkspaceTab | null;
  // The first desk for this kind of branch opens first
  const active = tabs.find((t) => t.value === requested)?.value ?? tabs[0]?.value;

  const loading = (
    <div style={{ textAlign: "center", padding: 40 }}>
      <Spin />
    </div>
  );

  return (
    <div>
      <nav
        role="tablist"
        style={{
          height: TAB_BAR_HEIGHT,
          display: "flex",
          alignItems: "stretch",
          gap: 4,
          padding: "0 4px",
          overflowX: "auto",
          borderBottom: "1px solid #e8edf3",
          marginBottom: 8,
        }}
      >
        {tabs.map((t) => {
          const on = t.value === active;
          const count = counts[t.value];
          return (
            <button
              key={t.value}
              role="tab"
              aria-selected={on}
              type="button"
              onClick={() => setParams({ tab: t.value }, { replace: true })}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "0 14px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                whiteSpace: "nowrap",
                font: "inherit",
                fontSize: 14,
                fontWeight: on ? 600 : 500,
                color: on ? primaryColor : "#475569",
                borderBottom: `2px solid ${on ? primaryColor : "transparent"}`,
                marginBottom: -1,
              }}
            >
              <span style={{ fontSize: 15 }}>{t.icon}</span>
              {t.label}
              {!!count && (
                <span
                  style={{
                    minWidth: 20,
                    height: 20,
                    padding: "0 6px",
                    borderRadius: 10,
                    fontSize: 11.5,
                    lineHeight: "20px",
                    textAlign: "center",
                    background: on ? primaryColor : "#e2e8f0",
                    color: on ? "#fff" : "#334155",
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
      {active === "billing" && <HospitalPage topOffset={TAB_BAR_SPACE} />}
      {active !== "billing" && (
        <div style={{ height: `calc(100vh - ${80 + TAB_BAR_SPACE}px)`, overflowY: "auto", padding: "4px 4px 24px" }}>
          <Suspense fallback={loading}>
            {active === "queue" && <QueueTab />}
            {active === "lab" && <LabTab />}
            {active === "pharmacy" && <PharmacyTab />}
            {active === "wards" && <WardsTab />}
            {active === "claims" && <ClaimsTab />}
          </Suspense>
        </div>
      )}
    </div>
  );
};

export default HospitalWorkspace;
