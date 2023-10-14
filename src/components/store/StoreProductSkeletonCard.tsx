import { Skeleton, Card, CardContent } from "@mui/material";
import React from "react";

const StoreProductCardSkeleton: React.FC = () => {
  return (
    <Card
      sx={{
        width: 180,
        height: 200,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Skeleton variant="rectangular" height={150} width={180} />
      <CardContent
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        
      </CardContent>
    </Card>
  );
};

export default StoreProductCardSkeleton;
