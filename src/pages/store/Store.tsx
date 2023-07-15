import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Grid,
  IconButton,
  Typography,
} from "@mui/material";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import StoreProductCard from "../../components/store/StoreProductCard";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import StoreProductCardSkeleton from "../../components/store/StoreProductSkeletonCard";

const Store: React.FC = () => {
  const { isLoading, isError, error, data } = useQuery({
    queryKey: ["product"],
    queryFn: () =>
      fetch("http://localhost:3000/product/products").then((res) => res.json()),
    retry: 3,
    retryDelay: 1000,
  });

  const onEdit = () => {
    console.log("clicked");
  };
  const onAdd = () => {
    console.log("clicked");
  };

  if (isError) {
    return <div>An error has occurred: {error.message}</div>;
  }

  return (
    <>
      <Typography mt={2} variant="h6" ml={4} mb={1} gutterBottom>
        Products Management
      </Typography>
      <Divider sx={{ mb: 2 }} />
      <div
        className="cards"
        style={{ height: "calc(100vh - 230px)", overflowY: "auto" }}
      >
        <Card
          sx={{
            width: 200,
            boxShadow: "none",
            height: 300,
            display: "flex",
            flexDirection: "column",
            border: "2px dashed skyblue",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <CardContent>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
              }}
            >
              <IconButton onClick={onAdd}>
                <AddOutlinedIcon sx={{ fontSize: 40 }} />
              </IconButton>

              <Typography
                variant="body1"
                component="div"
                sx={{ textAlign: "center" }}
              >
                Add a new dish
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {isLoading
          ? [...Array(11)].map((_, index) => (
              <StoreProductCardSkeleton key={index} />
            ))
          : data?.products.map((product: any) => (
              <StoreProductCard
                key={product._id}
                bowls={product.quantity}
                price={product.price}
                name={product.name}
                img={product.img}
                onEdit={onEdit}
              />
            ))}
      </div>
      <Divider />
      <Grid item xs={12} sx={{ position: "sticky", bottom: 0 }}>
        <Grid item sx={{ display: "flex", columnGap: 2, p: 2, ml: 1 }}>
          <Button variant="outlined" sx={{ p: 1 }}>
            Discard Changes
          </Button>
          <Button variant="contained" sx={{ p: 1 }}>
            Save Changes
          </Button>
        </Grid>
      </Grid>
    </>
  );
};

export default Store;
