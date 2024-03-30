import {
  FolderAddOutlined,
  HolderOutlined,
  PlusCircleFilled,
  PlusOutlined,
} from "@ant-design/icons";
import { ProCard } from "@ant-design/pro-components";
import { useQuery } from "@tanstack/react-query";
import { Button, Empty, FloatButton, Input, Spin, Typography } from "antd";
import { Space } from "antd/lib";
import React, { useState } from "react";
import EmptyPage from "@routes/EmptyPage";
import { getAllProducts } from "@services/products";
import StoreProductCard from "@components/store/StoreProductCard";
import ErrorDialog from "@components/MODALS/Dialogs/ErrorDialog";
import AddNewProductModal from "@components/store/AddNewProductModal";
import StoreModal from "@components/MODALS/pro/StoreModal";

const { Search } = Input;

export default function MainStore() {
  const [open, setOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);

  const handleOpen = (productId: React.SetStateAction<null>) => {
    setOpen(true);
    setSelectedProductId(productId);
  };

  const [searchTerm, setSearchTerm] = useState("");

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
      <>
        <HolderOutlined />
        {item?.name}
      </>
    ),
    children: [
      item?.products && item?.products?.length > 0 ? (
        <div
          className="wrapper"
          style={{
            display: "grid",
            padding: 4,
            rowGap: 15,
            height: "calc(100vh - 280px)",
            overflowY: "auto",
            alignItems: "start",
          }}
        >
          {item?.products.length > 0 ? (
            item?.products
              ?.filter((prod) =>
                prod?.name.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((prod) => (
                <Space>
                  <StoreProductCard
                    key={prod._id}
                    bowls={prod?.quantity}
                    price={prod.price}
                    name={prod?.name}
                    img={prod?.image}
                    product={prod}
                    productId={prod?._id}
                  />
                </Space>
              ))
          ) : (
            <Empty description="No Products in this category" />
          )}
        </div>
      ) : (
        <>
          <EmptyPage />
        </>
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
      {data.length > 0 ? (
        <>
          <Space
            style={{
              justifyContent: "space-between",
              width: "100%",
              marginBottom: 4,
            }}
          >
            <Space>
              <FolderAddOutlined />
              <Typography.Text strong>Products Management</Typography.Text>
            </Space>
            <Search
              placeholder="Enter product name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              enterButton
            />
          </Space>
          <ProCard
            tabs={{
              type: "card",
              items: tabsItems,
              tabPosition: "right",
              tabBarStyle: { background: "", touchAction: "pan-down" },
            }}
            bordered
            boxShadow
          />
          <AddNewProductModal open={open} onClose={onClose} onSave={onSave} />
        </>
      ) : (
        <EmptyPage />
      )}
      <FloatButton
        type="primary"
        description={<StoreModal edit={false} />}
        shape="square"
        style={{ right: 10 + 40, width: 100 }}
        tooltip={<div>Add a new Product</div>}
      />
    </>
  );
}
