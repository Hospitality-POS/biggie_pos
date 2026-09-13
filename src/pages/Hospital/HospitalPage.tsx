import React, { useState, useEffect, useMemo } from "react";
import { Alert, Badge, Button, Drawer } from "antd";
import {
  MedicineBoxOutlined,
  ExperimentOutlined,
  HeartOutlined,
  PlusCircleOutlined,
  ShoppingCartOutlined,
} from "@ant-design/icons";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import ProductCard from "../../components/product/productCard";
import PackageCard from "../../components/cart/PackageCard";
import SkeletonProductCard from "../../components/product/skeletonProductCard";
import CategoryCard from "../../components/category/categoryCard";
import CartDrawer from "../../components/cart/CartDrawer";
import HospitalSidebar from "./HospitalSidebar";
import BarcodeScanPanel from "../Restaurant/Barcodescanner";
import PurchasePackageModal from "../../components/MODALS/pro/PurchasePackageModal";

import { useAppDispatch, useAppSelector } from "../../store";
import { getCart } from "../../features/Cart/CartActions";
import { fetchProductsByCategory } from "../../features/Product/ProductAction";
import { fetchMainCategories } from "@services/categories";
import { fetchShop } from "@services/shops";
import { fetchActivePackages, Package } from "@services/subscription";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import { useRetailQueue } from "@context/RetailQueueContext";

import POSHeader from "@components/pos/POSHeader";
import POSSearchHeader from "@components/pos/POSSearchHeader";
import POSItemTypeFilters, { POSItemType } from "@components/pos/POSItemTypeFilters";
import {
  POSSkeletonCategoryCards,
  POSSkeletonVerticalTabs,
} from "@components/pos/POSSkeletons";

const SECTION_ICONS: Record<string, React.ReactNode> = {
  Pharmacy: <MedicineBoxOutlined style={{ fontSize: 13 }} />,
  Laboratory: <ExperimentOutlined style={{ fontSize: 13 }} />,
  Radiology: <HeartOutlined style={{ fontSize: 13 }} />,
  Procedures: <PlusCircleOutlined style={{ fontSize: 13 }} />,
  Vaccines: <MedicineBoxOutlined style={{ fontSize: 13 }} />,
  default: <MedicineBoxOutlined style={{ fontSize: 13 }} />,
};

const getSectionIcon = (name: string) => SECTION_ICONS[name] ?? SECTION_ICONS.default;

interface HospitalPageProps {
  mode?: "hospital" | "retail";
}

