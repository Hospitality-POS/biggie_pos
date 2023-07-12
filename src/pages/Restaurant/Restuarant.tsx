import React, { useState } from "react";

import { Typography } from "@mui/material";
import ProductCard from "../../components/product/productCard";
import { useQuery } from "@tanstack/react-query";
import SkeletonProductCard from "../../components/product/skeletonProductCard";
import CategoryCard from "../../components/category/categoryCard";
import SkeletonCategoryCard from "../../components/category/skeletonCategoryCard";
import AddToCartIcon from "../../components/cart/AddToCartIcon";
import PaymentDrawer from "../../components/payment/PaymentDrawer";
import CartDrawer from "../../components/cart/CartDrawer";

const RestaurantPage = () => {
  const [selectedCard, setSelectedCard] = useState(null);
  const { isLoading, error, data } = useQuery({
    queryKey: ["product"],
    queryFn: () =>
      fetch("http://localhost:3000/product/products").then((res) => res.json()),
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

  if (isLoading) {
    return (
      <>
        <div>
          <Typography variant="h6" gutterBottom mt={1} pl={4}>
            Categories
          </Typography>
          <section
            className="cards"
            style={{
              display: "flex",
              gap: "20px",
              marginTop: "10px",
              paddingLeft: "4px",
            }}
          >
            {[...Array(8)].map((_, index) => (
              <SkeletonCategoryCard key={index} />
            ))}
          </section>
       
          <Typography variant="h6" gutterBottom mt={2} pl={4}>
            Special Menu for you
          </Typography>
          <section
            className="cards"
            style={{
              display: "flex",
              gap: "20px",
              marginTop: "10px",
              paddingLeft: "4px",
            }}
          >
            {[...Array(12)].map((_, index) => (
              <SkeletonProductCard key={index} />
            ))}
          </section>
        </div>
      </>
    );
  }

  if (error) {
    return <div>An error has occurred: {error.message}</div>;
  }

  return (
    <div>
      <Typography variant="h6" gutterBottom mt={1} pl={4}>
        Categories
      </Typography>
      <section
        className="cards"
        style={{
          display: "flex",
          gap: "20px",
          marginTop: "10px",
        }}
      >
        {categories.map((category, index) => (
          <CategoryCard
            key={index}
            handleSelectedCard={handleSelectCard}
            selectedCard={selectedCard}
            icon={category.icon}
            name={category.name}
            itemCount={category.itemCount}
            id={category.id}
          />
        ))}
      </section>

      <Typography variant="h6" gutterBottom mt={2} pl={4}>
        Special Menu for you
      </Typography>

      <section
        className="cards"
        style={{
          display: "flex",
          gap: "20px",
          marginTop: "10px",
          paddingLeft: "4px",
        }}
      >
        {data?.products.map((menu: { _id: React.Key | null | undefined }) => (
          <ProductCard key={menu._id} menu={menu} handleCart={handleCartOpen} />
        ))}
      </section>

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
    </div>
  );
};

export default RestaurantPage;
