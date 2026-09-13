import React from 'react';
import { Card, CardContent, Skeleton } from '@mui/material';

function SkeletonCartItemCard() {
  return (
    <Card sx={{ mb: 1, boxShadow: "none", border: "1px solid #f1f5f9", borderRadius: "8px", backgroundColor: "#ffffff" }}>
      <CardContent sx={{ pb: "8px !important", pt: "10px !important", px: "10px !important" }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 96px 74px minmax(36px, auto)", gap: 6, alignItems: "center" }}>
          <div>
            <Skeleton variant="text" animation="wave" height={20} width="80%" />
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Skeleton variant="rounded" animation="wave" height={26} width={80} sx={{ borderRadius: "5px" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Skeleton variant="text" animation="wave" height={20} width={50} />
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Skeleton variant="circular" width={28} height={28} animation="wave" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default SkeletonCartItemCard;