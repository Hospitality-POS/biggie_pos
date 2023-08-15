import {
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  IconButton,
  Typography,
} from "@mui/material";
import React from "react";
import CircleIcon from "@mui/icons-material/Circle";
import BorderColorOutlinedIcon from "@mui/icons-material/BorderColorOutlined";
import EditProductModal from "./EditProductModal";

import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { useDispatch } from "react-redux";
import { deleteProduct } from "../../features/Product/ProductAction";

interface StoreProductCardProps {
  img: string;
  name: string;
  price: number;
  bowls: number;
  product: any;
  productId: string;
}
const StoreProductCard: React.FC<StoreProductCardProps> = ({
  name,
  img,
  price,
  bowls,
  product,
  productId
}) => {
  const [modalOpen, setModalOpen] = React.useState(false);
  const dispatch= useDispatch()
  const handleEditClick = () => {
    setModalOpen(true);
  };

  const transformImagePath=(absolutePath: string)=> {
    const filename = absolutePath.split("\\").pop(); 
    return `\\uploads\\${filename}`;
  }
  const handleCloseModal = () => {
    setModalOpen(false);
  };
  const handleDeleteClick = (id) => {
    dispatch(deleteProduct(id))
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
          image={img ? transformImagePath(img) : "/food.jpg"}
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
            Ksh.{price?.toLocaleString()}
            <CircleIcon sx={{ fontSize: 8, mt: 1, color: "#6c1c2c" }} /> {bowls}{" "}
            Bowl{bowls <= 1 ? " " : "s"}
          </Typography>
        </CardContent>
        <Box sx={{ display: "flex",
    
    alignItems: "center", 
    marginTop: 1, }}>
          <IconButton
            sx={{
              flex: 1,
              borderRadius: 0,
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
          </IconButton>
          <IconButton
            sx={{
              flex: 1,
              borderRadius: 0,
              p: 2,
              bgcolor: "#ff3333", 
              "&:hover": {
                bgcolor: "#cc0000",
                color: "#ffffff",
              },
            }}
            onClick={()=>handleDeleteClick(productId)}
          >
            <DeleteSweepIcon fontSize="inherit" />
          </IconButton>
        </Box>
      </Card>
      <EditProductModal
        open={modalOpen}
        productData={product}
        onClose={handleCloseModal}
      />
    </>
  );
};

export default StoreProductCard;
