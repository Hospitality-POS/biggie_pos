import React, { useState } from "react";

import { Button, Grid, Typography } from "@mui/material";
import ProductCard from "../../components/product/productCard";
import { useQuery } from "@tanstack/react-query";
import SkeletonProductCard from "../../components/product/skeletonProductCard";
import CategoryCard from "../../components/category/categoryCard";
import SkeletonCategoryCard from "../../components/category/skeletonCategoryCard";
import AddToCartIcon from "../../components/cart/AddToCartIcon";
import PaymentDrawer from "../../components/payment/PaymentDrawer";
import CartDrawer from "../../components/cart/CartDrawer";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchCartItems } from "../../features/Cart/CartActions";
import axios from "axios";
import { fetchProductsByCategory } from "../../features/Product/ProductAction";

const RestaurantPage = () => {
  const { user } = useSelector((state: any) => state.auth);
  const { cartDetails } = useSelector((state: any) => state.cart);
  const { products, loading } = useSelector((state: any) => state.product);
  const [selectedCard, setSelectedCard] = useState(null);
  const { id } = useParams();

  const { data: tableData } = useQuery({
    queryKey: ["table_name"],
    queryFn: () =>
      fetch(`http://localhost:3000/tables/${id}`, {
        headers: {
          Authorization: `Bearer ${user.Token}`,
        },
      }).then((res) => res.json()),
    retry: 3,
    retryDelay: 1000,
  });

  const fetchCategories = async () => {
    const response = await axios.get("http://localhost:3000/categories");
    return response.data;
  };

  const { data: categories, isLoading } = useQuery(["categories"], () =>
    fetchCategories()
  );

  const [cartOpen, setCartOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const dispatch = useDispatch();

  const handleCartOpen = () => {
    setCartOpen(true);
    dispatch(fetchCartItems(cartDetails?._id));
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
  const handleSelectCard = (card: React.SetStateAction<null>) => {
    setSelectedCard(card);
    dispatch(fetchProductsByCategory(card));
  };
  const handleNext = () => {
    setCurrentIndex((currentIndex + 1) % categories.length);
  };

  const handlePrev = () => {
    setCurrentIndex((currentIndex - 1 + categories.length) % categories.length);
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
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <div>
          {/* <Typography variant="h6" gutterBottom mt={1} pl={4}>
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
          </section> */}

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

  return (
    <>
      <Grid item xs={12}>
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
                  sx={{
                    color: "#6c1c2c",
                    borderColor: "#6c1c2c",

                    "&:hover": {
                      borderColor: "#bc8c7c",
                      color: "#bc8c7c",
                    },
                  }}
                  disabled={categories?.length === 1}
                >
                  <NavigateBeforeIcon />
                </Button>
              </Grid>
              <Grid item>
                <Button
                  size="small"
                  onClick={handleNext}
                  variant="outlined"
                  sx={{
                    color: "#6c1c2c",
                    borderColor: "#6c1c2c",

                    "&:hover": {
                      borderColor: "#bc8c7c",
                      color: "#bc8c7c",
                    },
                  }}
                  disabled={categories?.length === 1}
                >
                  <NavigateNextIcon />
                </Button>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      <Grid item xs={12}>
        <Grid container justifyContent="center">
          <Grid item>
            <div style={{ display: "flex", overflow: "hidden", width: "100%" }}>
              <div
                style={{
                  display: "flex",
                  gap: "20px",
                  width: `${categories?.length * 100}%`,
                  transform: `translateX(-${
                    currentIndex * (100 / categories?.length)
                  }%)`,
                  transition: "transform 0.5s ease-in-out",
                }}
              >
                {categories?.map(
                  (category: {
                    product_count: number;
                    _id: string;
                    name: string;
                  }) => (
                    <CategoryCard
                      style={{
                        flex: `0 0 ${100 / categories?.length}%`,
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        border: "1px solid black",
                      }}
                      key={category._id}
                      handleSelectedCard={handleSelectCard}
                      selectedCard={selectedCard}
                      icon={"/chip.png"}
                      name={category.name}
                      itemCount={category.product_count}
                      id={category._id}
                    />
                  )
                )}
              </div>
            </div>
          </Grid>
        </Grid>
      </Grid>

      {/* </section> */}

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
        {products?.map((menu: { _id: React.Key | null | undefined }) => (
          <ProductCard key={menu._id} menu={menu} handleCart={handleCartOpen} />
        ))}
      </section>

      <CartDrawer
        tableData={tableData}
        cartOpen={cartOpen}
        handleCartClose={handleCartClose}
        handlePaymentOpen={handlePaymentOpen}
      />

      <PaymentDrawer
        paymentOpen={paymentOpen}
        handlePaymentClose={handlePaymentClose}
      />

      <AddToCartIcon OpenCart={handleCartOpen} />
    </>
  );
};

export default RestaurantPage;
