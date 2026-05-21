import React from "react";
import CircleIcon from "@mui/icons-material/Circle";
import { useAppDispatch, useAppSelector } from "../../store";
import { Card, Typography, Switch, Tooltip, message } from "antd";
import { DeleteFilled, EditOutlined } from "@ant-design/icons";
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
  onSuccess?: () => void;
}

const StoreProductCard: React.FC<StoreProductCardProps> = ({
  name, price, bowls, product, productId, activateInventory, onSuccess,
}) => {
  const [isDisabled, setIsDisabled] = React.useState<boolean>(
    product?.is_disabled ?? false
  );
  const [toggling, setToggling] = React.useState(false);

  const primaryColor = usePrimaryColor();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  // Check if user is admin OR manager (for delete and disable operations)
  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager";
  const canManageProducts = isAdmin || isManager; // For delete and disable
  const canEdit = true; // Everyone can edit products

  const handleToggleDisabled = async () => {
    if (!canManageProducts) {
      message.warning("Only admins and managers can enable/disable products");
      return;
    }
    setToggling(true);
    const newDisabledState = !isDisabled;
    setIsDisabled(newDisabledState); // optimistic update
    try {
      await editProduct({ ...product, is_disabled: newDisabledState });
      message.success(`Product ${newDisabledState ? "disabled" : "enabled"} successfully`);
    } catch {
      setIsDisabled(!newDisabledState); // revert on failure
      message.error("Failed to update product status");
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = async () => {
    if (!canManageProducts) {
      message.warning("Only admins and managers can delete products");
      return;
    }
    const confirm = await ShowConfirm({
      title: `Are you sure you want to delete ${name}?`,
      position: true,
      description: "This action cannot be undone.",
    });
    if (confirm) {
      try {
        await dispatch(deleteProduct(productId));
        message.success(`${name} deleted successfully`);
      } catch (error) {
        message.error("Failed to delete product");
      }
    }
  };

  // Frozen actions shown only when product is disabled
  const disabledActions = [
    <RecipeModal
      productId={product?._id}
      key={product?._id}
      activateInventory={product?.activateInventory}
      productName={name}
      disabled={isDisabled}
    />,
    <Tooltip
      key="edit-tooltip"
      title="Edit product"
    >
      <div>
        <StoreModal
          edit={true}
          data={product}
          onSuccess={onSuccess}
          trigger={
            <EditOutlined
              style={{
                fontSize: 18,
                color: primaryColor,
                cursor: "pointer",
              }}
            />
          }
        />
      </div>
    </Tooltip>,
    <Tooltip
      key="delete-tooltip"
      title={!canManageProducts ? "Only admins and managers can delete products" : "Delete product"}
    >
      <DeleteFilled
        key="delete"
        onClick={handleDelete}
        style={{
          fontSize: 18,
          color: canManageProducts ? "#ef4444" : "#9ca3af",
          cursor: canManageProducts ? "pointer" : "not-allowed",
          opacity: canManageProducts ? 1 : 0.5,
        }}
      />
    </Tooltip>,
  ];

  // Normal actions shown when product is active
  const activeActions = [
    <RecipeModal
      productId={product?._id}
      key={product?._id}
      activateInventory={product?.activateInventory}
      productName={name}
    />,
    <Tooltip
      key="edit-tooltip"
      title="Edit product"
    >
      <div>
        <StoreModal
          edit={true}
          data={product}
          onSuccess={onSuccess}
          trigger={
            <EditOutlined
              style={{
                fontSize: 18,
                color: primaryColor,
                cursor: "pointer",
              }}
            />
          }
        />
      </div>
    </Tooltip>,
    <Tooltip
      key="delete-tooltip"
      title={!canManageProducts ? "Only admins and managers can delete products" : "Delete product"}
    >
      <DeleteFilled
        key="delete"
        onClick={handleDelete}
        style={{
          fontSize: 18,
          color: canManageProducts ? "#ef4444" : "#9ca3af",
          cursor: canManageProducts ? "pointer" : "not-allowed",
          opacity: canManageProducts ? 1 : 0.5,
        }}
      />
    </Tooltip>,
  ];

  // Get role badge text
  const getRoleBadge = () => {
    if (isAdmin) return "Admin";
    if (isManager) return "Manager";
    return "Staff";
  };

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
          }}
        />
      )}

      {/* Disable toggle — top-right corner */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
          position: "relative",
          zIndex: 11, // always above the overlay so toggle is always clickable
        }}
      >
        <Tooltip
          title={
            !canManageProducts
              ? "Only admins and managers can enable/disable products"
              : isDisabled
                ? "Enable product at POS"
                : "Disable product at POS"
          }
        >
          <Switch
            size="small"
            checked={!isDisabled}
            loading={toggling}
            disabled={!canManageProducts}
            onChange={handleToggleDisabled}
            style={{
              backgroundColor: isDisabled ? "#d1d5db" : "#6c1c2c",
            }}
          />
        </Tooltip>

        {/* Role indicator */}
        {/* <Tooltip title={`Role: ${getRoleBadge()}`}>
          <div
            style={{
              fontSize: 9,
              padding: "2px 6px",
              borderRadius: 4,
              backgroundColor: isAdmin ? "#ef4444" : isManager ? "#f59e0b" : "#9ca3af",
              color: "#fff",
              fontWeight: 500,
            }}
          >
            {getRoleBadge()}
          </div>
        </Tooltip> */}
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