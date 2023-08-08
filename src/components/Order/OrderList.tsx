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
} from "@mui/material";
import {
  Edit,
  Delete,
  ArrowUpward,
  ArrowDownward,
  MoreVert,
} from "@mui/icons-material";
import moment from "moment";
import { useDispatch } from "react-redux";
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
    const matchesSearch = order.order_no
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesDate =
      !selectedDate || moment(order.createdAt).isSame(selectedDate, "day");
    return matchesSearch && matchesDate;
  });

  const handleChangePage = (
    event: React.MouseEvent<HTMLButtonElement> | null,
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

  const onEdit = (id: string) => {
    console.log("edit modal");
  };

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

  return (
    <div>
      <div style={{ display: "flex", columnGap: 20 }}>
        <TextField
          label="Search Order No"
          variant="outlined"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ marginBottom: 16 }}
        />
        <TextField
          label="Filter by Date"
          variant="outlined"
          type="date"
          value={selectedDate}
          onChange={(e) => handleDateChange(e.target.value)}
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
          <TableHead style={{ backgroundColor: "#6c1c2c", }}>
            <TableRow>
              <TableCell sx={{color: "white", fontSize:"16px"}}>
                Order No
                {sortColumn === "order_no" && (
                  <Tooltip
                    title={`Sort ${
                      sortDirection === "asc" ? "descending" : "ascending"
                    }`}
                  >
                    <IconButton onClick={() => handleSort("order_no")}>
                      {sortDirection === "asc" ? (
                        <ArrowUpward  sx={{color: "white"}} />
                      ) : (
                        <ArrowDownward  sx={{color: "white"}}/>
                      )}
                    </IconButton>
                  </Tooltip>
                )}
              </TableCell>
              <TableCell  sx={{color: "white", fontSize:"16px"}}>
                Created At
                {sortColumn === "createdAt" && (
                  <Tooltip
                    title={`Sort ${
                      sortDirection === "asc" ? "descending" : "ascending"
                    }`}
                  >
                    <IconButton onClick={() => handleSort("createdAt")}>
                      {sortDirection === "asc" ? (
                        <ArrowUpward  sx={{color: "white"}}/>
                      ) : (
                        <ArrowDownward  sx={{color: "white"}}/>
                      )}
                    </IconButton>
                  </Tooltip>
                )}
              </TableCell>
              <TableCell  sx={{color: "white", fontSize:"16px"}}>Updated By</TableCell>
              <TableCell  sx={{color: "white"}}>
                <Tooltip title="Sort">
                  <IconButton onClick={handleSortMenuClick}>
                    <MoreVert  sx={{color: "white"}} />
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
                  <TableCell>{order.order_no}</TableCell>
                  <TableCell>
                    {moment(order.createdAt).format("MMMM Do YYYY, h:mm a")}
                  </TableCell>
                  <TableCell>{order.updated_by.username}</TableCell>
                  <TableCell>
                    <Tooltip title="Edit">
                      <IconButton onClick={() => onEdit(order._id)}>
                        <Edit />
                      </IconButton>
                    </Tooltip>
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
    </div>
  );
};

export default OrderList;
