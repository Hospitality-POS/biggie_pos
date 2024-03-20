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
    setSalesDateTimeRange, // Updated to handle both date and time
    setPurchaseDateTimeRange, // Updated to handle both date and time
    purchaseDateTimeRange, // Updated to handle both date and time
    salesDateTimeRange, // Updated to handle both date and time
    setOpenSalesModal,
    setOpenPurchaseModal,
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
            showTime={{ format: "HH:mm" }} // Enable time selection
            format="YYYY-MM-DD HH:mm" // Set format to include time
            presets={rangePresets}
            onChange={(dates) =>
              setSalesDateTimeRange([
                dates?.[0]?.format("YYYY-MM-DD HH:mm") || "",
                dates?.[1]?.format("YYYY-MM-DD HH:mm") || "",
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
            startDate={salesDateTimeRange[0]} // Updated to use salesDateTimeRange
            endDate={salesDateTimeRange[1]} // Updated to use salesDateTimeRange
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
            showTime={{ format: "HH:mm" }} // Enable time selection
            format="YYYY-MM-DD HH:mm" // Set format to include time
            presets={rangePresets}
            onChange={(dates) =>
              setPurchaseDateTimeRange([
                dates?.[0]?.format("YYYY-MM-DD HH:mm") || "",
                dates?.[1]?.format("YYYY-MM-DD HH:mm") || "",
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
            startDate={purchaseDateTimeRange[0]} // Updated to use purchaseDateTimeRange
            endDate={purchaseDateTimeRange[1]} // Updated to use purchaseDateTimeRange
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
