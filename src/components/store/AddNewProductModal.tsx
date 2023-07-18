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
  const [description, setDescription] = React.useState("");
  const [image, setImage] = React.useState<File | null>(null);
  const [quantity, setQuantity] = React.useState(0);
  const [minViableQuantity, setMinViableQuantity] = React.useState(0);
  const [category, setCategory] = React.useState("");

  const handleSave = () => {
    onSave(
      name,
      price,
      description,
      image,
      quantity,
      minViableQuantity,
      category
    );
    setName("");
    setPrice(0);
    setDescription("");
    setImage(null);
    setQuantity(0);
    setMinViableQuantity(0);
    setCategory("");
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
              backgroundColor: "#bc8c7c",
              padding: "8px",
              marginBottom: "16px",
              borderRadius: "4px",
              textAlign: "center"
            }}
          >
            <Typography variant="h6" component="h2" color="white">
              Add a new Dish
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
                  <MenuItem value="category1">Category 1</MenuItem>
                  <MenuItem value="category2">Category 2</MenuItem>
                  <MenuItem value="category3">Category 3</MenuItem>
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
                value={minViableQuantity}
                onChange={(e) => setMinViableQuantity(parseInt(e.target.value))}
                fullWidth
                margin="normal"
              />
              <TextareaAutosize
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                minRows={3}
                maxRows={10}
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
