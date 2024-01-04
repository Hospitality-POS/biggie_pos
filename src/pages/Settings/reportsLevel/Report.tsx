import React, { useState } from "react";
import { HddOutlined } from "@ant-design/icons";
import { ProCard } from "@ant-design/pro-components";
import { Space } from "antd";
import SalesReport from "./SalesReport";
import PurchaseReport from "./PurchaseReports";
import { useReport } from "../hooks/useReport";

const ReportMainSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("sale");

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setOpenSalesModal(false);
    setOpenPurchaseModal(false);
  };
  const {
    openSalesModal,
    openPurchaseModal,
    onCloseSalesModal,
    onClosePurchaseModal,
    setOpenPurchaseModal,
    setOpenSalesModal,
  } = useReport("sale");

  console.log("openSalesModal:", openSalesModal);
  console.log("openPurchaseModal:", openPurchaseModal);
  const tabItems = [
    {
      key: "sale",
      tab: "Sale",
      label: "Generate Sales Report",
      children: (
        <SalesReport
          open={openSalesModal}
          onClose={() => onCloseSalesModal()}
        />
      ),
    },
    {
      key: "purchase",
      tab: "Purchase",
      label: "Generate Purchase Report",
      children: (
        <PurchaseReport
          open={openPurchaseModal}
          onClose={() => onClosePurchaseModal()}
        />
      ),
    },
  ];

  return (
    <ProCard
      style={{ height: "90vh" }}
      tabs={{
        type: "card",
        activeKey: activeTab,
        onChange: handleTabChange,
        items: tabItems,
      }}
      title={
        <Space>
          <HddOutlined />
          Generate Reports
        </Space>
      }
    ></ProCard>
  );
};

export default ReportMainSettings;
