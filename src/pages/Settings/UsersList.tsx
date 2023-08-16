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
} from "@mui/material";
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from "@mui/icons-material/Edit";


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
  };


  const handleConfirmDelete = () => {
    if (selectedUserId !== null) {
      handleCloseDeleteDialog();
    }
  };

  return (
    <div>
      <Box display="flex" alignItems="center" mb={2}>
        <TextField
          label="Search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          fullWidth
          margin="normal"
          InputProps={{ endAdornment: <SearchIcon /> }}
        />
        <Button startIcon={<AddIcon />} variant="outlined">
          Add New User
        </Button>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Avatar</TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === "name"}
                  direction={orderBy === "name" ? order : "asc"}
                  onClick={() => handleSort("name")}
                >
                  Name
                </TableSortLabel>
              </TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedUsers.map(
              (user) => (
                <TableRow key={user._id}>
                  <TableCell>
                    <Avatar
                      alt={user.username}
                      src={`https://via.placeholder.com/40`}
                    />
                  </TableCell>
                  <TableCell>{user.fullname}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.phone}</TableCell>
                  <TableCell>{user.isAdmin ? "Admin" : "user"}</TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleDeleteUser(user?._id)}>
                      <DeleteIcon />
                    </IconButton>
                    {/* Add edit and other action buttons */}
                    <IconButton onClick={() => handleEditUser(user?._id)}>
                      <EditIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              )
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Delete Confirmation Dialog */}
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
    </div>
  );
}

export default UsersList;
