import React, { useState } from "react";
import { Button, DatePicker } from "antd";
import { HddOutlined, IssuesCloseOutlined } from "@ant-design/icons";
import { ProCard } from "@ant-design/pro-components";
import PurchaseReportModal from "@components/Reports/PurchaseReport";
import SalesReportModal from "@components/Reports/SalesReport";
import { Space } from "antd";
import { useReport } from "../hooks/useReport";

const { RangePicker } = DatePicker;

const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("sale");
  const {
    onCloseSalesModal,
    onClosePurchaseModal,
    generateReportHandler,
    isGenerateButtonDisabled,
    rangePresets,
    openSalesModal,
    openPurchaseModal,
    setSalesDateRange,
    setPurchaseDateRange,
    purchaseDateRange,
    salesDateRange,
    setOpenSalesModal,
    setOpenPurchaseModal
  } = useReport(activeTab);


  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setOpenSalesModal(false);
    setOpenPurchaseModal(false);
  };

  
  const tabItems = [
    {
      key: "sale",
      tab: "Sale",
      label: "Generate Sales Report",
      children: (
        <Space direction="vertical" size={16}>
          <RangePicker
            presets={rangePresets}
            onChange={(dates) =>
              setSalesDateRange([
                dates?.[0]?.format("YYYY-MM-DD") || "",
                dates?.[1]?.format("YYYY-MM-DD") || "",
              ])
            }
          />
          <Button
            type="primary"
            onClick={generateReportHandler}
            disabled={isGenerateButtonDisabled}
          >
            Generate Report
          </Button>
          <SalesReportModal
            openM={openSalesModal}
            onCloseM={onCloseSalesModal}
            startDate={salesDateRange[0]}
            endDate={salesDateRange[1]}
          />
        </Space>
      ),
    },
    {
      key: "purchase",
      tab: "Purchase",
      label: "Generate Purchase Report",
      children: (
        <Space direction="vertical" size={16}>
          <RangePicker
            presets={rangePresets}
            onChange={(dates) =>
              setPurchaseDateRange([
                dates?.[0]?.format("YYYY-MM-DD") || "",
                dates?.[1]?.format("YYYY-MM-DD") || "",
              ])
            }
          />
          <Button
            type="primary"
            onClick={() => generateReportHandler()}
            disabled={isGenerateButtonDisabled}
          >
            Generate Report
          </Button>
          <PurchaseReportModal
            openM={openPurchaseModal}
            onCloseM={onClosePurchaseModal}
            startDate={purchaseDateRange[0]}
            endDate={purchaseDateRange[1]}
          />
        </Space>
      ),
    },
  ];

  return (
    <ProCard
      tabs={{
        type: "line",
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

export default Reports;
