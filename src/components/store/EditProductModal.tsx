import * as React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Modal from "@mui/material/Modal";
import TextField from "@mui/material/TextField";
import Grid from "@mui/material/Grid";
import {
  Button,
  TextareaAutosize,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
} from "@mui/material";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";

interface EditProductModalProps {
  productData: any;
  open: boolean;
  onClose: () => void;
  onSave: (
    name: string,
    price: number,
    description: string,
    image: File | null,
    quantity: number,
    minViableQuantity: number,
    category: string
  ) => void;
}

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 900,
  bgcolor: "background.paper",
  boxShadow: 24,
  borderRadius: 2,
  p: 4,
};

const EditProductModal: React.FC<EditProductModalProps> = ({
  open,
  productData,
  onClose,
}) => {
  const [name, setName] = React.useState(productData.name || "");
  const [price, setPrice] = React.useState(productData.price || 0);
  const [desc, setDescription] = React.useState(
    productData.desc|| ""
  );
  const [image, setImage] = React.useState<File | null>(null);
  const [quantity, setQuantity] = React.useState(
    productData.quantity || 0
  );
  const [min_viable_quantity, setMinViableQuantity] = React.useState(
    productData.min_viable_quantity || 0
  );
  const [category, setCategory] = React.useState(
    productData.category._id || ""
  );

  const fetchCategories = async () => {
    const response = await axios.get("http://localhost:3000/categories");
    return response.data
  };

  console.log(productData);
  
  const { data: categories } = useQuery(["categories"], () =>
    fetchCategories()
  );

  const handleUpdate = async () => {
    const newProductData = {
      name,
      price,
      desc,
      quantity,
      min_viable_quantity: min_viable_quantity,
      category,
      image: image || null,
    };

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const accessToken = user.Token;
    try {
      await axios.put(
        `http://localhost:3000/product/products/${productData._id}`,
        newProductData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      // const newProduct = response.data;

      // console.log("New product created:", newProduct);

      setName("");
      setPrice(0);
      setDescription("");
      setImage(null);
      setQuantity(0);
      setMinViableQuantity(0);
      setCategory("");
      onClose();
    } catch (error) {
      console.error("Error creating product:", error);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImage(e.target.files[0]);
    } else {
      setImage(null);
    }
  };

  return (
    <div>
      <Modal
        keepMounted
        open={open}
        onClose={onClose}
        aria-labelledby="add new product"
        aria-describedby="New product add to store"
      >
        <Box sx={style}>
          <div
            style={{
              backgroundColor: "#6c1c2c",
              padding: "8px",
              marginBottom: "16px",
              borderRadius: "4px",
              textAlign: "center",
            }}
          >
            <Typography variant="h6" component="h2" color="white">
              Update Dish
            </Typography>
          </div>
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
              <div
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
              </div>
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
                minRows={3}
                maxRows={3}
                style={{ width: "100%", marginTop: 10 }}
              />
            </Grid>
          </Grid>
          <Button
            onClick={handleUpdate}
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
            update
          </Button>
        </Box>
      </Modal>
    </div>
  );
};

export default EditProductModal;
