import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  TextField,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  Grid,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useForm, Controller } from "react-hook-form";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";

interface NewProduct {
  name: string;
  quantity: number;
  cost: number;
  min_viable_quantity: number;
  category_id: string; 
  description: string;
}

interface InventoryModalProps {
  open: boolean;
  onClose: () => void;
  onAddProduct: (newProduct: NewProduct) => void;
}

const InventoryModal: React.FC<InventoryModalProps> = ({
  open,
  onClose,
  onAddProduct,
}) => {
  const { handleSubmit, control, formState, reset, setValue  } = useForm<NewProduct>({
    defaultValues: {
      name: "",
      quantity: 0,
      cost: 0,
      min_viable_quantity: 0,
      category_id: "",
      description: "",
    },
  });

  const fetchCategories = async () => {
    const response = await axios.get("http://localhost:3000/categories");
    return response.data;
  };

  const { data: categories } = useQuery(["categories"], () =>
    fetchCategories()
  );

  const handleAddNewProduct = (data: NewProduct) => {
   
    const newProductData: NewProduct = { ...data, category_id: data.category_id };
    onAddProduct(newProductData);
    reset();
    onClose();
  };

  const handleClose = () => {
    reset();
    setValue("min_viable_quantity", 0); 
    onClose();
  };

  const handleCategoryChange = (categoryId: string) => {
    setValue("category_id", categoryId);
  };

  return (
    <Dialog
      open={open}
      maxWidth="md"
       onClose={handleClose}
    >
      <DialogTitle
        style={{
          backgroundColor: "#6c1c2c",
          color: "white",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        Add New Product
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit(handleAddNewProduct)}>
        <DialogContent>
          <DialogContentText style={{ padding: 2 }}>
            Fill in the details for the new product
          </DialogContentText>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Controller
                name="name"
                control={control}
                rules={{ required: "Product name is required" }}
                render={({ field }) => (
                  <TextField
                    label="Product Name"
                    variant="outlined"
                    {...field}
                    fullWidth
                    margin="dense"
                    error={!!formState.errors.name}
                    helperText={formState.errors.name?.message}
                  />
                )}
              />
              <Controller
                name="quantity"
                control={control}
                rules={{ required: "Quantity is required" }}
                render={({ field }) => (
                  <TextField
                    label="Quantity"
                    variant="outlined"
                    type="number"
                    {...field}
                    fullWidth
                    margin="dense"
                    InputProps={{ inputProps: { min: 0 } }}
                    error={!!formState.errors.quantity}
                    helperText={formState.errors.quantity?.message}
                  />
                )}
              />
              <Controller
                name="cost"
                control={control}
                rules={{ required: "Purchase cost is required" }}
                render={({ field }) => (
                  <TextField
                    label="Purchase Cost"
                    variant="outlined"
                    type="number"
                    {...field}
                    fullWidth
                    margin="dense"
                    InputProps={{ inputProps: { min: 0 } }}
                    error={!!formState.errors.cost}
                    helperText={formState.errors.cost?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth margin="dense" variant="outlined">
                <InputLabel id="category-label">Category</InputLabel>
                <Controller
                  name="category_id"
                  control={control}
                  rules={{ required: "Category is required" }}
                  render={({ field }) => (
                    <Select
                      labelId="category-label"
                      label="Category"
                      {...field}
                      onChange={e => handleCategoryChange(e.target.value)}
                    >
                      {categories?.map((category: any) => (
                        <MenuItem key={category._id} value={category._id}>
                          {category.name}
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                />
                {formState.errors.category_id && (
                  <FormHelperText error>
                    {formState.errors.category_id.message}
                  </FormHelperText>
                )}
              </FormControl>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField
                    label="Description"
                    variant="outlined"
                    {...field}
                    fullWidth
                    margin="dense"
                  />
                )}
              />
              <Controller
                name="min_viable_quantity"
                control={control}
                rules={{ required: "Minimum viable quantity is required" }}
                render={({ field }) => (
                  <TextField
                    label="Minimum Viable Quantity"
                    variant="outlined"
                    type="number"
                    {...field}
                    fullWidth
                    margin="dense"
                    InputProps={{ inputProps: { min: 0 } }}
                    error={!!formState.errors.min_viable_quantity}
                    helperText={formState.errors.min_viable_quantity?.message}
                  />
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              reset();
              onClose();
            }}
            color="primary"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            color="primary"
            disabled={formState.isSubmitting}
          >
            Add
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default InventoryModal;
