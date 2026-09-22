import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ShopOutlined,
  DollarOutlined,
  CustomerServiceOutlined,
  TeamOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import { useTenantModules } from "../hooks/useTenantModules";

export type ProductKey = "duka" | "pesa" | "mteja" | "bandu" | "dala";

export interface ProductConfig {
  key: ProductKey;
  name: string;
  shortName: string;
  label: string;
  tagline: string;
  icon: React.ReactNode;
  color: string;
  defaultPath: string;
  pathPrefixes: string[];
}

export const PRODUCT_CONFIGS: Record<ProductKey, ProductConfig> = {
  duka: {
    key: "duka",
    name: "Duka",
    shortName: "POS",
    label: "Duka (POS)",
    tagline: "Point of Sale, Orders, Inventory & Crew",
    icon: <ShopOutlined />,
    color: "#0ea5e9", // Sky blue
    defaultPath: "/pos/dashboard",
    pathPrefixes: [
      "/home-dashboard",
      "/pos",
      "/duka",
      "/tables",
      "/store",
      "/inventory",
      "/employee-shift",
      "/petty-cash",
      "/refunds",
      "/table-settings",
      "/Category-settings",
      "/category-settings",
      "/main-category",
      "/cart",
    ],
  },
  pesa: {
    key: "pesa",
    name: "Pesa",
    shortName: "Finance",
    label: "Pesa (Accounting)",
    tagline: "Double-Entry Accounting, Invoices & Banking",
    icon: <DollarOutlined />,
    color: "#10b981", // Emerald green
    defaultPath: "/accounting/dashboard",
    pathPrefixes: [
      "/accounting",
      "/admin/accounting",
      "/pesa",
      "/admin/pesa",
    ],
  },
  mteja: {
    key: "mteja",
    name: "Mteja",
    shortName: "CRM",
    label: "Mteja (CRM)",
    tagline: "Omnichannel WhatsApp, Leads & Campaigns",
    icon: <CustomerServiceOutlined />,
    color: "#8b5cf6", // Purple
    defaultPath: "/crm/dashboard",
    pathPrefixes: [
      "/crm",
      "/omnichannel",
      "/mteja",
      "/admin/mteja",
      "/admin/crm",
    ],
  },
  bandu: {
    key: "bandu",
    name: "Bandu",
    shortName: "HR",
    label: "Bandu (HR & Payroll)",
    tagline: "HR Directory, Leave, Attendance & Payroll",
    icon: <TeamOutlined />,
    color: "#f59e0b", // Amber
    defaultPath: "/hr/dashboard",
    pathPrefixes: [
      "/hr",
      "/bandu",
      "/admin/bandu",
      "/admin/hr",
    ],
  },
  dala: {
    key: "dala",
    name: "Dala",
    shortName: "Property",
    label: "Dala (Real Estate)",
    tagline: "Property Portfolio, Leases, Rent & Maintenance",
    icon: <HomeOutlined />,
    color: "#06b6d4", // Cyan
    defaultPath: "/dala/dashboard",
    pathPrefixes: [
      "/dala",
      "/admin/dala",
    ],
  },
};

interface ProductContextType {
  activeProduct: ProductKey;
  activeProductConfig: ProductConfig;
  availableProducts: ProductConfig[];
  switchProduct: (key: ProductKey, navigateToDefault?: boolean) => void;
  isMultiProduct: boolean;
}

const ProductContext = createContext<ProductContextType | null>(null);

