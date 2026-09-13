import React, { useRef, useState, useEffect } from "react";
import {
  ShopOutlined,
  AppstoreOutlined,
  ScanOutlined,
  LeftOutlined,
  RightOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { POSSkeletonTabs } from "./POSSkeletons";
import { useNetworkStatus } from "../../services/offlineSync";

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
  const { isOnline, pendingCount, isSyncing, triggerSync } = useNetworkStatus();
  const tabsRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollability = () => {
    if (!tabsRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = tabsRef.current;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
  };

  useEffect(() => {
    checkScrollability();
    const el = tabsRef.current;
    if (el) {
      el.addEventListener("scroll", checkScrollability, { passive: true });
      window.addEventListener("resize", checkScrollability);
      return () => {
        el.removeEventListener("scroll", checkScrollability);
        window.removeEventListener("resize", checkScrollability);
      };
    }
  }, [categories, posMode]);

  // Scroll active category into view when changed
  useEffect(() => {
    if (!tabsRef.current || !selectedCategoryId) return;
    const activeBtn = tabsRef.current.querySelector(
      `[data-category-id="${selectedCategoryId}"]`
    );
    if (activeBtn) {
      activeBtn.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [selectedCategoryId]);

  const handleScroll = (direction: "left" | "right") => {
    if (tabsRef.current) {
      const offset = direction === "left" ? -240 : 240;
      tabsRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

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

          {/* Offline / Pending Sync Indicator */}
          {!isOnline ? (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                backgroundColor: "#ef4444",
                color: "#ffffff",
                borderRadius: 20,
                padding: "3px 8px",
                fontSize: "0.72rem",
                fontWeight: 600,
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }}
              title="Working offline. Orders will be saved locally and synced automatically when online."
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: "#ffffff",
                  display: "inline-block",
                }}
              />
              <span>Offline</span>
              {pendingCount > 0 && <span>({pendingCount})</span>}
            </div>
          ) : pendingCount > 0 ? (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                backgroundColor: "rgba(255, 255, 255, 0.18)",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                color: "#ffffff",
                borderRadius: 20,
                padding: "2px 8px",
                fontSize: "0.72rem",
                fontWeight: 600,
              }}
            >
              <span>{pendingCount} offline order{pendingCount > 1 ? "s" : ""}</span>
              <button
                type="button"
                onClick={triggerSync}
                disabled={isSyncing}
                style={{
                  backgroundColor: "#ffffff",
                  color: primaryColor,
                  border: "none",
                  borderRadius: 12,
                  padding: "2px 8px",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  cursor: isSyncing ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {isSyncing && <SyncOutlined spin style={{ fontSize: 10 }} />}
                {isSyncing ? "Syncing…" : "Sync"}
              </button>
            </div>
          ) : null}
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

      {/* Row 2: Browse Category Tabs with Scroll Helpers */}
      {posMode === "browse" && (
        <div
          style={{
            paddingLeft: isMobile ? 8 : 12,
            paddingRight: isMobile ? 8 : 12,
            paddingBottom: 8,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {categoriesLoading ? (
            <POSSkeletonTabs />
          ) : (
            <>
              {/* Left Scroll Helper */}
              <button
                type="button"
                onClick={() => handleScroll("left")}
                disabled={!canScrollLeft}
                aria-label="Scroll left"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  backgroundColor: canScrollLeft
                    ? "rgba(255, 255, 255, 0.25)"
                    : "rgba(255, 255, 255, 0.08)",
                  border: "none",
                  color: canScrollLeft ? "#ffffff" : "rgba(255, 255, 255, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: canScrollLeft ? "pointer" : "default",
                  flexShrink: 0,
                  transition: "all 0.15s ease",
                  boxShadow: canScrollLeft ? "0 1px 4px rgba(0,0,0,0.15)" : "none",
                }}
              >
                <LeftOutlined style={{ fontSize: 11 }} />
              </button>

              {/* Scrollable category tabs */}
              <div
                ref={tabsRef}
                style={{
                  display: "flex",
                  overflowX: "auto",
                  gap: 8,
                  alignItems: "center",
                  scrollbarWidth: "none",
                  WebkitOverflowScrolling: "touch",
                  paddingBottom: 2,
                  flex: 1,
                  minWidth: 0,
                }}
              >
                {categories.map((category) => {
                  const isSelected = selectedCategoryId === category._id;
                  return (
                    <button
                      key={category._id}
                      data-category-id={category._id}
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
                        flexShrink: 0,
                      }}
                    >
                      {category.icon}
                      <span>{category.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Right Scroll Helper */}
              <button
                type="button"
                onClick={() => handleScroll("right")}
                disabled={!canScrollRight}
                aria-label="Scroll right"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  backgroundColor: canScrollRight
                    ? "rgba(255, 255, 255, 0.25)"
                    : "rgba(255, 255, 255, 0.08)",
                  border: "none",
                  color: canScrollRight ? "#ffffff" : "rgba(255, 255, 255, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: canScrollRight ? "pointer" : "default",
                  flexShrink: 0,
                  transition: "all 0.15s ease",
                  boxShadow: canScrollRight ? "0 1px 4px rgba(0,0,0,0.15)" : "none",
                }}
              >
                <RightOutlined style={{ fontSize: 11 }} />
              </button>
            </>
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
