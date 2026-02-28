import React, { useState } from "react";
import { Button, DatePicker, Form, InputNumber } from "antd";
import {
  BarChartOutlined,
  CarOutlined,
  FileExclamationOutlined,
  FileTextOutlined,
  HddOutlined,
  PrinterOutlined,
  ShoppingOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { ProCard, ProFormSelect } from "@ant-design/pro-components";
import PurchaseReportModal from "@components/Reports/PurchaseReport";
import { Space } from "antd";
import { useReport } from "../hooks/useReport";
import VoidReportModal from "@components/Reports/VoidReport";
import { fetchItemSalesReport } from "@services/reports";
import { fetchAllUsersByShopId } from "@services/users";
import { fetchAllCustomers } from "@services/customers";
import ItemSalesModal from "./ItemSalesModal";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getTableLocation } from "@services/tables";
import DeliveryReportModal from "@components/Reports/DeliveryReport";
import InventoryUsageReportModal from "@components/Reports/InventoryUsageReport";

const { RangePicker } = DatePicker;

const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("sale");
  const [form] = Form.useForm();
  const [queryKey, setQueryKey] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string } | null>(null);

  const queryClient = useQueryClient();

  const {
    onClosePurchaseModal,
    generateReportHandler,
    isGenerateButtonDisabled,
    rangePresets,
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

    setDeliveryDateTimeRange,
    onCloseDeliveryModal,
    deliveryDateTimeRange,
    openDeliveryModal,

    openInventoryUsageModal,
    setInventoryUsageDateTimeRange,
    onCloseInventoryUsageModal,
    inventoryUsageDateTimeRange,
  } = useReport(activeTab);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setOpenSalesModal(false);
    setOpenPurchaseModal(false);
    setOpenVoidedModal(false);
    form.resetFields();
    setSelectedCustomer(null);
    setQueryKey(null);
  };

  const shopId = localStorage.getItem("shopId");

  const { data: users } = useQuery({
    queryKey: ["reports_users_by_shop_id"],
    queryFn: () => fetchAllUsersByShopId(),
    retry: 3,
    refetchInterval: 5000,
    networkMode: "always",
    enabled: !!shopId,
  });

  // Fetch customers for the filter
  const { data: customersData } = useQuery({
    queryKey: ["reports_customers"],
    queryFn: () => fetchAllCustomers(),
    retry: 2,
    networkMode: "always",
    enabled: !!shopId,
  });

  const fetchUsersByShopIdRequest = async () => {
    return users?.map((e: { username: any; _id: any }) => {
      return { label: e.username, value: e._id };
    });
  };

  const fetchCustomersRequest = async () => {
    const list = Array.isArray(customersData)
      ? customersData
      : customersData?.data || [];
    return list.map((c: any) => ({
      label: c.customer_name || c.name,
      value: c._id,
    }));
  };

  const onFinish = async (values) => {
    const { dateRange, servedBy, commission, locationId, shop_id, customerId } = values;
    const [startDate, endDate] = dateRange || [];
    setSalesDateTimeRange([
      dateRange?.[0]?.format("YYYY-MM-DD HH:mm") || "",
      dateRange?.[1]?.format("YYYY-MM-DD HH:mm") || "",
    ]);

    // Track selected customer name for display in the modal
    if (customerId) {
      const list = Array.isArray(customersData)
        ? customersData
        : customersData?.data || [];
      const found = list.find((c: any) => c._id === customerId);
      setSelectedCustomer(found
        ? { id: customerId, name: found.customer_name || found.name }
        : { id: customerId, name: "Selected Customer" }
      );
    } else {
      setSelectedCustomer(null);
    }

    if (startDate) {
      setQueryKey({
        startDate: startDate?.format("YYYY-MM-DD HH:mm") || "",
        endDate: endDate?.format("YYYY-MM-DD HH:mm") || "",
        servedBy,
        commission,
        locationId,
        shop_id,
        customer_id: customerId || undefined,
      });
      queryClient.invalidateQueries(["itemsales"]);
    }

    return true;
  };

  const { data: itemSalesData, isLoading: isItemSalesLoading } = useQuery(
    ["itemsales", queryKey],
    () => fetchItemSalesReport(queryKey),
    {
      enabled: !!queryKey,
      networkMode: "always",
      retry: 2,
      initialData: { success: true, data: [] },
    }
  );

  const salesReportData = React.useMemo(() => {
    if (!itemSalesData) return [];
    if (itemSalesData.success && Array.isArray(itemSalesData.data)) {
      return itemSalesData.data;
    }
    if (Array.isArray(itemSalesData)) return itemSalesData;
    if (itemSalesData.data && Array.isArray(itemSalesData.data)) {
      return itemSalesData.data;
    }
    return [];
  }, [itemSalesData]);

  const tabItems = [
    {
      key: "sale",
      tab: "Sale",
      label: (
        <Space>
          <FileTextOutlined style={{ color: "#52c41a" }} />
          Generate Item Sales Report
        </Space>
      ),
      children: (
        <>
          <Form form={form} onFinish={onFinish} layout="inline">
            <Form.Item
              name="dateRange"
              label="Date & Time"
              style={{ marginBottom: 16 }}
              rules={[{ required: true, message: "kindly select date & time range" }]}
            >
              <RangePicker
                showTime={{ format: "HH:mm" }}
                format="YYYY-MM-DD HH:mm"
                presets={rangePresets}
              />
            </Form.Item>
            <Form.Item name="createdBy" style={{ marginBottom: 16 }}>
              <ProFormSelect
                width={"md"}
                name="servedBy"
                label="Created By"
                showSearch
                placeholder="Select created By"
                request={fetchUsersByShopIdRequest}
              />
            </Form.Item>
            <Form.Item name="locationId" style={{ marginBottom: 16 }}>
              <ProFormSelect
                width={"md"}
                name="locationId"
                label="Served By"
                showSearch
                placeholder="Select served by"
                request={async () => {
                  const data = await getTableLocation({});
                  return data?.map((e: { name: any; _id: any }) => ({
                    label: e.name,
                    value: e._id,
                  }));
                }}
              />
            </Form.Item>

            {/* ── Customer filter ── */}
            <Form.Item name="customerId" style={{ marginBottom: 16 }}>
              <ProFormSelect
                width={"md"}
                name="customerId"
                label="Customer"
                showSearch
                allowClear
                placeholder="All customers"
                fieldProps={{
                  suffixIcon: <UserOutlined />,
                  allowClear: true,
                }}
                request={fetchCustomersRequest}
              />
            </Form.Item>

            <Form.Item name="commission" style={{ marginBottom: 16 }} label="Commission">
              <InputNumber
                placeholder="Commission %"
                min={0}
                max={100}
                formatter={(value) => `${value}%`}
                parser={(value) => value!.replace("%", "")}
              />
            </Form.Item>
            <Form.Item style={{ marginBottom: 16 }}>
              <ItemSalesModal
                data={salesReportData}
                loading={isItemSalesLoading}
                startDate={salesDateTimeRange[0]}
                endDate={salesDateTimeRange[1]}
                customerName={selectedCustomer?.name || null}
              />
            </Form.Item>
          </Form>
        </>
      ),
    },
    {
      key: "purchase",
      tab: "Purchase",
      label: (
        <Space>
          <ShoppingOutlined style={{ color: "#fa8c16" }} />
          Generate Sales Report
        </Space>
      ),
      children: (
        <Form form={form} onFinish={onFinish} layout="inline">
          <Form.Item
            name="dateRange"
            label="Date & Time"
            style={{ marginBottom: 16 }}
            rules={[{ required: true, message: "kindly select date & time range" }]}
          >
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
          </Form.Item>
          <Button
            type="primary"
            icon={<PrinterOutlined />}
            htmlType="submit"
            disabled={isGenerateButtonDisabled}
            onClick={() => generateReportHandler()}
          >
            Generate Report
          </Button>
          <PurchaseReportModal
            openM={openPurchaseModal}
            onCloseM={onClosePurchaseModal}
            startDate={purchaseDateTimeRange[0]}
            endDate={purchaseDateTimeRange[1]}
          />
        </Form>
      ),
    },
    {
      key: "voided",
      tab: "void",
      label: (
        <Space>
          <FileExclamationOutlined style={{ color: "#eb2f2f" }} />
          Generate Voided bills Report
        </Space>
      ),
      children: (
        <Form form={form} onFinish={onFinish} layout="inline">
          <Form.Item
            name="dateRange"
            label="Date & Time"
            style={{ marginBottom: 16 }}
            rules={[{ required: true, message: "kindly select date & time range" }]}
          >
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
          </Form.Item>
          <Button
            htmlType="submit"
            type="primary"
            onClick={generateReportHandler}
            disabled={isGenerateButtonDisabled}
            icon={<PrinterOutlined />}
          >
            Generate Report
          </Button>
          <VoidReportModal
            openM={openVoidedModal}
            onCloseM={onCloseVoidedModal}
            startDate={voidedDateTimeRange[0]}
            endDate={voidedDateTimeRange[1]}
          />
        </Form>
      ),
    },
    {
      key: "delivery",
      tab: "Delivery",
      label: (
        <Space>
          <CarOutlined style={{ color: "#1890ff" }} />
          Generate Delivery Report
        </Space>
      ),
      children: (
        <Form form={form} onFinish={onFinish} layout="inline">
          <Form.Item
            name="dateRange"
            label="Date & Time"
            style={{ marginBottom: 16 }}
            rules={[{ required: true, message: "kindly select date & time range" }]}
          >
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
          </Form.Item>
          <Button
            type="primary"
            onClick={generateReportHandler}
            disabled={isGenerateButtonDisabled}
            icon={<BarChartOutlined />}
            htmlType="submit"
          >
            Generate Delivery Report
          </Button>
          <DeliveryReportModal
            openM={openDeliveryModal}
            onCloseM={onCloseDeliveryModal}
            startDate={deliveryDateTimeRange[0]}
            endDate={deliveryDateTimeRange[1]}
          />
        </Form>
      ),
    },
    {
      key: "inventory_usage",
      tab: "inventory_usage",
      label: (
        <Space>
          <HddOutlined style={{ color: "#1890ff" }} />
          Generate Inventory Usage Report
        </Space>
      ),
      children: (
        <Form form={form} onFinish={onFinish} layout="inline">
          <Form.Item
            name="dateRange"
            label="Date & Time"
            style={{ marginBottom: 16 }}
            rules={[{ required: true, message: "kindly select date & time range" }]}
          >
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
          </Form.Item>
          <Button
            type="primary"
            onClick={generateReportHandler}
            disabled={isGenerateButtonDisabled}
            icon={<BarChartOutlined />}
            htmlType="submit"
          >
            Generate Inventory Usage Report
          </Button>
          <InventoryUsageReportModal
            openM={openInventoryUsageModal}
            onCloseM={onCloseInventoryUsageModal}
            startDate={inventoryUsageDateTimeRange[0]}
            endDate={inventoryUsageDateTimeRange[1]}
          />
        </Form>
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
          <HddOutlined style={{ color: "#722ed1", fontSize: "24px" }} />
          Generate Reports
        </Space>
      }
    ></ProCard>
  );
};

export default Reports;