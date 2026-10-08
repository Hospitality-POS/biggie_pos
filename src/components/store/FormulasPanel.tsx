import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Checkbox, Empty, message, Skeleton, Tag, Typography } from "antd";
import { ExperimentOutlined, DownOutlined, RightOutlined } from "@ant-design/icons";
import { fetchAllRecipes } from "@services/recipe";
import { editProduct } from "@services/products";
import RecipeModal from "@components/MODALS/pro/RecipeModal";

const { Text } = Typography;

interface FormulasPanelProps {
  products: any[];
  palette: {
    primary: string;
    primaryLight: string;
    subText: string;
    darkText: string;
    border: string;
    bg: string;
  };
  searchTerm: string;
  onSuccess?: () => void;
  isAdmin?: boolean;
}

const variantNameOf = (r: any): string => {
  if (r.variant_name) return r.variant_name;
  const v = r.inventory_id?.variants?.find(
    (v: any) => String(v._id) === String(r.variant_id)
  );
  return v?.name || "";
};

const formatLabel = (r: any): string =>
  r.formatType === "ratio"
    ? `1 per ${r.ratio || 1} sale${(r.ratio || 1) === 1 ? "" : "s"}`
    : "Every sale";

const FormulasPanel: React.FC<FormulasPanelProps> = ({
  products,
  palette,
  searchTerm,
  onSuccess,
  isAdmin = false,
}) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkActing, setBulkActing] = useState<"activate" | "deactivate" | null>(null);
  const queryClient = useQueryClient();

  const { data: recipes, isLoading } = useQuery({
    queryKey: ["all-recipes"],
    queryFn: fetchAllRecipes,
    retry: 1,
    networkMode: "always",
  });

  // recipe lines grouped by service id
  const linesByProduct = useMemo(() => {
    const map = new Map<string, any[]>();
    (Array.isArray(recipes) ? recipes : []).forEach((r: any) => {
      const pid = String(r.product_id?._id || r.product_id || "");
      if (!pid) return;
      if (!map.has(pid)) map.set(pid, []);
      map.get(pid)!.push(r);
    });
    return map;
  }, [recipes]);

  const rows = useMemo(() => {
    const list = products.map((p: any) => ({
      product: p,
      lines: linesByProduct.get(String(p._id)) || [],
    }));
    return list.filter(({ product }) =>
      product?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, linesByProduct, searchTerm]);

  const configuredCount = rows.filter((r) => r.lines.length > 0).length;

  // ── Selection for bulk Activate Inventory ───────────────────────────────
  const visibleIds = rows.map((r) => String(r.product._id));
  const selectedCount = visibleIds.filter((id) => selected.has(id)).length;
  const allSelected = visibleIds.length > 0 && selectedCount === visibleIds.length;

  const toggleSelect = (pid: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const bulkSetInventory = async (activate: boolean) => {
    const targets = rows.filter(
      (r) =>
        selected.has(String(r.product._id)) &&
        (activate ? r.product.activateInventory !== true : r.product.activateInventory === true)
    );
    if (targets.length === 0) {
      message.info(
        activate
          ? "All selected services already have inventory deduction on"
          : "All selected services already have inventory deduction off"
      );
      return;
    }
    setBulkActing(activate ? "activate" : "deactivate");
    let ok = 0;
    let fail = 0;
    for (const { product } of targets) {
      try {
        await editProduct({ ...product, activateInventory: activate }, true);
        ok++;
      } catch {
        fail++;
      }
    }
    setBulkActing(null);
    setSelected(new Set());
    await queryClient.invalidateQueries({ queryKey: ["products"] });
    onSuccess?.();
    if (fail === 0) {
      message.success(
        `Inventory deduction ${activate ? "activated" : "deactivated"} on ${ok} service${ok !== 1 ? "s" : ""}`
      );
    } else {
      message.warning(`${ok} updated, ${fail} failed`);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton.Button key={i} active block style={{ height: 64, borderRadius: 10 }} />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <Empty
        description={
          searchTerm
            ? `No services matching "${searchTerm}"`
            : "No services found"
        }
        style={{ padding: "40px 0" }}
      />
    );
  }

  return (
    <div
      style={{
        border: `1px solid ${palette.border}`,
        borderRadius: 10,
        overflow: "hidden",
        maxHeight: "calc(100vh - 300px)",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 14px",
          background: palette.bg,
          borderBottom: `1px solid ${palette.border}`,
          flexWrap: "wrap",
        }}
      >
        {isAdmin && (
          <Checkbox
            checked={allSelected}
            indeterminate={selectedCount > 0 && !allSelected}
            onChange={toggleSelectAll}
            style={{ marginRight: 2 }}
          />
        )}
        <Text style={{ fontSize: 12, color: palette.subText, flex: 1 }}>
          {configuredCount} of {rows.length} service{rows.length === 1 ? "" : "s"} have formulas set
          {isAdmin && selectedCount > 0 && ` · ${selectedCount} selected`}
        </Text>

        {isAdmin && selectedCount > 0 && (
          <>
            <button
              onClick={() => bulkSetInventory(true)}
              disabled={bulkActing !== null}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                background: "#f0fdf4", border: "1px solid #bbf7d0",
                borderRadius: 7, padding: "4px 10px",
                fontSize: 11, fontWeight: 600, color: "#10b981",
                cursor: bulkActing ? "wait" : "pointer",
                opacity: bulkActing ? 0.65 : 1, whiteSpace: "nowrap",
              }}
            >
              {bulkActing === "activate" ? "Activating…" : `Activate Inventory (${selectedCount})`}
            </button>
            <button
              onClick={() => bulkSetInventory(false)}
              disabled={bulkActing !== null}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                background: "#fef2f2", border: "1px solid #fecaca",
                borderRadius: 7, padding: "4px 10px",
                fontSize: 11, fontWeight: 600, color: "#ef4444",
                cursor: bulkActing ? "wait" : "pointer",
                opacity: bulkActing ? 0.65 : 1, whiteSpace: "nowrap",
              }}
            >
              {bulkActing === "deactivate" ? "Deactivating…" : `Deactivate Inventory (${selectedCount})`}
            </button>
          </>
        )}
      </div>

      {rows.map(({ product, lines }, idx) => {
        const pid = String(product._id);
        const open = expanded[pid] ?? lines.length <= 3;
        const hasFormula = lines.length > 0;

        return (
          <div
            key={pid}
            style={{
              borderBottom:
                idx < rows.length - 1 ? `1px solid ${palette.border}` : "none",
              background: "#fff",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                opacity: product.is_disabled ? 0.6 : 1,
                background: selected.has(pid) ? palette.primaryLight : "transparent",
              }}
            >
              {isAdmin && (
                <Checkbox
                  checked={selected.has(pid)}
                  onChange={() => toggleSelect(pid)}
                />
              )}
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  flexShrink: 0,
                  background: palette.primaryLight,
                  color: palette.primary,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 15,
                }}
              >
                <ExperimentOutlined />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <Text
                  strong
                  style={{
                    fontSize: 13,
                    color: palette.darkText,
                    display: "block",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {product.name}
                  {product.is_disabled && (
                    <span style={{ fontSize: 10, color: "#ef4444", fontWeight: 500, marginLeft: 6 }}>
                      Disabled
                    </span>
                  )}
                </Text>
                <Text style={{ fontSize: 11, color: palette.subText }}>
                  {hasFormula
                    ? `${lines.length} ingredient${lines.length === 1 ? "" : "s"}`
                    : "No formula set"}
                </Text>
              </div>

              {hasFormula && (
                <Tag
                  style={{
                    border: "none",
                    borderRadius: 5,
                    fontSize: 10,
                    background: product.activateInventory ? "#f0fdf4" : "#fffbeb",
                    color: product.activateInventory ? "#059669" : "#d97706",
                  }}
                >
                  {product.activateInventory ? "Deduction on" : "Deduction off"}
                </Tag>
              )}

              {hasFormula && (
                <button
                  onClick={() =>
                    setExpanded((prev) => ({ ...prev, [pid]: !open }))
                  }
                  style={{
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    color: palette.subText,
                    fontSize: 11,
                    padding: 4,
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  {open ? <DownOutlined /> : <RightOutlined />}
                </button>
              )}

              <RecipeModal
                productId={product._id}
                activateInventory={product?.activateInventory}
                productName={product.name}
                onSuccess={onSuccess}
              />
            </div>

            {open && hasFormula && (
              <div
                style={{
                  padding: "0 14px 12px 58px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 5,
                }}
              >
                {lines.map((r: any) => (
                  <div
                    key={r._id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 10px",
                      background: palette.bg,
                      borderRadius: 7,
                      border: `1px solid ${palette.border}`,
                    }}
                  >
                    <Text strong style={{ fontSize: 12, color: palette.primary, whiteSpace: "nowrap" }}>
                      {r.quantity} {r.unit_id?.name || ""}
                    </Text>
                    <Text style={{ fontSize: 12, color: palette.darkText, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.inventory_id?.name || "(item removed)"}
                      {variantNameOf(r) ? ` (${variantNameOf(r)})` : ""}
                    </Text>
                    <Tag
                      style={{
                        border: "none",
                        borderRadius: 5,
                        fontSize: 10,
                        margin: 0,
                        background: r.formatType === "ratio" ? "#eff6ff" : "#f1f5f9",
                        color: r.formatType === "ratio" ? "#2563eb" : "#64748b",
                      }}
                    >
                      {formatLabel(r)}
                    </Tag>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default FormulasPanel;
