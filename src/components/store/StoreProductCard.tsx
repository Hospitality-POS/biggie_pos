import React, { } from "react";
import CircleIcon from "@mui/icons-material/Circle";
import EditProductModal from "./EditProductModal";
import { useAppDispatch, useAppSelector } from "../../store";
import { Card, Typography } from "antd";
import { DeleteFilled } from "@ant-design/icons";
import ShowConfirm from "@utils/ConfirmUtil";
import { deleteProduct } from "@services/products";
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
  const [modalOpen, setModalOpen] = React.useState(false);
  const primaryColor = usePrimaryColor();
  const dispatch = useAppDispatch();

  const handleEditClick = () => setModalOpen(true);
  const handleCloseModal = () => setModalOpen(false);
  const handleDeleteClick = (id: string) => dispatch(deleteProduct(id));

  const { user } = useAppSelector((state) => state.auth);
  const isAdmin = user?.role === "admin";

  return (
    <>
      <Card
        key={product?._id}
        hoverable
        style={{
          maxWidth: 200, width: 200,
          borderRadius: 10, overflow: "hidden",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}
        styles={{ body: { backgroundColor: "white", padding: "12px 14px" } }}
        type="inner"
        actions={[
          <RecipeModal productId={product?._id} key={product?._id} activateInventory={product?.activateInventory} productName={name} />,
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
                deleteProduct(productId);
              }
            }}
            style={{
              fontSize: 18,
              color: isAdmin ? "#ef4444" : "gray",
              pointerEvents: !isAdmin ? "none" : "auto",
              opacity: !isAdmin ? 0.5 : 1,
            }}
          />,
        ]}
      >
        <Typography.Title
          level={5}
          ellipsis={{ rows: 1, expandable: true }}
          style={{ textAlign: "center", marginBottom: 10, fontSize: 13, color: "#0f172a" }}
        >
          {name}
        </Typography.Title>

        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 4 }}>
          <Typography.Text ellipsis style={{ fontWeight: 600, color: "#6c1c2c" }}>
            Ksh.{price?.toLocaleString()}
          </Typography.Text>
          <Typography>
            <CircleIcon style={{ fontSize: "10px", color: primaryColor, verticalAlign: "middle" }} />
          </Typography>
          <Typography.Text ellipsis>{bowls}</Typography.Text>
          <Typography.Text> Item{bowls <= 1 ? " " : "s"}</Typography.Text>
        </div>
      </Card>

      <EditProductModal open={modalOpen} productData={product} onClose={handleCloseModal} />
    </>
  );
};

export default StoreProductCard;