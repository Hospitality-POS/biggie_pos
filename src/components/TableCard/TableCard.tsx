import { Card, CardMedia } from "@mui/material";
import classes from "./table.module.css";

const TableCard = ({ item }) => {
  const cardStyles = {
    boxShadow: "none",
    bgcolor: "transparent",
    color: item.isOccupied ? "white" : "black"
  };
  const imageStyles = {
    border: "none",
    opacity: item.isOccupied ? 1 : 0.5, 

  };
  return (
    <Card sx={cardStyles} className={classes.container}>
      <div className={classes.cardContent}>
        <CardMedia 
          sx={imageStyles}
          component="img"
          alt="Table"
          height="120"
          image="/table.png"
          className={classes.image}
        />
        <div className={classes.name}>{item.name}</div>
      </div>
    </Card>
  );
};

export default TableCard;
