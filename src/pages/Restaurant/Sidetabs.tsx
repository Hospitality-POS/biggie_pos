import React, { useEffect, useRef, useState } from "react";
import { Button, Tooltip } from "antd";
import { AppstoreOutlined, CloseOutlined, MenuOutlined } from "@ant-design/icons";
import { usePrimaryColor } from "@context/PrimaryColorContext";

interface VerticalTabProps {
  handleSubCategoryChange: (subcategoryID: string) => void;
  subcategories: Array<{ _id: string; name: string }>;
}

const VerticalTabs: React.FC<VerticalTabProps> = ({
  handleSubCategoryChange,
  subcategories,
}) => {
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const primaryColor = usePrimaryColor();

  // Derived dark shade for hover/active
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
      : { r: 108, g: 28, b: 44 };
  };
  const { r, g, b } = hexToRgb(primaryColor);
  const darkShade = `rgba(${Math.max(0, r - 30)},${Math.max(0, g - 10)},${Math.max(0, b - 10)},1)`;
  const lightTint = `rgba(${r},${g},${b},0.08)`;

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Auto-select first subcategory
  useEffect(() => {
    if (subcategories?.length && !selectedKey) {
      setSelectedKey(subcategories[0]._id);
    }
  }, [subcategories]);

  // Close drawer on outside click
  useEffect(() => {
    if (!drawerOpen) return;
    const handler = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setDrawerOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [drawerOpen]);

  const handleSelect = (id: string) => {
    setSelectedKey(id);
    handleSubCategoryChange(id);
    if (isMobile) setDrawerOpen(false);
  };

  if (!subcategories?.length) return null;

  // ── Shared menu item renderer ────────────────────────────────────────────
  const MenuItem = ({
    sub,
    collapsed,
    onClick,
  }: {
    sub: { _id: string; name: string };
    collapsed?: boolean;
    onClick: () => void;
  }) => {
    const isSelected = selectedKey === sub._id;
    return (
      <Tooltip
        title={collapsed ? sub.name : ""}
        placement="right"
        mouseEnterDelay={0.3}
      >
        <button
          onClick={onClick}
          style={{
            display: "flex",
            alignItems: "center",
            gap: collapsed ? 0 : 10,
            justifyContent: collapsed ? "center" : "flex-start",
            width: "100%",
            padding: collapsed ? "10px 0" : "10px 14px",
            margin: "2px 0",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            background: isSelected ? "rgba(255,255,255,0.18)" : "transparent",
            color: "white",
            fontSize: 13,
            fontWeight: isSelected ? 600 : 400,
            letterSpacing: 0.2,
            transition: "background 0.18s ease, transform 0.1s ease",
            outline: "none",
            position: "relative",
            overflow: "hidden",
          }}
          onMouseEnter={(e) => {
            if (!isSelected)
              (e.currentTarget as HTMLButtonElement).style.background =
                "rgba(255,255,255,0.1)";
          }}
          onMouseLeave={(e) => {
            if (!isSelected)
              (e.currentTarget as HTMLButtonElement).style.background =
                "transparent";
          }}
        >
          {/* Active indicator bar */}
          {isSelected && (
            <span
              style={{
                position: "absolute",
                left: 0,
                top: "20%",
                height: "60%",
                width: 3,
                borderRadius: "0 3px 3px 0",
                background: "white",
              }}
            />
          )}
          <AppstoreOutlined style={{ fontSize: 14, flexShrink: 0, opacity: isSelected ? 1 : 0.75 }} />
          {!collapsed && (
            <span
              style={{
                flex: 1,
                textAlign: "left",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {sub.name}
            </span>
          )}
        </button>
      </Tooltip>
    );
  };

  // ── Mobile: floating pill button + slide-in drawer ───────────────────────
  if (isMobile) {
    return (
      <>
        {/* Overlay */}
        {drawerOpen && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.35)",
              zIndex: 1100,
              backdropFilter: "blur(2px)",
            }}
            onClick={() => setDrawerOpen(false)}
          />
        )}

        {/* Slide-in drawer */}
        <div
          ref={drawerRef}
          style={{
            position: "fixed",
            top: 0,
            left: drawerOpen ? 0 : "-260px",
            height: "100dvh",
            width: 240,
            background: primaryColor,
            zIndex: 1200,
            transition: "left 0.28s cubic-bezier(0.4,0,0.2,1)",
            display: "flex",
            flexDirection: "column",
            boxShadow: drawerOpen ? "4px 0 24px rgba(0,0,0,0.25)" : "none",
          }}
        >
          {/* Drawer header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 14px 12px",
              borderBottom: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <span
              style={{
                color: "white",
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: 1.2,
                textTransform: "uppercase",
                opacity: 0.85,
              }}
            >
              Categories
            </span>
            <button
              onClick={() => setDrawerOpen(false)}
              style={{
                background: "rgba(255,255,255,0.15)",
                border: "none",
                borderRadius: 6,
                color: "white",
                cursor: "pointer",
                padding: "4px 6px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <CloseOutlined style={{ fontSize: 12 }} />
            </button>
          </div>

          {/* Menu items */}
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px" }}>
            {subcategories.map((sub) => (
              <MenuItem
                key={sub._id}
                sub={sub}
                onClick={() => handleSelect(sub._id)}
              />
            ))}
          </div>
        </div>

        {/* Floating toggle pill */}
        <button
          onClick={() => setDrawerOpen(true)}
          style={{
            position: "fixed",
            left: 14,
            bottom: 80,
            zIndex: 1050,
            background: primaryColor,
            border: "none",
            borderRadius: 24,
            color: "white",
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            gap: 7,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: `0 4px 16px rgba(${r},${g},${b},0.45)`,
            transition: "transform 0.15s ease, box-shadow 0.15s ease",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.04)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
          }}
        >
          <MenuOutlined style={{ fontSize: 13 }} />
          <span>
            {selectedKey
              ? subcategories.find((s) => s._id === selectedKey)?.name ?? "Categories"
              : "Categories"}
          </span>
        </button>
      </>
    );
  }

  // ── Desktop: collapsible sidebar ─────────────────────────────────────────
  return (
    <div
      style={{
        width: isCollapsed ? 64 : 190,
        minWidth: isCollapsed ? 64 : 190,
        background: primaryColor,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.25s cubic-bezier(0.4,0,0.2,1), min-width 0.25s cubic-bezier(0.4,0,0.2,1)",
        borderRadius: "10px 0 0 10px",
        overflow: "hidden",
        boxShadow: "inset -1px 0 0 rgba(255,255,255,0.08)",
      }}
    >
      {/* Header / collapse toggle */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: isCollapsed ? "center" : "space-between",
          padding: isCollapsed ? "12px 0" : "12px 12px 10px",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          flexShrink: 0,
        }}
      >
        {!isCollapsed && (
          <span
            style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: 10,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            Category
          </span>
        )}
        <Tooltip title={isCollapsed ? "Expand" : "Collapse"} placement="right">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{
              background: "rgba(255,255,255,0.12)",
              border: "none",
              borderRadius: 6,
              color: "white",
              cursor: "pointer",
              padding: "5px 7px",
              display: "flex",
              alignItems: "center",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.background =
              "rgba(255,255,255,0.22)")
            }
            onMouseLeave={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.background =
              "rgba(255,255,255,0.12)")
            }
          >
            <MenuOutlined style={{ fontSize: 11 }} />
          </button>
        </Tooltip>
      </div>

      {/* Items */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: isCollapsed ? "8px 6px" : "8px 8px",
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(255,255,255,0.2) transparent",
        }}
      >
        {subcategories.map((sub) => (
          <MenuItem
            key={sub._id}
            sub={sub}
            collapsed={isCollapsed}
            onClick={() => handleSelect(sub._id)}
          />
        ))}
      </div>

      {/* Footer count badge */}
      {!isCollapsed && (
        <div
          style={{
            padding: "8px 14px",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            style={{
              background: "rgba(255,255,255,0.15)",
              borderRadius: 10,
              padding: "1px 8px",
              fontSize: 11,
              color: "rgba(255,255,255,0.7)",
              fontWeight: 600,
            }}
          >
            {subcategories.length}
          </span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
            subcategories
          </span>
        </div>
      )}
    </div>
  );
};

export default VerticalTabs;