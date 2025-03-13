import React, { useState, useEffect } from "react";
import {
  Alert,
  AlertTitle,
  AppBar,
  Divider,
  Grid,
  IconButton,
  Tab,
  Tabs,
  Typography,
  useMediaQuery,
  useTheme,
  Paper,
} from "@mui/material";
import ProductCard from "../../components/product/productCard";
import { useQuery } from "@tanstack/react-query";
import SkeletonProductCard from "../../components/product/skeletonProductCard";
import CategoryCard from "../../components/category/categoryCard";
import CartDrawer from "../../components/cart/CartDrawer";
import BackspaceIcon from "@mui/icons-material/Backspace";
import { useParams } from "react-router-dom";
import { getCart } from "../../features/Cart/CartActions";
import { fetchProductsByCategory } from "../../features/Product/ProductAction";
import VerticalTabs from "./Sidetabs";
import { useAppDispatch, useAppSelector } from "../../store";
import { fetchTableById } from "../../features/Table/TableActions";
import CartLoader from "../../components/spinner/cartLoader";
import { fetchMainCategories } from "@services/categories";

function a11yProps(index) {
  return {
    id: `full-width-tab-${index}`,
    "aria-controls": `full-width-tabpanel-${index}`,
  };
}

const RestaurantPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));

  const { user } = useAppSelector((state) => state.auth);
  const { cartDetails } = useAppSelector((state) => state.cart);
  const { tableData } = useAppSelector((state) => state.Tables);
  const { products, loading } = useAppSelector((state) => state.product);
  const dispatch = useAppDispatch();
  const [selectedCard, setSelectedCard] = useState(null);
  const [showCategories, setShowCategories] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [categoryChosen, setCategoryChosen] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [value, setValue] = React.useState(0);
  const [Subcategories, setSubcategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [primaryColor, setPrimaryColor] = useState("#6c1c2c");

  // Get tenant primary color on component mount
  useEffect(() => {
    const storedTenant = localStorage.getItem("tenant");
    const tenant = storedTenant ? JSON.parse(storedTenant) : null;
    if (tenant && tenant.primary_color) {
      setPrimaryColor(tenant.primary_color);
    }
  }, []);


  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const handleChangeMainCategory = (maincategoryid) => {
    if (!Maincategories) return;
    const mainCategory = Maincategories.find(categ => categ._id === maincategoryid);

    if (mainCategory) {
      setSubcategories(mainCategory.sub_categories || []);
      if (mainCategory.sub_categories.length > 0) {
        setCategories(mainCategory.sub_categories[0].categories || []);
      } else {
        setCategories([]);
      }
    }
  };

  const handleChangeSubCategory = (subcategoryid) => {
    const subCategory = Subcategories.find(sub => sub._id === subcategoryid);
    if (subCategory) {
      setCategories(subCategory.categories || []);
    }
  };

  const { id } = useParams();

  const { data: Maincategories, isLoading: mainCategoriesLoading } = useQuery({
    queryKey: ["Maincategories"],
    queryFn: fetchMainCategories,
    retry: 3,
    networkMode: "always",
    onSuccess: (data) => {
      if (data?.length > 0) {
        const firstCategoryId = data[0]._id; // Use the first category's ID
        handleChangeMainCategory(firstCategoryId);
      }
      setIsLoadingData(false);
    },
    onError: (error) => {
      console.error("Error fetching main categories:", error); // Handle error if necessary
      setIsLoadingData(false);
    }
  });

  useEffect(() => {
    if (Maincategories?.length > 0) {
      const firstCategoryId = Maincategories[0]._id;
      handleChangeMainCategory(firstCategoryId);
    }
  }, [Maincategories]);

  console.log("Maincategories", Maincategories);

  const handleCartOpen = () => {
    setCartOpen(true);
    dispatch(getCart(id));
  };

  const handleBack = () => {
    setShowCategories(true);
  };

  const handleSelectCard = (card) => {
    setSelectedCard(card);
    dispatch(fetchProductsByCategory(card));
    setCategoryChosen(true);
    setShowCategories(false);
  };

  const areProductsAvailable = products && products.length > 0;
  const sortedProducts = products
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Grid container spacing={2}>
      {/* Left Column */}
      <Grid item xs={12} md={8}>
        <Paper
          elevation={3}
          style={{
            padding: "16px",
            height: "80vh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <AppBar position="static" sx={{ mb: 2, bgcolor: primaryColor }}>
            <Tabs
              value={value}
              onChange={handleChange}
              indicatorColor="secondary"
              textColor="inherit"
              variant={isMobile ? "scrollable" : "fullWidth"}
              scrollButtons="auto"
              aria-label="full width tabs example"
            >
              {Maincategories?.length
                ? Maincategories.map((categ, index) => (
                  <Tab
                    key={categ._id}
                    onClick={() => handleChangeMainCategory(categ._id)}
                    iconPosition="start"
                    style={{ height: isMobile ? "auto" : 20 }}
                    label={categ.name}
                    {...a11yProps(index)}
                  />
                ))
                : ""}
            </Tabs>
          </AppBar>
          <Divider sx={{ mt: 2, mb: 2 }} />
          {Subcategories.length ? (
            <div
              style={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                height: isMobile ? "auto" : "64vh",
              }}
            >
              {isLoadingData && mainCategoriesLoading ? <CartLoader /> : ""}
              <div
                style={{
                  height: isMobile ? "auto" : "inherit",
                  width: isMobile ? "100%" : "auto",
                }}
              >
                <VerticalTabs
                  subcategories={Subcategories}
                  handleSubCategoryChange={handleChangeSubCategory}
                />
              </div>
              <div
                // style={{
                //   width: "100%",
                //   overflowY: isMobile ? "visible" : "auto",
                // }}
                style={{
                  flex: 1,
                  overflowY: "auto",
                }}
              >
                {showCategories ? (
                  <section
                    className="cards"
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "flex-start",
                      justifyContent: "flex-start",
                      gap: "10px",
                      paddingLeft: "4px",
                      marginLeft: "10px",
                      marginTop: 38,
                    }}
                  >
                    {categories.length ? (
                      categories.map((category) => (
                        <CategoryCard
                          style={{
                            flex: isMobile
                              ? "0 0 100%"
                              : isTablet
                                ? "0 0 45%"
                                : `0 0 ${100 / categories?.length}%`,
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            border: "1px solid black",
                            marginBottom: isMobile ? "10px" : "0",
                          }}
                          key={category._id}
                          handleSelectedCard={handleSelectCard}
                          selectedCard={selectedCard}
                          icon={"/categoryIcon.svg"}
                          name={category.name}
                          itemCount={1}
                          id={category._id}
                        />
                      ))
                    ) : (
                      <>
                        <CartLoader />
                        <Alert
                          variant="filled"
                          severity="info"
                          sx={{ width: "100%", bgcolor: "#DEAC80" }}
                        >
                          <AlertTitle>Sorry</AlertTitle>
                          Empty categories!
                        </Alert>
                      </>
                    )}
                  </section>
                ) : (
                  <div style={{ width: "inherit" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-end",
                        justifyContent: "flex-end",
                      }}
                    >
                      <IconButton
                        onClick={handleBack}
                        sx={{
                          color: primaryColor,
                          "&:hover": {
                            color: "#bc8c7c",
                          },
                        }}
                      >
                        <BackspaceIcon fontSize="large" />
                      </IconButton>
                    </div>
                    {loading && (
                      <section
                        className="cards"
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          alignItems: "flex-start",
                          justifyContent: "flex-start",
                          gap: "10px",
                          marginLeft: 4,
                          paddingLeft: "4px",
                        }}
                      >
                        {[...Array(6)].map((_, index) => (
                          <SkeletonProductCard key={index} />
                        ))}
                      </section>
                    )}
                    {!loading && (
                      <section
                        className="cards"
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          alignItems: "flex-start",
                          justifyContent: "flex-start",
                          gap: "10px",
                          marginLeft: 4,
                          width: "inherit",
                          maxHeight: isMobile ? "none" : "70vh",
                          overflowY: isMobile ? "visible" : "auto",
                        }}
                      >
                        {areProductsAvailable ? (
                          sortedProducts.map((menu) => (
                            <ProductCard
                              key={menu._id}
                              menu={menu}
                              handleCart={handleCartOpen}
                              style={{
                                flex: isMobile
                                  ? "0 0 100%"
                                  : isTablet
                                    ? "0 0 45%"
                                    : "0 0 30%",
                                marginBottom: "10px",
                              }}
                            />
                          ))
                        ) : categoryChosen ? (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              height: "100%",
                              width: "inherit",
                            }}
                          >
                            <Alert
                              variant="filled"
                              severity="info"
                              sx={{ width: "100%", bgcolor: "#DEAC80" }}
                            >
                              <AlertTitle>Sorry</AlertTitle>
                              This category has no items!
                            </Alert>
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
                            <Typography
                              variant="body1"
                              gutterBottom
                              mt={2}
                              pl={4}
                            >
                              Choose a category
                            </Typography>
                          </div>
                        )}
                      </section>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Alert
              variant="filled"
              severity="info"
              sx={{ width: "100%", bgcolor: "#DEAC80" }}
            >
              <AlertTitle>Sorry</AlertTitle>
              This category has no items!
            </Alert>
          )}
        </Paper>
      </Grid>
      {/* Right Column */}
      <Grid item xs={12} md={4}>
        <CartDrawer />
      </Grid>
    </Grid>
  );
};

export default RestaurantPage;