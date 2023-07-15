import { Button, Card, CardContent, CardMedia, Typography } from '@mui/material'
import React from 'react'
import CircleIcon from "@mui/icons-material/Circle";
import BorderColorOutlinedIcon from "@mui/icons-material/BorderColorOutlined";

interface StoreProductCardProps {
  img: string;
  name: string;
  price: number;
  bowls: number;
  onEdit: () => void;
}
const StoreProductCard:React.FC<StoreProductCardProps>=({name, img, price, bowls, onEdit})=>{
  return (
    <>
    <Card
          sx={{
            maxWidth: 200,
            height: 300,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <CardMedia
            component="img"
            height="145"
            sx={{ objectFit: "cover" }}
            image={img? img: "/food.jpg"}
            alt={name}
          />
          <CardContent
            sx={{
              flexGrow: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Typography
              variant="body1"
              component="div"
              sx={{ textAlign: "center" }}
            >
              {name}
            </Typography>
            <Typography
              variant="subtitle1"
              color="text.secondary"
              sx={{
                textAlign: "center",
                alignContent: "baseline",
                justifyContent: "center",
                gap: 1,
                display: "flex",
              }}
            >
              Ksh.{price}{" "}
              <CircleIcon color="primary" sx={{ fontSize: 8, mt: 1 }} /> {bowls}{" "}
              Bowls
            </Typography>
          </CardContent>
          <Button
            variant="contained"
            sx={{ borderRadius: 0, gap: 2, p: 2, bgcolor: "#FF8400" }}
            onClick={onEdit}
          >
            <BorderColorOutlinedIcon fontSize="inherit" />
            Edit Dish
          </Button>
        </Card>
        </>
  )
}

export default StoreProductCard