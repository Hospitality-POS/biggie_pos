import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Grid,
  IconButton,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import StoreProductCard from "../../components/store/StoreProductCard";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import StoreProductCardSkeleton from "../../components/store/StoreProductSkeletonCard";
import AddNewProductModal from "../../components/store/AddNewProductModal";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { fetchProducts, fetchProductsByCategory } from "../../features/Product/ProductAction";

const Store: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { products, loading, error } = useSelector(
    (state: any) => state.product
  );
  const dispatch = useDispatch();
  // const { isLoading, isError, error, data } = useQuery({
  //   queryKey: ["product"],
  //   queryFn: () =>
  //     fetch("http://localhost:3000/product/products").then((res) => res.json()),
  //   retry: 3,
  //   retryDelay: 1000,
  //   refetchInterval: 1000,
  //   refetchIntervalInBackground: true
  // });
  const [value, setValue] = React.useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const handleCategories = (id: string) => {
    dispatch(fetchProductsByCategory(id));
  };
  const onAdd = () => {
    setOpen(true);
  };
  const onSave = () => {
    console.log("clicked");
  };
  const onClose = () => {
    setOpen(false);
  };

  const fetchCategories = async () => {
    const response = await axios.get("http://localhost:3000/categories");
    return response.data;
  };

  const { data: categoriesData } = useQuery(["categories"], () =>
    fetchCategories()
  );

  if (error) {
    return <div>An error has occurred: {error.message}</div>;
  }

  return (
    <>
      <Typography mt={2} variant="h6" ml={4} gutterBottom>
        Products Management
      </Typography>
      <Box sx={{ bgcolor: "background.paper", width: "100", ml: 2 }}>
        <Tabs
          value={value}
          onChange={handleChange}
          textColor="inherit"
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            "& .MuiTabs-indicator": {
              backgroundColor: "#6c1c2c",
            },
          }}
          aria-label="scrollable auto tabs example"
        >
          {categoriesData &&
            categoriesData.map((category: any) => (
              <Tab
                key={category._id}
                label={category.name}
                onClick={()=>handleCategories(category._id)}
              />
            ))}
        </Tabs>
      </Box>
      <Divider sx={{ mb: 2 }} />

      <div
        className="cards"
        style={{ height: "calc(100vh - 280px)", overflowY: "auto" }}
      >
        <Card
          sx={{
            width: 200,
            boxShadow: "none",
            height: 300,
            display: "flex",
            flexDirection: "column",
            border: "2px dashed #6c1c2c",
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

        <AddNewProductModal open={open} onClose={onClose} onSave={onSave} />

        {loading
          ? [...Array(11)].map((_, index) => (
              <StoreProductCardSkeleton key={index} />
            ))
          : products?.map((product: any) => (
              <StoreProductCard
                key={product._id}
                bowls={product.quantity}
                price={product.price}
                name={product.name}
                img={product.image}
                product={product}
                productId={product._id}
              />
            ))}
      </div>
      <Divider />
      <Grid item xs={12} sx={{ position: "sticky", bottom: 0 }}>
        <Grid item sx={{ display: "flex", columnGap: 2, p: 2, ml: 1 }}>
          <Button
            variant="outlined"
            sx={{
              p: 1,
              color: "#6c1c2c",
              borderColor: "#6c1c2c",

              "&:hover": {
                borderColor: "#bc8c7c",
                color: "#bc8c7c",
              },
            }}
          >
            Discard Changes
          </Button>
          <Button
          onClick={()=>dispatch(fetchProducts())}
            variant="contained"
            sx={{
              p: 1,
              bgcolor: "#6c1c2c",
              "&:hover": {
                bgcolor: "#bc8c7c",
                color: "#ffff",
              },
            }}
          >
            Save Changes
          </Button>
        </Grid>
      </Grid>
    </>
  );
};

export default Store;
