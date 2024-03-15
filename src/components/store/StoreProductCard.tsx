import {
  Box,
  Button,
  CardContent,
  CardMedia,
  IconButton,
} from "@mui/material";
import React from "react";
import CircleIcon from "@mui/icons-material/Circle";
import BorderColorOutlinedIcon from "@mui/icons-material/BorderColorOutlined";
import EditProductModal from "./EditProductModal";
// import { deleteProduct } from "../../features/Product/ProductAction";
import { MenuBook } from "@mui/icons-material";
import { useAppDispatch } from "../../store";
import { Card, Space, Typography } from "antd";
import { ProCard } from "@ant-design/pro-components";
import { DeleteFilled, EditOutlined, SettingOutlined } from "@ant-design/icons";
import ShowConfirm from "@utils/ConfirmUtil";
import { deleteProduct } from "@services/products";

interface StoreProductCardProps {
  img: string;
  name: string;
  price: number;
  bowls: number;
  product: any;
  productId: string;
}
const StoreProductCard: React.FC<StoreProductCardProps> = ({
  name,
  price,
  bowls,
  product,
  productId,
}) => {
  const [modalOpen, setModalOpen] = React.useState(false);
  const dispatch = useAppDispatch();
  const handleEditClick = () => {
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };
  const handleDeleteClick = (id: string) => {
    dispatch(deleteProduct(id));
  };

  return (
    <>
      <Card
        hoverable
        style={{ maxWidth: 200, width: 200 }}
        // bordered
        // bodyStyle={{ backgroundColor: "white" }}
        type="inner"
        actions={[
          <SettingOutlined
            key="setting"
            style={{ fontSize: "20px", color: "white" }}
          />,
          <EditOutlined
            key="edit"
            onClick={handleEditClick}
            style={{ fontSize: "20px", color: "white" }}
          />,
          <DeleteFilled
            key="delete"
            onClick={async () => {
              const confirm = await ShowConfirm({
                title: "Are you sure you want to delete this product?",
              });
              if (confirm) {
                deleteProduct(productId);
              }
            }}
            style={{ fontSize: "20px", color: "white" }}
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
            <CircleIcon style={{ fontSize: "10px", color: "#6c1c2c" }} />
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
