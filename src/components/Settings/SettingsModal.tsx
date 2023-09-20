import {
  Box,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@mui/material";
import AssessmentIcon from "@mui/icons-material/Assessment";
import ReceiptIcon from "@mui/icons-material/Receipt";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import CategoryIcon from "@mui/icons-material/Category";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import PaymentIcon from "@mui/icons-material/Payment";
import PeopleIcon from "@mui/icons-material/People";
import SettingsIcon from "@mui/icons-material/Settings";
import TableBarIcon from "@mui/icons-material/TableBar";
import CloseIcon from '@mui/icons-material/Close';
import InventoryIcon from '@mui/icons-material/Inventory';
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { fetchAllUsers } from "../../features/Auth/AuthActions";
import { fetchAllProductInventories } from "../../features/Inventory/product/productInventoryActions";
import { fetchSuppliers } from "../../features/Supplier/SupplierActions";
import { fetchTables } from "../../features/Table/TableActions";
import { fetchCategories } from "../../features/Category/CategoryActions";
import { fetchPaymentsMethod } from "../../features/Payment/PaymentMethodActions";

interface SettingsModalProps {
  sidebarOpen: boolean;
  handleSidebarClose: () => void;
}

function SettingsModal({
  sidebarOpen,
  handleSidebarClose,
}: SettingsModalProps) {
    const dispatch = useDispatch()
    const navigate = useNavigate()

    
  return (
    <Drawer anchor="right" open={sidebarOpen} onClose={handleSidebarClose}>
      <Box
        sx={{ width: 250 }}
        role="presentation"
        onClick={handleSidebarClose}
        onKeyDown={handleSidebarClose}
      >
         <Box sx={{ backgroundColor: "#6c1c2c", padding: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="h6" color="white" sx={{ display: "flex", alignItems: "center" }}>
            <SettingsIcon sx={{ marginRight: 1 }} />
            Settings
          </Typography>
          <IconButton onClick={handleSidebarClose} color="inherit">
            <CloseIcon />
          </IconButton>
        </Box>

        <List>
          <ListItem button onClick={() => {navigate("/Inventory"), dispatch(fetchAllProductInventories())}}>
            <ListItemIcon>
              <InventoryIcon />
            </ListItemIcon>
            <ListItemText primary="Inventory" />
          </ListItem>
          <ListItem button onClick={() => {navigate("/users"), dispatch(fetchAllUsers())}}>
            <ListItemIcon>
              <PeopleIcon />
            </ListItemIcon>
            <ListItemText primary="People/Users" />
          </ListItem>
          <ListItem button onClick={() => {navigate("/table-settings"), dispatch(fetchTables())}}>
            <ListItemIcon>
              <TableBarIcon />
            </ListItemIcon>
            <ListItemText primary="Tables" />
          </ListItem>
          <ListItem button onClick={() => {navigate("/Category-settings"), dispatch(fetchCategories())}}>
            <ListItemIcon>
              <CategoryIcon />
            </ListItemIcon>
            <ListItemText primary="Categories" />
          </ListItem>
          <ListItem button onClick={() => {navigate("/payment-settings"),dispatch(fetchPaymentsMethod())}}>
            <ListItemIcon>
              <PaymentIcon />
            </ListItemIcon>
            <ListItemText primary="Payment Methods" />
          </ListItem>
          <ListItem button onClick={() => {navigate("/Supplier"), dispatch(fetchSuppliers())}}>
            <ListItemIcon>
              <LocalShippingIcon />
            </ListItemIcon>
            <ListItemText primary="Supplier" />
          </ListItem>
          <ListItem button onClick={() => navigate("/Reports")}>
            <ListItemIcon>
              <AssessmentIcon />
            </ListItemIcon>
            <ListItemText primary="Reports" />
          </ListItem>
          <ListItem button onClick={() => navigate("/Printed Bills")}>
            <ListItemIcon>
              <ReceiptIcon />
            </ListItemIcon>
            <ListItemText primary="Printed Bills" />
          </ListItem>
          <ListItem button onClick={() => navigate("/Help")}>
            <ListItemIcon>
              <HelpOutlineIcon />
            </ListItemIcon>
            <ListItemText primary="Help" />
          </ListItem>
        </List>
      </Box>
    </Drawer>
  );
}

export default SettingsModal;
