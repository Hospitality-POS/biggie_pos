import React from "react";
import CircleIcon from "@mui/icons-material/Circle";
import { useAppDispatch, useAppSelector } from "../../store";
import { Card, Typography, Switch, Tooltip } from "antd";
import { DeleteFilled } from "@ant-design/icons";
import ShowConfirm from "@utils/ConfirmUtil";
import { deleteProduct, editProduct } from "@services/products";
import StoreModal from "@components/MODALS/pro/StoreModal";
import RecipeModal from "@components/MODALS/pro/RecipeModal";
import { usePrimaryColor } from "@context/PrimaryColorContext";

interface StoreProductCardProps {
  img: string;
  name: string;
  price: number;
  bowls: number;
  product: any;
  productId: string;
  activateInventory: boolean;
}

const StoreProductCard: React.FC<StoreProductCardProps> = ({
  name, price, bowls, product, productId, activateInventory,
}) => {
  const [isDisabled, setIsDisabled] = React.useState<boolean>(
    product?.is_disabled ?? false
  );
  const [toggling, setToggling] = React.useState(false);

  const primaryColor = usePrimaryColor();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const isAdmin = user?.role === "admin";

  const handleToggleDisabled = async () => {
    if (!isAdmin) return;
    setToggling(true);
    const newDisabledState = !isDisabled;
    setIsDisabled(newDisabledState); // optimistic update
    try {
      await editProduct({ ...product, is_disabled: newDisabledState });
    } catch {
      setIsDisabled(!newDisabledState); // revert on failure
    } finally {
      setToggling(false);
    }
  };

  // Frozen actions shown only when product is disabled — toggle only
  const disabledActions = [
    <div
      key="frozen-recipe"
      style={{ fontSize: 18, color: "#d1d5db", cursor: "not-allowed" }}
      title="Product is disabled"
    >
      <span style={{ fontSize: 16, opacity: 0.3 }}>📋</span>
    </div>,
    <div
      key="frozen-edit"
      style={{ fontSize: 18, color: "#d1d5db", cursor: "not-allowed" }}
      title="Product is disabled"
    >
      <span style={{ fontSize: 16, opacity: 0.3 }}>✏️</span>
    </div>,
    <div
      key="frozen-delete"
      style={{ fontSize: 18, color: "#d1d5db", cursor: "not-allowed" }}
      title="Product is disabled"
    >
      <DeleteFilled style={{ fontSize: 18, color: "#d1d5db", opacity: 0.3 }} />
    </div>,
  ];

  // Normal actions shown when product is active
  const activeActions = [
    <RecipeModal
      productId={product?._id}
      key={product?._id}
      activateInventory={product?.activateInventory}
      productName={name}
    />,
    <StoreModal edit={true} data={product} />,
    <DeleteFilled
      key="delete"
      onClick={async () => {
        if (!isAdmin) return;
        const confirm = await ShowConfirm({
          title: `Are you sure you want to delete ${name}?`,
          position: true,
        });
        if (confirm) {
          dispatch(deleteProduct(productId));
        }
      }}
      style={{
        fontSize: 18,
        color: isAdmin ? "#ef4444" : "gray",
        pointerEvents: !isAdmin ? "none" : "auto",
        opacity: !isAdmin ? 0.5 : 1,
      }}
    />,
  ];

  return (
    <Card
      key={product?._id}
      hoverable={!isDisabled}
      style={{
        maxWidth: 200,
        width: 200,
        borderRadius: 10,
        overflow: "hidden",
        border: "1px solid #e2e8f0",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        opacity: isDisabled ? 0.6 : 1,
        transition: "opacity 0.2s ease",
        position: "relative",
      }}
      styles={{ body: { backgroundColor: "white", padding: "12px 14px" } }}
      type="inner"
      actions={isDisabled ? disabledActions : activeActions}
    >
      {/* Disabled overlay — blocks all card interaction except the toggle */}
      {isDisabled && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10,
            borderRadius: 10,
            cursor: "not-allowed",
            // Leave room for the actions row at the bottom (~53px) and toggle area at top (~36px)
            bottom: 53,
            top: 36,
          }}
        />
      )}

      {/* Disable toggle — top-right corner */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 6,
          position: "relative",
          zIndex: 11, // always above the overlay so toggle is always clickable
        }}
      >
        <Tooltip
          title={
            !isAdmin
              ? "Only admins can enable/disable services"
              : isDisabled
                ? "Enable service at POS"
                : "Disable service at POS"
          }
        >
          <Switch
            size="small"
            checked={!isDisabled}
            loading={toggling}
            disabled={!isAdmin}
            onChange={handleToggleDisabled}
            style={{
              backgroundColor: isDisabled ? "#d1d5db" : "#6c1c2c",
            }}
          />
        </Tooltip>
      </div>

      <Typography.Title
        level={5}
        ellipsis={{ rows: 1, expandable: true }}
        style={{
          textAlign: "center",
          marginBottom: 10,
          fontSize: 13,
          color: isDisabled ? "#9ca3af" : "#0f172a",
          transition: "color 0.2s ease",
        }}
      >
        {name}
        {isDisabled && (
          <Typography.Text
            style={{
              display: "block",
              fontSize: 10,
              color: "#ef4444",
              fontWeight: 500,
              marginTop: 2,
            }}
          >
            Disabled
          </Typography.Text>
        )}
      </Typography.Title>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 4,
        }}
      >
        <Typography.Text
          ellipsis
          style={{ fontWeight: 600, color: isDisabled ? "#9ca3af" : "#6c1c2c" }}
        >
          Ksh.{price?.toLocaleString()}
        </Typography.Text>
        <Typography>
          <CircleIcon
            style={{
              fontSize: "10px",
              color: isDisabled ? "#9ca3af" : primaryColor,
              verticalAlign: "middle",
            }}
          />
        </Typography>
        <Typography.Text ellipsis>{bowls}</Typography.Text>
        <Typography.Text> Item{bowls <= 1 ? " " : "s"}</Typography.Text>
      </div>
    </Card>
  );
};

export default StoreProductCard;