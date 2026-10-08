import { Card, Skeleton } from "antd";
import classes from "./table.module.css";

const TableCardSkeleton = () => {
  return (
    <Card
      bordered={false}
      style={{
        boxShadow: "none",
        backgroundColor: "transparent",
        marginTop: "10px",
      }}
      className={classes.container}
    >
      <Skeleton.Button active style={{ width: 80, height: 50, borderRadius: 25 }} />
    </Card>
  );
};

export default TableCardSkeleton;
