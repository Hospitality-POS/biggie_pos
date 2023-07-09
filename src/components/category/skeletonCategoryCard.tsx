import { Card, Skeleton, Typography } from '@mui/material';

function SkeletonCategoryCard() {
  return (
    <Card sx={{ backgroundColor: 'white', width: '120px', height: '100px' }}>
      <Skeleton variant="rectangular" height={120} animation="wave" />
      <Skeleton variant="text" height={40} animation="wave" />
      <Skeleton variant="text" height={20} animation="wave" />
    </Card>
  );
}

export default SkeletonCategoryCard;
