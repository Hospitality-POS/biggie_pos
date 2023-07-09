import { Card, CardContent, CardMedia, Typography } from "@mui/material";
import { green, grey } from "@mui/material/colors";
import { useState } from "react";

function CategoryCard({ icon, name, itemCount, id }: any) {
  const [activeCardIndex, setActiveCardIndex] = useState("");
  
  const isActive = activeCardIndex === id;

  const handleClick = () => {
    setActiveCardIndex(id === activeCardIndex ? "" : id);
  };


  return (
    <Card
      onClick={handleClick}
      sx={{
        backgroundColor: isActive ? green[500] : grey[100],
        color: isActive ? "white" : "black",
        cursor: "pointer",
        transition: "background-color 0.3s ease",
        width: "120px",
        height: "100px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <CardContent>
        <CardMedia
          component="img"
          alt="icon"
          image={icon ? icon : "/chip4.png"}
          sx={{ width: "40px", height: "40px" }}
        />
        <Typography variant="h6" component="div" fontSize={12}>
          {name}
        </Typography>
        <Typography variant="subtitle2" color="text.secondary">
          {itemCount} Items
        </Typography>
      </CardContent>
    </Card>
  );
}

export default CategoryCard;
