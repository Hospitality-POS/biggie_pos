import React from "react";
import { Skeleton } from "antd";

function SkeletonCartItemCard() {
  return (
    <div
      style={{
        marginBottom: 8,
        border: "1px solid #f1f5f9",
        borderRadius: 8,
        backgroundColor: "#ffffff",
        padding: "10px",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 96px 74px minmax(36px, auto)",
          gap: 6,
          alignItems: "center",
        }}
      >
        <div>
          <Skeleton.Input active size="small" style={{ width: "80%", height: 18 }} />
        </div>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Skeleton.Button active size="small" style={{ width: 80, height: 26, borderRadius: 5 }} />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Skeleton.Input active size="small" style={{ width: 50, height: 18 }} />
        </div>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Skeleton.Avatar active size={28} shape="circle" />
        </div>
      </div>
    </div>
  );
}

export default SkeletonCartItemCard;