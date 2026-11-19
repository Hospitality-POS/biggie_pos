import React from "react";
import { Modal, Typography, Button, Empty, Tooltip } from "antd";
import { ShoppingCartOutlined, TagsOutlined } from "@ant-design/icons";
import { usePrimaryColor } from "@context/PrimaryColorContext";

const { Text } = Typography;

export interface SellableVariant {
  _id: string;
  name: string;
  price?: number;
  quantity?: number;
  status?: string;
  location_id?: string | null;
  image?: string;
}

interface VariantSelectionModalProps {
  open: boolean;
  onClose: () => void;
  productName: string;
  basePrice: number;
  currency: string;
  variants: SellableVariant[];
  /** Quantity of each variant already in the cart, keyed by variant _id */
  inCart?: Record<string, number>;
  /** Product is stock-tracked: block variants with no stock left */
  trackStock?: boolean;
  onSelect: (variant: SellableVariant) => void;
}

const LOW_STOCK = 5;

/** Asks which variant of an inventory item is being sold before it goes into the cart. */
const VariantSelectionModal: React.FC<VariantSelectionModalProps> = ({
  open,
  onClose,
  productName,
  basePrice,
  currency,
  variants,
  inCart = {},
  trackStock = true,
  onSelect,
}) => {
  const primaryColor = usePrimaryColor() || "#10b981";

  const pick = (v: SellableVariant) => {
    onSelect(v);
    onClose();
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      destroyOnClose
      width={440}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: `${primaryColor}1a`,
              color: primaryColor,
              fontSize: 16,
              flexShrink: 0,
            }}
          >
            <TagsOutlined />
          </span>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.25, minWidth: 0 }}>
            <Text style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>Choose a variant</Text>
            <Text strong ellipsis style={{ fontSize: 16 }}>
              {productName}
            </Text>
          </div>
        </div>
      }
    >
      {variants.length === 0 ? (
        <Empty description="No variants available" />
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            maxHeight: "60vh",
            overflowY: "auto",
            padding: "4px 2px",
          }}
        >
          {variants.map((v) => {
            const price = v.price != null && v.price > 0 ? v.price : basePrice;
            const added = inCart[v._id] || 0;
            const left = (Number(v.quantity) || 0) - added;
            const blocked = trackStock && left <= 0;
            const low = trackStock && !blocked && left <= LOW_STOCK;
            const stockColor = blocked ? "#ef4444" : low ? "#f59e0b" : "#10b981";

            return (
              <div
                key={v._id}
                role="button"
                aria-disabled={blocked}
                tabIndex={blocked ? -1 : 0}
                onClick={() => !blocked && pick(v)}
                onKeyDown={(e) => {
                  if (!blocked && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    pick(v);
                  }
                }}
                onMouseEnter={(e) => {
                  if (blocked) return;
                  e.currentTarget.style.borderColor = primaryColor;
                  e.currentTarget.style.boxShadow = `0 4px 12px ${primaryColor}1f`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#e2e8f0";
                  e.currentTarget.style.boxShadow = "none";
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  background: blocked ? "#f8fafc" : "#fff",
                  cursor: blocked ? "not-allowed" : "pointer",
                  opacity: blocked ? 0.6 : 1,
                  transition: "border-color .2s, box-shadow .2s",
                }}
              >
                {/* Variant image, or its first letter */}
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    flexShrink: 0,
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: `${primaryColor}14`,
                    color: primaryColor,
                    fontWeight: 700,
                    fontSize: 16,
                  }}
                >
                  {v.image ? (
                    <img src={v.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    v.name?.charAt(0)?.toUpperCase()
                  )}
                </div>

                {/* Name + stock */}
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                  <Text strong ellipsis style={{ fontSize: 14 }}>
                    {v.name}
                  </Text>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {trackStock && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "#64748b" }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: stockColor }} />
                        {blocked ? "Out of stock" : low ? `Only ${left} left` : `${left} in stock`}
                      </span>
                    )}
                    {added > 0 && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: primaryColor,
                          background: `${primaryColor}14`,
                          borderRadius: 6,
                          padding: "0 6px",
                        }}
                      >
                        {added} in cart
                      </span>
                    )}
                  </div>
                </div>

                {/* Price + add to cart */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  <div style={{ textAlign: "right", lineHeight: 1.1 }}>
                    <Text style={{ fontSize: 11, color: "#94a3b8", display: "block" }}>{currency}</Text>
                    <Text strong style={{ fontSize: 15 }}>
                      {price.toLocaleString()}
                    </Text>
                  </div>
                  <Tooltip title={blocked ? "Out of stock" : "Add to cart"}>
                    <Button
                      type="primary"
                      shape="circle"
                      size="large"
                      aria-label={`Add ${v.name} to cart`}
                      icon={<ShoppingCartOutlined />}
                      disabled={blocked}
                      onClick={(e) => {
                        e.stopPropagation();
                        pick(v);
                      }}
                      style={
                        blocked
                          ? undefined
                          : { background: primaryColor, borderColor: primaryColor, boxShadow: `0 2px 6px ${primaryColor}40` }
                      }
                    />
                  </Tooltip>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
};

export default VariantSelectionModal;
