import React, { Suspense, lazy } from "react";
import { Segmented, Spin } from "antd";
import { MedicineBoxOutlined, ShoppingCartOutlined, TeamOutlined } from "@ant-design/icons";
import { useSearchParams } from "react-router-dom";
import { useHealthcareSettings } from "@hooks/useHealthcareSettings";
import { useHealthcareAccess } from "@pages/Healthcare/shared";
import { getPermissionChecker } from "@utils/getPermissionChecker";
import HospitalPage from "./HospitalPage";

const QueueTab = lazy(() => import("@pages/Healthcare/QueueTab"));
const PharmacyTab = lazy(() => import("@pages/Healthcare/PharmacyTab"));

// Height of the tab bar, so the billing screen still fits the window
const TAB_BAR_HEIGHT = 48;

export type WorkspaceTab = "queue" | "billing" | "pharmacy";

/**
 * The one screen for a hospital-mode branch: the patient queue, billing (the
 * POS) and the pharmacy, as tabs. Each tab shows only when its Healthcare
 * feature is on and the user's role allows it; with none of the add-on on,
 * this is just the POS as before.
 */
const HospitalWorkspace: React.FC = () => {
  const settings = useHealthcareSettings();
  const access = useHealthcareAccess();
  const canBill = getPermissionChecker()("CART_VIEW_ITEMS");
  const [params, setParams] = useSearchParams();

  const tabs = [
    settings.visits && access.viewVisits && { value: "queue", label: "Queue", icon: <TeamOutlined /> },
    canBill && { value: "billing", label: "Billing", icon: <ShoppingCartOutlined /> },
    settings.prescriptions && access.viewPrescriptions && { value: "pharmacy", label: "Pharmacy", icon: <MedicineBoxOutlined /> },
  ].filter(Boolean) as { value: WorkspaceTab; label: string; icon: React.ReactNode }[];

  // Healthcare off (or only billing allowed): the POS exactly as it was
  if (tabs.length <= 1 && canBill) return <HospitalPage />;

  const requested = params.get("tab") as WorkspaceTab | null;
  const active = tabs.find((t) => t.value === requested)?.value ?? (canBill ? "billing" : tabs[0]?.value);

  const loading = (
    <div style={{ textAlign: "center", padding: 40 }}>
      <Spin />
    </div>
  );

  return (
    <div>
      <div style={{ height: TAB_BAR_HEIGHT, display: "flex", alignItems: "center", padding: "0 4px" }}>
        <Segmented<WorkspaceTab>
          value={active}
          onChange={(tab) => setParams({ tab }, { replace: true })}
          options={tabs.map((t) => ({
            value: t.value,
            label: (
              <span style={{ padding: "0 6px" }}>
                {t.icon} {t.label}
              </span>
            ),
          }))}
        />
      </div>
      {active === "billing" && <HospitalPage topOffset={TAB_BAR_HEIGHT} />}
      {active !== "billing" && (
        <div style={{ height: `calc(100vh - ${80 + TAB_BAR_HEIGHT}px)`, overflowY: "auto", padding: "4px 4px 24px" }}>
          <Suspense fallback={loading}>
            {active === "queue" && <QueueTab />}
            {active === "pharmacy" && <PharmacyTab />}
          </Suspense>
        </div>
      )}
    </div>
  );
};

export default HospitalWorkspace;
