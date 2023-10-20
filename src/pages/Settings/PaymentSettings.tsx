import React, { useEffect, useState } from "react";
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
import PaymentIcon from "@mui/icons-material/Payment";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ActionsIcon from "@mui/icons-material/MoreVert";
import { useSelector, useDispatch } from "react-redux";
import {
  deletePaymentMethod,
  fetchPaymentsMethod,
} from "../../features/Payment/PaymentMethodActions";
import AddPaymentSettingDialog from "../../components/MODALS/Dialogs/AddPaymentMethodDialog";
import { useAppDispatch, useAppSelector } from "../../store";

const Payments = () => {
  const dispatch = useAppDispatch();
  const { payments: paymentMethods } = useAppSelector(
    (state) => state.PaymentMethods
  );
  const [filter, setFilter] = useState("");
  const [orderBy, setOrderBy] = useState("name");
  const [order, setOrder] = useState("asc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [addPaymentSettingDialogOpen, setAddPaymentSettingDialogOpen] =
    useState(false);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<any>(null);

  const handleSort = (property: React.SetStateAction<string>) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const handleChangePage = (_: any, newPage: React.SetStateAction<number>) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: { target: { value: string } }) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleDeleteClick = (paymentMethod: React.SetStateAction<null>) => {
    setDeleteCandidate(paymentMethod);
    setDeleteConfirmationOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (deleteCandidate) {
      dispatch(deletePaymentMethod(deleteCandidate._id));
      setDeleteConfirmationOpen(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmationOpen(false);
  };

  const handleOpenAddPaymentSettingDialog = () => {
    setAddPaymentSettingDialogOpen(true);
  };

  const handleAddPaymentSetting = (newPaymentSetting: any) => {
    // You can update your state or perform any necessary actions here
    // For example, you can add the newPaymentSetting to your existing paymentMethods
    // and update the table accordingly.
  };

  // Filter paymentMethods based on user input
  const filteredPaymentMethods = paymentMethods
    ? paymentMethods.filter((paymentMethod: { name: string }) =>
        paymentMethod.name.toLowerCase().includes(filter.toLowerCase())
      )
    : [];

  // Sort filtered paymentMethods
  const sortedPaymentMethods = filteredPaymentMethods
    .slice()
    .sort((a: { [x: string]: string }, b: { [x: string]: string }) => {
      const compareValueA = a[orderBy] || "";
      const compareValueB = b[orderBy] || "";
      const comparison = compareValueA.localeCompare(compareValueB);

      return order === "asc" ? comparison : -comparison;
    });

  const dispatchFetchPayments = () => {
    dispatch(fetchPaymentsMethod());
  };

  useEffect(() => {
    dispatchFetchPayments();
  }, []);
  
  return (
    <Paper>
      <Typography mt={2} variant="h6" ml={2} gutterBottom>
        List of all payment settings
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
          onClick={handleOpenAddPaymentSettingDialog}
        >
          Add New Payment Setting
        </Button>
        <TextField
          label="Search Payment Setting"
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
                    <PaymentIcon style={{ marginRight: "4px" }} />
                    Payment Name
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
                <Box display="flex" alignItems="center">
                  <ActionsIcon style={{ marginRight: "4px" }} />
                  Actions
                </Box>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedPaymentMethods
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map(
                (paymentMethod: {
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
                }) => (
                  <TableRow key={paymentMethod._id}>
                    <TableCell
                      style={{
                        display: "flex",
                        alignItems: "center",
                        columnGap: 5,
                      }}
                    >
                      <IconButton>
                        <PaymentIcon />
                      </IconButton>
                      {paymentMethod.name}
                    </TableCell>
                    <TableCell>
                      <IconButton color="primary">
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        color="error"
                        onClick={() => handleDeleteClick(paymentMethod)}
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
        count={filteredPaymentMethods.length}
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
          Are you sure you want to delete:{" "}
          <i>{deleteCandidate ? deleteCandidate.name : ""}</i> the payment
          method
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

      {/* Add Payment Setting Dialog */}
      <AddPaymentSettingDialog
        open={addPaymentSettingDialogOpen}
        onClose={() => setAddPaymentSettingDialogOpen(false)}
        onAddPaymentMethod={handleAddPaymentSetting}
      />
    </Paper>
  );
};

export default Payments;