const STORAGE_KEY = "activeProduct";

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const modules = useTenantModules();

  // List all products enabled for this tenant
  const availableProducts = useMemo(() => {
    const list: ProductConfig[] = [];
    if (modules.hasPOS) list.push(PRODUCT_CONFIGS.duka);
    if (modules.hasAccounting) list.push(PRODUCT_CONFIGS.pesa);
    if (modules.hasMteja) list.push(PRODUCT_CONFIGS.mteja);
    if (modules.hasHR) list.push(PRODUCT_CONFIGS.bandu);
    if (modules.hasDala) list.push(PRODUCT_CONFIGS.dala);

    // Fallback: if nothing is enabled yet, default to duka
    if (list.length === 0) list.push(PRODUCT_CONFIGS.duka);
    return list;
  }, [modules]);

  const availableKeys = useMemo(
    () => new Set(availableProducts.map((p) => p.key)),
    [availableProducts]
  );

  // Helper: detect which product a given pathname belongs to
  const detectProductFromPath = useCallback((pathname: string, search?: string): ProductKey | null => {
    // For dashboard paths, check URL search query param 'tab' first
    if (pathname === "/home-dashboard" || pathname === "/admin/dashboard" || pathname === "/dashboard") {
      const searchStr = search !== undefined ? search : window.location.search;
      const params = new URLSearchParams(searchStr);
      const tabParam = params.get("tab") || params.get("dashboard") || params.get("module");
      if (tabParam) {
        const key = tabParam.trim().toLowerCase();
        const tabMap: Record<string, ProductKey> = {
          pos: "duka",
          duka: "duka",
          accounting: "pesa",
          pesa: "pesa",
          finance: "pesa",
          mteja: "mteja",
          crm: "mteja",
          bandu: "bandu",
          hr: "bandu",
          payroll: "bandu",
          dala: "dala",
          property: "dala",
          realestate: "dala",
        };
        if (tabMap[key]) return tabMap[key];
      }
      return "duka";
    }

    for (const [key, config] of Object.entries(PRODUCT_CONFIGS)) {
      if (config.pathPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"))) {
        return key as ProductKey;
      }
    }
    return null;
  }, []);

  // Initialize active product
  const [activeProduct, setActiveProduct] = useState<ProductKey>(() => {
    // 1. First check URL path
    const detected = detectProductFromPath(window.location.pathname, window.location.search);
    if (detected && availableKeys.has(detected)) {
      return detected;
    }

    // 2. Check localStorage
    const saved = localStorage.getItem(STORAGE_KEY) as ProductKey | null;
    if (saved && availableKeys.has(saved)) {
      return saved;
    }

    // 3. Fallback to first available product
    return availableProducts[0]?.key || "duka";
  });

  // Keep active product in sync when URL changes to another product's territory
  useEffect(() => {
    const detected = detectProductFromPath(location.pathname, location.search);
    if (detected && availableKeys.has(detected) && detected !== activeProduct) {
      setActiveProduct(detected);
      localStorage.setItem(STORAGE_KEY, detected);
    }
  }, [location.pathname, location.search, detectProductFromPath, availableKeys, activeProduct]);

  // Ensure current activeProduct is still valid if tenant modules update
  useEffect(() => {
    if (!availableKeys.has(activeProduct)) {
      const fallback = availableProducts[0]?.key || "duka";
      setActiveProduct(fallback);
      localStorage.setItem(STORAGE_KEY, fallback);
    }
  }, [availableKeys, availableProducts, activeProduct]);

  const switchProduct = useCallback(
    (key: ProductKey, navigateToDefault = true) => {
      if (!availableKeys.has(key)) return;
      setActiveProduct(key);
      localStorage.setItem(STORAGE_KEY, key);

      if (navigateToDefault) {
        const config = PRODUCT_CONFIGS[key];
        if (config) {
          navigate(config.defaultPath);
        }
      }
    },
    [availableKeys, navigate]
  );

  const activeProductConfig = PRODUCT_CONFIGS[activeProduct] || PRODUCT_CONFIGS.duka;
  const isMultiProduct = availableProducts.length > 1;

  const value = useMemo(
    () => ({
      activeProduct,
      activeProductConfig,
      availableProducts,
      switchProduct,
      isMultiProduct,
    }),
    [activeProduct, activeProductConfig, availableProducts, switchProduct, isMultiProduct]
  );

  return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>;
};

export const useActiveProduct = () => {
  const context = useContext(ProductContext);
  if (!context) {
    // Graceful fallback if called outside provider (e.g. initial render / tests)
    return {
      activeProduct: "duka" as ProductKey,
      activeProductConfig: PRODUCT_CONFIGS.duka,
      availableProducts: [PRODUCT_CONFIGS.duka],
      switchProduct: () => {},
      isMultiProduct: false,
    };
  }
  return context;
};

export { useActiveDashboard, type DashboardTabKey } from "../hooks/useActiveDashboard";
