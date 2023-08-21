import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Avatar,
  TableSortLabel,
  IconButton,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TablePagination,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import AddUserDialog from "../../components/MODALS/Dialogs/AddUserDialog";

interface User {
  fullname: string;
  id: number;
  name: string;
  email: string;
  phone: number;
  role: string;
}

function UsersList() {
  const { users } = useSelector((state: any) => state.auth);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [filter, setFilter] = useState<string>("");
  const [orderBy, setOrderBy] = useState<string>("id");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [openDeleteDialog, setOpenDeleteDialog] = useState<boolean>(false);
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(5);
  const [openAddUserDialog, setOpenAddUserDialog] = useState<boolean>(false);

  const filteredUsers = users.filter(
    (user: User) =>
      user.fullname.toLowerCase().includes(filter.toLowerCase()) ||
      user.email.toLowerCase().includes(filter.toLowerCase())
  );

  const handleSort = (property: string) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const sortedUsers = filteredUsers.sort(
    (a: { name: string; id: number }, b: { name: string; id: number }) => {
      const isAsc = order === "asc";
      if (orderBy === "name") {
        return isAsc
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      return isAsc ? a.id - b.id : b.id - a.id;
    }
  );

  const handleDeleteUser = (userId: number) => {
    setOpenDeleteDialog(true);
    setSelectedUserId(userId);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setSelectedUserId(null);
  };

  const handleEditUser = (id: number) => {
    console.log("edit user with id:", id);
    // Implement your logic to edit the user
  };

  const handleConfirmDelete = () => {
    if (selectedUserId !== null) {
      // Implement your logic to delete the user
      handleCloseDeleteDialog();
    }
  };

  const handleAddUser = () => {
    setOpenAddUserDialog(true);
  };

  const handleCloseAddUserDialog = () => {
    setOpenAddUserDialog(false);
  };

  const handleConfirmAddUser = () => {
    handleCloseAddUserDialog();
  };

  return (
    <div>
      <Box
        display="flex"
        columnGap={2}
        alignItems="center"
        mb={2}
        mt={2}
        sx={{ paddingLeft: 2 }}
      >
        <TextField
          label="Search User"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          InputProps={{ endAdornment: <SearchIcon /> }}
        />
        <Button
          startIcon={<AddIcon />}
          variant="contained"
          style={{ padding: 14, backgroundColor: "#6c1c2c" }}
          onClick={handleAddUser}
        >
          Add New User
        </Button>
      </Box>
      <TableContainer
        component={Paper}
        style={{
          width: "100%",
          marginTop: "1rem",
          overflowX: "auto",
          paddingLeft: 10,
          paddingRight: 10,
        }}
      >
        <Table>
          <TableHead>
            <TableRow style={{ backgroundColor: "#6c1c2c" }}>
              <TableCell style={{ color: "white", paddingLeft: 40 }}>
                Profile Name
              </TableCell>
              <TableCell style={{ color: "white" }}>
                <TableSortLabel
                  active={orderBy === "name"}
                  direction={orderBy === "name" ? order : "asc"}
                  onClick={() => handleSort("name")}
                >
                  Fullname
                </TableSortLabel>
              </TableCell>
              <TableCell style={{ color: "white" }}>Email</TableCell>
              <TableCell style={{ color: "white" }}>Phone</TableCell>
              <TableCell style={{ color: "white" }}>Role</TableCell>
              <TableCell style={{ color: "white" }}>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedUsers
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((user) => (
                <TableRow key={user.id}>
                  <TableCell style={{ display: "flex", alignItems: "center", columnGap: 5 }}>
                    <Avatar
                      alt={user.username}
                      src={`https://via.placeholder.com/40`}
                    />
                    {user.fullname}
                  </TableCell>
                  <TableCell>{user.fullname}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.phone}</TableCell>
                  <TableCell>{user.isAdmin ? "Admin" : "user"}</TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleDeleteUser(user.id)}>
                      <DeleteIcon />
                    </IconButton>
                    <IconButton onClick={() => handleEditUser(user.id)}>
                      <EditIcon />
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
        count={filteredUsers.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(event, newPage) => setPage(newPage)}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(parseInt(event.target.value, 10));
          setPage(0);
        }}
      />

      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this user?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="primary">
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} color="primary">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* add user */}
      <AddUserDialog
        open={openAddUserDialog}
        onClose={handleCloseAddUserDialog}
        onAddUser={(user) => {
          console.log("Adding user:", user);
        }}
      />
    </div>
  );
}

export default UsersList;
