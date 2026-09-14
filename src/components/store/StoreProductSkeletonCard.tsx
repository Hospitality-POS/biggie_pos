import { Card, Skeleton } from "antd";
import React from "react";

const StoreProductCardSkeleton: React.FC = () => {
  return (
    <Card
      style={{
        width: 180,
        height: 200,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
      bodyStyle={{ padding: 8 }}
    >
      <Skeleton.Button active block style={{ height: 140, borderRadius: 8, marginBottom: 8 }} />
      <Skeleton active paragraph={{ rows: 1 }} title={false} />
    </Card>
  );
};

export default StoreProductCardSkeleton;
