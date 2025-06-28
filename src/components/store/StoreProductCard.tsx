import React, { useEffect, useState } from "react";
import CircleIcon from "@mui/icons-material/Circle";
import EditProductModal from "./EditProductModal";
// import { deleteProduct } from "../../features/Product/ProductAction";
import { useAppDispatch, useAppSelector } from "../../store";
import { Card, Typography } from "antd";
import { DeleteFilled, SettingOutlined } from "@ant-design/icons";
import ShowConfirm from "@utils/ConfirmUtil";
import { deleteProduct } from "@services/products";
import StoreModal from "@components/MODALS/pro/StoreModal";
import RecipeModal from "@components/MODALS/pro/RecipeModal";

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
  name,
  price,
  bowls,
  product,
  productId,
  activateInventory,
}) => {

  const [modalOpen, setModalOpen] = React.useState(false);
  const [primaryColor, setPrimaryColor] = useState("#6c1c2c");
  useEffect(() => {
    const storedTenant = localStorage.getItem("tenant");
    const tenant = storedTenant ? JSON.parse(storedTenant) : null;
    if (tenant && tenant.color_scheme.primary) {
      setPrimaryColor(tenant.color_scheme.primary);
    }
  }, []);

  const dispatch = useAppDispatch();
  const handleEditClick = () => {
    setModalOpen(true);
  };

  const { user } = useAppSelector((state) => state.auth);
  const isAdmin = user?.role === "admin";



  const handleCloseModal = () => {
    setModalOpen(false);
  };
  const handleDeleteClick = (id: string) => {
    dispatch(deleteProduct(id));
  };



  return (
    <>
      <Card
        key={product?._id}
        hoverable
        style={{ maxWidth: 200, width: 200 }}
        bodyStyle={{ backgroundColor: "white" }}
        type="inner"
        actions={[
          // <SettingOutlined
          //   key="setting"
          //   style={{ fontSize: "25px", color: "white" }}
          // />,
          <RecipeModal productId={product?._id} key={product?._id} activateInventory={product?.activateInventory} productName={name} />,
          <StoreModal edit={true} data={product} />,
          <DeleteFilled
            key="delete"
            onClick={async () => {
              if (!isAdmin) return; // Prevent click if not admin

              const confirm = await ShowConfirm({
                title: `Are you sure you want to delete ${name}?`,
                position: true
              });
              if (confirm) {
                deleteProduct(productId);
              }
            }}
            style={{
              fontSize: "25px",
              color: isAdmin ? "white" : "gray", // Optional: Change color if disabled
              pointerEvents: !isAdmin ? "none" : "auto", // Prevent clicks if disabled
              opacity: !isAdmin ? 0.5 : 1, // Make it visually disabled
            }}
          />,
        ]}
      >
        <Typography.Title
          level={5}
          ellipsis={{ rows: 1, expandable: true }}
          style={{ textAlign: "center" }}
        >
          {name}
        </Typography.Title>

        <div style={{ display: "flex", justifyContent: "center", gap: 4 }}>
          <Typography.Text ellipsis>
            {" "}
            Ksh.{price?.toLocaleString()}
          </Typography.Text>
          <Typography>
            <CircleIcon style={{ fontSize: "10px", color: primaryColor }} />
          </Typography>
          <Typography.Text ellipsis>{bowls}</Typography.Text>
          <Typography.Text> Item{bowls <= 1 ? " " : "s"}</Typography.Text>
        </div>
      </Card>

      <EditProductModal
        open={modalOpen}
        productData={product}
        onClose={handleCloseModal}
      />
    </>
  );
};

export default StoreProductCard;
