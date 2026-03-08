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
  Drawer,
  Fab,
} from "@mui/material";
import ProductCard from "../../components/product/productCard";
import PackageCard from "../../components/cart/PackageCard";
import { useQuery } from "@tanstack/react-query";
import SkeletonProductCard from "../../components/product/skeletonProductCard";
import CategoryCard from "../../components/category/categoryCard";
import CartDrawer from "../../components/cart/CartDrawer";
import BackspaceIcon from "@mui/icons-material/Backspace";
import SearchIcon from "@mui/icons-material/Search";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
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

// ── Skeletons ─────────────────────────────────────────────────────────────────

const SkeletonTabs = () => (
  <Box sx={{
    display: "flex", width: "100%", overflowX: "auto", gap: 1,
    "&::-webkit-scrollbar": { height: "4px" },
    "&::-webkit-scrollbar-track": { backgroundColor: "rgba(255,255,255,0.1)" },
    "&::-webkit-scrollbar-thumb": { backgroundColor: "rgba(255,255,255,0.3)", borderRadius: "2px" },
  }}>
    {[...Array(5)].map((_, i) => (
      <Skeleton key={i} variant="rectangular" width={120} height={44} sx={{ borderRadius: 1, flexShrink: 0 }} />
    ))}
  </Box>
);

const SkeletonCategoryCards = ({ isMobile, isTablet }: { isMobile: boolean; isTablet: boolean }) => (
  <Box sx={{ display: "flex", flexWrap: "wrap", gap: "10px", mt: 2, width: "100%" }}>
    {[...Array(6)].map((_, i) => (
      <Skeleton
        key={i}
        variant="rectangular"
        width={isMobile ? "100%" : isTablet ? "45%" : "30%"}
        height={80}
        sx={{ borderRadius: 2 }}
      />
    ))}
  </Box>
);

const SkeletonVerticalTabs = () => (
  <Box sx={{ display: "flex", flexDirection: "column", gap: 1, width: 130, mr: 1, flexShrink: 0 }}>
    {[...Array(5)].map((_, i) => (
      <Skeleton key={i} variant="rectangular" width="100%" height={44} sx={{ borderRadius: 1 }} />
    ))}
  </Box>
);

// ── Main Component ────────────────────────────────────────────────────────────

const RestaurantPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));

  const { products, services, loading: productsLoading } = useAppSelector((state) => state.product);
  const dispatch = useAppDispatch();
  const { id } = useParams();

  const { isRetailMode } = usePOSMode();
  const { activeTable, refreshSlots } = useRetailQueue();

  const [selectedCard, setSelectedCard] = useState(null);
  const [showCategories, setShowCategories] = useState(true);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [categoryChosen, setCategoryChosen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [subcategories, setSubcategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [activeItemType, setActiveItemType] = useState<"products" | "services" | "packages">("services");
  const [purchaseModalVisible, setPurchaseModalVisible] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);

  const primaryColor = usePrimaryColor();

  const { data: packagesData, isLoading: packagesLoading, refetch: refetchPackages } = useQuery({
    queryKey: ["active-packages"],
    queryFn: fetchActivePackages,
    enabled: true,
  });
  const availablePackages = packagesData?.packages || [];

  const { data: Maincategories, isLoading: mainCategoriesLoading } = useQuery({
    queryKey: ["Maincategories"],
    queryFn: fetchMainCategories,
    retry: 3,
    networkMode: "always",
  });

  // ── Effects ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredProducts(products || []);
      setFilteredServices(services || []);
      return;
    }
    const term = searchTerm.toLowerCase();
    setFilteredProducts((products || []).filter((p) => p.name.toLowerCase().includes(term)));
    setFilteredServices((services || []).filter((s) => s.name.toLowerCase().includes(term)));
  }, [searchTerm, products, services]);

  useEffect(() => {
    if (services && products) {
      if (services.length === 0 && products.length > 0) setActiveItemType("products");
      else if (services.length > 0) setActiveItemType("services");
    }
  }, [services, products]);

  useEffect(() => {
    if (Maincategories?.length > 0) handleChangeMainCategory(Maincategories[0]._id);
  }, [Maincategories]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleChangeMainCategory = (id: string) => {
    if (!Maincategories) return;
    const main = Maincategories.find((c) => c._id === id);
    if (main) {
      setSubcategories(main.sub_categories || []);
      setCategories(main.sub_categories?.[0]?.categories || []);
    }
    setSearchTerm("");
    setShowCategories(true);
    setCategoryChosen(false);
  };

  const handleChangeSubCategory = (subcategoryid: string) => {
    const sub = subcategories.find((s) => s._id === subcategoryid);
    if (sub) setCategories(sub.categories || []);
    setSearchTerm("");
    setShowCategories(true);
    setCategoryChosen(false);
  };

  const handleCartOpen = () => {
    setCartDrawerOpen(true);
    const tableId = isRetailMode ? activeTable?._id : id;
    if (tableId) dispatch(getCart(tableId));
  };

  const handleBack = () => {
    setShowCategories(true);
    setSearchTerm("");
    setActiveItemType("services");
  };

  const handleSelectCard = (card) => {
    setSelectedCard(card);
    dispatch(fetchProductsByCategory(card));
    setCategoryChosen(true);
    setShowCategories(false);
    setSearchTerm("");
    setActiveItemType("services");
  };

  const handleQueueOrder = async () => {
    await refreshSlots();
    message.success("Order queued! Ready for next customer.");
  };

  // ── Derived state ─────────────────────────────────────────────────────────

  const displayItems =
    activeItemType === "products"
      ? filteredProducts
      : activeItemType === "services"
        ? filteredServices
        : availablePackages;

  const sortedItems =
    activeItemType === "packages"
      ? displayItems
      : [...displayItems].sort((a, b) => a.name.localeCompare(b.name));

  const areItemsAvailable = sortedItems.length > 0;
  const isLoading = mainCategoriesLoading || productsLoading || packagesLoading;

  // ── Item type filter chips ─────────────────────────────────────────────────

  const ItemTypeFilters = () => {
    const hasServices = filteredServices.length > 0;
    const hasProducts = filteredProducts.length > 0;
    const hasPackages = availablePackages.length > 0;
    if (!hasProducts && !hasServices && !hasPackages) return null;

    const chips = [
      { type: "services" as const, icon: <Build sx={{ fontSize: 14 }} />, label: `Services (${filteredServices.length})`, show: hasServices },
      { type: "products" as const, icon: <ShoppingCart sx={{ fontSize: 14 }} />, label: `Products (${filteredProducts.length})`, show: hasProducts },
      { type: "packages" as const, icon: <CardGiftcard sx={{ fontSize: 14 }} />, label: `Packages (${availablePackages.length})`, show: hasPackages },
    ];

    return (
      <Box sx={{ display: "flex", gap: 1, mb: 1.5, flexWrap: "wrap" }}>
        {chips.filter((c) => c.show).map((c) => (
          <Chip
            key={c.type}
            size="small"
            icon={c.icon}
            label={c.label}
            variant={activeItemType === c.type ? "filled" : "outlined"}
            onClick={() => setActiveItemType(c.type)}
            sx={{
              fontSize: 12,
              height: 28,
              backgroundColor: activeItemType === c.type ? primaryColor : "transparent",
              color: activeItemType === c.type ? "white" : primaryColor,
              borderColor: primaryColor,
              "& .MuiChip-icon": { color: "inherit" },
              "&:hover": {
                backgroundColor: activeItemType === c.type ? primaryColor : `${primaryColor}18`,
              },
              transition: "all 0.2s ease",
            }}
          />
        ))}
      </Box>
    );
  };

  // ── Product grid ──────────────────────────────────────────────────────────

  const ProductGrid = () => (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: "10px",
        width: "100%",
        maxHeight: isMobile ? "none" : "calc(100vh - 280px)",
        overflowY: isMobile ? "visible" : "auto",
        pb: 1,
        "&::-webkit-scrollbar": { width: "4px" },
        "&::-webkit-scrollbar-track": { background: "transparent" },
        "&::-webkit-scrollbar-thumb": { background: "#cbd5e1", borderRadius: "2px" },
      }}
    >
      {areItemsAvailable ? (
        activeItemType === "packages" ? (
          sortedItems.map((pkg: Package) => (
            <PackageCard
              key={pkg._id}
              package={pkg}
              onPurchase={(p) => { setSelectedPackage(p); setPurchaseModalVisible(true); }}
              style={{ flex: isMobile ? "0 0 100%" : isTablet ? "0 0 calc(50% - 5px)" : "0 0 calc(33% - 7px)" }}
            />
          ))
        ) : (
          sortedItems.map((item) => (
            <ProductCard
              key={item._id}
              menu={item}
              handleCart={handleCartOpen}
              style={{ flex: isMobile ? "0 0 100%" : isTablet ? "0 0 calc(50% - 5px)" : "0 0 calc(33% - 7px)" }}
            />
          ))
        )
      ) : searchTerm ? (
        <Alert severity="info" sx={{ width: "100%", bgcolor: "#DEAC80", color: "white", borderRadius: 2 }}>
          <AlertTitle>No Results</AlertTitle>
          No items match "{searchTerm}"
        </Alert>
      ) : categoryChosen ? (
        <Alert severity="info" sx={{ width: "100%", bgcolor: "#DEAC80", color: "white", borderRadius: 2 }}>
          <AlertTitle>Empty</AlertTitle>
          This category has no items yet.
        </Alert>
      ) : (
        <Box sx={{ width: "100%", textAlign: "center", py: 6, color: "text.secondary" }}>
          <Typography variant="body2">Select a category to browse items</Typography>
        </Box>
      )}
    </Box>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Grid container spacing={isMobile ? 0 : 2} sx={{ height: isMobile ? "auto" : "calc(100vh - 80px)" }}>

        {/* ── Left panel: browsing ── */}
        <Grid item xs={12} md={8} sx={{ height: isMobile ? "auto" : "100%" }}>
          <Paper
            elevation={isMobile ? 0 : 3}
            sx={{
              height: isMobile ? "auto" : "100%",
              display: "flex",
              flexDirection: "column",
              borderRadius: isMobile ? 0 : 2,
              overflow: "hidden",
              border: isMobile ? "none" : undefined,
            }}
          >
            {/* ── Top app bar with main category tabs ── */}
            <AppBar
              position="static"
              elevation={0}
              sx={{ bgcolor: primaryColor, flexShrink: 0 }}
            >
              {isRetailMode && (
                <Box sx={{ display: "flex", justifyContent: "flex-end", px: 1.5, pt: 0.5 }}>
                  <RetailSlotIndicator onQueueOrder={handleQueueOrder} />
                </Box>
              )}

              {mainCategoriesLoading ? (
                <Box sx={{ p: 1.5 }}>
                  <SkeletonTabs />
                </Box>
              ) : (
                <Tabs
                  value={tabValue}
                  onChange={(_, v) => setTabValue(v)}
                  indicatorColor="secondary"
                  textColor="inherit"
                  variant="scrollable"
                  scrollButtons="auto"
                  allowScrollButtonsMobile
                  sx={{
                    minHeight: 44,
                    "& .MuiTabs-scrollButtons": { color: "white", "&.Mui-disabled": { opacity: 0.3 } },
                    "& .MuiTab-root": {
                      minWidth: "auto",
                      fontSize: isMobile ? "0.8rem" : "0.9rem",
                      fontWeight: 500,
                      textTransform: "none",
                      padding: isMobile ? "8px 12px" : "10px 16px",
                      minHeight: 44,
                      color: "rgba(255,255,255,0.8)",
                      "&.Mui-selected": { color: "white" },
                    },
                    "& .MuiTabs-indicator": { backgroundColor: "white", height: 3 },
                  }}
                >
                  {Maincategories?.map((categ, i) => (
                    <Tab
                      key={categ._id}
                      label={categ.name}
                      onClick={() => handleChangeMainCategory(categ._id)}
                      {...a11yProps(i)}
                    />
                  ))}
                </Tabs>
              )}
            </AppBar>

            {/* ── Content area ── */}
            <Box sx={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              {mainCategoriesLoading ? (
                <Box sx={{ display: "flex", p: 2, height: "100%" }}>
                  {!isMobile && <SkeletonVerticalTabs />}
                  <SkeletonCategoryCards isMobile={isMobile} isTablet={isTablet} />
                </Box>
              ) : subcategories.length ? (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "row",
                    flex: 1,
                    overflow: "hidden",
                  }}
                >
                  {/* Subcategory sidebar */}
                  <Box sx={{ flexShrink: 0, overflow: "hidden" }}>
                    <VerticalTabs
                      subcategories={subcategories}
                      handleSubCategoryChange={handleChangeSubCategory}
                    />
                  </Box>

                  {/* Main content */}
                  <Box
                    sx={{
                      flex: 1,
                      overflow: isMobile ? "visible" : "auto",
                      p: isMobile ? 1.5 : 2,
                      "&::-webkit-scrollbar": { width: "4px" },
                      "&::-webkit-scrollbar-thumb": { background: "#cbd5e1", borderRadius: 2 },
                    }}
                  >
                    {showCategories ? (
                      /* Category cards grid */
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: "10px", pt: 1 }}>
                        {isLoading ? (
                          <SkeletonCategoryCards isMobile={isMobile} isTablet={isTablet} />
                        ) : categories.length ? (
                          categories.map((category) => (
                            <CategoryCard
                              key={category._id}
                              handleSelectedCard={handleSelectCard}
                              selectedCard={selectedCard}
                              icon="/categoryIcon.svg"
                              name={category.name}
                              itemCount={1}
                              id={category._id}
                              style={{
                                flex: isMobile
                                  ? "0 0 calc(50% - 5px)"
                                  : isTablet
                                    ? "0 0 calc(50% - 5px)"
                                    : `0 0 calc(${100 / Math.min(categories.length, 3)}% - 8px)`,
                                border: "1px solid #e2e8f0",
                                borderRadius: 8,
                              }}
                            />
                          ))
                        ) : (
                          <Alert severity="info" sx={{ width: "100%", bgcolor: "#DEAC80", borderRadius: 2 }}>
                            <AlertTitle>Empty</AlertTitle>
                            No categories here yet.
                          </Alert>
                        )}
                      </Box>
                    ) : (
                      /* Items view */
                      <Box>
                        {/* Search + back row */}
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            mb: 1.5,
                          }}
                        >
                          <TextField
                            placeholder={activeItemType === "packages" ? "Search packages…" : "Search items…"}
                            variant="outlined"
                            size="small"
                            fullWidth
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            sx={{
                              "& .MuiOutlinedInput-root": {
                                borderRadius: 6,
                                fontSize: 13,
                                "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: primaryColor },
                                "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: primaryColor },
                              },
                            }}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <SearchIcon sx={{ color: primaryColor, fontSize: 18 }} />
                                </InputAdornment>
                              ),
                            }}
                          />
                          <IconButton
                            onClick={handleBack}
                            size="small"
                            sx={{
                              color: primaryColor,
                              border: `1px solid ${primaryColor}30`,
                              borderRadius: 2,
                              p: "6px",
                              "&:hover": { bgcolor: `${primaryColor}10` },
                            }}
                          >
                            <BackspaceIcon fontSize="small" />
                          </IconButton>
                        </Box>

                        <ItemTypeFilters />

                        {productsLoading || packagesLoading ? (
                          <Box sx={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                            {[...Array(6)].map((_, i) => <SkeletonProductCard key={i} />)}
                          </Box>
                        ) : (
                          <ProductGrid />
                        )}
                      </Box>
                    )}
                  </Box>
                </Box>
              ) : (
                <Box sx={{ p: 2 }}>
                  <Alert severity="info" sx={{ bgcolor: "#DEAC80", borderRadius: 2 }}>
                    <AlertTitle>Empty</AlertTitle>
                    This category has no subcategories yet.
                  </Alert>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* ── Right panel: cart (desktop) ── */}
        {!isMobile && (
          <Grid item md={4} sx={{ height: "100%" }}>
            <Paper elevation={3} sx={{ height: "100%", borderRadius: 2, overflow: "hidden" }}>
              <CartDrawer />
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* ── Mobile: cart FAB + bottom drawer ── */}
      {isMobile && (
        <>
          <Fab
            onClick={handleCartOpen}
            size="medium"
            sx={{
              position: "fixed",
              bottom: 20,
              right: 16,
              bgcolor: primaryColor,
              color: "white",
              zIndex: 1100,
              boxShadow: `0 4px 16px ${primaryColor}55`,
              "&:hover": { bgcolor: primaryColor },
            }}
          >
            <ShoppingCartIcon />
          </Fab>

          <Drawer
            anchor="bottom"
            open={cartDrawerOpen}
            onClose={() => setCartDrawerOpen(false)}
            PaperProps={{
              sx: {
                borderRadius: "16px 16px 0 0",
                maxHeight: "85dvh",
                overflow: "hidden",
              },
            }}
          >
            {/* Drag handle */}
            <Box sx={{ display: "flex", justifyContent: "center", pt: 1.5, pb: 0.5 }}>
              <Box sx={{ width: 36, height: 4, borderRadius: 2, bgcolor: "#cbd5e1" }} />
            </Box>
            <Box sx={{ overflow: "auto", flex: 1 }}>
              <CartDrawer />
            </Box>
          </Drawer>
        </>
      )}

      <PurchasePackageModal
        visible={purchaseModalVisible}
        package={selectedPackage}
        onClose={() => { setPurchaseModalVisible(false); setSelectedPackage(null); }}
        onSuccess={refetchPackages}
      />
    </>
  );
};

export default RestaurantPage;