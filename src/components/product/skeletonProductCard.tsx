import React from "react";
import { Skeleton } from "antd";

interface SkeletonProductCardProps {
  style?: React.CSSProperties;
}

const SkeletonProductCard: React.FC<SkeletonProductCardProps> = ({ style }) => {
  return (
    <div
      style={{
        borderRadius: 14,
        overflow: "hidden",
        backgroundColor: "#ffffff",
        border: "1px solid #e2e8f0",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        display: "flex",
        flexDirection: "column",
        height: 265,
        boxSizing: "border-box",
        flex: "0 0 calc(33% - 7px)",
        minWidth: 160,
        ...style,
      }}
    >
      {/* Top media placeholder matching ProductCard 125px thumbnail */}
      <div
        style={{
          width: "100%",
          height: 125,
          position: "relative",
          backgroundColor: "#f8fafc",
          borderBottom: "1px solid #f1f5f9",
          overflow: "hidden",
        }}
      >
        <Skeleton.Button
          active
          block
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 0,
            display: "block",
          }}
        />
      </div>

      {/* Card body matching ProductCard */}
      <div
        style={{
          padding: "12px 14px",
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          justifyContent: "space-between",
        }}
      >
        {/* Title and metadata */}
        <div>
          <Skeleton.Input
            active
            size="small"
            style={{ width: "80%", height: 16, marginBottom: 6, borderRadius: 4 }}
          />
          <Skeleton.Input
            active
            size="small"
            style={{ width: "45%", height: 13, borderRadius: 4 }}
          />
        </div>

        {/* Price & Action button */}
        <div style={{ marginTop: 10 }}>
          <Skeleton.Input
            active
            size="small"
            style={{ width: "50%", height: 20, marginBottom: 8, borderRadius: 4 }}
          />
          <Skeleton.Button
            active
            block
            style={{
              height: 34,
              borderRadius: 8,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default SkeletonProductCard;
