import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  TextField,
  TablePagination,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Button,
} from "@mui/material";
import {
  Delete,
  ArrowUpward,
  ArrowDownward,
  MoreVert,
} from "@mui/icons-material";
import moment from "moment";
import { useDispatch } from "react-redux";
// import { deleteOrder } from "../../features/Order/OrderActions";
import SearchIcon from "@mui/icons-material/Search";
import { CSVLink } from "react-csv";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { deleteOrder } from "../../features/Order/OrderActions";

interface Order {
  updated_by: any;
  _id: string;
  name: string;
  order_no: string;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  orders: Order[];
}

const OrderList: React.FC<Props> = ({ orders }) => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [sortColumn, setSortColumn] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(5);
  const [servedByFilter, setServedByFilter] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [sortMenuAnchor, setSortMenuAnchor] = useState<null | HTMLElement>(
    null
  );
  const dispatch = useDispatch();

  const sortedOrders = [...orders].sort((a, b) => {
    if (sortColumn === "order_no") {
      return sortDirection === "asc"
        ? a.order_no.localeCompare(b.order_no)
        : b.order_no.localeCompare(a.order_no);
    }
    if (sortColumn === "createdAt") {
      return sortDirection === "asc"
        ? moment(a.createdAt).unix() - moment(b.createdAt).unix()
        : moment(b.createdAt).unix() - moment(a.createdAt).unix();
    }
    return 0;
  });

 const filteredOrders = sortedOrders.filter((order) => {
    const matchesSearch =
      order.order_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.updated_by.username.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDate =
      (!startDate || moment(order.createdAt).isSameOrAfter(startDate, "day")) &&
      (!endDate || moment(order.createdAt).isSameOrBefore(endDate, "day"));

    return matchesSearch && matchesDate;
  });

  const handleChangePage = (
    _event: React.MouseEvent<HTMLButtonElement> | null,
    newPage: number
  ) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // const onEdit = (id: string) => {
  //   console.log("edit modal");
  // };

  const onDelete = (id: string) => {
    dispatch(deleteOrder(id));
  };
  const handleDateChange = (date: string) => {
    setSelectedDate(date);
  };

  const handleSort = (column: string) => {
    if (column === sortColumn) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
    setSortMenuAnchor(null);
  };

  const handleSortMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setSortMenuAnchor(event.currentTarget);
  };

  const handleSortMenuClose = () => {
    setSortMenuAnchor(null);
  };

  const handleExportCSV = () => {
    const csvData = filteredOrders.map((order) => ({
      OrderNo: order.order_no,
      CreatedAt: moment(order.createdAt).format("MMMM Do YYYY, h:mm a"),
      UpdatedBy: order.updated_by.username,
    }));

    const csvHeaders = [
      { label: "Order No", key: "OrderNo" },
      { label: "Created At", key: "CreatedAt" },
      { label: "Served By", key: "UpdatedBy" },
    ];

    return (
      <CSVLink
        data={csvData}
        headers={csvHeaders}
        filename={"orders.csv"}
        style={{ textDecoration: "none" }}
      >
        Export CSV
      </CSVLink>
    );
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text("Orders Report", 10, 10);

    const tableData = filteredOrders.map((order) => [
      order.order_no,
      moment(order.createdAt).format("MMMM Do YYYY, h:mm a"),
      order.updated_by.username,
    ]);

    // Define columns for the table
    const headers = ["Order No", "Created At", "Updated By"];

    // Set the y position for the table header
    const tableY = 20;

    // Set the y position for the table data
    const dataY = tableY + 10;

    // Generate the table
    doc.autoTable({
      head: [headers],
      body: tableData,
      startY: dataY,
    });

    // Save the PDF
    doc.save("orders.pdf");
  };

  return (
    <div>
      <div style={{ display: "flex", columnGap: 20 }}>
        <TextField
          label="Search Order or Served By"
          variant="outlined"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ marginBottom: 16 }}
          InputProps={{
            startAdornment: (
              <span style={{ marginRight: 5, opacity: 0.5, marginTop: 5 }}>
                <SearchIcon />
              </span>
            ),
          }}
        />
  

        <TextField
          label="Start Date"
          variant="outlined"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          InputLabelProps={{
            shrink: true,
          }}
          InputProps={{
            style: { marginBottom: 16, width: 200 },
          }}
        />
        <TextField
          label="End Date"
          variant="outlined"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          InputLabelProps={{
            shrink: true,
          }}
          InputProps={{
            style: { marginBottom: 16, width: 200 },
          }}
        />
      </div>
      <TableContainer component={Paper}>
        <Table aria-label="order-list">
          <TableHead style={{ backgroundColor: "#6c1c2c" }}>
            <TableRow>
              <TableCell sx={{ color: "white", fontSize: "16px" }}>
                Order No.
                {sortColumn === "order_no" && (
                  <Tooltip
                    title={`Sort ${
                      sortDirection === "asc" ? "descending" : "ascending"
                    }`}
                  >
                    <IconButton onClick={() => handleSort("order_no")}>
                      {sortDirection === "asc" ? (
                        <ArrowUpward sx={{ color: "white" }} />
                      ) : (
                        <ArrowDownward sx={{ color: "white" }} />
                      )}
                    </IconButton>
                  </Tooltip>
                )}
              </TableCell>
              <TableCell sx={{ color: "white", fontSize: "16px" }}>
                Created At
                {sortColumn === "createdAt" && (
                  <Tooltip
                    title={`Sort ${
                      sortDirection === "asc" ? "descending" : "ascending"
                    }`}
                  >
                    <IconButton onClick={() => handleSort("createdAt")}>
                      {sortDirection === "asc" ? (
                        <ArrowUpward sx={{ color: "white" }} />
                      ) : (
                        <ArrowDownward sx={{ color: "white" }} />
                      )}
                    </IconButton>
                  </Tooltip>
                )}
              </TableCell>
              <TableCell sx={{ color: "white", fontSize: "16px" }}>
                Served By
              </TableCell>
              <TableCell sx={{ color: "white" }}>
                <Tooltip title="Sort">
                  <IconButton onClick={handleSortMenuClick}>
                    <MoreVert sx={{ color: "white" }} />
                  </IconButton>
                </Tooltip>
                <Menu
                  anchorEl={sortMenuAnchor}
                  keepMounted
                  open={Boolean(sortMenuAnchor)}
                  onClose={handleSortMenuClose}
                >
                  <MenuItem onClick={() => handleSort("order_no")}>
                    <ListItemIcon>
                      <ArrowUpward fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Sort Order No Asc" />
                  </MenuItem>
                  <MenuItem onClick={() => handleSort("order_no")}>
                    <ListItemIcon>
                      <ArrowDownward fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Sort Order No Desc" />
                  </MenuItem>
                  <MenuItem onClick={() => handleSort("createdAt")}>
                    <ListItemIcon>
                      <ArrowUpward fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Sort Created At Asc" />
                  </MenuItem>
                  <MenuItem onClick={() => handleSort("createdAt")}>
                    <ListItemIcon>
                      <ArrowDownward fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Sort Created At Desc" />
                  </MenuItem>
                </Menu>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredOrders
              .slice(page * rowsPerPage, (page + 1) * rowsPerPage)
              .map((order) => (
                <TableRow key={order._id}>
                  <TableCell sx={{ fontWeight: "bold" }}>
                    {order.order_no}
                  </TableCell>
                  <TableCell>
                    {moment(order.createdAt).format("MMMM Do YYYY, h:mm a")}
                  </TableCell>
                  <TableCell>{order.updated_by.username}</TableCell>
                  <TableCell>
                    <Tooltip title="Delete">
                      <IconButton onClick={() => onDelete(order._id)}>
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredOrders.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>
      <div
        style={{ marginTop: 5, display: "flex", columnGap: 5, marginBottom: 0 }}
      >
        <Button variant="outlined">{handleExportCSV()}</Button>
        <Button variant="outlined" onClick={handleExportPDF}>
          Export PDF
        </Button>
      </div>
    </div>
  );
};

export default OrderList;
