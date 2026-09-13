import React, { useState, useMemo, useCallback } from "react";
import { Typography, Button } from "antd";
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  GiftOutlined,
} from "@ant-design/icons";
import { Package } from "@services/subscription";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import { useAppSelector } from "../../store";

interface PackageCardProps {
  package: Package;
  onPurchase: (pkg: Package) => void;
  style?: React.CSSProperties;
}

const PackageCard: React.FC<PackageCardProps> = ({ package: pkg, onPurchase, style }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const primaryColor = usePrimaryColor();
  const { cartDetails } = useAppSelector((state) => state.cart);
  const currency = (cartDetails as { currency?: string } | null)?.currency || "KES";

  const pricePerVisit = useMemo(() => {
    if (!pkg.total_visits || pkg.total_visits <= 0) return null;
    return (pkg.price / pkg.total_visits).toFixed(0);
  }, [pkg.price, pkg.total_visits]);

  const formattedPrice = useMemo(() => {
    return (pkg.price || 0).toLocaleString();
  }, [pkg.price]);

  const handleClick = useCallback(() => {
    if (!isProcessing) {
      setIsProcessing(true);
      onPurchase(pkg);
      setTimeout(() => setIsProcessing(false), 1000);
    }
  }, [isProcessing, onPurchase, pkg]);

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        minWidth: "150px",
        minHeight: "260px",
        borderRadius: "12px",
        overflow: "hidden",
        backgroundColor: "#ffffff",
        border: `1px solid ${isHovered ? primaryColor : "#e2e8f0"}`,
        boxShadow: isHovered
          ? `0 8px 20px ${primaryColor}22, 0 2px 6px rgba(0,0,0,0.06)`
          : "0 1px 4px rgba(0,0,0,0.04)",
        cursor: isProcessing ? "wait" : "pointer",
        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        position: "relative",
        opacity: isProcessing ? 0.75 : 1,
        transform: isHovered ? "translateY(-2px)" : "translateY(0)",
        ...style,
      }}
    >
      {/* Top Graphic / Media Area */}
      <div
        style={{
          width: "100%",
          height: "125px",
          overflow: "hidden",
          position: "relative",
          backgroundColor: "#f8fafc",
          borderBottom: "1px solid #f1f5f9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
        }}
      >
        {/* Package Code Tag (Top-Right) */}
        {pkg.code ? (
          <div
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              backgroundColor: "rgba(100, 116, 139, 0.12)",
              color: "#475569",
              padding: "2px 8px",
              borderRadius: 8,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 0.5,
              border: "1px solid rgba(100, 116, 139, 0.2)",
              zIndex: 2,
            }}
          >
            {pkg.code}
          </div>
        ) : null}

        {/* Branded Circle Icon */}
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: `${primaryColor}14`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "transform 0.25s ease",
            transform: isHovered ? "scale(1.08)" : "scale(1)",
          }}
        >
          <GiftOutlined style={{ fontSize: 26, color: primaryColor }} />
        </div>
      </div>

      {/* Card Body */}
      <div
        style={{
          padding: "12px 14px",
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          justifyContent: "space-between",
        }}
      >
        {/* Title & metadata */}
        <div>
          <Typography.Text
            strong
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "#0f172a",
              lineHeight: 1.35,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              minHeight: "38px",
            }}
            title={pkg.name}
          >
            {pkg.name}
          </Typography.Text>

          {/* Visits and validity badges */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexWrap: "wrap",
              marginTop: 6,
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 11,
                color: "#059669",
                backgroundColor: "#ecfdf5",
                border: "1px solid #a7f3d0",
                padding: "2px 6px",
                borderRadius: 6,
                fontWeight: 600,
              }}
            >
              <CheckCircleOutlined style={{ fontSize: 11 }} />
              <span>{pkg.total_visits} visits</span>
            </div>

            {pkg.validity_days ? (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11,
                  color: "#64748b",
                  backgroundColor: "#f1f5f9",
                  border: "1px solid #e2e8f0",
                  padding: "2px 6px",
                  borderRadius: 6,
                  fontWeight: 500,
                }}
              >
                <ClockCircleOutlined style={{ fontSize: 11 }} />
                <span>{pkg.validity_days} days</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Price & Action Button */}
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>
              {currency}
            </span>
            <span style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
              {formattedPrice}
            </span>
          </div>

          {pricePerVisit && !isNaN(Number(pricePerVisit)) && Number(pricePerVisit) > 0 ? (
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
              {currency} {parseFloat(pricePerVisit).toLocaleString()} per visit
            </div>
          ) : null}

          {/* Tactile Touch Action Button */}
          <Button
            type="primary"
            block
            size="middle"
            icon={<GiftOutlined />}
            loading={isProcessing}
            style={{
              marginTop: 10,
              borderRadius: 8,
              fontWeight: 600,
              height: 36,
              fontSize: 13,
              backgroundColor: primaryColor,
              borderColor: primaryColor,
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
          >
            {isProcessing ? "Opening..." : "Purchase Package"}
          </Button>
        </div>
      </div>
    </div>
  );
};

const MemoizedPackageCard = React.memo(PackageCard);
export default MemoizedPackageCard;