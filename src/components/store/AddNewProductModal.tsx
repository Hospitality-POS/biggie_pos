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
  IconButton,
  Input,
  InputAdornment,
} from "@mui/material";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { CloseRounded } from "@mui/icons-material";

interface Category {
  _id: string;
  name: string;
}
interface AddNewProductModalProps {
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

const AddNewProductModal: React.FC<AddNewProductModalProps> = ({
  open,
  onClose,
  onSave,
}) => {
  const [name, setName] = React.useState("");
  const [price, setPrice] = React.useState(0);
  const [desc, setDescription] = React.useState("");
  const [image, setImage] = React.useState<File | null>(null);
  const [quantity, setQuantity] = React.useState(0);
  const [min_viable_quantity, setMinViableQuantity] = React.useState(0);
  const [category, setCategory] = React.useState<string>("");

  const fetchCategories = async () => {
    const response = await axios.get<Category[]>(
      "http://localhost:3000/categories"
    );
    return response.data;
  };

  const { data: categories } = useQuery<Category[]>(["categories"], () =>
    fetchCategories()
  );

  const handleSave = async () => {
    const productData = {
      name,
      price,
      description: desc,
      quantity,
      min_viable_quantity: min_viable_quantity,
      category,
      image: image || null,
    };

    const formData = new FormData();
    formData.append("image", image);
    for (const key in productData) {
      formData.append(key, productData[key]);
    }

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const accessToken = user.Token;
    try {
      const response = await axios.post(
        "http://localhost:3000/product/products",
        productData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const newProduct = response.data;

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
    const file = e.target.files && e.target.files[0];
    setImage(file || null);
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
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
            // encType="multipart/form-data"
          >
            <Typography variant="h6" component="h2" color="white">
              Add a new Dish
            </Typography>
            <IconButton onClick={() => onClose()}>
              <CloseRounded fontSize="large" color="inherit" />
            </IconButton>
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
                minRows={3}
                maxRows={3}
                style={{ width: "100%", marginTop: 10 }}
              />
            </Grid>
          </Grid>
          <Button
            onClick={handleSave}
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
        </Box>
      </Modal>
    </div>
  );
};

export default AddNewProductModal;
