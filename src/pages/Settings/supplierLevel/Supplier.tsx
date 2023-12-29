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
  // Button,
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
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import BusinessIcon from "@mui/icons-material/Business";
import PhoneIcon from "@mui/icons-material/Phone";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import EmailIcon from "@mui/icons-material/Email";
import ActionsIcon from "@mui/icons-material/MoreVert";
import { useSelector, useDispatch } from "react-redux";
import {
  deleteSupplier,
  fetchSuppliers,
} from "../../../features/Supplier/SupplierActions";
import AddSupplierDialog from "../../../components/MODALS/Dialogs/AddSupplierDialog";
import { ProCard, ProFormText, ProTable } from "@ant-design/pro-components";
import { fetchAllTableLocation } from "../../../services/tables";
import { Tooltip } from "antd/lib";
import { Button } from "antd";

const SupplierTable = () => {
  const dispatch = useDispatch();
  const { suppliers } = useSelector((state: any) => state.supplier);

  const [filter, setFilter] = useState<string>("");
  const [orderBy, setOrderBy] = useState<string>("name");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [addSupplierDialogOpen, setAddSupplierDialogOpen] = useState(false);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState(null);

  const handleSort = (property: React.SetStateAction<string>) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const handleChangePage = (
    _event: any,
    newPage: React.SetStateAction<number>
  ) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: { target: { value: string } }) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleDeleteClick = (supplier: React.SetStateAction<null>) => {
    setDeleteCandidate(supplier);
    setDeleteConfirmationOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (deleteCandidate) {
      dispatch(deleteSupplier(deleteCandidate._id));
      setDeleteConfirmationOpen(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmationOpen(false);
  };

  const handleOpenAddSupplierDialog = () => {
    setAddSupplierDialogOpen(true);
  };
  const handleAddSupplier = (_newSupplier) => {
    // You can update your state or perform any necessary actions here
    // For example, you can add the newSupplier to your existing suppliers
    // and update the table accordingly.
  };

  // Filter suppliers based on user input
  const filteredSuppliers = suppliers
    ? suppliers.filter(
        (supplier: { name: string; email: string }) =>
          supplier.name?.toLowerCase().includes(filter.toLowerCase()) ||
          supplier.email?.toLowerCase().includes(filter.toLowerCase())
      )
    : [];

  // Sort filtered suppliers
  const sortedSuppliers = filteredSuppliers
    .slice()
    .sort((a: { [x: string]: string }, b: { [x: string]: string }) => {
      const compareValueA = a[orderBy] || ""; // Handle null values
      const compareValueB = b[orderBy] || "";
      const comparison = compareValueA.localeCompare(compareValueB);

      return order === "asc" ? comparison : -comparison;
    });

  const dispatchFetchSuppliers = () => {
    dispatch(fetchSuppliers());
  };

  useEffect(() => {
    dispatchFetchSuppliers();
  }, []);

  const actionColumn = {
    title: "Actions",
    dataIndex: "actions",
    hideInSearch: true,
    render: (_, record: any) => [
      <Tooltip key="edit" title="Edit">
        <Button
          type="link"
          icon={<EditOutlined style={{ color: "#6c1c2c" }} />}
          //   onClick={() => handleEditClick(record)}
        />
      </Tooltip>,
      <Tooltip key="delete" title="Delete">
        <Button
          type="link"
          danger
          icon={<DeleteOutlined />}
          //   onClick={() => handleDeleteClick(record)}
        />
      </Tooltip>,
    ],
  };

  return (
    <>
      {/* <Typography mt={2} variant="h6" ml={2} gutterBottom>
        List of all the suppliers
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
          onClick={handleOpenAddSupplierDialog}
        >
          Add New Supplier
        </Button>
        <TextField
          label="Search Supplier"
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
                    <BusinessIcon style={{ marginRight: "4px" }} /> {/* Icon */}
      {/* Supplier's Name
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
                  active={orderBy === "email"}
                  direction={orderBy === "email" ? order : "asc"}
                  onClick={() => handleSort("email")}
                >
                  <Box display="flex" alignItems="center">
                    <EmailIcon style={{ marginRight: "4px" }} />
                    Email
                    {orderBy === "email" && (
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
                  <PhoneIcon style={{ marginRight: "4px" }} />
                  Phone
                </Box>
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
            {sortedSuppliers
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map(
                (supplier: {
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
                  email:
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
                  phone:
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
                  <TableRow key={supplier._id}>
                    <TableCell
                      style={{
                        display: "flex",
                        alignItems: "center",
                        columnGap: 5,
                      }}
                    >
                      <Avata alt={supplier.name} src={supplier.name} />
                      {supplier.name}
                    </TableCell>
                    <TableCell>{supplier.email}</TableCell>
                    <TableCell>0{supplier.phone}</TableCell>
                    <TableCell>
                      <IconButton color="primary">
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        color="error"
                        onClick={() => handleDeleteClick(supplier)}
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
        count={filteredSuppliers.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      /> */}

      {/* Delete Confirmation Dialog */}
      {/* <Dialog
        open={deleteConfirmationOpen}
        onClose={handleDeleteCancel}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete :{" "}
          <i>{deleteCandidate ? deleteCandidate.name : ""} </i>the supplier
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog> */}

      {/*add supplier  */}
      {/* <AddSupplierDialog
        open={addSupplierDialogOpen}
        onClose={() => setAddSupplierDialogOpen(false)}
        onAddSupplier={handleAddSupplier}
      /> */}

      <ProTable
        rowKey="_id"
        pagination={{
          pageSize: 5,
          showQuickJumper: false,
          showTotal: (total, range) => (
            <div>{`Showing ${range[0]}-${range[1]} of ${total} total items`}</div>
          ),
        }}
        columns={[
          {
            title: "Supplier",
            dataIndex: "name",
            hideInSearch: false,

            renderFormItem: () => {
              return (
                <ProFormText
                  width={"md"}
                  name={"name"}
                  placeholder={"Search Supplier"}
                />
              );
            },
          },
          {
            title: "Email",
            dataIndex: "email",
            hideInSearch: false,
            renderFormItem: () => {
              return (
                <ProFormText
                  width={"md"}
                  name={"email"}
                  placeholder={"Search Supplier email"}
                />
              );
            },
          },
          {
            title: "Phone",
            dataIndex: "phone",
            hideInSearch: false,
            renderFormItem: () => {
              return (
                <ProFormText
                  width={"md"}
                  name={"phone"}
                  placeholder={"Search Suppliers phone"}
                />
              );
            },
          },
          actionColumn,
        ]}
        request={async (params) => {
          const data = await fetchAllTableLocation(params);
          // console.log("========", data);
          // console.log(sorter, filter);
          return {
            data: data,
            success: true,
            total: data.length,
          };
        }}
        tableAlertRender={({ selectedRowKeys }) => {
          return <p>You have selected {selectedRowKeys.length}</p>;
        }}
        // actionRef={actionRef}
        rowSelection={{
          alwaysShowAlert: false,
          selections: false,
        }}
        search={{
          searchText: "Search Supplier",
          resetText: "Reset",
          labelWidth: "auto",
        }}
        dateFormatter="string"
        headerTitle="List of Suppliers"
        toolBarRender={() => [
          <AddSupplierDialog
            open={addSupplierDialogOpen}
            onClose={() => setAddSupplierDialogOpen(false)}
            onAddSupplier={handleAddSupplier}
          />,
        ]}
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
          <i>{deleteCandidate ? deleteCandidate.name : ""} </i>the supplier
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
    </>
  );
};

export default SupplierTable;
