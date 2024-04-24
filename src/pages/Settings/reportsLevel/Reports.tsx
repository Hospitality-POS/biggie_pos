import React, { useState } from "react";
import { Button, DatePicker } from "antd";
import { HddOutlined, HolderOutlined, IssuesCloseOutlined } from "@ant-design/icons";
import { ProCard } from "@ant-design/pro-components";
import PurchaseReportModal from "@components/Reports/PurchaseReport";
import SalesReportModal from "@components/Reports/SalesReport";
import { Space } from "antd";
import { useReport } from "../hooks/useReport";
import VoidReportModal from "@components/Reports/VoidReport";

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
    setSalesDateTimeRange,
    setPurchaseDateTimeRange,
    purchaseDateTimeRange,
    salesDateTimeRange,
    setOpenSalesModal,
    setOpenPurchaseModal,

    openVoidedModal,
    setVoidedDateTimeRange,
    setOpenVoidedModal,
    onCloseVoidedModal,
    voidedDateTimeRange,
  } = useReport(activeTab);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setOpenSalesModal(false);
    setOpenPurchaseModal(false);
    setOpenVoidedModal(false);
  };

  const tabItems = [
    {
      key: "sale",
      tab: "Sale",
      label: <Space><HolderOutlined/>Generate Sales Report</Space>,
      children: (
        <Space direction="vertical" size={16}>
          <RangePicker
            showTime={{ format: "HH:mm" }}
            format="YYYY-MM-DD HH:mm"
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
            startDate={salesDateTimeRange[0]}
            endDate={salesDateTimeRange[1]}
          />
        </Space>
      ),
    },
    {
      key: "purchase",
      tab: "Purchase",
      label: <Space><HolderOutlined/>Generate Purchase Report</Space>,
      children: (
        <Space direction="vertical" size={16}>
          <RangePicker
            showTime={{ format: "HH:mm" }}
            format="YYYY-MM-DD HH:mm"
            presets={rangePresets}
            // showHour={true}
            // showTime
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
            startDate={purchaseDateTimeRange[0]}
            endDate={purchaseDateTimeRange[1]}
          />
        </Space>
      ),
    },
    {
      key: "voided",
      tab: "void",
      label: <Space><HolderOutlined/>Generate Voided bills Report</Space>,
      children: (
        <Space direction="vertical" size={16}>
          <RangePicker
            showTime={{ format: "HH:mm" }}
            format="YYYY-MM-DD HH:mm"
            presets={rangePresets}
            onChange={(dates) =>
              setVoidedDateTimeRange([
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
          <VoidReportModal
            openM={openVoidedModal}
            onCloseM={onCloseVoidedModal}
            startDate={voidedDateTimeRange[0]}
            endDate={voidedDateTimeRange[1]}
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
