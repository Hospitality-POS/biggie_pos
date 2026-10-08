import React from "react";
import {
  CustomerServiceOutlined,
  ShoppingCartOutlined,
  MedicineBoxOutlined,
  GiftOutlined,
} from "@ant-design/icons";

export type POSItemType = "services" | "products" | "packages";

interface POSItemTypeFiltersProps {
  activeType: POSItemType;
  onChange: (type: POSItemType) => void;
  servicesCount: number;
  productsCount: number;
  packagesCount: number;
  primaryColor: string;
  isHospitalMode?: boolean;
}

export const POSItemTypeFilters: React.FC<POSItemTypeFiltersProps> = ({
  activeType,
  onChange,
  servicesCount,
  productsCount,
  packagesCount,
  primaryColor,
  isHospitalMode = false,
}) => {
  const hasServices = servicesCount > 0;
  const hasProducts = productsCount > 0;
  const hasPackages = packagesCount > 0;

  if (!hasServices && !hasProducts && !hasPackages) {
    return null;
  }

  const items = [
    {
      type: "services" as const,
      icon: <CustomerServiceOutlined style={{ fontSize: 13 }} />,
      label: `Services (${servicesCount})`,
      show: hasServices,
    },
    {
      type: "products" as const,
      icon: isHospitalMode ? (
        <MedicineBoxOutlined style={{ fontSize: 13 }} />
      ) : (
        <ShoppingCartOutlined style={{ fontSize: 13 }} />
      ),
      label: isHospitalMode ? `Pharmacy (${productsCount})` : `Products (${productsCount})`,
      show: hasProducts,
    },
    {
      type: "packages" as const,
      icon: <GiftOutlined style={{ fontSize: 13 }} />,
      label: `Packages (${packagesCount})`,
      show: hasPackages,
    },
  ];

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        marginBottom: 12,
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      {items
        .filter((item) => item.show)
        .map((item) => {
          const isActive = activeType === item.type;
          return (
            <button
              key={item.type}
              type="button"
              onClick={() => onChange(item.type)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 12px",
                height: 28,
                borderRadius: 14,
                fontSize: 12,
                fontWeight: isActive ? 600 : 500,
                border: `1px solid ${isActive ? primaryColor : primaryColor + "50"}`,
                backgroundColor: isActive ? primaryColor : "transparent",
                color: isActive ? "#ffffff" : primaryColor,
                cursor: "pointer",
                transition: "all 0.2s ease",
                outline: "none",
              }}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
    </div>
  );
};

export default POSItemTypeFilters;
