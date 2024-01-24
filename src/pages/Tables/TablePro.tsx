import { HolderOutlined } from "@ant-design/icons";
import { ProCard } from "@ant-design/pro-components";
import SuccesssModal from "@components/MODALS/SuccessModal";
import TableCard from "@components/TableCard/TableCard";
import StaffModal from "@components/staffCard/LoginModal";
import { fetchTableUsequery } from "@services/tables";
import { useQuery } from "@tanstack/react-query";
import { Flex, Spin } from "antd";
import { Empty, Modal, Space } from "antd/lib";
import axios from "axios";
import Lottie from "lottie-react";
import React, { useState } from "react";
import { useAppSelector } from "src/store";
import fssanimation from "../../components/Loaders/fss loader.json";
import EmptyPage from "@routes/EmptyPage";

export default function TablePro() {
  const [open, setOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const { openModal: successmodal, loading } = useAppSelector(
    (state) => state.order
  );

  const handleOpen = (productId: React.SetStateAction<null>) => {
    setOpen(true);
    setSelectedProductId(productId);
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["tables"],
    queryFn: fetchTableUsequery,
    retry: 3,
    networkMode: "always"
  });

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
      children:
        item?.tables && item?.tables.length > 0 ? (
          item.tables.map((T) => (
            <Space align="center" key={T._id}>
              <div
                className="cards"
                style={{
                  display: "flex",
                  gap: "10px",
                  justifyContent: "center",
                  marginTop: "5px",
                  flexWrap: "wrap",
                  width: "100%",
                  bottom: 0,
                }}
              >
                <TableCard key={T._id} item={T} openModal={handleOpen} />
              </div>
            </Space>
          ))
        ) : (
          <EmptyPage />
        ),
    })
  );

  if (isLoading) {
    return <Spin size="large" fullscreen tip="please wait ..." />;
  }

  if(loading){
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
    return <EmptyPage/>;
  }

  return (
    <>
      <ProCard
        title={<Space>Tables</Space>}
        tabs={{
          type: "card",
          items: tabsItems,
        }}
      />
      {selectedProductId && (
        <StaffModal setOpen={setOpen} open={open} tbl={selectedProductId} />
      )}
    </>
  );
}
