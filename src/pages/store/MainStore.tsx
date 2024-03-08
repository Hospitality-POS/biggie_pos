import { HolderOutlined, PlusOutlined } from "@ant-design/icons";
import { ProCard } from "@ant-design/pro-components";
import SuccesssModal from "@components/MODALS/SuccessModal";
import TableCard from "@components/TableCard/TableCard";
import StaffModal from "@components/staffCard/LoginModal";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Flex, FloatButton, Spin, Typography } from "antd";
import { Empty, Modal, Space } from "antd/lib";
import axios from "axios";
import Lottie from "lottie-react";
import React, { useState } from "react";
import { useAppSelector } from "src/store";
import fssanimation from "../../components/Loaders/fss loader.json";
import EmptyPage from "@routes/EmptyPage";
import { getAllProducts } from "@services/products";
import StoreProductCardSkeleton from "@components/store/StoreProductSkeletonCard";
import StoreProductCard from "@components/store/StoreProductCard";
import ErrorDialog from "@components/MODALS/Dialogs/ErrorDialog";
import { Product } from "src/interfaces/Product";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import { CardContent, Box, IconButton } from "@mui/material";
import { PlusOneTwoTone } from "@mui/icons-material";
import AddNewProductModal from "@components/store/AddNewProductModal";

export default function MainStore() {
  const [open, setOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);

  const handleOpen = (productId: React.SetStateAction<null>) => {
    setOpen(true);
    setSelectedProductId(productId);
  };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["products"],
    queryFn: getAllProducts,
    retry: 3,
    refetchInterval: 3000,
    networkMode: "always",
  });

  const onAdd = () => {
    setOpen(true);
  };
  const onSave = () => {
    console.log("clicked");
  };
  const onClose = () => {
    setOpen(false);
  };

  const tabsItems = data?.map((item) => ({
    key: `${item._id}`,
    tab: "Products Management",
    label: (
      <Typography>
        <HolderOutlined />
        {item.name}
      </Typography>
    ),
    children: [
      <FloatButton
        onClick={onAdd}
        type="primary"
        icon={<PlusOutlined />}
        style={{ right: 20 + 70 }}
        tooltip={<div>Add a new Product</div>}
      />,
      item?.products && item?.products.length > 0 ? (
        <div
          className="wrapper"
          style={{
            display: "grid",
            // gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", 
            // gap: "10px",
            padding: 4,
            // border: "1px solid red",
            minHeight: "75vh",
            overflowY: "auto",
            alignItems: "start",
          }}
        >
          {item?.products.map((prod) => (
            <Space>
              <StoreProductCard
                key={prod._id}
                bowls={prod.quantity}
                price={prod.price}
                name={prod.name}
                img={prod.image}
                product={prod}
                productId={prod._id}
              />
            </Space>
          ))}
        </div>
      ) : (
        <EmptyPage />
      ),
    ],
  }));

  if (isLoading) {
    return <Spin size="large" fullscreen tip="please wait ..." />;
  }
  if (isError) {
    return (
      <ErrorDialog
        error={error}
        onClose={() => {
          setErrorDialogOpen(false);
        }}
      />
    );
  }

  return (
    <>
      <ProCard
        title={<Space>Products Management</Space>}
        tabs={{
          type: "card",
          items: tabsItems,
        }}
      />

      <AddNewProductModal open={open} onClose={onClose} onSave={onSave} />
    </>
  );
}
