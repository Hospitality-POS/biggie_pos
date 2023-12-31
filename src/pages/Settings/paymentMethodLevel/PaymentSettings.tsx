import React, { useEffect, useRef, useState } from "react";
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
} from "../../../features/Payment/PaymentMethodActions";
import AddPaymentSettingDialog from "../../../components/MODALS/Dialogs/AddPaymentMethodDialog";
import { useAppDispatch, useAppSelector } from "../../../store";
import { ActionType, ProCard, ProFormText, ProTable } from "@ant-design/pro-components";
import { Tooltip } from "antd/lib";
import { Button } from 'antd';
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { fetchAllPaymentMethods } from "../../../services/paymentMethod";

const Payments = () => {
  const actionRef = useRef<ActionType>()
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
      
      <ProCard title="Payment Method Settings"/>

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
            title: "Method",
            dataIndex: "name",
            hideInSearch: false,

            renderFormItem: () => {
              return (
                <ProFormText
                  width={"md"}
                  name={"method"}
                  placeholder={"Search Payment method"}
                />
              );
            },
          },
         
          actionColumn,
        ]}
        request={async (params) => {
          const data = await fetchAllPaymentMethods(params);
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
        actionRef={actionRef}
        rowSelection={{
          alwaysShowAlert: false,
          selections: false,
        }}
        search={{
          searchText: "Search Method",
          resetText: "Reset",
          labelWidth: "auto",
        }}
        dateFormatter="string"
        headerTitle="List of Payment Methods"
        toolBarRender={() => [
          <AddPaymentSettingDialog
            open={addPaymentSettingDialogOpen}
            onClose={() => setAddPaymentSettingDialogOpen(false)}
            onAddPaymentMethod={handleAddPaymentSetting}
          />,
        ]}
      />


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
          <Button onClick={handleDeleteConfirm} danger>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Payments;
