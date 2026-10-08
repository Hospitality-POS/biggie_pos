import React from "react";
import { Skeleton } from "antd";

export const POSSkeletonTabs: React.FC = () => (
  <div
    style={{
      display: "flex",
      width: "100%",
      overflowX: "auto",
      gap: 8,
      paddingTop: 4,
      paddingBottom: 4,
      scrollbarWidth: "none",
    }}
  >
    {Array.from({ length: 6 }).map((_, i) => (
      <Skeleton.Button
        key={i}
        active
        size="small"
        style={{
          width: 110,
          height: 34,
          borderRadius: 20,
          flexShrink: 0,
          opacity: 0.35,
        }}
      />
    ))}
  </div>
);

interface SkeletonCategoryCardsProps {
  isMobile?: boolean;
  isTablet?: boolean;
  cols?: number;
}

export const POSSkeletonCategoryCards: React.FC<SkeletonCategoryCardsProps> = ({
  isMobile = false,
  isTablet = false,
  cols = 6,
}) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: isMobile
        ? "repeat(auto-fit, minmax(130px, 1fr))"
        : isTablet
        ? "repeat(auto-fit, minmax(160px, 1fr))"
        : "repeat(auto-fit, minmax(190px, 1fr))",
      gap: 12,
      flex: 1,
      width: "100%",
      paddingTop: 8,
      alignContent: "start",
    }}
  >
    {Array.from({ length: cols }).map((_, i) => (
      <Skeleton.Node
        key={i}
        active
        style={{
          width: "100%",
          height: 95,
          borderRadius: 8,
        }}
      >
        <span />
      </Skeleton.Node>
    ))}
  </div>
);

export const POSSkeletonVerticalTabs: React.FC = () => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      gap: 8,
      width: 190,
      flexShrink: 0,
      backgroundColor: "#f8fafc",
      borderRight: "1px solid #e2e8f0",
      padding: 12,
      height: "100%",
    }}
  >
    <Skeleton.Input active size="small" style={{ width: "60%", height: 20, marginBottom: 4 }} />
    {Array.from({ length: 5 }).map((_, i) => (
      <Skeleton.Button
        key={i}
        active
        style={{
          width: "100%",
          height: 40,
          borderRadius: 6,
        }}
      />
    ))}
  </div>
);
