import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Button,
  TableSortLabel,
  TablePagination,
  IconButton,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CategoryIcon from "@mui/icons-material/Category";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ActionsIcon from "@mui/icons-material/MoreVert";
import { useSelector, useDispatch } from "react-redux";
import {
  deleteCategory,
  fetchCategories,
} from "../../features/Category/CategoryActions";
import AddCategoryDialog from "../../components/MODALS/Dialogs/AddCategoryDialog";

const CategorySettings = () => {
  const dispatch = useDispatch();
  const { categories } = useSelector((state: any) => state.Categories);
  const [filter, setFilter] = useState("");
  const [orderBy, setOrderBy] = useState("name");
  const [order, setOrder] = useState("asc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [addCategoryDialogOpen, setAddCategoryDialogOpen] = useState(false);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState(null);

  const handleSort = (property: React.SetStateAction<string>) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const handleChangePage = (_: any, newPage: React.SetStateAction<number>) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: { target: { value: string } }) => {
    setRowsPerPage(parseInt(event.target.value, 5));
    setPage(0);
  };

  const handleDeleteClick = (category: React.SetStateAction<null>) => {
    setDeleteCandidate(category);
    setDeleteConfirmationOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (deleteCandidate) {
      dispatch(deleteCategory(deleteCandidate._id));
      setDeleteConfirmationOpen(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmationOpen(false);
  };

  const handleOpenAddCategoryDialog = () => {
    setAddCategoryDialogOpen(true);
  };

  const handleAddCategory = (newCategory: any) => {
    // You can update your state or perform any necessary actions here
    // For example, you can add the newCategory to your existing categories
    // and update the table accordingly.
  };

  // Filter categories based on user input
  const filteredCategories = categories
    ? categories.filter((category: { name: string }) =>
        category.name.toLowerCase().includes(filter.toLowerCase())
      )
    : [];

  // Sort filtered categories
  const sortedCategories = filteredCategories.slice().sort((a, b) => {
    const compareValueA = a[orderBy];
    const compareValueB = b[orderBy];

    if (orderBy === "product_count") {
      return order === "asc"
        ? compareValueA - compareValueB
        : compareValueB - compareValueA;
    } else {
      const comparison = compareValueA.localeCompare(compareValueB);
      return order === "asc" ? comparison : -comparison;
    }
  });

  const dispatchFetchAllCategories = () => {
    dispatch(fetchCategories());
  };

  useEffect(() => {
    dispatchFetchAllCategories();
  }, []);

  return (
    <Paper>
      <Typography mt={2} variant="h6" ml={2} gutterBottom>
        List of all categories
      </Typography>
      <Box
        display="flex"
        columnGap={2}
        alignItems="center"
        mb={2}
        mt={2}
        sx={{ paddingLeft: 2 }}
      >
        <Button
          startIcon={<AddIcon />}
          variant="contained"
          style={{ padding: 14, backgroundColor: "#6c1c2c" }}
          onClick={handleOpenAddCategoryDialog}
        >
          Add New Category
        </Button>
        <TextField
          label="Search Category"
          value={filter}
          InputProps={{ endAdornment: <SearchIcon /> }}
          onChange={(e) => setFilter(e.target.value)}
        />
      </Box>
      <TableContainer
        style={{
          width: "100%",
          marginTop: "1rem",
          overflowX: "auto",
          paddingLeft: 20,
          paddingRight: 20,
        }}
      >
        <Table>
          <TableHead>
            <TableRow style={{ backgroundColor: "#6c1c2c" }}>
              <TableCell style={{ color: "white" }}>
                <TableSortLabel
                  style={{ color: "white" }}
                  active={orderBy === "name"}
                  direction={orderBy === "name" ? order : "asc"}
                  onClick={() => handleSort("name")}
                >
                  <Box display="flex" alignItems="center">
                    <CategoryIcon style={{ marginRight: "4px" }} />
                    Category Name
                    {orderBy === "name" && (
                      <ArrowDropDownIcon
                        style={{
                          transform:
                            order === "asc" ? "rotate(0deg)" : "rotate(180deg)",
                        }}
                      />
                    )}
                  </Box>
                </TableSortLabel>
              </TableCell>
              <TableCell style={{ color: "white" }}>
                <TableSortLabel
                  style={{ color: "white" }}
                  active={orderBy === "product_count"} // Set the active state for sorting
                  direction={orderBy === "product_count" ? order : "asc"}
                  onClick={() => handleSort("product_count")} // Handle sorting for product_count
                >
                  <Box display="flex" alignItems="center">
                    SubCategory
                    {orderBy === "product_count" && (
                      <ArrowDropDownIcon
                        style={{
                          transform:
                            order === "asc" ? "rotate(0deg)" : "rotate(180deg)",
                        }}
                      />
                    )}
                  </Box>
                </TableSortLabel>
              </TableCell>
              <TableCell style={{ color: "white" }}>
                <Box display="flex" alignItems="center">
                  <ActionsIcon style={{ marginRight: "4px" }} />
                  Actions
                </Box>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedCategories
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map(
                (category: {
                  sub_category: any;
                  _id: React.Key | null | undefined;
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
                  product_count:
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
                  <TableRow key={category._id}>
                    <TableCell
                      style={{
                        display: "flex",
                        alignItems: "center",
                        columnGap: 5,
                      }}
                    >
                      <IconButton>
                        <CategoryIcon />
                      </IconButton>
                      {category.name}
                    </TableCell>
                    <TableCell>{category?.sub_category?.name}</TableCell>
                    <TableCell>
                      <IconButton color="primary">
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        color="error"
                        onClick={() => handleDeleteClick(category)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                )
              )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={filteredCategories.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmationOpen}
        onClose={handleDeleteCancel}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete :{" "}
          <i>{deleteCandidate ? deleteCandidate.name : ""} </i>the category
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Category Dialog */}
      <AddCategoryDialog
        open={addCategoryDialogOpen}
        onClose={() => setAddCategoryDialogOpen(false)}
        onAddCategory={handleAddCategory}
      />
    </Paper>
  );
};

export default CategorySettings;
