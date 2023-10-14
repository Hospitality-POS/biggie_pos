import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';

function SkeletonProductCard() {
  return (
    <Card elevation={3} style={{ maxWidth: "150px", minHeight: "fit-content" }}>
      <Skeleton variant="rectangular" height={90} width={150} animation="wave" />
      <CardContent style={{ display: "flex", flexDirection: "column", alignItems: "center" }} >
      </CardContent>
    </Card>
  );
}

export default SkeletonProductCard;
