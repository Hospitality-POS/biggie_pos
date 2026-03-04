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
  TextField,
  InputAdornment,
  Skeleton,
  Box,
  Chip,
} from "@mui/material";
import ProductCard from "../../components/product/productCard";
import PackageCard from "../../components/cart/PackageCard";
import { useQuery } from "@tanstack/react-query";
import SkeletonProductCard from "../../components/product/skeletonProductCard";
import CategoryCard from "../../components/category/categoryCard";
import CartDrawer from "../../components/cart/CartDrawer";
import BackspaceIcon from "@mui/icons-material/Backspace";
import SearchIcon from "@mui/icons-material/Search";
import { useParams } from "react-router-dom";
import { getCart } from "../../features/Cart/CartActions";
import { fetchProductsByCategory } from "../../features/Product/ProductAction";
import VerticalTabs from "./Sidetabs";
import { useAppDispatch, useAppSelector } from "../../store";
import { fetchMainCategories } from "@services/categories";
import { fetchActivePackages, Package } from "@services/subscription";
import PurchasePackageModal from "../../components/MODALS/pro/PurchasePackageModal";
import { ShoppingCart, Build, CardGiftcard } from "@mui/icons-material";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import { usePOSMode } from "@context/POSModeContext";
import { useRetailQueue } from "@context/RetailQueueContext";
import RetailSlotIndicator from "@components/retail/RetailSlotIndicator";
import { message } from "antd";

function a11yProps(index) {
  return {
    id: `full-width-tab-${index}`,
    "aria-controls": `full-width-tabpanel-${index}`,
  };
}

const SkeletonTabs = () => {
  return (
    <Box sx={{
      display: 'flex',
      width: '100%',
      overflowX: 'auto',
      gap: 1,
      '&::-webkit-scrollbar': { height: '4px' },
      '&::-webkit-scrollbar-track': { backgroundColor: 'rgba(255,255,255,0.1)' },
      '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: '2px' },
    }}>
      {[...Array(5)].map((_, index) => (
        <Skeleton key={index} variant="rectangular" width={150} height={48} sx={{ borderRadius: 1, flexShrink: 0 }} />
      ))}
    </Box>
  );
};

const SkeletonCategoryCards = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '10px', mt: 4, ml: 1, width: '100%' }}>
      {[...Array(6)].map((_, index) => (
        <Skeleton
          key={index}
          variant="rectangular"
          width={isMobile ? '100%' : isTablet ? '45%' : '30%'}
          height={80}
          sx={{ mb: 1, borderRadius: 1 }}
        />
      ))}
    </Box>
  );
};

const SkeletonVerticalTabs = () => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, width: 120, mr: 2 }}>
    {[...Array(4)].map((_, index) => (
      <Skeleton key={index} variant="rectangular" width="100%" height={60} sx={{ borderRadius: 1 }} />
    ))}
  </Box>
);

const RestaurantPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));

  const { user } = useAppSelector((state) => state.auth);
  const { cartDetails } = useAppSelector((state) => state.cart);
  const { tableData } = useAppSelector((state) => state.Tables);
  const { products, services, loading: productsLoading } = useAppSelector((state) => state.product);
  const dispatch = useAppDispatch();
  const { id } = useParams();

  const { isRetailMode } = usePOSMode();
  const { activeTable, refreshSlots } = useRetailQueue();

  const [selectedCard, setSelectedCard] = useState(null);
  const [showCategories, setShowCategories] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [categoryChosen, setCategoryChosen] = useState(false);
  const [value, setValue] = useState(0);
  const [Subcategories, setSubcategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [activeItemType, setActiveItemType] = useState<'products' | 'services' | 'packages'>('services');
  const [purchaseModalVisible, setPurchaseModalVisible] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);

  const primaryColor = usePrimaryColor();

  const { data: packagesData, isLoading: packagesLoading, refetch: refetchPackages } = useQuery({
    queryKey: ['active-packages'],
    queryFn: () => fetchActivePackages(),
    enabled: true,
  });

  const availablePackages = packagesData?.packages || [];

  const { data: Maincategories, isLoading: mainCategoriesLoading } = useQuery({
    queryKey: ["Maincategories"],
    queryFn: fetchMainCategories,
    retry: 3,
    networkMode: "always",
  });

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredProducts(products || []);
      setFilteredServices(services || []);
      return;
    }
    const productFiltered = (products || []).filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const serviceFiltered = (services || []).filter(s =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProducts(productFiltered);
    setFilteredServices(serviceFiltered);
  }, [searchTerm, products, services]);

  useEffect(() => {
    if (services && products) {
      if (services.length === 0 && products.length > 0) {
        setActiveItemType('products');
      } else if (services.length > 0) {
        setActiveItemType('services');
      }
    }
  }, [services, products]);

  useEffect(() => {
    if (Maincategories?.length > 0) {
      handleChangeMainCategory(Maincategories[0]._id);
    }
  }, [Maincategories]);

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
    setSearchTerm("");
  };

  const handleChangeSubCategory = (subcategoryid) => {
    const subCategory = Subcategories.find(sub => sub._id === subcategoryid);
    if (subCategory) {
      setCategories(subCategory.categories || []);
    }
    setSearchTerm("");
    setShowCategories(true);
    setCategoryChosen(false);
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleCartOpen = () => {
    setCartOpen(true);
    const tableId = isRetailMode ? activeTable?._id : id;
    if (tableId) dispatch(getCart(tableId));
  };

  const handleBack = () => {
    setShowCategories(true);
    setSearchTerm("");
    setActiveItemType('services');
  };

  const handleSelectCard = (card) => {
    setSelectedCard(card);
    dispatch(fetchProductsByCategory(card));
    setCategoryChosen(true);
    setShowCategories(false);
    setSearchTerm("");
    setActiveItemType('services');
  };

  const handlePurchasePackage = (pkg: Package) => {
    setSelectedPackage(pkg);
    setPurchaseModalVisible(true);
  };

  const handlePurchaseSuccess = () => {
    refetchPackages();
  };

  // Retail: queue current order and get ready for next customer
  const handleQueueOrder = async () => {
    await refreshSlots();
    message.success('Order queued! Ready for next customer.');
  };

  const getDisplayItems = () => {
    switch (activeItemType) {
      case 'products': return filteredProducts;
      case 'services': return filteredServices;
      case 'packages': return availablePackages;
      default: return filteredServices;
    }
  };

  const displayItems = getDisplayItems();
  const areItemsAvailable = displayItems && displayItems.length > 0;
  const sortedItems = activeItemType === 'packages'
    ? displayItems
    : displayItems.slice().sort((a, b) => a.name.localeCompare(b.name));

  const isLoading = mainCategoriesLoading || productsLoading || packagesLoading;

  const renderItemTypeFilters = () => {
    const hasProducts = filteredProducts.length > 0;
    const hasServices = filteredServices.length > 0;
    const hasPackages = availablePackages.length > 0;

    if (!hasProducts && !hasServices && !hasPackages) return null;

    return (
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        {hasServices && (
          <Chip
            icon={<Build />}
            label={`Services (${filteredServices.length})`}
            variant={activeItemType === 'services' ? 'filled' : 'outlined'}
            onClick={() => setActiveItemType('services')}
            sx={{
              backgroundColor: activeItemType === 'services' ? primaryColor : 'transparent',
              color: activeItemType === 'services' ? 'white' : primaryColor,
              borderColor: primaryColor,
              '&:hover': { backgroundColor: activeItemType === 'services' ? primaryColor : 'rgba(108, 28, 44, 0.1)' },
            }}
          />
        )}
        {hasProducts && (
          <Chip
            icon={<ShoppingCart />}
            label={`Products (${filteredProducts.length})`}
            variant={activeItemType === 'products' ? 'filled' : 'outlined'}
            onClick={() => setActiveItemType('products')}
            sx={{
              backgroundColor: activeItemType === 'products' ? primaryColor : 'transparent',
              color: activeItemType === 'products' ? 'white' : primaryColor,
              borderColor: primaryColor,
              '&:hover': { backgroundColor: activeItemType === 'products' ? primaryColor : 'rgba(108, 28, 44, 0.1)' },
            }}
          />
        )}
        {hasPackages && (
          <Chip
            icon={<CardGiftcard />}
            label={`Packages (${availablePackages.length})`}
            variant={activeItemType === 'packages' ? 'filled' : 'outlined'}
            onClick={() => setActiveItemType('packages')}
            sx={{
              backgroundColor: activeItemType === 'packages' ? primaryColor : 'transparent',
              color: activeItemType === 'packages' ? 'white' : primaryColor,
              borderColor: primaryColor,
              '&:hover': { backgroundColor: activeItemType === 'packages' ? primaryColor : 'rgba(108, 28, 44, 0.1)' },
            }}
          />
        )}
      </Box>
    );
  };

  return (
    <>
      <Grid container spacing={2}>
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
              {/* Retail mode: slot indicator in top-right of AppBar */}
              {isRetailMode && (
                <Box sx={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  px: 1,
                  pt: 0.5,
                  pb: 0,
                }}>
                  <RetailSlotIndicator onQueueOrder={handleQueueOrder} />
                </Box>
              )}

              {mainCategoriesLoading ? (
                <Box sx={{ p: 1 }}>
                  <SkeletonTabs />
                </Box>
              ) : (
                <Tabs
                  value={value}
                  onChange={handleChange}
                  indicatorColor="secondary"
                  textColor="inherit"
                  variant="scrollable"
                  scrollButtons="auto"
                  allowScrollButtonsMobile
                  aria-label="main category tabs"
                  sx={{
                    '& .MuiTabs-scrollButtons': {
                      color: 'white',
                      '&.Mui-disabled': { opacity: 0.3 },
                    },
                    '& .MuiTabs-scroller': {
                      '&::-webkit-scrollbar': { height: '4px' },
                      '&::-webkit-scrollbar-track': { backgroundColor: 'rgba(255,255,255,0.1)' },
                      '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: '2px' },
                    },
                    '& .MuiTab-root': {
                      minWidth: 'auto',
                      maxWidth: 'none',
                      whiteSpace: 'nowrap',
                      fontSize: isMobile ? '0.875rem' : '1rem',
                      fontWeight: 500,
                      textTransform: 'none',
                      padding: '12px 16px',
                      overflow: 'visible',
                      textOverflow: 'clip',
                      '&:hover': {
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        transition: 'background-color 0.3s ease',
                      },
                    },
                    '& .MuiTabs-indicator': {
                      backgroundColor: 'white',
                      height: '3px',
                    },
                  }}
                >
                  {Maincategories?.length
                    ? Maincategories.map((categ, index) => (
                      <Tab
                        key={categ._id}
                        onClick={() => handleChangeMainCategory(categ._id)}
                        label={categ.name}
                        {...a11yProps(index)}
                      />
                    ))
                    : null}
                </Tabs>
              )}
            </AppBar>
            <Divider sx={{ mt: 2, mb: 2 }} />

            {mainCategoriesLoading ? (
              <Box sx={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                height: 'calc(100% - 100px)',
              }}>
                {!isMobile && <SkeletonVerticalTabs />}
                <SkeletonCategoryCards />
              </Box>
            ) : Subcategories.length ? (
              <div style={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                height: isMobile ? "auto" : "64vh",
              }}>
                <div style={{
                  height: isMobile ? "auto" : "inherit",
                  width: isMobile ? "100%" : "auto",
                }}>
                  <VerticalTabs
                    subcategories={Subcategories}
                    handleSubCategoryChange={handleChangeSubCategory}
                  />
                </div>
                <div style={{ flex: 1, overflowY: "auto" }}>
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
                      {isLoading ? (
                        <SkeletonCategoryCards />
                      ) : categories.length ? (
                        categories.map((category) => (
                          <CategoryCard
                            style={{
                              flex: isMobile
                                ? "0 0 100%"
                                : isTablet
                                  ? "0 0 45%"
                                  : `0 0 ${100 / Math.min(categories?.length, 3)}%`,
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
                        <Alert variant="filled" severity="info" sx={{ width: "100%", bgcolor: "#DEAC80" }}>
                          <AlertTitle>Sorry</AlertTitle>
                          Empty categories!
                        </Alert>
                      )}
                    </section>
                  ) : (
                    <div style={{ width: "inherit" }}>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "16px",
                      }}>
                        <TextField
                          placeholder={activeItemType === 'packages' ? "Search Packages..." : "Search Items..."}
                          variant="outlined"
                          size="small"
                          fullWidth
                          value={searchTerm}
                          onChange={handleSearchChange}
                          sx={{
                            maxWidth: isMobile ? "80%" : "100%",
                            padding: "0 8px",
                            "& .MuiOutlinedInput-root": {
                              borderRadius: "20px",
                              borderColor: primaryColor,
                              "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: primaryColor },
                              "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: primaryColor },
                            },
                          }}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <SearchIcon style={{ color: primaryColor }} />
                              </InputAdornment>
                            ),
                          }}
                        />
                        <IconButton
                          onClick={handleBack}
                          sx={{ color: primaryColor, "&:hover": { color: "#bc8c7c" } }}
                        >
                          <BackspaceIcon fontSize="large" />
                        </IconButton>
                      </div>

                      {renderItemTypeFilters()}

                      {productsLoading || packagesLoading ? (
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
                      ) : (
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
                          {areItemsAvailable ? (
                            activeItemType === 'packages' ? (
                              sortedItems.map((pkg: Package) => (
                                <PackageCard
                                  key={pkg._id}
                                  package={pkg}
                                  onPurchase={handlePurchasePackage}
                                  style={{
                                    flex: isMobile ? "0 0 100%" : isTablet ? "0 0 45%" : "0 0 30%",
                                    marginBottom: "10px",
                                  }}
                                />
                              ))
                            ) : (
                              sortedItems.map((item) => (
                                <ProductCard
                                  key={item._id}
                                  menu={item}
                                  handleCart={handleCartOpen}
                                  style={{
                                    flex: isMobile ? "0 0 100%" : isTablet ? "0 0 45%" : "0 0 30%",
                                    marginBottom: "10px",
                                  }}
                                />
                              ))
                            )
                          ) : searchTerm ? (
                            <div style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "100%",
                              padding: "16px",
                            }}>
                              <Alert variant="filled" severity="info" sx={{ width: "100%", bgcolor: "#DEAC80" }}>
                                <AlertTitle>No Results</AlertTitle>
                                No items match your search "{searchTerm}"
                              </Alert>
                            </div>
                          ) : categoryChosen ? (
                            <div style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              height: "100%",
                              width: "inherit",
                            }}>
                              <Alert variant="filled" severity="info" sx={{ width: "100%", bgcolor: "#DEAC80" }}>
                                <AlertTitle>Sorry</AlertTitle>
                                This category has no items!
                              </Alert>
                            </div>
                          ) : (
                            <div style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              height: "100%",
                            }}>
                              <Typography variant="body1" gutterBottom mt={2} pl={4}>
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
              <Alert variant="filled" severity="info" sx={{ width: "100%", bgcolor: "#DEAC80" }}>
                <AlertTitle>Sorry</AlertTitle>
                This category has no items!
              </Alert>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <CartDrawer />
        </Grid>
      </Grid>

      <PurchasePackageModal
        visible={purchaseModalVisible}
        package={selectedPackage}
        onClose={() => {
          setPurchaseModalVisible(false);
          setSelectedPackage(null);
        }}
        onSuccess={handlePurchaseSuccess}
      />
    </>
  );
};

export default RestaurantPage;