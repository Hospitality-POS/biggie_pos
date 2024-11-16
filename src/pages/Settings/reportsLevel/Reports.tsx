import React, { useState } from "react";
import { Button, DatePicker, Space, Tabs } from "antd";
import {
  BarChartOutlined,
  FileExclamationOutlined,
  FileTextOutlined,
  HddOutlined,
  ShoppingOutlined,
  CarOutlined,
  StockOutlined,
} from "@ant-design/icons";
import { ProCard } from "@ant-design/pro-components";
import PurchaseReportModal from "@components/Reports/PurchaseReport";
import SalesReportModal from "@components/Reports/SalesReport";
import VoidReportModal from "@components/Reports/VoidReport";
import DeliveryReportModal from "@components/Reports/DeliveryReport";
import { useReport } from "../hooks/useReport";
import InventoryUsageReportModal from "@components/Reports/InventoryUsageReport"

const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

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
    openDeliveryModal,
    setDeliveryDateTimeRange,
    setOpenDeliveryModal,
    onCloseDeliveryModal,
    deliveryDateTimeRange,
    openInventoryUsageModal,
    setOpenInventoryUsageModal,
    onCloseInventoryUsageModal,
    setInventoryUsageDateTimeRange,
    inventoryUsageDateTimeRange,

  } = useReport(activeTab);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setOpenSalesModal(false);
    setOpenPurchaseModal(false);
    setOpenVoidedModal(false);
    setOpenDeliveryModal(false);
    setOpenInventoryUsageModal(false);
  };

  return (
    <ProCard
      title={
        <Space>
          <HddOutlined style={{ color: "#722ed1", fontSize: "24px" }} />
          Generate Reports
        </Space>
      }
    >
      <Tabs activeKey={activeTab} onChange={handleTabChange} type="card">
        <TabPane
          tab={
            <Space>
              <FileTextOutlined style={{ color: "#52c41a" }} />{" "}
              {/* Green for Sales */}
              Generate Item Sales Report
            </Space>
          }
          key="sale"
        >
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
        </TabPane>

        <TabPane
          tab={
            <Space>
              <ShoppingOutlined style={{ color: "#fa8c16" }} />{" "}
              {/* Orange for Purchase */}
              Generate Purchase Report
            </Space>
          }
          key="purchase"
        >
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
              onClick={generateReportHandler}
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
        </TabPane>

        <TabPane
          tab={
            <Space>
              <FileExclamationOutlined style={{ color: "#eb2f2f" }} />{" "}
              {/* Red for Voided */}
              Generate Voided Bills Report
            </Space>
          }
          key="voided"
        >
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
        </TabPane>

        <TabPane
          tab={
            <Space>
              <CarOutlined style={{ color: "#1890ff" }} />{" "}
              {/* Blue for Delivery */}
              Generate Delivery Report
            </Space>
          }
          key="delivery"
        >
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
        </TabPane>
        <TabPane
          tab={
            <Space>
              <StockOutlined style={{ color: "#1890ff" }} />{" "}
              {/* Blue for Delivery */}
              Inventory Usage Report
            </Space>
          }
          key="usage"
        >
          <Space direction="vertical" size={16}>
            <RangePicker
              showTime={{ format: "HH:mm" }}
              format="YYYY-MM-DD HH:mm"
              presets={rangePresets}
              onChange={(dates) =>
                setInventoryUsageDateTimeRange([
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
            <InventoryUsageReportModal
              openM={openInventoryUsageModal}
              onCloseM={onCloseInventoryUsageModal}
              startDate={inventoryUsageDateTimeRange[0]}
              endDate={inventoryUsageDateTimeRange[1]}
            />
          </Space>
        </TabPane>
      </Tabs>
    </ProCard>
  );
};

export default Reports;
