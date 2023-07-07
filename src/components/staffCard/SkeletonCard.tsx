import React from "react";
import { Skeleton } from "@mui/material";
import classes from "./staff.module.css";

const SkeletonCard = () => {
  return (
    <div className={classes.cards}>
      <div className={classes.avatarContainer}>
        <Skeleton variant="circular" width={50} height={50} />
      </div>
      <div className={classes.content}>
        <Skeleton width={100} />
        <Skeleton width={80} />
        <Skeleton width={120} />
      </div>
      <Skeleton variant="rectangular" className={classes.loginButton} />
    </div>
  );
};

export default SkeletonCard;
