import { Skeleton, Card, CardContent } from "@mui/material";
import React from "react";

const StoreProductCardSkeleton: React.FC = () => {
  return (
    <Card
      sx={{
        width: 200,
        height: 300,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Skeleton variant="rectangular" height={150}  />
      <CardContent
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Skeleton variant="text" width="60%" />
        <Skeleton variant="text" width="40%" />
      </CardContent>
      <Skeleton
        variant="rectangular"
        height={48}
        width="100%"
        sx={{ borderRadius: 0 }}
      />
    </Card>
  );
};

export default StoreProductCardSkeleton;
