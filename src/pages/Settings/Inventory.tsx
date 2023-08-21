import React, { useEffect, useState } from "react";
import {
  Table,
  TableContainer,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  IconButton,
  Button,
  TextField,
  TableSortLabel,
  Checkbox,
  TablePagination,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import CheckIcon from "@mui/icons-material/Check";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import InventoryModal from "../../components/MODALS/InventoryModal";
import { useDispatch, useSelector } from "react-redux";
import InfoIcon from "@mui/icons-material/Info";
import {
    createProductInventory,
  deleteProductInventory,
  fetchAllProductInventories,
  updateProductInventory,
} from "../../features/Inventory/product/productInventoryActions";
import AcceptDeliveryDialog from "../../components/MODALS/Dialogs/AcceptDeliveryDialog";
import ViewProductDialog from "../../components/MODALS/Dialogs/ViewProductDialog";

interface Product {
  name: string;
  quantity: number;

}

const Inventory: React.FC = () => {
  const { data } = useSelector((state: any) => state.productInventory);

  //   const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [selected, setSelected] = useState<number[]>([]);
  const [searchValue, setSearchValue] = useState<string>("");
  const [orderBy, setOrderBy] = useState<keyof Product>("code");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] =
    useState<boolean>(false);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [acceptDeliveryOpen, setAcceptDeliveryOpen] = useState<boolean>(false);
  const [acceptingIndex, setAcceptingIndex] = useState<number | null>(null);
  const [receivedQuantity, setReceivedQuantity] = useState<number>(0);
  const [editedProduct, setEditedProduct] = useState<Product | null>(null);
  const [addProductOpen, setAddProductOpen] = useState<boolean>(false);
  const [originalEditedProduct, setOriginalEditedProduct] =
    useState<Product | null>(null);
  const [viewProductDialogOpen, setViewProductDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const dispatch = useDispatch();

 

  const handleViewProductOpen = (product: Product) => {
    setSelectedProduct(product);
    setViewProductDialogOpen(true);
  };

  const handleViewProductClose = () => {
    setSelectedProduct(null);
    setViewProductDialogOpen(false);
  };

  const handleAddNewProduct = (newProduct: Product) => {
    // console.log(newProduct);
    
    dispatch(createProductInventory(newProduct))
  };

  const handleEdit = (_id: number) => {
    const productToEdit = sortedProducts.find(
      (product: { _id: number }) => product._id === _id
    );
    const clonedProduct = { ...productToEdit };

    setEditedProduct(clonedProduct);
    setOriginalEditedProduct(clonedProduct);
    setEditingProductId(_id);
  };

  const handleEditCancel = () => {
    setEditingProductId(null);
  };

  const handleEditConfirm = (_id: number) => {
    dispatch(updateProductInventory(editedProduct));

    setEditingProductId(null);
    setOriginalEditedProduct(null);
  };

  const handleAcceptDeliveryOpen = (index: number) => {
    setAcceptingIndex(index);
    setAcceptDeliveryOpen(true);
  };

  const handleAcceptDeliveryCancel = () => {
    setAcceptDeliveryOpen(false);
    setAcceptingIndex(null);
    setReceivedQuantity(0);
  };

  const handleAcceptDeliveryConfirm = () => {
    // Implement logic to update the quantity after accepting delivery
    // You can prompt the user to input the received quantity
    const updatedProducts = data?.map(
      (product: { quantity: number }, i: number | null) => {
        if (i === acceptingIndex) {
          return {
            ...product,
            quantity: product.quantity + receivedQuantity,
          };
        }
        return product;
      }
    );

    // setProducts(updatedProducts);
    setAcceptDeliveryOpen(false);
    setAcceptingIndex(null);
    setReceivedQuantity(0);
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmationOpen(false);
    setDeletingIndex(null);
  };

  const handleDeleteConfirm = () => {
 
    dispatch(deleteProductInventory(deletingIndex))
    setDeleteConfirmationOpen(false);
    setDeletingIndex(null);
  };

  const handleCheckboxToggle = (_id: number) => {
    const selectedIndex = selected.indexOf(_id);
    let newSelected: number[] = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, _id);
    } else {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1)
      );
    }

    setSelected(newSelected);
  };

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelecteds = sortedProducts.map((product: any) => product._id);
      setSelected(newSelecteds);
    } else {
      setSelected([]);
    }
  };

  const handleDelete = (_id: number) => {
    setDeletingIndex(_id);
    setDeleteConfirmationOpen(true);
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSortRequest = (property: keyof Product) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const isSelected = (_id: number) => selected.indexOf(_id) !== -1;

  const filteredProducts = data
  ? [...data].filter((product: any) => {
      if (product && product.name && product.category_id) {
        const searchString = searchValue.toLowerCase();
        const includesSearch = (property: string) =>
          property.toLowerCase().includes(searchString);
        
        return (
          includesSearch(product.name) ||
          includesSearch(product.category_id.name) ||
          includesSearch(product.code.toString()) 
        );
      }
      return false;
    })
  : [];

  const sortedProducts = filteredProducts
    .slice()
    .sort((a: { [x: string]: number }, b: { [x: string]: number }) => {
      if (order === "asc") {
        return a[orderBy] > b[orderBy] ? 1 : -1;
      } else {
        return a[orderBy] < b[orderBy] ? 1 : -1;
      }
    });

  const emptyRows =
    rowsPerPage -
    Math.min(rowsPerPage, sortedProducts.length - page * rowsPerPage);

  return (
    <div style={{ padding: 20 }}>
      <Typography variant="h5" fontWeight={500}>
        Product Inventory
      </Typography>
      <div style={{ display: "flex", marginTop: 10, columnGap: 10 }}>
        <Button
          variant="contained"
          style={{ backgroundColor: "#6c1c2c" }}
          startIcon={<AddIcon />}
          onClick={() => setAddProductOpen(true)}
        >
          Add New Inventory
        </Button>

        <TextField
          label="Search"
          variant="outlined"
          value={searchValue}
          InputProps={{ endAdornment: <SearchIcon /> }}
          onChange={(e) => setSearchValue(e.target.value)}
        />
      </div>

      <InventoryModal
        open={addProductOpen}
        onClose={() => setAddProductOpen(false)}
        onAddProduct={handleAddNewProduct}
      />

      <TableContainer
        component={Paper}
        style={{ width: "100%", marginTop: "1rem", overflowX: "auto" }}
      >
        <Table style={{ minWidth: 650 }}>
          <TableHead>
            <TableRow style={{ backgroundColor: "#6c1c2c" }}>
              <TableCell>
                <Checkbox
                  indeterminate={
                    selected.length > 0 && selected.length < data?.length
                  }
                  checked={selected.length === data?.length}
                  onChange={handleSelectAllClick}
                />
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === "code"}
                  direction={orderBy === "code" ? order : "asc"}
                  onClick={() => handleSortRequest("code")}
                  style={{ color: "white" }}
                >
                  Code
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === "product"}
                  direction={orderBy === "product" ? order : "asc"}
                  onClick={() => handleSortRequest("product")}
                  style={{ color: "white" }}
                >
                  Product
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === "quantity"}
                  direction={orderBy === "quantity" ? order : "asc"}
                  onClick={() => handleSortRequest("quantity")}
                  style={{ color: "white" }}
                >
                  Quantity
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === "cost"}
                  direction={orderBy === "cost" ? order : "asc"}
                  onClick={() => handleSortRequest("cost")}
                  style={{ color: "white" }}
                >
                  Purchase Cost
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === "category"}
                  direction={orderBy === "category" ? order : "asc"}
                  onClick={() => handleSortRequest("category")}
                  style={{ color: "white" }}
                >
                  Category
                </TableSortLabel>
              </TableCell>
              <TableCell style={{ color: "white" }}>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedProducts
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((product: { _id: React.Key | null | undefined; code: string | number | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | null | undefined; name: string | number | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | null | undefined; quantity: string | number | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | null | undefined; price: string | number | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | null | undefined; category_id: { name: string | number | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | null | undefined; }; }) => {
                const isItemSelected = isSelected(product._id);
                const labelId = `enhanced-table-checkbox-${product._id}`;
                const isEditingThisRow = editingProductId === product._id;
                return (
                  <TableRow
                    hover
                    key={product._id}
                    role="checkbox"
                    tabIndex={-1}
                    selected={isItemSelected}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={isItemSelected}
                        onClick={() => handleCheckboxToggle(product._id)}
                        inputProps={{ "aria-labelledby": labelId }}
                      />
                    </TableCell>
                    <TableCell>{product.code}</TableCell>
                    <TableCell>
                      {isEditingThisRow ? (
                        <TextField
                          value={editedProduct?.name || ""}
                          onChange={(e) =>
                            setEditedProduct({
                              ...editedProduct,
                              name: e.target.value,
                            })
                          }
                        />
                      ) : (
                        product.name
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditingThisRow ? (
                        <TextField
                          value={editedProduct?.quantity || ""}
                          onChange={(e) =>
                            setEditedProduct({
                              ...editedProduct,
                              quantity: e.target.value,
                            })
                          }
                        />
                      ) : (
                        product.quantity
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditingThisRow ? (
                        <TextField
                          value={editedProduct?.price || ""}
                          onChange={(e) =>
                            setEditedProduct({
                              ...editedProduct,
                              price: e.target.value,
                            })
                          }
                        />
                      ) : (
                        product.price?.toLocaleString()
                      )}
                    </TableCell>
                    <TableCell>{product.category_id.name}</TableCell>
                    <TableCell>
                      {editingProductId === product._id ? (
                        <>
                          <IconButton
                            onClick={() => handleEditConfirm(product._id)}
                          >
                            <CheckIcon />
                          </IconButton>
                          <IconButton onClick={handleEditCancel}>
                            <CloseIcon />
                          </IconButton>
                        </>
                      ) : (
                        <>
                          <IconButton
                            onClick={() =>
                              handleAcceptDeliveryOpen(product._id)
                            }
                          >
                            <AddIcon />
                          </IconButton>
                          <IconButton onClick={() => handleEdit(product._id)}>
                            <EditIcon />
                          </IconButton>
                          <IconButton onClick={() => handleDelete(product._id)}>
                            <DeleteIcon />
                          </IconButton>
                          <IconButton
                            onClick={() => handleViewProductOpen(product)}
                          >
                            <InfoIcon />
                          </IconButton>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            {emptyRows > 0 && (
              <TableRow style={{ height: 53 * emptyRows }}>
                <TableCell colSpan={7} />
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={sortedProducts.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>
      
      {/*make this a separate component #DeleteInventoryDialog  */}
      <Dialog open={deleteConfirmationOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this product?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="primary" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

       <AcceptDeliveryDialog
        open={acceptDeliveryOpen}
        onClose={handleAcceptDeliveryCancel}
        onConfirm={handleAcceptDeliveryConfirm}
      />

      <ViewProductDialog
        open={viewProductDialogOpen}
        onClose={handleViewProductClose}
        product={selectedProduct}
      />
    </div>
  );
};

export default Inventory;
