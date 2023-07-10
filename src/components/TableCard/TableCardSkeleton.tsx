import { Box, Card, CardMedia, Skeleton } from "@mui/material";
import classes from "./table.module.css";

const TableCardSkeleton = () => {
  return (
    <Card
      sx={{
        boxShadow: "none",
        bgcolor: "transparent",
        marginTop: "10px"
      }}
      className={classes.container}
    >
      {/* <CardMedia /> */}
      <Skeleton
        variant="circular"
        width={80}
        height={50}
        animation="wave"
      />
    </Card>
  );
};

export default TableCardSkeleton;
