import { Card, CardMedia } from "@mui/material";
import classes from "./table.module.css";

const TableCard = ({ item }) => {
  return (
    <Card sx={{ boxShadow: "none", bgcolor:"transparent" }} className={classes.container}>
      <div className={classes.cardContent}>
        <CardMedia 
          sx={{ border: "none" }}
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
