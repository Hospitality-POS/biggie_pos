import { Box, Button, Card, CardContent, Divider, Grid, IconButton, TextField, Typography } from '@mui/material'
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import { useDispatch } from 'react-redux';
import { addItem, removeItem } from '../../features/Cart/CartSlice';



function CartItemCard({cartItem}) {
    const dispatch = useDispatch()
    // console.log(cartItem);
    
  return (
    <>
    <Card sx={{ mb: 1 , boxShadow: "none",}} >
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={6}>
                <Typography variant="body1">{cartItem.name}</Typography>
              </Grid>
              <Grid item xs={3} ml={-2}>
                <Box sx={{ display: "flex", alignItems: "center", columnGap: 1}}>
                  <IconButton size="small" sx={{borderRadius: 50, border: 1}} onClick={()=>dispatch(removeItem(cartItem._id))}>
                    <RemoveIcon
 />
                  </IconButton>
                  <Typography variant="body1">{cartItem.quantity}</Typography>
                  <IconButton size="small" sx={{borderRadius: 50, border: 1}} onClick={()=>dispatch(addItem(cartItem))}>
                    <AddIcon />
                  </IconButton>
                </Box>
              </Grid>
              <Grid item xs={3}>
                <Typography variant="body1" fontSize="16px" ml={3}>ksh.{cartItem.price}</Typography>
              </Grid>
            </Grid>
            <Grid item display={"flex"} justifyContent={"space-between"}>

            <TextField
              placeholder="Add Description"
              variant="outlined"
              size="small"
              // fullWidth
              margin="normal"
              InputProps={{
                endAdornment: (
                  <IconButton size="small" >
                    <AddIcon />
                  </IconButton>
                ),
              }}
            />
            <Button variant="outlined" color="error" size="small" sx={{height: 40, mt: 2, borderRadius: "8px"}}>

            <DeleteIcon  color="error" onClick={()=>dispatch(removeItem(cartItem._id))}/>
            </Button>
            </Grid>
          </CardContent>
          <Divider />
        </Card>
        </>
  )
}

export default CartItemCard