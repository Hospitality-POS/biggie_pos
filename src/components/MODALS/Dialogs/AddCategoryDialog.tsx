import React, { useState } from "react";
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
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import CloseIcon from "@mui/icons-material/Close";
import CategoryIcon from "@mui/icons-material/Category";
import { useDispatch, useSelector } from "react-redux";
import { resetCategoryMessage } from "../../../features/Category/CategorySlice";
import { createCategory } from "../../../features/Category/CategoryActions";


interface Category {
  name: string;
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
  const {
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<Category>();
  const [newCategory, setNewCategory] = useState<Category>({
    name: "",
  });

  const { newCategoryMessage, IsError, isLoading } = useSelector(
    (state: any) => state.Categories
  );

  const dispatch = useDispatch();

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setNewCategory((prevCategory) => ({
      ...prevCategory,
      [name]: value,
    }));
  };

  const handleConfirmAddCategory = (data: Category) => {
    dispatch(resetCategoryMessage());
    dispatch(createCategory(data));
    onAddCategory(data);
    handleClose();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={open} maxWidth="md" onClose={handleClose}>
      <DialogTitle
        style={{
          backgroundColor: "#6c1c2c",
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
        <Alert severity="error" onClose={() => dispatch(resetCategoryMessage())}>
          <AlertTitle>Error</AlertTitle>
          <strong>{newCategoryMessage}</strong>
        </Alert>
      )}
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
              defaultValue={newCategory.name}
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
          </Grid>
        </Grid>
      </DialogContent>
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
          onClick={handleSubmit(handleConfirmAddCategory)}
          disabled={isLoading}
        >
          {isLoading ? "Adding Category..." : "Add Category"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddCategoryDialog;