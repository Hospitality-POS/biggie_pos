import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  DialogContentText,
  IconButton,
  InputAdornment,
  Alert,
  AlertTitle,
  FormControl,
  Select,
  InputLabel,
  MenuItem,
  FormHelperText,
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import CloseIcon from "@mui/icons-material/Close";
import CategoryIcon from "@mui/icons-material/Category";
import { useDispatch, useSelector } from "react-redux";
import { resetCategoryMessage } from "../../../features/Category/CategorySlice";
import { createCategory } from "../../../features/Category/CategoryActions";
import axiosInstance from "../../../services/request";
import { useQuery } from "@tanstack/react-query";

interface Category {
  name: string;
  subcategory_id: string;
}

interface AddCategoryDialogProps {
  open: boolean;
  onClose: () => void;
  onAddCategory: (category: Category) => void;
}

const AddCategoryDialog: React.FC<AddCategoryDialogProps> = ({
  open,
  onClose,
  onAddCategory,
}) => {
  const [primaryColor, setPrimaryColor] = useState("#6c1c2c");

  // Get tenant primary color on component mount
  useEffect(() => {
    const storedTenant = localStorage.getItem("tenant");
    const tenant = storedTenant ? JSON.parse(storedTenant) : null;
    if (tenant && tenant.primary_color) {
      setPrimaryColor(tenant.primary_color);
    }
  }, []);

  const {
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm<Category>({ defaultValues: { name: "", subcategory_id: "" } });

  const handleSubCategoryChange = (subCategoryId: string) => {
    setValue("subcategory_id", subCategoryId);
  };

  const { newCategoryMessage, IsError, isLoading } = useSelector(
    (state: any) => state.Categories
  );

  const dispatch = useDispatch();

  const handleConfirmAddCategory = (data: Category) => {
    dispatch(resetCategoryMessage());
    const newCategory: Category = {
      name: data.name,
      sub_category: data.subcategory_id,
    };
    dispatch(createCategory(newCategory));
    onAddCategory(data);
    handleClose();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const fetchSubCategories = async () => {
    const response = await axiosInstance.get(
      process.env.VITE_BASE_URL + "/categories/sub-categories"
    );
    return response.data;
  };

  const { data: subcategories } = useQuery(["subcategories"], () =>
    fetchSubCategories()
  );

  return (
    <Dialog open={open} maxWidth="md" onClose={handleClose}>
      <DialogTitle
        style={{
          backgroundColor: primaryColor,
          color: "white",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
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
          <CategoryIcon />
          Add New Category
        </div>
        <IconButton onClick={handleClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {IsError && (
        <Alert
          severity="error"
          onClose={() => dispatch(resetCategoryMessage())}
        >
          <AlertTitle>Error</AlertTitle>
          <strong>{newCategoryMessage}</strong>
        </Alert>
      )}

      <form onSubmit={handleSubmit(handleConfirmAddCategory)}>
        <DialogContent>
          <DialogContentText style={{ padding: 4 }}>
            Fill in the details for the new category
          </DialogContentText>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Controller
                name="name"
                control={control}
                rules={{ required: "Name is required" }}
                render={({ field }) => (
                  <TextField
                    label="Name"
                    variant="outlined"
                    {...field}
                    fullWidth
                    margin="dense"
                    error={!!errors.name}
                    helperText={errors.name?.message}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <CategoryIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />

              <FormControl fullWidth margin="dense" variant="outlined">
                <InputLabel id="subcategory-label">Subcategory</InputLabel>
                <Controller
                  name="subcategory_id"
                  control={control}
                  rules={{ required: "Subcategory is required" }}
                  render={({ field }) => (
                    <Select
                      labelId="subcategory-label"
                      label="Subcategory"
                      {...field}
                      onChange={(e) => handleSubCategoryChange(e.target.value)}
                    >
                      {subcategories?.map((subcategory: any) => (
                        <MenuItem key={subcategory._id} value={subcategory._id}>
                          {subcategory.name}
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                />
                {errors.subcategory_id && (
                  <FormHelperText error>
                    {errors.subcategory_id.message}
                  </FormHelperText>
                )}
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button
            type="submit"
            variant="outlined"
            sx={{
              pl: 2,
              color: primaryColor,
              borderColor: primaryColor,
              "&:hover": {
                borderColor: "#bc8c7c",
                color: "#bc8c7c",
              },
            }}
            fullWidth
            disabled={isSubmitting || isLoading}
          >
            {isLoading ? "Adding Category..." : "Add Category"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AddCategoryDialog;