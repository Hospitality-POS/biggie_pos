import React from "react";
import { Modal, List, Typography, Tag } from "antd";

const { Text } = Typography;

export interface SellableVariant {
  _id: string;
  name: string;
  price?: number;
  quantity?: number;
  status?: string;
  location_id?: string | null;
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
}) => (
  <Modal
    open={open}
    onCancel={onClose}
    footer={null}
    centered
    destroyOnClose
    title={`Choose a variant · ${productName}`}
  >
    <List
      dataSource={variants}
      locale={{ emptyText: "No variants available" }}
      renderItem={(v) => {
        const price = v.price != null && v.price > 0 ? v.price : basePrice;
        const left = (Number(v.quantity) || 0) - (inCart[v._id] || 0);
        const blocked = trackStock && left <= 0;
        return (
          <List.Item
            onClick={() => {
              if (blocked) return;
              onSelect(v);
              onClose();
            }}
            style={{
              cursor: blocked ? "not-allowed" : "pointer",
              opacity: blocked ? 0.5 : 1,
              padding: "12px 8px",
              borderRadius: 8,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Text strong>{v.name}</Text>
              {trackStock && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {blocked ? "Out of stock" : `${left} in stock`}
                </Text>
              )}
            </div>
            <Tag color={blocked ? "default" : "green"} style={{ fontSize: 14, padding: "2px 10px" }}>
              {currency} {price.toLocaleString()}
            </Tag>
          </List.Item>
        );
      }}
    />
  </Modal>
);

export default VariantSelectionModal;
