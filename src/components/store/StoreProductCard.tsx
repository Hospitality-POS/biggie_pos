import {
  Button,
  Card,
  CardContent,
  CardMedia,
  Typography,
} from "@mui/material";
import React from "react";
import CircleIcon from "@mui/icons-material/Circle";
import BorderColorOutlinedIcon from "@mui/icons-material/BorderColorOutlined";
import EditProductModal from "./EditProductModal";

interface StoreProductCardProps {
  img: string;
  name: string;
  price: number;
  bowls: number;
  product: any;
  onEdit: () => void;
}
const StoreProductCard: React.FC<StoreProductCardProps> = ({
  name,
  img,
  price,
  bowls,
  product,
  onEdit,
}) => {
  const [modalOpen, setModalOpen] = React.useState(false);

  const handleEditClick = () => {
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  const handleUpdateProduct = (updatedProductData) => {
    onEdit(updatedProductData);
  };
  return (
    <>
      <Card
        sx={{
          maxWidth: 200,
          height: 300,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <CardMedia
          component="img"
          height="145"
          sx={{ objectFit: "cover" }}
          image={img ? img : "/food.jpg"}
          alt={name}
        />
        <CardContent
          sx={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Typography
            variant="body1"
            component="div"
            sx={{ textAlign: "center" }}
          >
            {name}
          </Typography>
          <Typography
            variant="subtitle1"
            color="text.secondary"
            sx={{
              textAlign: "center",
              alignContent: "baseline",
              justifyContent: "center",
              gap: 1,
              display: "flex",
            }}
          >
            Ksh.{price.toLocaleString()}
            <CircleIcon sx={{ fontSize: 8, mt: 1, color: "#6c1c2c" }} /> {bowls}{" "}
            Bowl{bowls <= 1 ? " " : "s"}
          </Typography>
        </CardContent>
        <Button
          variant="contained"
          sx={{
            borderRadius: 0,
            gap: 2,
            p: 2,
            bgcolor: "#6c1c2c",
            "&:hover": {
              bgcolor: "#bc8c7c",
              color: "#ffff",
            },
          }}
         onClick={handleEditClick}
        >
          <BorderColorOutlinedIcon fontSize="inherit" />
          Edit Dish
        </Button>
      </Card>
      <EditProductModal
        open={modalOpen}
        productData={product}
        onClose={handleCloseModal}
        onUpdate={handleUpdateProduct}
      />
    </>
  );
};

export default StoreProductCard;
