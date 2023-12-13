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
  Avatar as Avata,
  Alert,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import TableIcon from "@mui/icons-material/TableChart";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import LocationOnIcon from "@mui/icons-material/LocationOn"; // Icon for Located At
import ActionsIcon from "@mui/icons-material/MoreVert";
import {
  createLocation,
  deleteTable,
  fetchTables,
} from "../../features/Table/TableActions";
import AddTableDialog from "../../components/MODALS/Dialogs/AddTableDialog";
import AddNewTableLocationDialog from "../../components/MODALS/Dialogs/AddNewTableLocation";
import { useAppDispatch, useAppSelector } from "../../store";
import { resetTableMessage } from "../../features/Table/TableSlice";
import Spinner from "../../components/spinner/Spinner";
import ScrollableTabsLocations from "./tablelocation/Locations";
import useTableSettings from "./hooks/useTableSettings";

const TableSettings = () => {
  const {state,dispatch:hookDispatch}=useTableSettings()
  const dispatch = useAppDispatch();
  const { tables, newTableMessage, loading, newTableMessageSucess } = useAppSelector((state) => state.Tables);
  // const [filter, setFilter] = useState("");
  // const [orderBy, setOrderBy] = useState("name");
  // const [order, setOrder] = useState("asc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [addTableDialogOpen, setAddTableDialogOpen] = useState(false);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [addLocationDialogOpen, setAddLocationDialogOpen] = useState(false);

  const handleOpenAddLocationDialog = () => {
    setAddLocationDialogOpen(true);
  };

  const handleAddLocation = (newLocation: string) => {
    dispatch(createLocation(newLocation));
    // console.log("New Location:", newLocation);
    // You can update your state or perform any other actions here
  };

  const handleSort = (property) => {
    const isAsc = state.orderBy === property && state.order === "asc";
    // setOrder(isAsc ? "desc" : "asc");
    hookDispatch({action:"SET_ORDER",payload: isAsc ? "desc" : "asc"})
    hookDispatch({action: "SET_ORDERBY",payload:property})
    // setOrderBy(property);
  };

  const handleChangePage = (_, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 5));
    setPage(0);
  };

  const handleDeleteClick = (table) => {
    setDeleteCandidate(table);
    setDeleteConfirmationOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (deleteCandidate) {
      dispatch(deleteTable(deleteCandidate._id));
      setDeleteConfirmationOpen(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmationOpen(false);
  };

  const handleOpenAddTableDialog = () => {
    setAddTableDialogOpen(true);
  };

  const handleAddTable = (newTable) => {
    // You can update your state or perform any necessary actions here
    // For example, you can add the newTable to your existing tables
    // and update the table accordingly.
  };


  // Filter tables based on user input
  const filteredTables = tables
    ? tables.filter(
        (table) =>
          table.name?.toLowerCase().includes(state.filter.toLowerCase()) ||
          table.locatedAt?.toLowerCase().includes(state.filter.toLowerCase()) // Change to locatedAt
      )
    : [];

  // Sort filtered tables
  const sortedTables = filteredTables.slice().sort((a, b) => {
    const compareValueA = a[state.orderBy] || ""; // Handle null values
    const compareValueB = b[state.orderBy] || "";
    const comparison = compareValueA.localeCompare(compareValueB);

    return state.order === "asc" ? comparison : -comparison;
  });

  useEffect(()=>{
    const fetchtables = ()=>{
      dispatch(fetchTables())
    }
    fetchtables();
  },[])

  if(loading){
    return <Spinner/>
  }

  return (
    <Paper>
      {newTableMessage && (
        <Alert variant="filled" severity="error"  onClose={() => dispatch(resetTableMessage())}>
          {newTableMessage}— check it out!
        </Alert>
      )}
      {newTableMessageSucess && (
        <Alert variant="filled" severity="success"  onClose={() => dispatch(resetTableMessage())}>
          {newTableMessageSucess}— check it out!
        </Alert>
      )}
      <Typography mt={2} variant="h6" ml={2} gutterBottom>
        List of all the tables
      </Typography>
      <Box
        display="flex"
        columnGap={2}
        alignItems="center"
        mb={2}
        mt={2}
        sx={{
          paddingLeft: 2,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <div style={{ width: "100%", display: "flex", columnGap: "20px" }}>
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            style={{ padding: 14, backgroundColor: "#6c1c2c" }}
            onClick={handleOpenAddTableDialog}
          >
            Add New Table
          </Button>

          <Button
            startIcon={<AddIcon />}
            variant="contained"
            style={{ padding: 14, backgroundColor: "#6c1c2c" }}
            onClick={handleOpenAddLocationDialog}
          >
            Add New Location
          </Button>
        </div>
        <div style={{ paddingRight: 20 }}>
          <TextField
            label="Search Table"
            value={state.filter}
            InputProps={{ endAdornment: <SearchIcon /> }}
            onChange={(e) => hookDispatch({action:"SET_FILTER",payload:e.target.value})}
          />
        </div>
      </Box>
      <ScrollableTabsLocations/>
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
                  active={state.orderBy === "name"}
                  direction={state.orderBy === "name" ? state.order : "asc"}
                  onClick={() => handleSort("name")}
                >
                  <Box display="flex" alignItems="center">
                    <TableIcon style={{ marginRight: "4px" }} />{" "}
                    {/* Change to table icon */}
                    Table Name
                    {state.orderBy === "name" && (
                      <ArrowDropDownIcon
                        style={{
                          transform:
                            state.order === "asc" ? "rotate(0deg)" : "rotate(180deg)",
                        }}
                      />
                    )}
                  </Box>
                </TableSortLabel>
              </TableCell>
              <TableCell style={{ color: "white" }}>
                <TableSortLabel
                  style={{ color: "white" }}
                  active={state.orderBy === "locatedAt"} // Change to locatedAt
                  direction={state.orderBy === "locatedAt" ? state.order : "asc"} // Change to locatedAt
                  onClick={() => handleSort("locatedAt")} // Change to locatedAt
                >
                  <Box display="flex" alignItems="center">
                    <LocationOnIcon style={{ marginRight: "4px" }} />{" "}
                    {/* Icon for Located At */}
                    Located At
                    {state.orderBy === "locatedAt" && (
                      <ArrowDropDownIcon
                        style={{
                          transform:
                            state.order === "asc" ? "rotate(0deg)" : "rotate(180deg)",
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
            {sortedTables
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((table) => (
                <TableRow key={table._id}>
                  <TableCell
                    style={{
                      display: "flex",
                      alignItems: "center",
                      columnGap: 5,
                    }}
                  >
                    <Avata alt={table.name} src={table.name} />
                    {table.name}
                  </TableCell>
                  <TableCell>{table.locatedAt}</TableCell>{" "}
                  {/* Change to locatedAt */}
                  <TableCell>
                    <IconButton
                      color="primary"
                      onClick={() => handleEditClick(table)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleDeleteClick(table)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={filteredTables.length}
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
          <i>{deleteCandidate ? deleteCandidate.name : ""} </i>the table
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

      {/* Add Table Dialog */}
      <AddTableDialog
        open={addTableDialogOpen}
        onClose={() => setAddTableDialogOpen(false)}
        onAddTable={handleAddTable}
      />
      <AddNewTableLocationDialog
        open={addLocationDialogOpen}
        onClose={() => setAddLocationDialogOpen(false)}
        onAddLocation={handleAddLocation}
      />
    </Paper>
  );
};

export default TableSettings;
