import React, { useState } from "react";
import { Dropdown, Typography, Tag } from "antd";
import {
  DownOutlined,
  CheckCircleFilled,
  DashboardOutlined,
  FileDoneOutlined,
  SettingOutlined,
  ShopOutlined,
  RollbackOutlined,
} from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
import { useActiveProduct, ProductConfig } from "src/context/ProductContext";
import { usePrimaryColor } from "src/context/PrimaryColorContext";
import { useAppSelector } from "src/store";

const { Text } = Typography;

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  React.useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
};

interface EcosystemAppSwitcherProps {
  compact?: boolean;
  textColor?: string;
  bgColor?: string;
  borderColor?: string;
  triggerType?: "pill" | "waffle";
}

export const EcosystemAppMenu: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const primaryColor = usePrimaryColor();
  const { user } = useAppSelector((state) => state.auth);
  const { activeProduct, activeProductConfig, availableProducts, switchProduct } = useActiveProduct();

  const isAdmin = user?.role === "admin";
  const isAdminRoute = location.pathname.startsWith("/admin");

  const handleProductSelect = (prod: ProductConfig) => {
    onClose?.();
    switchProduct(prod.key, true);
  };

  return (
    <div
      style={{
        width: isMobile ? "100%" : 656,
        maxWidth: "100%",
        maxHeight: isMobile ? "calc(86vh - 60px)" : "calc(100vh - 72px)",
        overflowY: "auto",
        backgroundColor: "#ffffff",
        borderRadius: isMobile ? 14 : 16,
        boxShadow: "0 20px 48px -10px rgba(0, 0, 0, 0.18), 0 10px 24px -5px rgba(0, 0, 0, 0.08)",
        border: "1px solid #e2e8f0",
        padding: isMobile ? "14px 12px" : "16px 18px",
        userSelect: "none",
        boxSizing: "border-box",
      }}
    >
      {/* ── WORKSPACES HEADER ──────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#475569",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Workspaces
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 1 }}>
            Switch between your business applications
          </div>
        </div>
        <Tag
          color="blue"
          style={{
            margin: 0,
            fontSize: 11,
            borderRadius: 12,
            padding: "1px 10px",
            fontWeight: 600,
          }}
        >
          {availableProducts.length} Active
        </Tag>
      </div>

      {/* ── WORKSPACES 2-COLUMN GRID ───────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(285px, 1fr))",
          gap: isMobile ? 8 : 10,
        }}
      >
        {availableProducts.map((prod) => {
          const isActive = prod.key === activeProduct;
          return (
            <div
              key={prod.key}
              onClick={() => handleProductSelect(prod)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                borderRadius: 10,
                cursor: "pointer",
                backgroundColor: isActive ? `${prod.color}10` : "#ffffff",
                border: isActive ? `1.5px solid ${prod.color}50` : "1.5px solid #f1f5f9",
                transition: "all 0.16s ease",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = "#f8fafc";
                  e.currentTarget.style.borderColor = "#cbd5e1";
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.05)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = "#ffffff";
                  e.currentTarget.style.borderColor = "#f1f5f9";
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.boxShadow = "none";
                }
              }}
            >
              {/* Product Icon in rounded box */}
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  backgroundColor: `${prod.color}18`,
                  color: prod.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  flexShrink: 0,
                }}
              >
                {prod.icon}
              </div>

              {/* Product Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Text strong style={{ fontSize: 13.5, color: isActive ? prod.color : "#1e293b" }}>
                    {prod.name}
                  </Text>
                  <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>
                    ({prod.shortName})
                  </span>
                  {isActive && (
                    <span
                      style={{
                        fontSize: 9.5,
                        fontWeight: 700,
                        padding: "1px 6px",
                        borderRadius: 6,
                        backgroundColor: `${prod.color}22`,
                        color: prod.color,
                        textTransform: "uppercase",
                        letterSpacing: "0.4px",
                      }}
                    >
                      Active
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: "#64748b",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    marginTop: 2,
                  }}
                  title={prod.tagline}
                >
                  {prod.tagline}
                </div>
              </div>

              {/* Active Indicator */}
              {isActive && (
                <CheckCircleFilled style={{ color: prod.color, fontSize: 18, flexShrink: 0 }} />
              )}
            </div>
          );
        })}
      </div>

      <div style={{ height: 1, backgroundColor: "#f1f5f9", margin: "16px 0 12px" }} />

      {/* ── PLATFORM TOOLS HEADER ──────────────────────────────────────────── */}
      <div style={{ marginBottom: 10 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#475569",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Platform Tools
        </div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 1 }}>
          Cross-system utilities & administration
        </div>
      </div>

      {/* ── PLATFORM TOOLS 2-COLUMN GRID ───────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(285px, 1fr))",
          gap: isMobile ? 8 : 10,
        }}
      >
        {/* Unified Dashboard */}
        <div
          onClick={() => {
            onClose?.();
            navigate("/home-dashboard");
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 12px",
            borderRadius: 10,
            cursor: "pointer",
            backgroundColor: "#ffffff",
            border: "1.5px solid #f1f5f9",
            transition: "all 0.16s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#f8fafc";
            e.currentTarget.style.borderColor = "#cbd5e1";
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.05)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#ffffff";
            e.currentTarget.style.borderColor = "#f1f5f9";
            e.currentTarget.style.transform = "none";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              backgroundColor: "#3b82f618",
              color: "#3b82f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              flexShrink: 0,
            }}
          >
            <DashboardOutlined />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text strong style={{ fontSize: 13, color: "#1e293b", display: "block" }}>
              Unified Dashboard
            </Text>
            <div
              style={{
                fontSize: 11.5,
                color: "#64748b",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                marginTop: 2,
              }}
            >
              Executive overview & key metrics
            </div>
          </div>
        </div>

        {/* Document Center */}
        <div
          onClick={() => {
            onClose?.();
            navigate("/documents");
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 12px",
            borderRadius: 10,
            cursor: "pointer",
            backgroundColor: "#ffffff",
            border: "1.5px solid #f1f5f9",
            transition: "all 0.16s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#f8fafc";
            e.currentTarget.style.borderColor = "#cbd5e1";
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.05)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#ffffff";
            e.currentTarget.style.borderColor = "#f1f5f9";
            e.currentTarget.style.transform = "none";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              backgroundColor: "#6366f118",
              color: "#6366f1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              flexShrink: 0,
            }}
          >
            <FileDoneOutlined />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text strong style={{ fontSize: 13, color: "#1e293b", display: "block" }}>
              Document Center & E-Sign
            </Text>
            <div
              style={{
                fontSize: 11.5,
                color: "#64748b",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                marginTop: 2,
              }}
            >
              Contracts, PDFs & signature workflows
            </div>
          </div>
        </div>

        {/* Platform Settings */}
        <div
          onClick={() => {
            onClose?.();
            navigate("/system-setup");
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 12px",
            borderRadius: 10,
            cursor: "pointer",
            backgroundColor: "#ffffff",
            border: "1.5px solid #f1f5f9",
            transition: "all 0.16s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#f8fafc";
            e.currentTarget.style.borderColor = "#cbd5e1";
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.05)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#ffffff";
            e.currentTarget.style.borderColor = "#f1f5f9";
            e.currentTarget.style.transform = "none";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              backgroundColor: "#0891b218",
              color: "#0891b2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              flexShrink: 0,
            }}
          >
            <SettingOutlined />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text strong style={{ fontSize: 13, color: "#1e293b", display: "block" }}>
              Platform Settings
            </Text>
            <div
              style={{
                fontSize: 11.5,
                color: "#64748b",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                marginTop: 2,
              }}
            >
              Organization & hardware configuration
            </div>
          </div>
        </div>

        {/* Admin Console / Return to Store Contextual Card */}
        {isAdmin && (
          <div
            onClick={() => {
              onClose?.();
              if (isAdminRoute) {
                navigate(activeProductConfig.defaultPath || "/tables");
              } else {
                navigate("/admin/dashboard");
              }
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 12px",
              borderRadius: 10,
              cursor: "pointer",
              backgroundColor: isAdminRoute ? "#f0fdf4" : `${primaryColor}0c`,
              border: isAdminRoute ? "1.5px solid #bbf7d0" : `1.5px solid ${primaryColor}25`,
              transition: "all 0.16s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isAdminRoute ? "#dcfce7" : `${primaryColor}18`;
              e.currentTarget.style.borderColor = isAdminRoute ? "#86efac" : `${primaryColor}40`;
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = isAdminRoute ? "#f0fdf4" : `${primaryColor}0c`;
              e.currentTarget.style.borderColor = isAdminRoute ? "1.5px solid #bbf7d0" : `1.5px solid ${primaryColor}25`;
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                backgroundColor: isAdminRoute ? "#16a34a18" : `${primaryColor}18`,
                color: isAdminRoute ? "#16a34a" : primaryColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                flexShrink: 0,
              }}
            >
              {isAdminRoute ? <ShopOutlined /> : <RollbackOutlined style={{ transform: "rotate(180deg)" }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text strong style={{ fontSize: 13, color: isAdminRoute ? "#16a34a" : primaryColor, display: "block" }}>
                {isAdminRoute ? "Return to POS / Store" : "Admin Console"}
              </Text>
              <div
                style={{
                  fontSize: 11.5,
                  color: "#64748b",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  marginTop: 2,
                }}
              >
                {isAdminRoute ? "Switch to business front-of-house" : "Platform administration & tenant setup"}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const EcosystemAppSwitcher: React.FC<EcosystemAppSwitcherProps> = ({
  compact = false,
  textColor = "white",
  bgColor = "rgba(255, 255, 255, 0.16)",
  borderColor = "rgba(255, 255, 255, 0.24)",
  triggerType = "waffle",
}) => {
  const isMobile = useIsMobile();
  const { activeProductConfig, isMultiProduct } = useActiveProduct();
  const [open, setOpen] = useState(false);

  const mobileStyle = (
    <style>{`
      @media (max-width: 768px) {
        .ecosystem-app-switcher-dropdown {
          position: fixed !important;
          top: 56px !important;
          left: 8px !important;
          right: 8px !important;
          width: calc(100vw - 16px) !important;
          max-width: calc(100vw - 16px) !important;
          transform: none !important;
          margin: 0 !important;
          z-index: 1050 !important;
        }
        .ecosystem-app-switcher-dropdown .ant-dropdown-menu,
        .ecosystem-app-switcher-dropdown > div {
          width: 100% !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
        }
      }
    `}</style>
  );

  // Waffle icon launcher trigger (3x3 grid)
  if (triggerType === "waffle") {
    return (
      <>
        {mobileStyle}
        <Dropdown
          open={open}
          onOpenChange={setOpen}
          dropdownRender={() => <EcosystemAppMenu onClose={() => setOpen(false)} />}
          trigger={["click"]}
          placement={isMobile ? "bottomCenter" : "bottomLeft"}
          overlayClassName="ecosystem-app-switcher-dropdown"
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 34,
              height: 34,
              borderRadius: 8,
              cursor: "pointer",
              color: textColor,
              background: open ? "rgba(255, 255, 255, 0.28)" : bgColor,
              border: `1px solid ${borderColor}`,
              userSelect: "none",
              transition: "all 0.15s ease",
            }}
            title="Basepoint Apps"
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.25)")}
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = open ? "rgba(255, 255, 255, 0.28)" : bgColor)
            }
          >
            <svg width="15" height="15" viewBox="0 0 12 12" fill="currentColor">
              <path d="M0 0h3v3H0V0zm4.5 0h3v3h-3V0zM9 0h3v3H9V0zM0 4.5h3v3H0v-3zm4.503 0h3v3h-3v-3zM9 4.5h3v3H9v-3zM0 9h3v3H0V9zm4.503 0h3v3h-3V9zM9 9h3v3H9V9z" />
            </svg>
          </div>
        </Dropdown>
      </>
    );
  }

  // If only 1 product is enabled and pill mode requested, render a simple non-dropdown status badge
  if (!isMultiProduct) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 10px",
          background: bgColor,
          border: `1px solid ${borderColor}`,
          borderRadius: 8,
          color: textColor,
          fontSize: 13,
          fontWeight: 600,
          userSelect: "none",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", fontSize: 15 }}>
          {activeProductConfig.icon}
        </span>
        <span>{activeProductConfig.name}</span>
      </div>
    );
  }

  // Multi-product switcher pill
  return (
    <>
      {mobileStyle}
      <Dropdown
        open={open}
        onOpenChange={setOpen}
        dropdownRender={() => <EcosystemAppMenu onClose={() => setOpen(false)} />}
        trigger={["click"]}
        placement={isMobile ? "bottomCenter" : "bottomLeft"}
        overlayClassName="ecosystem-app-switcher-dropdown"
      >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: compact ? 4 : 8,
          padding: compact ? "4px 8px" : "5px 12px",
          background: bgColor,
          border: `1px solid ${borderColor}`,
          borderRadius: 8,
          cursor: "pointer",
          color: textColor,
          fontSize: 13,
          fontWeight: 600,
          userSelect: "none",
          transition: "all 0.15s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.25)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = bgColor)}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 15,
            color: activeProductConfig.color,
            filter: "brightness(1.3)",
          }}
        >
          {activeProductConfig.icon}
        </span>
        <span>{activeProductConfig.name}</span>
        {!compact && (
          <span style={{ fontSize: 11, opacity: 0.8, fontWeight: 400 }}>
            ({activeProductConfig.shortName})
          </span>
        )}
        <DownOutlined style={{ fontSize: 10, opacity: 0.7, marginLeft: 2 }} />
      </div>
    </Dropdown>
    </>
  );
};

export default EcosystemAppSwitcher;
