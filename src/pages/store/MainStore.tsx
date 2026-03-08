import { FolderAddOutlined, HolderOutlined, SearchOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Button, Empty, Input, Skeleton, Typography } from "antd";
import { useEffect, useState } from "react";
import { getAllProducts } from "@services/products";
import StoreProductCard from "@components/store/StoreProductCard";
import StoreModal from "@components/MODALS/pro/StoreModal";

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

// ── Category tab nav ───────────────────────────────────────────────────────
const CategoryNav: React.FC<{
  categories: any[]; active: string;
  onChange: (k: string) => void; isMobile: boolean;
}> = ({ categories, active, onChange, isMobile }) => (
  <div style={{
    display: "flex", gap: 6, flexWrap: "wrap",
    paddingBottom: 14, borderBottom: `1px solid ${C.border}`, marginBottom: 16,
    overflowX: isMobile ? "auto" : undefined,
  }}>
    {categories.map((cat) => {
      const on = cat._id === active;
      return (
        <button key={cat._id} onClick={() => onChange(cat._id)} style={{
          background: on ? C.primary : C.bg,
          color: on ? "#fff" : C.subText,
          border: `1px solid ${on ? C.primary : C.border}`,
          borderRadius: 8,
          padding: isMobile ? "6px 10px" : "7px 13px",
          fontSize: isMobile ? 11 : 12,
          fontWeight: on ? 700 : 500,
          cursor: "pointer",
          display: "flex", alignItems: "center", gap: 6,
          transition: "all 0.15s", whiteSpace: "nowrap",
        }}>
          <HolderOutlined style={{ color: on ? "#fff" : C.primary, fontSize: 12 }} />
          {cat.name}
          {cat.products?.length > 0 && (
            <span style={{
              background: on ? "rgba(255,255,255,0.25)" : C.primaryLight,
              color: on ? "#fff" : C.primary,
              borderRadius: 10, padding: "0 6px", fontSize: 10, fontWeight: 700,
            }}>
              {cat.products.length}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

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
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["products"],
    queryFn: getAllProducts,
    retry: 1,
    networkMode: "always",
  });

  // Set first category as default when data loads
  useEffect(() => {
    if (data?.length && !activeTabId) {
      setActiveTabId(data[0]._id);
    }
  }, [data, activeTabId]);

  const activeCategory = data?.find((c: any) => c._id === activeTabId);
  const filteredProducts = (activeCategory?.products ?? []).filter((p: any) =>
    p?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ── Loading ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", background: C.bg, borderBottom: `1px solid ${C.border}` }}>
          <Skeleton.Input active style={{ width: 220, height: 20 }} />
        </div>
        <div style={{ padding: 18 }}>
          <ProductsSkeleton isMobile={isMobile} />
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div style={{
        background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12,
        padding: "40px 24px", textAlign: "center",
      }}>
        <Empty
          description={
            <div>
              <Text style={{ fontSize: 14, color: C.subText, display: "block", marginBottom: 8 }}>
                Failed to load products. Please try again.
              </Text>
              <Button type="primary" onClick={() => window.location.reload()}
                style={{ background: C.primary, borderColor: C.primary, borderRadius: 8 }}>
                Retry
              </Button>
            </div>
          }
        />
      </div>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────
  if (!data || data.length === 0) {
    return (
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
        <StoreModal edit={false} />
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 10,
        padding: isMobile ? "12px 14px" : "14px 18px",
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            borderRadius: 8,
            padding: "5px 7px", color: C.primary, fontSize: 16, lineHeight: 1,
          }}>
            <FolderAddOutlined />
          </div>
          <div>
            <Text strong style={{ fontSize: 14, color: C.darkText, display: "block" }}>Services Management</Text>
            <Text style={{ fontSize: 11, color: C.subText }}>
              {data.length} {data.length === 1 ? "category" : "categories"} · {data.reduce((s: number, c: any) => s + (c.products?.length ?? 0), 0)} services
            </Text>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Search
            placeholder="Search products…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            allowClear
            style={{ width: isMobile ? 150 : 220, borderRadius: 8 }}
            prefix={<SearchOutlined style={{ color: C.subText }} />}
          />
          <StoreModal edit={false} />
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: isMobile ? "12px" : "16px 18px" }}>
        <CategoryNav
          categories={data}
          active={activeTabId ?? ""}
          onChange={(k) => { setActiveTabId(k); setSearchTerm(""); }}
          isMobile={isMobile}
        />

        {/* Product count strip */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 14,
        }}>
          <Text style={{ fontSize: 12, color: C.subText }}>
            {activeCategory?.name && (
              <><span style={{ color: C.primary, fontWeight: 600 }}>{activeCategory.name}</span> · </>
            )}
            {filteredProducts.length} {filteredProducts.length === 1 ? "product" : "products"}
            {searchTerm && ` matching "${searchTerm}"`}
          </Text>
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} style={{
              background: "none", border: "none", color: C.subText,
              cursor: "pointer", fontSize: 11, padding: 0,
            }}>
              Clear search
            </button>
          )}
        </div>

        {/* Products grid */}
        {filteredProducts.length === 0 ? (
          <Empty
            description={
              searchTerm
                ? `No products matching "${searchTerm}"`
                : "No products in this category"
            }
            style={{ padding: "40px 0" }}
          />
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "repeat(2, 1fr)"
              : "repeat(auto-fill, minmax(220px, 1fr))",
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
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}