import { AppstoreOutlined, HolderOutlined } from "@ant-design/icons";
import { ProCard } from "@ant-design/pro-components";
import SuccesssModal from "@components/MODALS/SuccessModal";
import TableCard from "@components/TableCard/TableCard";
import StaffModal from "@components/staffCard/LoginModal";
import { fetchTableUsequery } from "@services/tables";
import { useQuery } from "@tanstack/react-query";
import { ConfigProvider, Spin, Typography } from "antd";
import { Space } from "antd/lib";
import Lottie from "lottie-react";
import React, { useState, useEffect } from "react";
import { useAppSelector } from "src/store";
import fssanimation from "../../components/Loaders/fss loader.json";
import EmptyPage from "@routes/EmptyPage";

export default function TablePro() {
  const [open, setOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [activeTabId, setActiveTabId] = useState<string>("");
  const { openModal: successmodal, loading } = useAppSelector(
    (state) => state.order
  );

  const handleOpen = (productId: React.SetStateAction<null>) => {
    setOpen(true);
    setSelectedProductId(productId);
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["tables", activeTabId],
    queryFn: () => fetchTableUsequery({ id: activeTabId }),
    networkMode: "always",
  });

  // Set initial active tab when data is loaded
  useEffect(() => {
    if (data && data.length > 0 && !activeTabId) {
      setActiveTabId(data[0]._id);
    }
  }, [data]);

  if (successmodal) {
    return <SuccesssModal />;
  }

  const tabsItems = data?.map(
    (item: { _id: string; name: string; tables?: any[] }) => ({
      key: `${item._id}`,
      tab: "Table",
      label: (
        <Space>
          <HolderOutlined />
          {item.name}
        </Space>
      ),
      children: [
        item?.tables && item?.tables.length > 0 ? (
          <div
            className="wrapper2"
            style={{
              display: "grid",
              rowGap: 30,
              height: "calc(100vh - 280px)",
              overflowY: "auto",
              alignItems: "start",
            }}
          >
            {item.tables.length > 0 ? (
              item.tables.map((T) => (
                <div
                  key={T._id}
                  className="card"
                  style={{
                    display: "flex",
                    justifyContent: "flex-start",
                    marginTop: "0px",
                    flexWrap: "wrap",
                    width: "100%",
                    bottom: 0,
                  }}
                >
                  <TableCard key={T._id} item={T} openModal={handleOpen} />
                </div>
              ))
            ) : (
              <EmptyPage />
            )}
          </div>
        ) : (
          <EmptyPage />
        ),
      ],
    })
  );

  if (isLoading) {
    return <Spin size="large" fullscreen tip="please wait ..." />;
  }

  if (loading) {
    return (
      <div
        style={{
          display: "grid",
          placeContent: "center",
          placeSelf: "auto",
          marginTop: "80px",
        }}
      >
        <Lottie
          animationData={fssanimation}
          loop={true}
          height={20}
          width={20}
        />
      </div>
    );
  }
  if (isError) {
    return <EmptyPage />;
  }

  return (
    <>
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
          title={
            <Typography.Text style={{ fontSize: "18px" }}>
              <AppstoreOutlined /> Tables
            </Typography.Text>
          }
          tabs={{
            type: "card",
            items: tabsItems,
            onChange: (key) => setActiveTabId(key),
            activeKey: activeTabId
          }}
          bordered
          boxShadow
        />
      </ConfigProvider>
      {selectedProductId && (
        <StaffModal setOpen={setOpen} open={open} tbl={selectedProductId} />
      )}
    </>
  );
}