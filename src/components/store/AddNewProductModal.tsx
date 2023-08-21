import React, { useState } from "react";
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
  Input,
  InputAdornment,
  Typography,
  Grid,
} from "@mui/material";
import { CloseRounded } from "@mui/icons-material";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { createProduct } from "../../features/Product/ProductAction";

interface Category {
  _id: string;
  name: string;
}

interface AddNewProductModalProps {
  open: boolean;
  onClose: () => void;
}

const AddNewProductModal: React.FC<AddNewProductModalProps> = ({
  open,
  onClose,
}) => {
  const [name, setName] = useState("");
  const [price, setPrice] = useState(0);
  const [desc, setDescription] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [quantity, setQuantity] = useState(0);
  const [min_viable_quantity, setMinViableQuantity] = useState(0);
  const [category, setCategory] = useState<string>("");

  const fetchCategories = async () => {
    const response = await axios.get<Category[]>(
      "http://localhost:3000/categories"
    );
    return response.data;
  };

  const { data: categories } = useQuery<Category[]>(["categories"], () =>
    fetchCategories()
  );

  const dispatch = useDispatch();

  const handleSave = async () => {
    const productData = {
      name,
      price,
      description: desc,
      quantity,
      min_viable_quantity,
      category,
      image: image || null,
    };

    const formData = new FormData();
    formData.append("image", image);
    for (const key in productData) {
      formData.append(key, productData[key]);
    }

    dispatch(createProduct(productData));

    setName("");
    setPrice(0);
    setDescription("");
    setImage(null);
    setQuantity(0);
    setMinViableQuantity(0);
    setCategory("");
    onClose();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    setImage(file || null);
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
        Add a New Dish{" "}
        <IconButton onClick={onClose}>
          <CloseRounded fontSize="inherit" color="inherit" />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <TextField
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              margin="normal"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel id="category">Category</InputLabel>
              <Select
                value={category}
                onChange={(e) => setCategory(e.target.value as string)}
                label="Category"
              >
                <MenuItem value="">Select category</MenuItem>
                {categories &&
                  categories.map(
                    (category: {
                      _id: React.Key | readonly string[] | null | undefined;
                      name:
                        | string
                        | number
                        | boolean
                        | React.ReactElement<
                            any,
                            string | React.JSXElementConstructor<any>
                          >
                        | Iterable<React.ReactNode>
                        | React.ReactPortal
                        | null
                        | undefined;
                    }) => (
                      <MenuItem key={category._id} value={category._id}>
                        {category.name}
                      </MenuItem>
                    )
                  )}
              </Select>
            </FormControl>
            <TextField
              label="Price"
              type="number"
              value={price}
              onChange={(e) => setPrice(parseFloat(e.target.value))}
              fullWidth
              margin="normal"
            />
            {/* <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  marginBottom: 20,
                }}
              >
                <label htmlFor="image">Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </div> */}
            <FormControl fullWidth margin="normal">
              {/* <InputLabel htmlFor="image">Image</InputLabel> */}
              <Input
                type="file"
                id="image"
                accept="image/*"
                onChange={handleImageChange}
                endAdornment={
                  <InputAdornment position="end">
                    <label htmlFor="image">
                      <IconButton component="span">
                        <CloseRounded fontSize="small" />
                      </IconButton>
                    </label>
                  </InputAdornment>
                }
              />
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value))}
              fullWidth
              margin="normal"
            />
            <TextField
              label="Min Viable Quantity"
              type="number"
              value={min_viable_quantity}
              onChange={(e) => setMinViableQuantity(parseInt(e.target.value))}
              fullWidth
              margin="normal"
            />
            <TextareaAutosize
              placeholder="Description"
              value={desc}
              onChange={(e) => setDescription(e.target.value)}
              minRows={3.5}
              maxRows={3.5}
              style={{ width: "100%", marginTop: 15 }}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        {/* <Button onClick={onClose} color="primary">
          Cancel
        </Button> */}
        <Button
          variant="outlined"
          onClick={handleSave}
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
    </Dialog>
  );
};

export default AddNewProductModal;
