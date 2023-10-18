import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  AlertTitle,
  AppBar,
  Button,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import ProductCard from "../../components/product/productCard";
import TapasIcon from "@mui/icons-material/Tapas";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import SkeletonProductCard from "../../components/product/skeletonProductCard";
import CategoryCard from "../../components/category/categoryCard";
import SoupKitchenIcon from "@mui/icons-material/SoupKitchen";
import SkeletonCategoryCard from "../../components/category/skeletonCategoryCard";
import AddToCartIcon from "../../components/cart/AddToCartIcon";
import PaymentDrawer from "../../components/payment/PaymentDrawer";
import CartDrawer from "../../components/cart/CartDrawer";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import LocalBarIcon from "@mui/icons-material/LocalBar";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import BackspaceIcon from "@mui/icons-material/Backspace";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { createCart, fetchCartItems, getCart } from "../../features/Cart/CartActions";
import axios from "axios";
import { Paper } from "@mui/material";
import { fetchProductsByCategory } from "../../features/Product/ProductAction";
import VerticalTabs from "./Sidetabs";
import { fetchsubcategories } from "../../features/Category/CategoryActions";
import { useAppDispatch, useAppSelector } from "../../store";
import { fetchTableById } from "../../features/Table/TableActions";
import CartLoader from "../../components/spinner/cartLoader";

function a11yProps(index: any) {
  return {
    id: `full-width-tab-${index}`,
    "aria-controls": `full-width-tabpanel-${index}`,
  };
}

interface Cartrefetch {
    table_id: string ;
    created_by: string;
}

const RestaurantPage: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const { cartDetails } = useAppSelector((state) => state.cart);
    const { tableData } = useAppSelector((state) => state.Tables);

  const { products, loading } = useAppSelector((state) => state.product);
  const { category: categories } = useAppSelector((state) => state.Categories);
  const { subCategory: Subcategories } = useAppSelector((state) => state.Categories);
  const dispatch = useAppDispatch();
  const [selectedCard, setSelectedCard] = useState(null);
  const [showCategories, setShowCategories] = useState(true);
  const { id } = useParams();
  

const queryClient = useQueryClient();


