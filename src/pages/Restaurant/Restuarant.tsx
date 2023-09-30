import React, { useEffect, useState } from "react";
import {
  AppBar,
  Button,
  CircularProgress,
  Divider,
  Grid,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
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
import { Paper } from "@mui/material";
import { fetchProductsByCategory } from "../../features/Product/ProductAction";

function a11yProps(index) {
  return {
    id: `full-width-tab-${index}`,
    "aria-controls": `full-width-tabpanel-${index}`,
  };
}

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

  const { data: categories, isLoading: categoriesLoading } = useQuery(
    ["categories"],
    () => fetchCategories()
  );

  const [cartOpen, setCartOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [categoryChosen, setCategoryChosen] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [value, setValue] = React.useState(0);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const handleChangeIndex = (index) => {
    setValue(index);
  };

  const dispatch = useDispatch();

  useEffect(() => {
    // When the component mounts, set isLoadingData to false
    setIsLoadingData(false);
  }, []);

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
    setCategoryChosen(true);
  };

  const handleNext = () => {
    setCurrentIndex((currentIndex + 1) % categories.length);
  };

  const handlePrev = () => {
    setCurrentIndex((currentIndex - 1 + categories.length) % categories.length);
  };

  const areProductsAvailable = products && products.length > 0;

  return (
    <>
      <Grid container spacing={3}>
        {/* Left Column */}
        <Grid item xs={8}>
          <Paper elevation={3} style={{ padding: "16px", height: "100vh" }}>
            <AppBar position="static" sx={{mb: 2, bgcolor: "#6c1c2c"}} >
              <Tabs
                value={value}
                onChange={handleChange}
                indicatorColor="secondary"
                textColor="inherit"
                variant="fullWidth"
                aria-label="full width tabs example"
              >
                <Tab label="Restaurant" {...a11yProps(0)} />
                <Tab label="BAR" {...a11yProps(1)} />
                <Tab label="Kitchen" {...a11yProps(2)} />
              </Tabs>
            </AppBar>
            <div>
              {/* Categories Loading Indicator */}
              {categoriesLoading && (
                <div>
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
              )}
              {!categoriesLoading && (
                <>
                  <Grid
                    container
                    justifyContent="center"
                    gap={2}
                    sx={{ display: "flex" }}
                  >
                    <Grid item>
                      <div
                        style={{
                          display: "flex",
                          overflow: "hidden",
                          width: "100%",
                        }}
                      >
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
                    <Grid
                      item
                      gap={2}
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
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
                </>
              )}
              <Divider sx={{ mt: 2, mb: 2 }} />
              {/* Products Loading Indicator */}
              {loading && (
                <section
                  className="cards"
                  style={{
                    display: "flex",
                    gap: "10px",
                    alignItems: "flex-start",
                    marginTop: "10px",
                    paddingLeft: "4px",
                  }}
                >
                  {[...Array(6)].map((_, index) => (
                    <SkeletonProductCard key={index} />
                  ))}
                </section>
              )}

              {/* Render Products */}
              {!loading && (
                <section
                  className="cards"
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    paddingLeft: "4px",
                  }}
                >
                  {areProductsAvailable ? (
                    products.map(
                      (menu: { _id: React.Key | null | undefined }) => (
                        <ProductCard
                          key={menu._id}
                          menu={menu}
                          handleCart={handleCartOpen}
                        />
                      )
                    )
                  ) : categoryChosen ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "100%",
                      }}
                    >
                      <Typography variant="body1" gutterBottom mt={2} pl={4}>
                        This category has no items
                      </Typography>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "100%",
                      }}
                    >
                      <Typography variant="body1" gutterBottom mt={2} pl={4}>
                        Choose a category
                      </Typography>
                    </div>
                  )}
                </section>
              )}
            </div>
          </Paper>
        </Grid>
        {/* Right Column */}
        <Grid item xs={4}>
          <CartDrawer tableData={tableData} />
        </Grid>
      </Grid>
    </>
  );
};

export default RestaurantPage;
