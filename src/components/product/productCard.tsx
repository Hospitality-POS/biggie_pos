import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import Typography from "@mui/material/Typography";
import { CardActionArea} from "@mui/material";
import { useDispatch } from "react-redux";
import { addItem } from "../../features/Cart/CartSlice";


function formatPrice(price: { toLocaleString: () => any }) {
  return price.toLocaleString();
}

function ProductCard({ menu }: any) {
  const dispatch = useDispatch()

  const handleAddToCart=()=>{
    dispatch(addItem(menu))
  }
  return (
    <Card
      sx={{ maxWidth: 345, width: "200px", height: "250px" }}
      onClick={handleAddToCart}
    >
      <CardActionArea>
        <CardMedia
          component="img"
          height="150px"
          width="120px"
          image={menu.image ? menu.image : "/food.jpg"}
          alt="Product"
        />
        <CardContent>
          <div >
            <Typography
              gutterBottom
              variant="h6"
              fontSize={18}
              component="span"
              color="text.secondary"
            >
              {menu.name} 
            </Typography>
          </div>
          <div>
            <Typography
              variant="body1"
              color="text.primary"
              fontWeight={"bold"}
              fontSize={18}
              mt={1}
            >
              Ksh. {formatPrice(menu.price)}
            </Typography>
          </div>
        </CardContent>
      </CardActionArea>
      
    </Card>
  );
}

export default ProductCard;
