import React, { useState } from "react";
import {
  Button,
  Grid,
  Typography,
  Box,
  Card,
  CardContent,
  CardActions,
  CardMedia,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import Skeleton from "@mui/material/Skeleton";
import AddToCartIcon from "../../components/cart/AddToCartIcon";
import PaymentDrawer from "../../components/payment/PaymentDrawer";
import CartDrawer from "../../components/cart/CartDrawer";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";

const RestaurantPage = () => {
  const [selectedCard, setSelectedCard] = useState(null);
  const { isLoading, isError, error, data } = useQuery({
    queryKey: ["product"],
    queryFn: () =>
      fetch("http://localhost:3000/product/products").then((res) =>
        res.json()
      ),
    retry: 3,
    retryDelay: 1000,
  });

  const categories = [
    { id: 1, name: "Appetizers", icon: "/chip.png", itemCount: 10 },
    { id: 2, name: "Main Courses", icon: "/chip3.png", itemCount: 15 },
    { id: 3, name: "Desserts", icon: "", itemCount: 8 },
    { id: 4, name: "Drinks", icon: "", itemCount: 12 },
    { id: 5, name: "Desserts", icon: "/chip2.png", itemCount: 8 },
    { id: 6, name: "Main Courses", icon: "", itemCount: 15 },
    { id: 7, name: "Desserts", icon: "", itemCount: 8 },
    { id: 8, name: "Drinks", icon: "", itemCount: 12 },
    { id: 9, name: "Main Courses", icon: "/chip.png", itemCount: 15 },
  ];

  const [cartOpen, setCartOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleCartOpen = () => {
    setCartOpen(true);
  };

  const handleCartClose = () => {
    setCartOpen(false);
  };

  const handlePaymentOpen = () => {
    setPaymentOpen(true);
  };

  const handlePaymentClose = () => {
    setPaymentOpen(false);
  };

  const handleSelectCard = (card) => {
    setSelectedCard(card);
  };

  const handleNext = () => {
    setCurrentIndex((currentIndex + 1) % categories.length);
  };

  const handlePrev = () => {
    setCurrentIndex((currentIndex - 1 + categories.length) % categories.length);
  };

  if (isLoading) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom mt={1} pl={4}>
          Categories
        </Typography>
        <Box display="flex" mt={1} pl={4}>
          {[...Array(8)].map((_, index) => (
            <Skeleton
              key={index}
              variant="rectangular"
              width={120}
              height={120}
              mr={2}
            />
          ))}
        </Box>

        <Typography variant="h6" gutterBottom mt={2} pl={4}>
          Special Menu for you
        </Typography>
        <Box
          display="flex"
          overflowX="auto"
          gap={2}
          mt={2}
          pl={2}
          pb={2}
          css={{ scrollbarWidth: "thin" }}
        >
          {[...Array(12)].map((_, index) => (
            <Skeleton
              key={index}
              variant="rectangular"
              width={250}
              height={200}
            />
          ))}
        </Box>
      </Box>
    );
  }

  if (isError) {
    return <div>An error has occurred: {error.message}</div>;
  }

  return (
    <Box>
      <Grid container justifyContent="space-between" mt={2}>
        <Typography variant="h6" gutterBottom mt={1} pl={4}>
          Categories
        </Typography>
        <Grid item>
          <Grid container spacing={2} pr={5}>
            <Grid item>
              <Button
                size="small"
                onClick={handlePrev}
                variant="outlined"
                disabled={categories.length === 1}
              >
                <NavigateBeforeIcon />
              </Button>
            </Grid>
            <Grid item>
              <Button
                size="small"
                onClick={handleNext}
                variant="outlined"
                disabled={categories.length === 1}
              >
                <NavigateNextIcon />
              </Button>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      <Box mt={2} pl={2}>
        <Box
          display="flex"
          overflowX="auto"
          gap={2}
          mt={2}
          pl={2}
          pb={2}
          css={{ scrollbarWidth: "thin" }}
        >
          {categories.map((category, index) => (
            <Card
              key={index}
              sx={{
                minWidth: 250,
                flex: "0 0 auto",
                boxShadow: selectedCard === index ? "0 0 5px 3px #000" : "none",
              }}
              onClick={() => handleSelectCard(index)}
            >
              <CardContent>
                <Typography variant="h6" component="div">
                  {category.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Item Count: {category.itemCount}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>

      <Typography variant="h6" gutterBottom mt={2} pl={4}>
        Special Menu for you
      </Typography>

      <Box
        display="flex"
        overflowX="auto"
        gap={2}
        mt={2}
        pl={2}
        pb={2}
        css={{ scrollbarWidth: "thin" }}
      >
        {data?.products.map((menu) => (
          <Card key={menu._id} sx={{ minWidth: 250 }}>
            <CardMedia
              component="img"
              height={140}
              image={menu.image}
              alt={menu.title}
            />
            <CardContent>
              <Typography variant="h6" component="div">
                {menu.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {menu.description}
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small" onClick={handleCartOpen}>
                Add to Cart
              </Button>
            </CardActions>
          </Card>
        ))}
      </Box>

      <CartDrawer
        cartOpen={cartOpen}
        handleCartClose={handleCartClose}
        handlePaymentOpen={handlePaymentOpen}
      />

      <PaymentDrawer
        paymentOpen={paymentOpen}
        handlePaymentClose={handlePaymentClose}
      />

      <AddToCartIcon OpenCart={handleCartOpen} />
    </Box>
  );
};

export default RestaurantPage;
