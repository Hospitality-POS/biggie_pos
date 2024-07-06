import { FolderAddOutlined, HolderOutlined } from "@ant-design/icons";
import { ProCard } from "@ant-design/pro-components";
import { useQuery } from "@tanstack/react-query";
import {
  Button,
  ConfigProvider,
  Empty,
  FloatButton,
  Input,
  Result,
  Spin,
  Typography,
} from "antd";
import { Space } from "antd/lib";
import { useState } from "react";
import EmptyPage from "@routes/EmptyPage";
import { getAllProducts } from "@services/products";
import StoreProductCard from "@components/store/StoreProductCard";
import ErrorDialog from "@components/MODALS/Dialogs/ErrorDialog";
import StoreModal from "@components/MODALS/pro/StoreModal";

const { Search } = Input;

export default function MainStore() {
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["products"],
    queryFn: getAllProducts,
    retry: 1,
    refetchInterval: 3000,
    networkMode: "always",
  });

  const tabsItems = data?.map((item) => ({
    key: `${item._id}`,
    tab: "Products Management",
    label: (
      <Space>
        <HolderOutlined />
        {item?.name}
      </Space>
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
    return (
      <Spin
        size="large"
        fullscreen
        tip="please wait, fetching all products ..."
      />
    );
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
              marginBottom: 20,
            }}
          >
            <Space>
              <FolderAddOutlined />
              <Typography.Text strong>Products Management</Typography.Text>
            </Space>
            <Space>
              <StoreModal edit={false} />
              <Search
                placeholder="Enter product name"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                enterButton
              />
            </Space>
          </Space>
          <ConfigProvider
            theme={{
              components: {
                Tabs: {
                  itemColor: "#fff",
                  itemActiveColor: "#000",
                  itemHoverColor: "#aa846f",
                  itemSelectedColor: "#000",
                  cardBg: "#6c1c2c",
                },
              },
            }}
          >
            <ProCard
              tabs={{
                type: "card",
                items: tabsItems,
                tabBarGutter: 5,
                animated: true,
              }}
              bordered
              boxShadow
            />
          </ConfigProvider>
        </>
      ) : (
        <>
          <Result
            status="info"
            title="No Products Found"
            subTitle="You haven't added any products yet. Click the button below to get started!"
            extra={
              <Space>
                <StoreModal edit={false} />
              </Space>
            }
            style={{ margin: "0 auto" }}
          />
        </>
      )}
    </>
  );
}
