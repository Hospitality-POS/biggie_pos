import { FolderAddOutlined, HolderOutlined, SearchOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Empty, Input, Skeleton, Switch, Typography, Popconfirm, notification } from "antd";
import { useEffect, useRef, useState } from "react";
import { getAllProducts, editProduct } from "@services/products";
import StoreProductCard from "@components/store/StoreProductCard";
import StoreModal from "@components/MODALS/pro/StoreModal";
import { useAppSelector } from "../../store";

const { Text } = Typography;
const { Search } = Input;

// ── Palette ────────────────────────────────────────────────────────────────
const C = {
  primary: "#6c1c2c",
  primaryLight: "#f9f0f2",
  subText: "#64748b",
  darkText: "#0f172a",
  border: "#e2e8f0",
  bg: "#f8fafc",
};

// ── Mobile hook ────────────────────────────────────────────────────────────
const useIsMobile = () => {
  const [v, setV] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setV(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return v;
};

// ── Bulk action button ─────────────────────────────────────────────────────
const BulkToggleButton: React.FC<{
  label: string;
  count: number;
  disable: boolean;
  loading: boolean;
  onConfirm: () => void;
  isAdmin: boolean;
}> = ({ label, count, disable, loading, onConfirm, isAdmin }) => {
  if (count === 0 || !isAdmin) return null;

  const color = disable ? "#ef4444" : "#10b981";
  const bg = disable ? "#fef2f2" : "#f0fdf4";
  const border = disable ? "#fecaca" : "#bbf7d0";

  return (
    <Popconfirm
      title={disable ? `Disable all ${count} ${label}?` : `Enable all ${count} ${label}?`}
      description={
        disable
          ? "They will be hidden from the POS until re-enabled."
          : "They will become visible at the POS immediately."
      }
      onConfirm={onConfirm}
      okText={disable ? "Disable all" : "Enable all"}
      okButtonProps={{ danger: disable, loading }}
      cancelText="Cancel"
      placement="bottomRight"
    >
      <button
        disabled={loading}
        style={{
          display: "flex", alignItems: "center", gap: 5,
          background: bg, border: `1px solid ${border}`,
          borderRadius: 7, padding: "4px 10px",
          fontSize: 11, fontWeight: 600, color,
          cursor: loading ? "wait" : "pointer",
          opacity: loading ? 0.65 : 1,
          transition: "all 0.15s",
          whiteSpace: "nowrap",
        }}
      >
        {loading ? "⏳" : disable ? "⏸" : "▶"}
        {disable ? "Disable" : "Enable"} all ({count})
      </button>
    </Popconfirm>
  );
};

// ── Category nav ───────────────────────────────────────────────────────────
const CategoryNav: React.FC<{
  categories: any[];
  active: string;
  onChange: (k: string) => void;
}> = ({ categories, active, onChange }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [catSearch, setCatSearch] = useState("");

  const filtered = categories.filter((c) =>
    c.name?.toLowerCase().includes(catSearch.toLowerCase())
  );

  useEffect(() => {
    const el = scrollRef.current?.querySelector<HTMLButtonElement>("[data-active='true']");
    el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [active]);

  return (
    <div style={{ marginBottom: 16 }}>
      <style>{`
        .cat-nav-scroll::-webkit-scrollbar { display: none; }
        .cat-nav-scroll { scrollbar-width: none; -ms-overflow-style: none; }
      `}</style>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 0 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          background: C.bg, border: `1px solid ${C.border}`,
          borderRadius: 8, padding: "5px 10px", flexShrink: 0,
        }}>
          <SearchOutlined style={{ color: C.subText, fontSize: 11 }} />
          <input
            value={catSearch}
            onChange={(e) => setCatSearch(e.target.value)}
            placeholder="Filter…"
            style={{
              border: "none", outline: "none", background: "transparent",
              fontSize: 12, color: C.darkText, width: 70,
            }}
          />
          {catSearch && (
            <button onClick={() => setCatSearch("")} style={{
              border: "none", background: "none", cursor: "pointer",
              color: C.subText, padding: 0, fontSize: 11, lineHeight: 1,
            }}>✕</button>
          )}
        </div>

        <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>
          <div style={{
            position: "absolute", left: 0, top: 0, bottom: 10, width: 24, zIndex: 1,
            pointerEvents: "none",
            background: "linear-gradient(to right, #fff 40%, transparent)",
          }} />
          <div style={{
            position: "absolute", right: 0, top: 0, bottom: 10, width: 24, zIndex: 1,
            pointerEvents: "none",
            background: "linear-gradient(to left, #fff 40%, transparent)",
          }} />
          <div
            ref={scrollRef}
            className="cat-nav-scroll"
            style={{
              display: "flex", gap: 6,
              overflowX: "auto",
              paddingBottom: 10, paddingLeft: 4, paddingRight: 4,
              WebkitOverflowScrolling: "touch",
            }}
          >
            {filtered.length === 0 ? (
              <Text style={{ fontSize: 12, color: C.subText, paddingBottom: 10, whiteSpace: "nowrap" }}>
                No categories matching "{catSearch}"
              </Text>
            ) : filtered.map((cat) => {
              const on = cat._id === active;
              return (
                <button
                  key={cat._id}
                  data-active={String(on)}
                  onClick={() => onChange(cat._id)}
                  style={{
                    flexShrink: 0,
                    background: on ? C.primary : C.bg,
                    color: on ? "#fff" : C.subText,
                    border: `1px solid ${on ? C.primary : C.border}`,
                    borderRadius: 8, padding: "6px 11px", fontSize: 12,
                    fontWeight: on ? 700 : 500, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 6,
                    transition: "all 0.15s", whiteSpace: "nowrap",
                  }}
                >
                  <HolderOutlined style={{ color: on ? "#fff" : C.primary, fontSize: 11 }} />
                  {cat.name}
                  {cat.products?.length > 0 && (
                    <span style={{
                      background: on ? "rgba(255,255,255,0.25)" : C.primaryLight,
                      color: on ? "#fff" : C.primary,
                      borderRadius: 10, padding: "0 6px",
                      fontSize: 10, fontWeight: 700, minWidth: 18, textAlign: "center",
                    }}>
                      {cat.products.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ borderBottom: `1px solid ${C.border}`, marginTop: 0 }} />
    </div>
  );
};

// ── Product grid skeleton ──────────────────────────────────────────────────
const ProductsSkeleton: React.FC<{ isMobile: boolean }> = ({ isMobile }) => (
  <div style={{
    display: "grid",
    gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fill, minmax(220px, 1fr))",
    gap: 14,
  }}>
    {Array.from({ length: 8 }).map((_, i) => (
      <Skeleton.Button key={i} active block style={{ height: 200, borderRadius: 10 }} />
    ))}
  </div>
);

// ── Main ───────────────────────────────────────────────────────────────────
export default function MainStore() {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);
  const isAdmin = user?.role === "admin";

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [showDisabled, setShowDisabled] = useState(false);

  // Tracks which bulk operation is running: null | "all-disable" | "all-enable" | "cat-disable" | "cat-enable"
  const [bulkLoading, setBulkLoading] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["products"],
    queryFn: getAllProducts,
    retry: 1,
    networkMode: "always",
  });

  useEffect(() => {
    if (data?.length && !activeTabId) setActiveTabId(data[0]._id);
  }, [data, activeTabId]);

  const activeCategory = data?.find((c: any) => c._id === activeTabId);

  const filteredProducts = (activeCategory?.products ?? [])
    .filter((p: any) => (showDisabled ? p?.is_disabled === true : !p?.is_disabled))
    .filter((p: any) => p?.name?.toLowerCase().includes(searchTerm.toLowerCase()));

  const allCategoryProducts: any[] = activeCategory?.products ?? [];
  const activeCount = allCategoryProducts.filter((p) => !p?.is_disabled).length;
  const disabledCount = allCategoryProducts.filter((p) => p?.is_disabled === true).length;

  // Flat list of every product across all categories
  const allProducts: any[] = (data ?? []).flatMap((c: any) => c.products ?? []);
  const allActiveCount = allProducts.filter((p) => !p?.is_disabled).length;
  const allDisabledCount = allProducts.filter((p) => p?.is_disabled === true).length;

  // ── Core bulk helper — calls the same editProduct API in a loop ───────────
  const bulkToggle = async (products: any[], disable: boolean, key: string) => {
    if (!isAdmin || products.length === 0) return;
    setBulkLoading(key);

    let succeeded = 0;
    let failed = 0;

    for (const product of products) {
      try {
        await editProduct({ ...product, is_disabled: disable }, true);
        succeeded++;
      } catch {
        failed++;
      }
    }

    // Refresh the full product list once all calls are done
    await queryClient.invalidateQueries({ queryKey: ["products"] });
    setBulkLoading(null);

    notification.destroy("bulk-toggle");
    if (failed === 0) {
      notification.success({
        key: "bulk-toggle",
        message: `${disable ? "Disabled" : "Enabled"} ${succeeded} service${succeeded !== 1 ? "s" : ""}`,
        placement: "bottomLeft",
        duration: 3,
      });
    } else {
      notification.warning({
        key: "bulk-toggle",
        message: `${succeeded} updated, ${failed} failed`,
        description: "Some services could not be updated. Please try again.",
        placement: "bottomLeft",
        duration: 4,
      });
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────
  if (isLoading) return (
    <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
      <div style={{ padding: "14px 18px", background: C.bg, borderBottom: `1px solid ${C.border}` }}>
        <Skeleton.Input active style={{ width: 220, height: 20 }} />
      </div>
      <div style={{ padding: 18 }}>
        <ProductsSkeleton isMobile={isMobile} />
      </div>
    </div>
  );

  // ── Error ────────────────────────────────────────────────────────────
  if (isError) return (
    <div style={{
      background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12,
      padding: "40px 24px", textAlign: "center",
    }}>
      <Empty description={
        <div>
          <Text style={{ fontSize: 14, color: C.subText, display: "block", marginBottom: 8 }}>
            Failed to load products. Please try again.
          </Text>
          <Button type="primary" onClick={() => window.location.reload()}
            style={{ background: C.primary, borderColor: C.primary, borderRadius: 8 }}>
            Retry
          </Button>
        </div>
      } />
    </div>
  );

  // ── Empty state ──────────────────────────────────────────────────────
  if (!data || data.length === 0) return (
    <div style={{
      background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12,
      padding: "60px 24px", textAlign: "center",
    }}>
      <div style={{
        width: 56, height: 56, background: C.primaryLight, borderRadius: 12,
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 16px", fontSize: 24, color: C.primary,
      }}>
        <FolderAddOutlined />
      </div>
      <Text strong style={{ fontSize: 16, color: C.darkText, display: "block", marginBottom: 8 }}>
        No Products Yet
      </Text>
      <Text style={{ fontSize: 13, color: C.subText, display: "block", marginBottom: 24 }}>
        Add your first product category and products to get started.
      </Text>
      <StoreModal edit={false} onSuccess={() => queryClient.invalidateQueries({ queryKey: ["products"] })} />
    </div>
  );

  // ── Main render ──────────────────────────────────────────────────────
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>

      {/* ── Header ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 10,
        padding: isMobile ? "12px 14px" : "14px 18px",
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ borderRadius: 8, padding: "5px 7px", color: C.primary, fontSize: 16, lineHeight: 1 }}>
            <FolderAddOutlined />
          </div>
          <div>
            <Text strong style={{ fontSize: 14, color: C.darkText, display: "block" }}>Services Management</Text>
            <Text style={{ fontSize: 11, color: C.subText }}>
              {data.length} {data.length === 1 ? "category" : "categories"} ·{" "}
              {data.reduce((s: number, c: any) => s + (c.products?.length ?? 0), 0)} services
            </Text>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Search
            placeholder="Search products…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            allowClear
            style={{ width: isMobile ? 150 : 220, borderRadius: 8 }}
            prefix={<SearchOutlined style={{ color: C.subText }} />}
          />

          {/* ── Disable ALL / Enable ALL (across every category) ── */}
          {isAdmin && (
            <div style={{ display: "flex", gap: 6 }}>
              <BulkToggleButton
                label="services"
                count={allActiveCount}
                disable={true}
                loading={bulkLoading === "all-disable"}
                isAdmin={isAdmin}
                onConfirm={() =>
                  bulkToggle(
                    allProducts.filter((p) => !p?.is_disabled),
                    true,
                    "all-disable"
                  )
                }
              />
              <BulkToggleButton
                label="services"
                count={allDisabledCount}
                disable={false}
                loading={bulkLoading === "all-enable"}
                isAdmin={isAdmin}
                onConfirm={() =>
                  bulkToggle(
                    allProducts.filter((p) => p?.is_disabled === true),
                    false,
                    "all-enable"
                  )
                }
              />
            </div>
          )}

          <StoreModal edit={false} onSuccess={() => queryClient.invalidateQueries({ queryKey: ["products"] })} />
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ padding: isMobile ? "12px" : "16px 18px" }}>

        <CategoryNav
          categories={data}
          active={activeTabId ?? ""}
          onChange={(k) => { setActiveTabId(k); setSearchTerm(""); }}
        />

        {/* Count strip + per-category bulk actions + view toggle */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: 8, marginBottom: 14,
        }}>
          <Text style={{ fontSize: 12, color: C.subText }}>
            {activeCategory?.name && (
              <><span style={{ color: C.primary, fontWeight: 600 }}>{activeCategory.name}</span> · </>
            )}
            {filteredProducts.length} {filteredProducts.length === 1 ? "product" : "products"}
            {searchTerm && ` matching "${searchTerm}"`}
          </Text>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} style={{
                background: "none", border: "none", color: C.subText,
                cursor: "pointer", fontSize: 11, padding: 0,
              }}>
                Clear search
              </button>
            )}

            {/* ── Per-category disable / enable ── */}
            {isAdmin && (
              <div style={{ display: "flex", gap: 6 }}>
                <BulkToggleButton
                  label={`in ${activeCategory?.name ?? "category"}`}
                  count={activeCount}
                  disable={true}
                  loading={bulkLoading === "cat-disable"}
                  isAdmin={isAdmin}
                  onConfirm={() =>
                    bulkToggle(
                      allCategoryProducts.filter((p) => !p?.is_disabled),
                      true,
                      "cat-disable"
                    )
                  }
                />
                <BulkToggleButton
                  label={`in ${activeCategory?.name ?? "category"}`}
                  count={disabledCount}
                  disable={false}
                  loading={bulkLoading === "cat-enable"}
                  isAdmin={isAdmin}
                  onConfirm={() =>
                    bulkToggle(
                      allCategoryProducts.filter((p) => p?.is_disabled === true),
                      false,
                      "cat-enable"
                    )
                  }
                />
              </div>
            )}

            {/* Active / Disabled view toggle */}
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              background: C.bg, border: `1px solid ${C.border}`,
              borderRadius: 8, padding: "4px 10px",
            }}>
              <Text style={{ fontSize: 11, color: showDisabled ? C.subText : C.primary, fontWeight: showDisabled ? 400 : 600 }}>
                Active
                <span style={{
                  marginLeft: 4, background: showDisabled ? C.bg : C.primaryLight,
                  color: showDisabled ? C.subText : C.primary,
                  borderRadius: 10, padding: "0 5px", fontSize: 10, fontWeight: 700,
                }}>
                  {activeCount}
                </span>
              </Text>
              <Switch
                size="small"
                checked={showDisabled}
                onChange={(val) => { setShowDisabled(val); setSearchTerm(""); }}
                style={{ backgroundColor: showDisabled ? "#ef4444" : "#d1d5db" }}
              />
              <Text style={{ fontSize: 11, color: showDisabled ? "#ef4444" : C.subText, fontWeight: showDisabled ? 600 : 400 }}>
                Disabled
                <span style={{
                  marginLeft: 4, background: showDisabled ? "#fef2f2" : C.bg,
                  color: showDisabled ? "#ef4444" : C.subText,
                  borderRadius: 10, padding: "0 5px", fontSize: 10, fontWeight: 700,
                }}>
                  {disabledCount}
                </span>
              </Text>
            </div>
          </div>
        </div>

        {/* Grid */}
        {filteredProducts.length === 0 ? (
          <Empty
            description={
              searchTerm
                ? `No ${showDisabled ? "disabled" : "active"} products matching "${searchTerm}"`
                : showDisabled
                  ? "No disabled products in this category"
                  : "No active products in this category"
            }
            style={{ padding: "40px 0" }}
          />
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 14,
            maxHeight: isMobile ? "calc(100vh - 340px)" : "calc(100vh - 300px)",
            overflowY: "auto",
            paddingBottom: 8,
          }}>
            {filteredProducts.map((prod: any) => (
              <StoreProductCard
                key={prod._id}
                bowls={prod?.quantity}
                price={prod.price}
                name={prod?.name}
                img={prod?.image}
                product={prod}
                productId={prod?._id}
                activateInventory={prod?.activateInventory}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}