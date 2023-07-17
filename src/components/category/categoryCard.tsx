import { Card, CardContent, CardMedia, Typography } from "@mui/material";
import { green, grey } from "@mui/material/colors";

function CategoryCard({
  icon,
  name,
  itemCount,
  id,
  handleSelectedCard,
  selectedCard,
}: any) {
 
  
  return (
    <Card
      onClick={()=>handleSelectedCard(id)}
      sx={{
        backgroundColor: selectedCard === id ? "#bc8c7c" : grey[100],
        color: selectedCard === id ? "white" : "black",
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
