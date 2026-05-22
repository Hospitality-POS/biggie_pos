import React, { useState, useEffect } from "react";
import {
    Alert,
    AlertTitle,
    AppBar,
    Box,
    Chip,
    Divider,
    Drawer,
    Fab,
    Grid,
    IconButton,
    InputAdornment,
    Paper,
    Skeleton,
    Tab,
    Tabs,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";
import {
    Medication,
    MedicalServices,
    Search,
    ShoppingCart,
    Backspace,
    GridView,
    QrCodeScanner,
    Vaccines,
    Science,
    LocalHospital,
    MonitorHeart,
    Bed,
} from "@mui/icons-material";
import ProductCard from "../../components/product/productCard";
import PackageCard from "../../components/cart/PackageCard";
import { useQuery } from "@tanstack/react-query";
import SkeletonProductCard from "../../components/product/skeletonProductCard";
import CategoryCard from "../../components/category/categoryCard";
import CartDrawer from "../../components/cart/CartDrawer";
import { useParams } from "react-router-dom";
import { getCart } from "../../features/Cart/CartActions";
import { fetchProductsByCategory } from "../../features/Product/ProductAction";
import HospitalSidebar from "./HospitalSidebar";
import { useAppDispatch, useAppSelector } from "../../store";
import { fetchMainCategories } from "@services/categories";
import { fetchActivePackages, Package } from "@services/subscription";
import PurchasePackageModal from "../../components/MODALS/pro/PurchasePackageModal";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import { useRetailQueue } from "@context/RetailQueueContext";
import BarcodeScanPanel from "../Restaurant/BarcodeScanPanel";
import { message } from "antd";

// ── Shared neutral tokens ─────────────────────────────────────────────────────
const H = {
    slateLight: "#f8fafc",
    border: "#e2e8f0",
    white: "#ffffff",
    warning: "#f59e0b",
    ok: "#10b981",
};

function a11yProps(index: number) {
    return { id: `hospital-tab-${index}`, "aria-controls": `hospital-tabpanel-${index}` };
}

// ── Section chip types ────────────────────────────────────────────────────────
type ItemType = "services" | "products" | "packages";

const SECTION_ICONS: Record<string, React.ReactNode> = {
    Pharmacy: <Medication sx={{ fontSize: 13 }} />,
    Laboratory: <Science sx={{ fontSize: 13 }} />,
    Radiology: <MonitorHeart sx={{ fontSize: 13 }} />,
    Procedures: <MedicalServices sx={{ fontSize: 13 }} />,
    Vaccines: <Vaccines sx={{ fontSize: 13 }} />,
    default: <LocalHospital sx={{ fontSize: 13 }} />,
};

const getSectionIcon = (name: string) =>
    SECTION_ICONS[name] ?? SECTION_ICONS.default;

// ── Skeletons ─────────────────────────────────────────────────────────────────
const SkeletonTabs = () => (
    <Box sx={{ display: "flex", gap: 1, overflowX: "auto", "&::-webkit-scrollbar": { height: 3 } }}>
        {[...Array(5)].map((_, i) => (
            <Skeleton key={i} variant="rectangular" width={110} height={40}
                sx={{ borderRadius: 1, flexShrink: 0, bgcolor: "rgba(255,255,255,0.15)" }} />
        ))}
    </Box>
);

const SkeletonCards = ({ cols }: { cols: number }) => (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: "10px", mt: 1 }}>
        {[...Array(cols)].map((_, i) => (
            <Skeleton key={i} variant="rectangular"
                width={`calc(${100 / Math.min(cols, 3)}% - 8px)`} height={80}
                sx={{ borderRadius: 2 }} />
        ))}
    </Box>
);

// ── Patient / ward indicator strip ────────────────────────────────────────────
const WardStrip: React.FC<{ activeTable: any }> = ({ activeTable }) => {
    if (!activeTable) return null;
    return (
        <Box
            sx={{
                display: "flex", alignItems: "center", gap: 1,
                px: 1.5, py: 0.75,
                background: "rgba(255,255,255,0.1)",
                borderBottom: "1px solid rgba(255,255,255,0.12)",
            }}
        >
            <Bed sx={{ fontSize: 14, color: "rgba(255,255,255,0.8)" }} />
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.9)", fontWeight: 600 }}>
                {activeTable.name}
            </Typography>
            <Box
                sx={{
                    ml: "auto",
                    width: 8, height: 8, borderRadius: "50%",
                    background: activeTable.isOccupied ? H.warning : H.ok,
                    boxShadow: `0 0 6px ${activeTable.isOccupied ? H.warning : H.ok}`,
                }}
            />
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)", fontSize: 10 }}>
                {activeTable.isOccupied ? "Occupied" : "Available"}
            </Typography>
        </Box>
    );
};

