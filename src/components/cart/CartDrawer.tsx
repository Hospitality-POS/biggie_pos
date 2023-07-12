import { Box, Button, Drawer, List, ListItem, ListItemText, Typography } from "@mui/material"


function CartDrawer({cartOpen,handleCartClose,handlePaymentOpen}) {
  return (
    <Drawer anchor="right" open={cartOpen} onClose={handleCartClose}>
        <Box sx={{ width: "300px",p: 2, mt: 2  }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom mt={1}>
            Order #djf8i
          </Typography>
          
          <List>
            <ListItem>
              <ListItemText primary="Item 1" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Item 2" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Item 3" />
            </ListItem>
          </List>
          <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
            <Button variant="contained" onClick={handlePaymentOpen}>
              Proceed to Payment
            </Button>
          </Box>
        </Box>
      </Drawer>
  )
}

export default CartDrawer