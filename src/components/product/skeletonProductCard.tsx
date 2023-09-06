import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';

function SkeletonProductCard() {
  return (
    <Card elevation={3} style={{ maxWidth: "300px", minHeight: "fit-content" }}>
      <Skeleton variant="rectangular" height={90} animation="wave" />
      <CardContent style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <Skeleton variant="rectangular" height={24} animation="wave" width={70} style={{ marginRight: "10px" }} />
          <Skeleton variant="rectangular" height={24} animation="wave" width={70} />
        </div>
      </CardContent>
    </Card>
  );
}

export default SkeletonProductCard;
