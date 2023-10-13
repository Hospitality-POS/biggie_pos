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
  Typography,
  Grid,
  InputAdornment,
} from "@mui/material";
import { CloseRounded } from "@mui/icons-material";
import { useForm, Controller } from "react-hook-form";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { createProduct } from "../../features/Product/ProductAction";
import DnsIcon from "@mui/icons-material/Dns";
import CategoryIcon from "@mui/icons-material/Category";
import PriceChangeIcon from "@mui/icons-material/PriceChange";
import ProductionQuantityLimitsIcon from "@mui/icons-material/ProductionQuantityLimits";
import FastfoodIcon from '@mui/icons-material/Fastfood';
import DescriptionIcon from '@mui/icons-material/Description';

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

interface AddNewProductModalProps {
  open: boolean;
  onClose: () => void;
}
const defaultValues = {
  name: "",
  price: 0,
  description: "",
  quantity: 0,
  min_viable_quantity: 0,
  category: ""
};

const AddNewProductModal: React.FC<AddNewProductModalProps> = ({
  open,
  onClose,
}) => {
  const {
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<ProductData>({ defaultValues });
  
  const fetchCategories = async () => {
    const response = await axios.get<Category[]>(
      "http://localhost:3000/categories"
    );
    return response.data;
  };

  const { data: categories } = useQuery<Category[]>(["categories"], fetchCategories);

  const dispatch = useDispatch();

  const handleSave = (data: ProductData) => {
    const productDetails: ProductData={
      name: data.name,
    quantity: data.quantity,
    price: data.price,
    desc: data.description,
    category: data.category,
    min_viable_quantity: data.min_viable_quantity
    }
    dispatch(createProduct(productDetails));
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
            Add a New Dish
        </div>
       
        <IconButton onClick={onClose}>
          <CloseRounded fontSize="inherit" color="inherit" />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <form onSubmit={handleSubmit(handleSave)}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Controller
                name="name"
                control={control}
                defaultValue=""
                rules={{ required: "Name is required" }}
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
                    error={!!errors.name}
                    helperText={errors.name?.message}
                  />
                )}
              />
              <Controller
                name="category"
                control={control}
                defaultValue=""
                rules={{ required: "Category is required" }}
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
                defaultValue={0}
                rules={{ required: "Price is required" }}
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
                    error={!!errors.price}
                    helperText={errors.price?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={6}>
              <Controller
                name="quantity"
                control={control}
                defaultValue={0}
                rules={{ required: "Quantity is required" }}
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
                    error={!!errors.quantity}
                    helperText={errors.quantity?.message}
                  />
                )}
              />
              <Controller
                name="min_viable_quantity"
                control={control}
                defaultValue={0}
                rules={{ required: "Min Viable Quantity is required" }}
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
                    error={!!errors.min_viable_quantity}
                    helperText={errors.min_viable_quantity?.message}
                  />
                )}
              />
              <Controller
                name="description"
                control={control}
                defaultValue=""
                render={({ field }) => (
                  <TextareaAutosize
                  {...field}
                  placeholder="Description"
                    minRows={3}
                    maxRows={3}
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
              Save
            </Button>
          </DialogActions>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddNewProductModal;