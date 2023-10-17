import React from 'react';
import { Card, CardContent, Grid, Skeleton, Typography } from '@mui/material';

function SkeletonCartItemCard() {
  return (
    <Card sx={{ mb: 1, boxShadow: "none", backgroundColor: "#FAF9F6" }}>
      <CardContent>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={4}>
            <Typography variant="body1">
              <Skeleton variant="text" animation="wave" height={20} width={100} />
            </Typography>
          </Grid>
          <Grid item xs={3}>
            <Skeleton sx={{ml: 3}} variant="text" animation="wave" height={20} width={25} />
          </Grid>
          <Grid item xs={2} ml={-3}>
            <Typography variant="body1" fontSize="16px" ml={3}>
              <Skeleton variant="text" animation="wave" height={20} width={40} />
            </Typography>
          </Grid>
          <Grid item xs={2} ml={4}>
            <Skeleton variant="rounded" width={40} height={15} animation="wave" />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}

export default SkeletonCartItemCard;