import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useActiveProduct, ProductKey, PRODUCT_CONFIGS } from "src/context/ProductContext";
import { useTenantModules } from "./useTenantModules";

export type DashboardTabKey = "pos" | "accounting" | "mteja" | "bandu" | "dala";

export const PRODUCT_TO_DASHBOARD_TAB: Record<ProductKey, DashboardTabKey> = {
  duka: "pos",
  pesa: "accounting",
  mteja: "mteja",
  bandu: "bandu",
  dala: "dala",
};

export const DASHBOARD_TAB_TO_PRODUCT: Record<DashboardTabKey, ProductKey> = {
  pos: "duka",
  accounting: "pesa",
  mteja: "mteja",
  bandu: "bandu",
  dala: "dala",
};

export const normalizeDashboardTab = (
  input: string | null | undefined
): DashboardTabKey | null => {
  if (!input) return null;
  const key = input.trim().toLowerCase();
  switch (key) {
    case "pos":
    case "duka":
      return "pos";
    case "accounting":
    case "pesa":
    case "finance":
      return "accounting";
    case "mteja":
    case "crm":
      return "mteja";
    case "bandu":
    case "hr":
    case "payroll":
      return "bandu";
    case "dala":
    case "property":
    case "realestate":
      return "dala";
    default:
      return null;
  }
};

const STORAGE_KEY = "activeDashboardTab";

/**
 * useActiveDashboard
 *
 * Tracks which dashboard (Duka/POS, Pesa/Accounting, Mteja/CRM, Bandu/HR, Dala/Real Estate)
 * is currently active. When users navigate between modules or click on Dashboard, this
 * hook ensures they always land on the dashboard corresponding to their active module.
 */
export const useActiveDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeProduct, switchProduct, availableProducts } = useActiveProduct();
  const modules = useTenantModules();

  // List available dashboard tabs according to tenant licensing
  const availableTabs = useMemo<DashboardTabKey[]>(() => {
    const list: DashboardTabKey[] = [];
    if (modules.hasPOS) list.push("pos");
    if (modules.hasAccounting) list.push("accounting");
    if (modules.hasMteja) list.push("mteja");
    if (modules.hasHR) list.push("bandu");
    if (modules.hasDala) list.push("dala");

    // Fallback if no modules enabled yet
    if (list.length === 0) list.push("pos");
    return list;
  }, [modules]);

  const isTabAvailable = useCallback(
    (tab: DashboardTabKey) => availableTabs.includes(tab),
    [availableTabs]
  );

  // Determine the default tab from activeProduct or stored tab
  const getResolvedTab = useCallback((): DashboardTabKey => {
    // 1. Check URL query params: ?tab=... or ?dashboard=... or ?module=...
    const queryTab =
      normalizeDashboardTab(searchParams.get("tab")) ||
      normalizeDashboardTab(searchParams.get("dashboard")) ||
      normalizeDashboardTab(searchParams.get("module"));
    if (queryTab && isTabAvailable(queryTab)) {
      return queryTab;
    }

    // 2. Check current activeProduct from ProductContext
    const productTab = PRODUCT_TO_DASHBOARD_TAB[activeProduct];
    if (productTab && isTabAvailable(productTab)) {
      return productTab;
    }

    // 3. Check localStorage
    const saved = normalizeDashboardTab(localStorage.getItem(STORAGE_KEY));
    if (saved && isTabAvailable(saved)) {
      return saved;
    }

    // 4. Fallback to first available tab
    return availableTabs[0] || "pos";
  }, [searchParams, isTabAvailable, activeProduct, availableTabs]);

  const [activeTab, setActiveTabState] = useState<DashboardTabKey>(getResolvedTab);

  // Sync tab when activeProduct or URL search parameters change
  useEffect(() => {
    const resolved = getResolvedTab();
    if (resolved !== activeTab) {
      setActiveTabState(resolved);
      localStorage.setItem(STORAGE_KEY, resolved);
    }
  }, [getResolvedTab, activeTab]);

  // Set active dashboard tab and optionally synchronize the global active product
  const setActiveDashboard = useCallback(
    (tabOrProduct: DashboardTabKey | ProductKey | string, syncProduct = true) => {
      const normalized = normalizeDashboardTab(tabOrProduct);
      if (!normalized || !isTabAvailable(normalized)) return;

      setActiveTabState(normalized);
      localStorage.setItem(STORAGE_KEY, normalized);

      // Sync activeProduct in ProductContext so navbar and menus adapt
      if (syncProduct) {
        const correspondingProduct = DASHBOARD_TAB_TO_PRODUCT[normalized];
        if (correspondingProduct && correspondingProduct !== activeProduct) {
          switchProduct(correspondingProduct, false);
        }
      }

      // If currently on dashboard page, update search parameter cleanly without page jump
      const isDashboardRoute =
        location.pathname === "/home-dashboard" ||
        location.pathname === "/dashboard" ||
        location.pathname === "/admin/dashboard";

      if (isDashboardRoute) {
        const currentTabParam = searchParams.get("tab");
        if (currentTabParam !== normalized) {
          const newParams = new URLSearchParams(searchParams);
          newParams.set("tab", normalized);
          setSearchParams(newParams, { replace: true });
        }
      }
    },
    [isTabAvailable, activeProduct, switchProduct, location.pathname, searchParams, setSearchParams]
  );

  // Returns URL to land directly on a specific dashboard
  const getDashboardPath = useCallback(
    (product?: ProductKey, isAdmin?: boolean): string => {
      const targetProduct = product || activeProduct;
      const targetTab = PRODUCT_TO_DASHBOARD_TAB[targetProduct] || "pos";
      const isAdminView =
        isAdmin !== undefined ? isAdmin : location.pathname.startsWith("/admin");
      const basePath = isAdminView ? "/admin/dashboard" : "/home-dashboard";
      return `${basePath}?tab=${targetTab}`;
    },
    [activeProduct, location.pathname]
  );

  // Directly navigate to a product's dashboard
  const navigateToDashboard = useCallback(
    (product?: ProductKey, isAdmin?: boolean) => {
      const path = getDashboardPath(product, isAdmin);
      const targetProduct = product || activeProduct;
      const targetTab = PRODUCT_TO_DASHBOARD_TAB[targetProduct];

      if (targetTab) {
        setActiveTabState(targetTab);
        localStorage.setItem(STORAGE_KEY, targetTab);
      }
      if (product && product !== activeProduct) {
        switchProduct(product, false);
      }
      navigate(path);
    },
    [getDashboardPath, activeProduct, switchProduct, navigate]
  );

  return {
    activeTab,
    activeProduct: DASHBOARD_TAB_TO_PRODUCT[activeTab],
    setActiveDashboard,
    navigateToDashboard,
    getDashboardPath,
    availableTabs,
    isTabAvailable,
  };
};

export default useActiveDashboard;