queryClient.invalidateQueries({ queryKey: ['table_name'] })
queryClient.invalidateQueries({ queryKey: ['Maincategories'] })

  // const { data: tableData } = useQuery({
  //   queryKey: ["table_name"],
  //   queryFn: () =>
  //     fetch(`http://localhost:3000/tables/${cartDetails?.table_id}`).then((res) => res.json()),
  // });


  const fetchMainCategories = async () => {
    const response = await axios.get(
      "http://localhost:3000/categories/main-categories"
    );
    return response.data;
  };

  const { data: Maincategories } = useQuery(["Maincategories"], () =>
    fetchMainCategories()
  );

  const handleBack = () => {
    setShowCategories(true);
  };

  const [cartOpen, setCartOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [categoryChosen, setCategoryChosen] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [mainCategoryId, setMainCategoryId] = useState("");
  const [value, setValue] = React.useState(0);

  const handleChange = (event: any, newValue: React.SetStateAction<number>) => {
    setValue(newValue);
  };

  const handleChangeIndex = (index: React.SetStateAction<number>) => {
    setValue(index);
  };

  const handleChangeMainCategory = (
    maincategoryid: React.SetStateAction<string>
  ) => {
    // setMainCategoryId(maincategoryid)
    dispatch(fetchsubcategories(maincategoryid));
  };

  

  const handleCartOpen = () => {
    setCartOpen(true);
    dispatch(getCart(id));
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

  const handleSelectCard = (card: any) => {
    setSelectedCard(card);
    // console.log("thisis", card);
    dispatch(fetchProductsByCategory(card));
    setCategoryChosen(true);
    setShowCategories(false);
  };

  const areProductsAvailable = products && products.length > 0;

  const cartId = cartDetails?._id;

  // const dispatchFetchCart = useCallback(() => {
  //   return dispatch(getCart(cartId));
  // }, [cartId, dispatch]);

  // const dispatchfetchsubcateg = useCallback(async()=>{
  //   return dispatch(fetchsubcategories("6525f7b62d06da587b70d5d5"));
  // },[dispatch])

  const dispatchfetchsubcateg = useCallback(async () => {
    setIsLoadingData(true);
    try {
      await dispatch(fetchsubcategories("6525f7b62d06da587b70d5d5"));
    } catch (error) {
      // Handle error if necessary
    } finally {
      setIsLoadingData(false);
    }
  }, [dispatch]);

  // const dispatchfetctaldata=useCallback(()=>{
  //   return dispatch(fetchTableById(id))
  // },[dispatch, id])

  const dispatchfetctaldata = useCallback(async () => {
    setIsLoadingData(true);
    try {
      await dispatch(fetchTableById(id));
    } catch (error) {
      // Handle error if necessary
    } finally {
      setIsLoadingData(false);
    }
  }, [dispatch, id]);

  // const dispatchFetchCartdetails = useCallback(()=>{
  //   return dispatch(getCart(id))
  // },[dispatch, id])
  
  
  useEffect(() => {
    // if (cartDetails?._id) {
    //   dispatchFetchCart();
    // }
    // dispatchFetchCartdetails()
    dispatchfetchsubcateg()
    dispatchfetctaldata()
  }, [cartDetails._id, dispatchfetchsubcateg, dispatchfetctaldata]);

  useEffect(() => {
    setIsLoadingData(false);
  }, []);

  return (
    <>
      <Grid container spacing={3}>
        {/* Left Column */}
        <Grid item xs={8}>
          <Paper elevation={3} style={{ padding: "16px", height: "90vh" }}>
            <AppBar position="static" sx={{ mb: 2, bgcolor: "#6c1c2c" }}>
              <Tabs
                value={value}
                onChange={handleChange}
                indicatorColor="secondary"
                textColor="inherit"
                variant="fullWidth"
                aria-label="full width tabs example"
              >
                {Maincategories?.map(
                  (
                    categ: {
                      _id: React.Key | null | undefined;
                      name:
                        | string
                        | number
                        | boolean
                        | React.ReactElement<
                            any,
                            string | React.JSXElementConstructor<any>
                          >
                        | Iterable<React.ReactNode>
                        | React.ReactPortal
                        | null
                        | undefined;
                    },
                    index: any
                  ) => (
                    <Tab
                      key={categ._id}
                      onClick={() => handleChangeMainCategory(categ._id)}
                      iconPosition="start"
                      label={categ.name}
                      {...a11yProps(index)}
                    />
                  )
                )}
                </Tabs>
            </AppBar>
            <Divider sx={{ mt: 2, mb: 2 }} />
            {Subcategories.length ? (
              <div style={{ display: "flex", flexDirection: "row" }}>
                {/* {isLoadingData? <CartLoader/>:""} */}
                <div style={{ height: "inherit" }}>
                  <VerticalTabs />
                </div>
                <div style={{ width: "100%" }}>
                  {showCategories ? (
                    <section
                      className="cards"
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "flex-start",
                        gap: "10px",
                        paddingLeft: "4px",
                        marginLeft: "10px",
                        marginTop: 38,
                      }}
                    >
                      {categories.length ? (
                        categories.map(
                          (category: { _id: string; name: string }) => (
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
                              itemCount={1}
                              id={category._id}
                            />
                          )
                        )
                      ) : (
                        <>
                        <CartLoader/>
                          <Alert
                            variant="filled"
                            severity="info"
                            sx={{ width: "100%", bgcolor: "#bc8c7c" }}
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
                            color: "#6c1c2c",
                            "&:hover": {
                              color: "#bc8c7c",
                            },
                          }}
                        >
                          <BackspaceIcon fontSize="large"/>
                        </IconButton>
                      </div>
                      {loading && (
                        <section
                          className="cards"
                          style={{
                            display: "flex",
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
                            alignItems: "flex-start",
                            justifyContent: "flex-start",
                            gap: "10px",
                            marginLeft: 4,
                            paddingLeft: "4px",
                            width: "inherit",
                          }}
                        >
                          {areProductsAvailable ? (
                            products.map(
                              (menu: {
                                _id: React.Key | null | undefined | string;
                              }) => (
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
                                width: "inherit",
                              }}
                            >
                              <Alert
                                variant="filled"
                                severity="info"
                                sx={{ width: "100%", bgcolor: "#bc8c7c" }}
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
              <>
                <Alert
                  variant="filled"
                  severity="info"
                  sx={{ width: "100%", bgcolor: "#bc8c7c" }}
                >
                  <AlertTitle>Sorry</AlertTitle>
                  This category has no items!
                </Alert>
              </>
            )}
          </Paper>
        </Grid>
        {/* Right Column */}
        <Grid item xs={4}>
          <CartDrawer />
        </Grid>
      </Grid>
    </>
  );
};

export default RestaurantPage;
