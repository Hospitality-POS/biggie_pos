import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import Typography from "@mui/material/Typography";
import { CardActionArea } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { addItemToCart } from "../../features/Cart/CartActions";
import { useParams } from "react-router-dom";

function formatPrice(price: { toLocaleString: () => any }) {
  return price.toLocaleString();
}

interface ProductCardProps {
  menu: {
    _id: string;
    name: string;
    price: number;
    desc: string;
    image?: string;
  };
  table_id: string;
}

function ProductCard({ menu }: ProductCardProps) {
  const { user } = useSelector((state: any) => state.auth);
  const { cart } = useSelector((state: any) => state.cart);
  const dispatch = useDispatch();

  const { id } = useParams();

  const handleAddToCart = () => {
    dispatch(
      addItemToCart({
        cart_id: cart._id,
        product_id: menu._id,
        price: menu.price,
        created_by: user._id,
        desc: menu.desc,
        table_id: id,
      })
    );
  };
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
          <div>
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
