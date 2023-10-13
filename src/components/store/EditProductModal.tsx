import React from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  TextareaAutosize,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Grid,
  Typography,
  Alert,
  InputAdornment,
} from "@mui/material";
import { CloseRounded } from "@mui/icons-material";
import { useForm, Controller } from "react-hook-form";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { updateProduct } from "../../features/Product/ProductAction";
import DnsIcon from "@mui/icons-material/Dns";
import CategoryIcon from "@mui/icons-material/Category";
import PriceChangeIcon from "@mui/icons-material/PriceChange";
import ProductionQuantityLimitsIcon from "@mui/icons-material/ProductionQuantityLimits";
import FastfoodIcon from '@mui/icons-material/Fastfood';

interface Category {
  _id: string;
  name: string;
}

interface ProductData {
  name: string;
  price: number;
  description: string;
  quantity: number;
  min_viable_quantity: number;
  category: string;
}

interface EditProductModalProps {
  productData: any;
  open: boolean;
  onClose: () => void;
}

const EditProductModal: React.FC<EditProductModalProps> = ({
  open,
  productData,
  onClose,
}) => {
  const {
    handleSubmit,
    control,
    reset,
    formState: { isDirty },
  } = useForm<ProductData>();

  const fetchCategories = async () => {
    const response = await axios.get<Category[]>(
      "http://localhost:3000/categories"
    );
    return response.data;
  };

  const { data: categories } = useQuery<Category[]>(
    ["categories"],
    fetchCategories
  );

  const dispatch = useDispatch();

  const handleUpdate = (data: ProductData) => {
    const newProductData = {
      _id: productData?._id,
      ...data,
    };

    if (!isDirty) {
      return;
    }

    dispatch(updateProduct(newProductData));

    reset();
    onClose();
  };

  return (
    <Dialog open={open} maxWidth="md" onClose={onClose}>
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignContent: "center",
          backgroundColor: "#6c1c2c",
          color: "white",
        }}
      >
       
        <div
          style={{
            gap: "10px",
            color: "white",
            display: "flex",
            alignItems: "center",
          }}
        >
          <FastfoodIcon />
           Update Dish
        </div>
        <IconButton onClick={onClose}>
          <CloseRounded fontSize="inherit" color="inherit" />
        </IconButton>
      </DialogTitle>
      {isDirty && (
        <Alert severity="info">
          Make sure to make changes for you to update - {productData.name} dish.
        </Alert>
      )}
      <DialogContent>
        <form onSubmit={handleSubmit(handleUpdate)}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Controller
                name="name"
                control={control}
                defaultValue={productData.name || ""}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Name"
                    fullWidth
                    margin="normal"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <DnsIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
              <Controller
                name="category"
                control={control}
                defaultValue={productData?.category?._id || ""}
                render={({ field }) => (
                  <FormControl fullWidth margin="normal">
                    <InputLabel id="category">Category</InputLabel>
                    <Select
                      {...field}
                      label="Category"
                      startAdornment={
                        <InputAdornment position="start">
                          <CategoryIcon />
                        </InputAdornment>
                      }
                    >
                      <MenuItem value="">Select category</MenuItem>
                      {categories &&
                        categories.map((category) => (
                          <MenuItem key={category._id} value={category._id}>
                            {category.name}
                          </MenuItem>
                        ))}
                    </Select>
                  </FormControl>
                )}
              />
              <Controller
                name="price"
                control={control}
                defaultValue={productData.price || 0}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Price"
                    type="number"
                    fullWidth
                    margin="normal"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PriceChangeIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
            </Grid>
            <Grid item xs={6}>
              <Controller
                name="quantity"
                control={control}
                defaultValue={productData.quantity || 0}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Quantity"
                    type="number"
                    fullWidth
                    margin="normal"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <ProductionQuantityLimitsIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
              <Controller
                name="min_viable_quantity"
                control={control}
                defaultValue={productData.min_viable_quantity || 0}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Min Viable Quantity"
                    type="number"
                    fullWidth
                    margin="normal"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <ProductionQuantityLimitsIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
              <Controller
                name="description"
                control={control}
                defaultValue={productData.desc || ""}
                render={({ field }) => (
                  <TextareaAutosize
                    {...field}
                    placeholder="Description"
                    minRows={3.5}
                    maxRows={3.5}
                    style={{ width: "100%", marginTop: 15 }}
                  />
                )}
              />
            </Grid>
          </Grid>
          <DialogActions>
            <Button
              type="submit"
              variant="outlined"
              sx={{
                pl: 2,
                color: "#6c1c2c",
                borderColor: "#6c1c2c",
                "&:hover": {
                  borderColor: "#bc8c7c",
                  color: "#bc8c7c",
                },
              }}
              fullWidth
            >
              Update
            </Button>
          </DialogActions>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditProductModal;