const HospitalPage: React.FC<HospitalPageProps> = ({ mode = "hospital" }) => {
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1024
  );

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;

  const { products, services, loading: productsLoading } = useAppSelector((s) => s.product);
  const { cartItems } = useAppSelector((s) => s.cart);
  const dispatch = useAppDispatch();
  const { id } = useParams();
  const { activeTable } = useRetailQueue();

  const shopId = localStorage.getItem("shopId");
  const { data: shopData } = useQuery({
    queryKey: ["shop", shopId],
    queryFn: () => (shopId ? fetchShop(shopId) : null),
    enabled: !!shopId,
  });

  const tenant = useMemo(() => {
    try {
      const stored = localStorage.getItem("tenant");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, []);

  const shopName = shopData?.name || tenant?.name || "";

  const [posMode, setPosMode] = useState<"browse" | "scan">("browse");
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [showCategories, setShowCategories] = useState(true);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [categoryChosen, setCategoryChosen] = useState(false);
  const [selectedMainCategoryId, setSelectedMainCategoryId] = useState<string>("");
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [filteredServices, setFilteredServices] = useState<any[]>([]);
  const [activeItemType, setActiveItemType] = useState<POSItemType>("services");
  const [purchaseModalVisible, setPurchaseModalVisible] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);

  const primaryColor = usePrimaryColor();
  const tableId = id && id !== "tables" ? id : activeTable?._id ?? null;

  const {
    data: packagesData,
    isLoading: packagesLoading,
    refetch: refetchPackages,
  } = useQuery({
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

  // Attach icons to departments
  const categoriesWithIcons = useMemo(() => {
    return (Maincategories || []).map((c: any) => ({
      ...c,
      icon: getSectionIcon(c.name),
    }));
  }, [Maincategories]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredProducts(products || []);
      setFilteredServices(services || []);
      return;
    }
    const t = searchTerm.toLowerCase();
    setFilteredProducts((products || []).filter((p: any) => p.name.toLowerCase().includes(t)));
    setFilteredServices((services || []).filter((s: any) => s.name.toLowerCase().includes(t)));
  }, [searchTerm, products, services]);

  useEffect(() => {
    if (services && products) {
      if (services.length === 0 && products.length > 0) setActiveItemType("products");
      else if (services.length > 0) setActiveItemType("services");
    }
  }, [services, products]);

  useEffect(() => {
    if (Maincategories?.length > 0) {
      handleChangeMainCategory(Maincategories[0]._id);
    }
  }, [Maincategories]);

  const handleChangeMainCategory = (idValue: string) => {
    if (!Maincategories) return;
    const main = Maincategories.find((c: any) => c._id === idValue);
    if (main) {
      setSelectedMainCategoryId(idValue);
      setSubcategories(main.sub_categories || []);
      setCategories(main.sub_categories?.[0]?.categories || []);
    }
    setSearchTerm("");
    setShowCategories(true);
    setCategoryChosen(false);
  };

  const handleChangeSubCategory = (subcategoryid: string) => {
    const sub = subcategories.find((s) => s._id === subcategoryid);
    if (sub) setCategories((sub as any).categories || []);
    setSearchTerm("");
    setShowCategories(true);
    setCategoryChosen(false);
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
    activeItemType === "products"
      ? filteredProducts
      : activeItemType === "services"
      ? filteredServices
      : availablePackages;

  const sortedItems =
    activeItemType === "packages"
      ? displayItems
      : [...displayItems].sort((a: any, b: any) => a.name.localeCompare(b.name));

  const areItemsAvailable = sortedItems.length > 0;
  const isLoading = mainCategoriesLoading || productsLoading || packagesLoading;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        gap: isMobile ? 0 : 16,
        height: isMobile ? "auto" : "calc(100vh - 80px)",
        width: "100%",
        overflow: "hidden",
      }}
    >
      {/* Left panel */}
      <div
        style={{
          flex: isMobile ? "none" : "1 1 65%",
          height: isMobile ? "auto" : "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#ffffff",
          borderRadius: isMobile ? 0 : 8,
          boxShadow: isMobile ? "none" : "0 2px 8px rgba(0,0,0,0.06)",
          border: isMobile ? "none" : "1px solid #e2e8f0",
          overflow: "hidden",
        }}
      >
        {/* Unified POS Header */}
        <POSHeader
          shopName={shopName}
          primaryColor={primaryColor}
          isMobile={isMobile}
          posMode={posMode}
          onModeChange={setPosMode}
          categoriesLoading={mainCategoriesLoading}
          categories={categoriesWithIcons}
          selectedCategoryId={selectedMainCategoryId}
          onSelectCategory={handleChangeMainCategory}
        />

        {/* Content area */}
        <div
          style={{
            flex: 1,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#f8fafc",
          }}
        >
          {posMode === "scan" ? (
            <BarcodeScanPanel tableId={tableId} onCartUpdate={handleCartOpen} />
          ) : (
            <>
              {mainCategoriesLoading ? (
                <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
                  {!isMobile && <POSSkeletonVerticalTabs />}
                  <div style={{ flex: 1, padding: isMobile ? 12 : 16, overflow: "auto" }}>
                    <POSSkeletonCategoryCards isMobile={isMobile} isTablet={isTablet} />
                  </div>
                </div>
              ) : subcategories.length ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    flex: 1,
                    overflow: "hidden",
                  }}
                >
                  {/* Hospital sidebar */}
                  <div style={{ flexShrink: 0, overflow: "hidden" }}>
                    <HospitalSidebar
                      subcategories={subcategories}
                      handleSubCategoryChange={handleChangeSubCategory}
                    />
                  </div>

                  {/* Main content */}
                  <div
                    style={{
                      flex: 1,
                      overflow: isMobile ? "visible" : "auto",
                      padding: isMobile ? 12 : 16,
                      scrollbarWidth: "thin",
                      scrollbarColor: "#cbd5e1 transparent",
                    }}
                  >
                    {showCategories ? (
                      isLoading ? (
                        <POSSkeletonCategoryCards isMobile={isMobile} isTablet={isTablet} />
                      ) : categories.length ? (
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: isMobile
                              ? "repeat(auto-fit, minmax(130px, 1fr))"
                              : isTablet
                              ? "repeat(auto-fit, minmax(160px, 1fr))"
                              : "repeat(auto-fit, minmax(190px, 1fr))",
                            gap: 12,
                            width: "100%",
                            paddingTop: 8,
                          }}
                        >
                          {categories.map((category: any) => (
                            <CategoryCard
                              key={category._id}
                              handleSelectedCard={handleSelectCard}
                              selectedCard={selectedCard}
                              icon="/categoryIcon.svg"
                              name={category.name}
                              itemCount={1}
                              id={category._id}
                              style={{
                                maxWidth: categories.length === 1 ? 280 : "none",
                                border: "1px solid #e2e8f0",
                                borderRadius: 8,
                                borderTop: `3px solid ${primaryColor}`,
                                width: "100%",
                                margin: 0,
                              }}
                            />
                          ))}
                        </div>
                      ) : (
                        <Alert
                          message="Empty"
                          description="No items in this department."
                          type="info"
                          showIcon
                          style={{ width: "100%", borderRadius: 8 }}
                        />
                      )
                    ) : (
                      <div>
                        {/* Search + Back row */}
                        <POSSearchHeader
                          searchTerm={searchTerm}
                          onSearchChange={setSearchTerm}
                          onBack={handleBack}
                          primaryColor={primaryColor}
                          placeholder="Search medications, services…"
                        />

                        {/* Item type filters */}
                        <POSItemTypeFilters
                          activeType={activeItemType}
                          onChange={setActiveItemType}
                          servicesCount={filteredServices.length}
                          productsCount={filteredProducts.length}
                          packagesCount={availablePackages.length}
                          primaryColor={primaryColor}
                          isHospitalMode={mode !== "retail"}
                        />

                        {/* Products / Services loading or grid */}
                        {productsLoading || packagesLoading ? (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                            {Array.from({ length: 6 }).map((_, i) => (
                              <SkeletonProductCard key={i} />
                            ))}
                          </div>
                        ) : areItemsAvailable ? (
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 10,
                              width: "100%",
                              maxHeight: isMobile ? "none" : "calc(100vh - 290px)",
                              overflowY: isMobile ? "visible" : "auto",
                              paddingTop: 8,
                              paddingLeft: 4,
                              paddingRight: 4,
                              paddingBottom: 16,
                              scrollbarWidth: "thin",
                              scrollbarColor: "#cbd5e1 transparent",
                            }}
                          >
                            {activeItemType === "packages"
                              ? sortedItems.map((pkg: any) => (
                                  <PackageCard
                                    key={pkg._id}
                                    package={pkg}
                                    onPurchase={(p) => {
                                      setSelectedPackage(p);
                                      setPurchaseModalVisible(true);
                                    }}
                                    style={{
                                      flex: isMobile
                                        ? "0 0 100%"
                                        : isTablet
                                        ? "0 0 calc(50% - 5px)"
                                        : "0 0 calc(33% - 7px)",
                                    }}
                                  />
                                ))
                              : sortedItems.map((item: any) => (
                                  <ProductCard
                                    key={item._id}
                                    menu={item}
                                    handleCart={handleCartOpen}
                                    style={{
                                      flex: isMobile
                                        ? "0 0 100%"
                                        : isTablet
                                        ? "0 0 calc(50% - 5px)"
                                        : "0 0 calc(33% - 7px)",
                                    }}
                                  />
                                ))}
                          </div>
                        ) : searchTerm ? (
                          <Alert
                            message="No Results"
                            description={`No items match "${searchTerm}"`}
                            type="info"
                            showIcon
                            style={{ width: "100%", borderRadius: 8 }}
                          />
                        ) : categoryChosen ? (
                          <Alert
                            message="Empty"
                            description="This section has no items yet."
                            type="info"
                            showIcon
                            style={{ width: "100%", borderRadius: 8 }}
                          />
                        ) : (
                          <div
                            style={{
                              width: "100%",
                              textAlign: "center",
                              padding: "48px 0",
                              color: "#64748b",
                            }}
                          >
                            <MedicineBoxOutlined
                              style={{
                                fontSize: 36,
                                color: "#cbd5e1",
                                marginBottom: 8,
                                display: "block",
                              }}
                            />
                            <p style={{ fontSize: 13, margin: 0 }}>
                              Select a department to browse items
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ padding: 16 }}>
                  <Alert
                    message="No Departments"
                    description="No departments configured yet."
                    type="info"
                    showIcon
                    style={{
                      borderRadius: 8,
                      borderLeft: `4px solid ${primaryColor}`,
                    }}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right panel: cart (desktop) */}
      {!isMobile && (
        <div
          style={{
            flex: "0 0 380px",
            height: "100%",
            backgroundColor: "#ffffff",
            borderRadius: 8,
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            border: "1px solid #e2e8f0",
            overflow: "hidden",
          }}
        >
          <CartDrawer />
        </div>
      )}

      {/* Mobile: cart FAB + drawer */}
      {isMobile && (
        <>
          <div
            style={{
              position: "fixed",
              bottom: 20,
              right: 16,
              zIndex: 1000,
            }}
          >
            <Badge count={cartItems?.length || 0}>
              <Button
                type="primary"
                shape="circle"
                size="large"
                icon={<ShoppingCartOutlined style={{ fontSize: 22 }} />}
                onClick={handleCartOpen}
                style={{
                  width: 56,
                  height: 56,
                  backgroundColor: primaryColor,
                  borderColor: primaryColor,
                  boxShadow: `0 4px 16px ${primaryColor}55`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              />
            </Badge>
          </div>

          <Drawer
            placement="bottom"
            open={cartDrawerOpen}
            onClose={() => setCartDrawerOpen(false)}
            height="85vh"
            bodyStyle={{ padding: 0 }}
            headerStyle={{ display: "none" }}
            style={{ borderRadius: "16px 16px 0 0", overflow: "hidden" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                paddingTop: 10,
                paddingBottom: 6,
              }}
            >
              <div
                style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "#cbd5e1" }}
              />
            </div>
            <div style={{ flex: 1, overflow: "auto", height: "calc(100% - 20px)" }}>
              <CartDrawer />
            </div>
          </Drawer>
        </>
      )}

      <PurchasePackageModal
        visible={purchaseModalVisible}
        package={selectedPackage}
        onClose={() => {
          setPurchaseModalVisible(false);
          setSelectedPackage(null);
        }}
        onSuccess={refetchPackages}
      />
    </div>
  );
};

export default HospitalPage;