// ── Main ──────────────────────────────────────────────────────────────────────
interface HospitalPageProps {
    mode?: "hospital" | "retail";
}

const HospitalPage: React.FC<HospitalPageProps> = ({ mode = "hospital" }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
    const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));

    const { products, services, loading: productsLoading } = useAppSelector((s) => s.product);
    const dispatch = useAppDispatch();
    const { id } = useParams();
    const { activeTable, refreshSlots } = useRetailQueue();

    const [posMode, setPosMode] = useState<"browse" | "scan">("browse");
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
    const [activeItemType, setActiveItemType] = useState<ItemType>("services");
    const [purchaseModalVisible, setPurchaseModalVisible] = useState(false);
    const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);

    const primaryColor = usePrimaryColor();
    const tableId = id && id !== "tables" ? id : activeTable?._id ?? null;

    const { data: packagesData, isLoading: packagesLoading, refetch: refetchPackages } = useQuery({
        queryKey: ["active-packages"],
        queryFn: fetchActivePackages,
    });
    const availablePackages = packagesData?.packages || [];

    const { data: Maincategories, isLoading: mainCategoriesLoading } = useQuery({
        queryKey: ["Maincategories"],
        queryFn: fetchMainCategories,
        retry: 3,
        networkMode: "always",
    });

    // ── Effects ──────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredProducts(products || []);
            setFilteredServices(services || []);
            return;
        }
        const t = searchTerm.toLowerCase();
        setFilteredProducts((products || []).filter((p) => p.name.toLowerCase().includes(t)));
        setFilteredServices((services || []).filter((s) => s.name.toLowerCase().includes(t)));
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

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleChangeMainCategory = (id: string) => {
        if (!Maincategories) return;
        const main = Maincategories.find((c) => c._id === id);
        if (main) {
            setSubcategories(main.sub_categories || []);
            setCategories(main.sub_categories?.[0]?.categories || []);
        }
        setSearchTerm(""); setShowCategories(true); setCategoryChosen(false);
    };

    const handleChangeSubCategory = (subcategoryid: string) => {
        const sub = subcategories.find((s) => s._id === subcategoryid);
        if (sub) setCategories((sub as any).categories || []);
        setSearchTerm(""); setShowCategories(true); setCategoryChosen(false);
    };

    const handleCartOpen = () => {
        setCartDrawerOpen(true);
        if (tableId) dispatch(getCart(tableId));
    };

    const handleBack = () => {
        setShowCategories(true);
        setSearchTerm("");
        setActiveItemType("services");
    };

    const handleSelectCard = (card: any) => {
        setSelectedCard(card);
        dispatch(fetchProductsByCategory(card));
        setCategoryChosen(true);
        setShowCategories(false);
        setSearchTerm("");
        setActiveItemType("services");
    };

    const displayItems =
        activeItemType === "products" ? filteredProducts
            : activeItemType === "services" ? filteredServices
                : availablePackages;

    const sortedItems =
        activeItemType === "packages"
            ? displayItems
            : [...displayItems].sort((a, b) => (a as any).name.localeCompare((b as any).name));

    const isLoading = mainCategoriesLoading || productsLoading || packagesLoading;

    // ── Use tenant primary color throughout ──────────────────────────────────
    const barColor = primaryColor;

    // ── Item type chips ───────────────────────────────────────────────────────
    const ItemTypeFilters = () => {
        const hasServices = filteredServices.length > 0;
        const hasProducts = filteredProducts.length > 0;
        const hasPackages = availablePackages.length > 0;
        if (!hasProducts && !hasServices && !hasPackages) return null;

        const chips = [
            { type: "services" as const, icon: <MedicalServices sx={{ fontSize: 13 }} />, label: `Services (${filteredServices.length})`, show: hasServices },
            { type: "products" as const, icon: <Medication sx={{ fontSize: 13 }} />, label: `Pharmacy (${filteredProducts.length})`, show: hasProducts },
            { type: "packages" as const, icon: <LocalHospital sx={{ fontSize: 13 }} />, label: `Packages (${availablePackages.length})`, show: hasPackages },
        ];

        return (
            <Box sx={{ display: "flex", gap: 1, mb: 1.5, flexWrap: "wrap" }}>
                {chips.filter((c) => c.show).map((c) => (
                    <Chip
                        key={c.type} size="small" icon={c.icon} label={c.label}
                        variant={activeItemType === c.type ? "filled" : "outlined"}
                        onClick={() => setActiveItemType(c.type)}
                        sx={{
                            fontSize: 12, height: 28,
                            backgroundColor: activeItemType === c.type ? barColor : "transparent",
                            color: activeItemType === c.type ? "white" : barColor,
                            borderColor: barColor,
                            "& .MuiChip-icon": { color: "inherit" },
                            "&:hover": { backgroundColor: activeItemType === c.type ? barColor : `${barColor}18` },
                            transition: "all 0.2s ease",
                        }}
                    />
                ))}
            </Box>
        );
    };

    // ── Product/service grid ──────────────────────────────────────────────────
    const ProductGrid = () => (
        <Box
            sx={{
                display: "flex", flexWrap: "wrap", gap: "10px", width: "100%",
                maxHeight: isMobile ? "none" : "calc(100vh - 290px)",
                overflowY: isMobile ? "visible" : "auto", pb: 1,
                "&::-webkit-scrollbar": { width: "4px" },
                "&::-webkit-scrollbar-thumb": { background: "#cbd5e1", borderRadius: 2 },
            }}
        >
            {sortedItems.length > 0 ? (
                activeItemType === "packages" ? (
                    sortedItems.map((pkg: any) => (
                        <PackageCard key={pkg._id} package={pkg}
                            onPurchase={(p) => { setSelectedPackage(p); setPurchaseModalVisible(true); }}
                            style={{ flex: isMobile ? "0 0 100%" : isTablet ? "0 0 calc(50% - 5px)" : "0 0 calc(33% - 7px)" }}
                        />
                    ))
                ) : (
                    sortedItems.map((item: any) => (
                        <ProductCard key={item._id} menu={item} handleCart={handleCartOpen}
                            style={{ flex: isMobile ? "0 0 100%" : isTablet ? "0 0 calc(50% - 5px)" : "0 0 calc(33% - 7px)" }}
                        />
                    ))
                )
            ) : searchTerm ? (
                <Alert severity="info" sx={{ width: "100%", borderRadius: 2 }}>
                    <AlertTitle>No Results</AlertTitle>No items match "{searchTerm}"
                </Alert>
            ) : categoryChosen ? (
                <Alert severity="info" sx={{ width: "100%", borderRadius: 2 }}>
                    <AlertTitle>Empty</AlertTitle>This section has no items yet.
                </Alert>
            ) : (
                <Box sx={{ width: "100%", textAlign: "center", py: 6, color: "text.secondary" }}>
                    <LocalHospital sx={{ fontSize: 36, color: "#cbd5e1", mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                        Select a department to browse items
                    </Typography>
                </Box>
            )}
        </Box>
    );

    // ── Mode toggle ───────────────────────────────────────────────────────────
    const ModeToggle = () => (
        <ToggleButtonGroup
            value={posMode} exclusive onChange={(_, v) => v && setPosMode(v)}
            size="small"
            sx={{
                "& .MuiToggleButton-root": {
                    color: "rgba(255,255,255,0.7)", borderColor: "rgba(255,255,255,0.25)",
                    fontSize: 11, fontWeight: 600, textTransform: "none",
                    px: 1.5, py: 0.5, gap: 0.5, minHeight: 30,
                },
                "& .MuiToggleButton-root.Mui-selected": {
                    color: "white", bgcolor: "rgba(255,255,255,0.18)",
                    borderColor: "rgba(255,255,255,0.5)",
                    "&:hover": { bgcolor: "rgba(255,255,255,0.22)" },
                },
                "& .MuiToggleButton-root:hover": { bgcolor: "rgba(255,255,255,0.08)" },
            }}
        >
            <ToggleButton value="browse">
                <GridView sx={{ fontSize: 13 }} />
                {!isMobile && <span style={{ marginLeft: 4 }}>Browse</span>}
            </ToggleButton>
            <ToggleButton value="scan">
                <QrCodeScanner sx={{ fontSize: 13 }} />
                {!isMobile && <span style={{ marginLeft: 4 }}>Scan</span>}
            </ToggleButton>
        </ToggleButtonGroup>
    );

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <>
            <Grid
                container spacing={isMobile ? 0 : 2}
                sx={{ height: isMobile ? "auto" : "calc(100vh - 80px)" }}
            >
                {/* ── Left panel ── */}
                <Grid item xs={12} md={8} sx={{ height: isMobile ? "auto" : "100%" }}>
                    <Paper
                        elevation={isMobile ? 0 : 3}
                        sx={{
                            height: isMobile ? "auto" : "100%",
                            display: "flex", flexDirection: "column",
                            borderRadius: isMobile ? 0 : 2, overflow: "hidden",
                        }}
                    >
                        {/* ── Teal app bar ── */}
                        <AppBar position="static" elevation={0} sx={{ bgcolor: barColor, flexShrink: 0 }}>
                            {/* Ward/patient strip */}
                            <WardStrip activeTable={activeTable} />

                            {/* Row: cross icon + mode toggle */}
                            <Box
                                sx={{
                                    display: "flex", alignItems: "center", justifyContent: "space-between",
                                    px: 1.5, pt: 0.75, pb: posMode === "browse" ? 0 : 0.75,
                                }}
                            >
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                    <LocalHospital sx={{ color: "rgba(255,255,255,0.8)", fontSize: 16 }} />
                                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.85)", fontWeight: 700, letterSpacing: 0.8 }}>
                                        {mode === "retail" ? "RETAIL POS" : "HOSPITAL POS"}
                                    </Typography>
                                </Box>
                                <ModeToggle />
                            </Box>

                            {/* Department tabs — browse mode only */}
                            {posMode === "browse" && (
                                <>
                                    {mainCategoriesLoading ? (
                                        <Box sx={{ p: 1.5 }}><SkeletonTabs /></Box>
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
                                                    minWidth: "auto", fontSize: isMobile ? "0.78rem" : "0.85rem",
                                                    fontWeight: 500, textTransform: "none",
                                                    padding: isMobile ? "8px 10px" : "10px 14px",
                                                    minHeight: 44, color: "rgba(255,255,255,0.75)",
                                                    "&.Mui-selected": { color: "white" },
                                                    gap: 0.5,
                                                },
                                                "& .MuiTabs-indicator": { backgroundColor: "white", height: 2.5 },
                                            }}
                                        >
                                            {Maincategories?.map((categ: any, i: number) => (
                                                <Tab
                                                    key={categ._id}
                                                    label={categ.name}
                                                    icon={getSectionIcon(categ.name) as React.ReactElement}
                                                    iconPosition="start"
                                                    onClick={() => handleChangeMainCategory(categ._id)}
                                                    {...a11yProps(i)}
                                                />
                                            ))}
                                        </Tabs>
                                    )}
                                </>
                            )}

                            {posMode === "scan" && (
                                <Box sx={{ px: 2, pb: 1, display: "flex", alignItems: "center", gap: 1 }}>
                                    <QrCodeScanner sx={{ color: "rgba(255,255,255,0.85)", fontSize: 16 }} />
                                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.85)", fontWeight: 600, letterSpacing: 0.5 }}>
                                        Barcode scanner — ready
                                    </Typography>
                                </Box>
                            )}
                        </AppBar>

                        {/* ── Content ── */}
                        <Box sx={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", bgcolor: H.slateLight }}>
                            {posMode === "scan" ? (
                                <BarcodeScanPanel tableId={tableId} onCartUpdate={handleCartOpen} />
                            ) : (
                                <>
                                    {mainCategoriesLoading ? (
                                        <Box sx={{ display: "flex", p: 2, height: "100%" }}>
                                            {!isMobile && (
                                                <Box sx={{ width: 130, mr: 1, flexShrink: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                                                    {[...Array(5)].map((_, i) => (
                                                        <Skeleton key={i} variant="rectangular" width="100%" height={44} sx={{ borderRadius: 1, bgcolor: `${barColor}18` }} />
                                                    ))}
                                                </Box>
                                            )}
                                            <SkeletonCards cols={6} />
                                        </Box>
                                    ) : subcategories.length ? (
                                        <Box sx={{ display: "flex", flexDirection: "row", flex: 1, overflow: "hidden" }}>
                                            {/* ── Hospital sidebar ── */}
                                            <Box sx={{ flexShrink: 0, overflow: "hidden" }}>
                                                <HospitalSidebar
                                                    subcategories={subcategories}
                                                    handleSubCategoryChange={handleChangeSubCategory}
                                                />
                                            </Box>

                                            {/* ── Main content ── */}
                                            <Box
                                                sx={{
                                                    flex: 1, overflow: isMobile ? "visible" : "auto",
                                                    p: isMobile ? 1.5 : 2,
                                                    "&::-webkit-scrollbar": { width: "4px" },
                                                    "&::-webkit-scrollbar-thumb": { background: "#cbd5e1", borderRadius: 2 },
                                                }}
                                            >
                                                {showCategories ? (
                                                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: "10px", pt: 1 }}>
                                                        {isLoading ? (
                                                            <SkeletonCards cols={6} />
                                                        ) : categories.length ? (
                                                            categories.map((category: any) => (
                                                                <CategoryCard
                                                                    key={category._id}
                                                                    handleSelectedCard={handleSelectCard}
                                                                    selectedCard={selectedCard}
                                                                    icon="/categoryIcon.svg"
                                                                    name={category.name}
                                                                    itemCount={1}
                                                                    id={category._id}
                                                                    style={{
                                                                        flex: isMobile ? "0 0 calc(50% - 5px)" : isTablet ? "0 0 calc(50% - 5px)" : `0 0 calc(${100 / Math.min(categories.length, 3)}% - 8px)`,
                                                                        border: `1px solid ${H.border}`,
                                                                        borderRadius: 8,
                                                                        borderTop: `3px solid ${barColor}`,
                                                                    }}
                                                                />
                                                            ))
                                                        ) : (
                                                            <Alert severity="info" sx={{ width: "100%", borderRadius: 2 }}>
                                                                <AlertTitle>Empty</AlertTitle>No items in this department.
                                                            </Alert>
                                                        )}
                                                    </Box>
                                                ) : (
                                                    <Box>
                                                        {/* Search + back */}
                                                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                                                            <TextField
                                                                placeholder="Search medications, services…"
                                                                variant="outlined" size="small" fullWidth
                                                                value={searchTerm}
                                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                                sx={{
                                                                    "& .MuiOutlinedInput-root": {
                                                                        borderRadius: 6, fontSize: 13,
                                                                        "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: barColor },
                                                                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: barColor },
                                                                    },
                                                                }}
                                                                InputProps={{
                                                                    startAdornment: (
                                                                        <InputAdornment position="start">
                                                                            <Search sx={{ color: barColor, fontSize: 18 }} />
                                                                        </InputAdornment>
                                                                    ),
                                                                }}
                                                            />
                                                            <IconButton
                                                                onClick={handleBack} size="small"
                                                                sx={{
                                                                    color: barColor, border: `1px solid ${barColor}30`,
                                                                    borderRadius: 2, p: "6px",
                                                                    "&:hover": { bgcolor: `${barColor}10` },
                                                                }}
                                                            >
                                                                <Backspace fontSize="small" />
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
                                            <Alert severity="info" sx={{ borderRadius: 2, borderLeft: `4px solid ${barColor}` }}>
                                                <AlertTitle>No Departments</AlertTitle>
                                                No departments configured yet.
                                            </Alert>
                                        </Box>
                                    )}
                                </>
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

            {/* ── Mobile: cart FAB + drawer ── */}
            {isMobile && (
                <>
                    <Fab
                        onClick={handleCartOpen} size="medium"
                        sx={{
                            position: "fixed", bottom: 20, right: 16,
                            bgcolor: barColor, color: "white", zIndex: 1100,
                            boxShadow: `0 4px 16px ${barColor}55`,
                            "&:hover": { bgcolor: barColor },
                        }}
                    >
                        <ShoppingCart />
                    </Fab>

                    <Drawer
                        anchor="bottom" open={cartDrawerOpen}
                        onClose={() => setCartDrawerOpen(false)}
                        PaperProps={{ sx: { borderRadius: "16px 16px 0 0", maxHeight: "85dvh", overflow: "hidden" } }}
                    >
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

export default HospitalPage;