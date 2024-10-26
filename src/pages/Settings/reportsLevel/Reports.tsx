import React, { useState } from "react";
import { Button, DatePicker } from "antd";
import {
  BarChartOutlined,
  FileExclamationOutlined,
  FileTextOutlined,
  HddOutlined,
  ShoppingOutlined,
  CarOutlined,
} from "@ant-design/icons";
import { ProCard } from "@ant-design/pro-components";
import PurchaseReportModal from "@components/Reports/PurchaseReport";
import SalesReportModal from "@components/Reports/SalesReport";
import VoidReportModal from "@components/Reports/VoidReport";
import { Space } from "antd";
import { useReport } from "../hooks/useReport";
import DeliveryReportModal from "@components/Reports/DeliveryReport";

const { RangePicker } = DatePicker;

interface DateTimeRange {
  startDate: string;
  endDate: string;
}

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

    // New delivery report states
    openDeliveryModal,
    setDeliveryDateTimeRange,
    setOpenDeliveryModal,
    onCloseDeliveryModal,
    deliveryDateTimeRange,
  } = useReport(activeTab);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setOpenSalesModal(false);
    setOpenPurchaseModal(false);
    setOpenVoidedModal(false);
    setOpenDeliveryModal(false);
  };

  const tabItems = [
    {
      key: "sale",
      tab: "Sale",
      label: (
        <Space>
          <FileTextOutlined />
          Generate Item Sales Report
        </Space>
      ),
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
            icon={<BarChartOutlined />}
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
      label: (
        <Space>
          <ShoppingOutlined />
          Generate Sales Report
        </Space>
      ),
      children: (
        <Space direction="vertical" size={16}>
          <RangePicker
            showTime={{ format: "HH:mm" }}
            format="YYYY-MM-DD HH:mm"
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
            icon={<BarChartOutlined />}
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
      label: (
        <Space>
          <FileExclamationOutlined />
          Generate Voided bills Report
        </Space>
      ),
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
            icon={<BarChartOutlined />}
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
    {
      key: "delivery",
      tab: "Delivery",
      label: (
        <Space>
          <CarOutlined />
          Generate Delivery Report
        </Space>
      ),
      children: (
        <Space direction="vertical" size={16}>
          <RangePicker
            showTime={{ format: "HH:mm" }}
            format="YYYY-MM-DD HH:mm"
            presets={rangePresets}
            onChange={(dates) =>
              setDeliveryDateTimeRange([
                dates?.[0]?.format("YYYY-MM-DD HH:mm") || "",
                dates?.[1]?.format("YYYY-MM-DD HH:mm") || "",
              ])
            }
          />
          <Button
            type="primary"
            onClick={generateReportHandler}
            disabled={isGenerateButtonDisabled}
            icon={<BarChartOutlined />}
          >
            Generate Report
          </Button> 
           <DeliveryReportModal
            openM={openDeliveryModal}
            onCloseM={onCloseDeliveryModal}
            startDate={deliveryDateTimeRange[0]} 
            endDate={deliveryDateTimeRange[1]}
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
