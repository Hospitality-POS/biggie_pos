import React, { useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button } from "@mui/material";
import { useForm, Controller } from "react-hook-form";

interface AddUserDialogProps {
  open: boolean;
  onClose: () => void;
  onAddUser: (user: User) => void;
}

const AddUserDialog: React.FC<AddUserDialogProps> = ({ open, onClose, onAddUser }) => {
   const { handleSubmit, control, formState: { errors } } = useForm<User>();
  const [newUser, setNewUser] = useState<User>({
    fullname: "",
    email: "",
    phone: "",
    role: "",
  });

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setNewUser((prevUser) => ({
      ...prevUser,
      [name]: value,
    }));
  };

  const handleConfirmAddUser = (data: User) => {
    onAddUser(data);
    onClose();
  };
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Add New User</DialogTitle>
      <DialogContent style={{ display: "flex", flexDirection: "column", gap: "16px", width: "400px" }}>
        <Controller
          name="fullname"
          control={control}
          rules={{ required: "Full Name is required" }}
          defaultValue={newUser.fullname} 
          render={({ field }) => (
            <TextField
              label="Full Name"
              fullWidth
              error={!!errors.fullname}
              helperText={errors.fullname?.message}
              {...field}
            />
          )}
        />
        <Controller
          name="email"
          control={control}
          rules={{
            required: "Email is required",
            pattern: {
              value: /^\S+@\S+\.\S+$/,
              message: "Invalid email format",
            },
          }}
          defaultValue={newUser.email} 
          render={({ field }) => (
            <TextField
              label="Email"
              fullWidth
              error={!!errors.email}
              helperText={errors.email?.message}
              {...field}
            />
          )}
        />
        <Controller
          name="phone"
          control={control}
          rules={{ required: "Phone is required" }}
          defaultValue={newUser.phone} 
          render={({ field }) => (
            <TextField
              label="Phone"
              fullWidth
              error={!!errors.phone}
              helperText={errors.phone?.message}
              {...field}
            />
          )}
        />
        <Controller
          name="role"
          control={control}
          rules={{ required: "Role is required" }}
          defaultValue={newUser.role} 
          render={({ field }) => (
            <TextField
              label="Role"
              fullWidth
              error={!!errors.role}
              helperText={errors.role?.message}
              {...field}
            />
          )}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Cancel
        </Button>
        <Button onClick={handleSubmit(handleConfirmAddUser)} color="primary">
          Add User
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddUserDialog;
