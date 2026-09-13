import React from "react";
import { ShopOutlined, AppstoreOutlined, ScanOutlined } from "@ant-design/icons";
import { POSSkeletonTabs } from "./POSSkeletons";

export interface POSCategoryItem {
  _id: string;
  name: string;
  icon?: React.ReactNode;
}

interface POSHeaderProps {
  shopName: string;
  primaryColor: string;
  isMobile: boolean;
  posMode: "browse" | "scan";
  onModeChange: (mode: "browse" | "scan") => void;
  categoriesLoading: boolean;
  categories: POSCategoryItem[];
  selectedCategoryId?: string;
  onSelectCategory: (categoryId: string) => void;
  slotIndicator?: React.ReactNode;
}

export const POSHeader: React.FC<POSHeaderProps> = ({
  shopName,
  primaryColor,
  isMobile,
  posMode,
  onModeChange,
  categoriesLoading,
  categories,
  selectedCategoryId,
  onSelectCategory,
  slotIndicator,
}) => {
  return (
    <div
      style={{
        backgroundColor: primaryColor,
        flexShrink: 0,
        color: "#ffffff",
        borderTopLeftRadius: isMobile ? 0 : 8,
        borderTopRightRadius: isMobile ? 0 : 8,
      }}
    >
      {/* Top row: Shop badge + Slot indicator (left), Mode toggle (right) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingLeft: isMobile ? 12 : 16,
          paddingRight: isMobile ? 12 : 16,
          paddingTop: isMobile ? 10 : 12,
          paddingBottom: posMode === "browse" ? 8 : 12,
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          {shopName && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                backgroundColor: "rgba(255, 255, 255, 0.16)",
                border: "1px solid rgba(255, 255, 255, 0.25)",
                borderRadius: 20,
                padding: "4px 10px",
                color: "#ffffff",
                flexShrink: 0,
                maxWidth: isMobile ? 140 : 220,
              }}
            >
              <ShopOutlined style={{ fontSize: 13, opacity: 0.9 }} />
              <span
                style={{
                  fontWeight: 700,
                  fontSize: "0.78rem",
                  letterSpacing: 0.3,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {shopName}
              </span>
            </div>
          )}
          {slotIndicator}
        </div>

        {/* Mode Toggle */}
        <div
          style={{
            display: "inline-flex",
            backgroundColor: "rgba(255, 255, 255, 0.15)",
            borderRadius: 8,
            padding: 2,
            border: "1px solid rgba(255, 255, 255, 0.2)",
          }}
        >
          <button
            type="button"
            onClick={() => onModeChange("browse")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: isMobile ? "4px 8px" : "4px 12px",
              fontSize: 11,
              fontWeight: 600,
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              backgroundColor: posMode === "browse" ? "rgba(255, 255, 255, 0.3)" : "transparent",
              color: "#ffffff",
              transition: "all 0.15s ease",
            }}
          >
            <AppstoreOutlined style={{ fontSize: 12 }} />
            {!isMobile && <span>Browse</span>}
          </button>
          <button
            type="button"
            onClick={() => onModeChange("scan")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: isMobile ? "4px 8px" : "4px 12px",
              fontSize: 11,
              fontWeight: 600,
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              backgroundColor: posMode === "scan" ? "rgba(255, 255, 255, 0.3)" : "transparent",
              color: "#ffffff",
              transition: "all 0.15s ease",
            }}
          >
            <ScanOutlined style={{ fontSize: 12 }} />
            {!isMobile && <span>Scan</span>}
          </button>
        </div>
      </div>

      {/* Row 2: Browse Category Tabs */}
      {posMode === "browse" && (
        <div
          style={{
            paddingLeft: isMobile ? 12 : 16,
            paddingRight: isMobile ? 12 : 16,
            paddingBottom: 8,
          }}
        >
          {categoriesLoading ? (
            <POSSkeletonTabs />
          ) : (
            <div
              style={{
                display: "flex",
                overflowX: "auto",
                gap: 8,
                alignItems: "center",
                scrollbarWidth: "none",
                WebkitOverflowScrolling: "touch",
                paddingBottom: 2,
              }}
            >
              {categories.map((category) => {
                const isSelected = selectedCategoryId === category._id;
                return (
                  <button
                    key={category._id}
                    type="button"
                    onClick={() => onSelectCategory(category._id)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      whiteSpace: "nowrap",
                      fontSize: isMobile ? "0.8rem" : "0.86rem",
                      fontWeight: isSelected ? 700 : 500,
                      padding: isMobile ? "6px 14px" : "6px 18px",
                      borderRadius: 20,
                      border: "none",
                      cursor: "pointer",
                      backgroundColor: isSelected ? "#ffffff" : "rgba(255, 255, 255, 0.12)",
                      color: isSelected ? primaryColor : "rgba(255, 255, 255, 0.88)",
                      boxShadow: isSelected ? "0 2px 8px rgba(0, 0, 0, 0.18)" : "none",
                      transition: "all 0.18s ease-in-out",
                      outline: "none",
                    }}
                  >
                    {category.icon}
                    <span>{category.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Row 2: Scan mode banner */}
      {posMode === "scan" && (
        <div
          style={{
            paddingLeft: isMobile ? 12 : 16,
            paddingRight: isMobile ? 12 : 16,
            paddingBottom: 10,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <ScanOutlined style={{ color: "rgba(255, 255, 255, 0.85)", fontSize: 15 }} />
          <span
            style={{
              color: "rgba(255, 255, 255, 0.85)",
              fontWeight: 600,
              fontSize: "0.78rem",
              letterSpacing: 0.5,
            }}
          >
            Ready to scan
          </span>
        </div>
      )}
    </div>
  );
};

export default POSHeader;
