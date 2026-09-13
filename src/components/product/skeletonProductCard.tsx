import { Card, Skeleton } from "antd";

function SkeletonProductCard() {
  return (
    <Card style={{ maxWidth: 150, minHeight: "fit-content" }} bodyStyle={{ padding: 8 }}>
      <Skeleton.Button active block style={{ height: 90, borderRadius: 6, marginBottom: 8 }} />
      <Skeleton active paragraph={{ rows: 1 }} title={false} />
    </Card>
  );
}

export default SkeletonProductCard;
