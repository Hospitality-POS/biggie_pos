import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';

function SkeletonProductCard() {
  return (
    <Card sx={{ maxWidth: 345, boxShadow: 'none', width: "200px" }}>
      <Skeleton variant="rectangular" height={150} animation="wave" />
      <CardContent>
        <Skeleton variant="text" height={24} animation="wave" />
        <Skeleton variant="text" height={16} animation="wave" />
      </CardContent>
    </Card>
  );
}

export default SkeletonProductCard;
