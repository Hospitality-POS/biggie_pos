import { Card, Skeleton } from "antd";

function SkeletonCategoryCard() {
  return (
    <Card style={{ backgroundColor: "white", width: 120, height: 100 }} bodyStyle={{ padding: 8 }}>
      <Skeleton.Button active block style={{ height: 50, marginBottom: 8, borderRadius: 6 }} />
      <Skeleton active paragraph={{ rows: 1 }} title={false} />
    </Card>
  );
}

export default SkeletonCategoryCard;
