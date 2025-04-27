import { useState } from "react";
import dayjs from "dayjs";
import {
  generateDeliveryReport,
  generateInventoryUsageReport,
  generatePurchaseReport,
  generateSalesReport,
  generateVoidedReport,
} from "@features/Report/reportActions";
import { useAppDispatch } from "../../../store";
import { TimeRangePickerProps } from "antd/lib";

export const useReport = (reportType: string) => {
  const [openSalesModal, setOpenSalesModal] = useState(false);
  const [openVoidedModal, setOpenVoidedModal] = useState(false);
  const [openPurchaseModal, setOpenPurchaseModal] = useState(false);
  const [openDeliveryModal, setOpenDeliveryModal] = useState(false);
  const [openInventoryUsageModal, setOpenInventoryUsageModal] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("sale");
  const [salesDateTimeRange, setSalesDateTimeRange] = useState<
    [string, string]
  >(["", ""]);
  const [voidedDateTimeRange, setVoidedDateTimeRange] = useState<
    [string, string]
  >(["", ""]);
  const [purchaseDateTimeRange, setPurchaseDateTimeRange] = useState<
    [string, string]
  >(["", ""]);
  const [deliveryDateTimeRange, setDeliveryDateTimeRange] = useState<
    [string, string]
  >(["", ""]);

  const [inventoryUsageDateTimeRange, setInventoryUsageDateTimeRange] = useState<
    [string, string]
  >(["", ""]);

  const [params, setParams] = useState<{
    createdBy?: string;
    servedBy?: string;
    commission?: number;
    locationId?: string;
    shop_id?: string;
  }>({
    createdBy: "",
    servedBy: "",
    commission: 0,
    locationId: "",
    shop_id: "",
  });
  const dispatch = useAppDispatch();

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setOpenSalesModal(false);
    setOpenPurchaseModal(false);
    setOpenVoidedModal(false);
    setOpenDeliveryModal(false);
    setOpenInventoryUsageModal(false);
  };

  const generateReportHandler = () => {
    let formattedPayload: {
      startDate: string;
      endDate: string;
      commission?: number;
      createdBy?: string;
      servedBy?: string;
      locationId?: string;
      shop_id?: string;
    } = {
      startDate: "",
      endDate: "",
    };

    if (
      reportType === "sale" &&
      salesDateTimeRange[0] &&
      salesDateTimeRange[1]
    ) {
      formattedPayload = {
        startDate: salesDateTimeRange[0],
        endDate: salesDateTimeRange[1],
        ...params,
      };
      dispatch(generateSalesReport(formattedPayload));
      setOpenSalesModal(true);
    } else if (
      reportType === "purchase" &&
      purchaseDateTimeRange[0] &&
      purchaseDateTimeRange[1]
    ) {
      formattedPayload = {
        startDate: purchaseDateTimeRange[0],
        endDate: purchaseDateTimeRange[1],
      };
      dispatch(generatePurchaseReport(formattedPayload));
      setOpenPurchaseModal(true);
    } else if (
      reportType === "voided" &&
      voidedDateTimeRange[0] &&
      voidedDateTimeRange[1]
    ) {
      formattedPayload = {
        startDate: voidedDateTimeRange[0],
        endDate: voidedDateTimeRange[1],
      };
      dispatch(generateVoidedReport(formattedPayload));
      setOpenVoidedModal(true);
    } else if (
      reportType === "delivery" &&
      deliveryDateTimeRange[0] &&
      deliveryDateTimeRange[1]
    ) {
      formattedPayload = {
        startDate: deliveryDateTimeRange[0],
        endDate: deliveryDateTimeRange[1],
      };
      dispatch(generateDeliveryReport(formattedPayload));
      setOpenDeliveryModal(true);
    } else if (

      reportType === "inventory_usage" &&
      inventoryUsageDateTimeRange[0] &&
      inventoryUsageDateTimeRange[1]
    ) {
      formattedPayload = {
        startDate: inventoryUsageDateTimeRange[0],
        endDate: inventoryUsageDateTimeRange[1],
      };
      dispatch(generateInventoryUsageReport(formattedPayload));
      setOpenInventoryUsageModal(true);
    }
  };

  const isGenerateButtonDisabled =
    (reportType === "sale" &&
      (!salesDateTimeRange[0] || !salesDateTimeRange[1])) ||
    (reportType === "purchase" &&
      (!purchaseDateTimeRange[0] || !purchaseDateTimeRange[1])) ||
    (reportType === "voided" &&
      (!voidedDateTimeRange[0] || !voidedDateTimeRange[1])) ||
    (reportType === "delivery" &&
      (!deliveryDateTimeRange[0] || !deliveryDateTimeRange[1]));
  (reportType === "inventory_usage" &&
    (!inventoryUsageDateTimeRange[0] || !inventoryUsageDateTimeRange[1]));

  const onCloseSalesModal = () => {
    setOpenSalesModal(false);
  };

  const onClosePurchaseModal = () => {
    setOpenPurchaseModal(false);
  };

  const onCloseVoidedModal = () => {
    setOpenVoidedModal(false);
  };

  const onCloseDeliveryModal = () => {
    setOpenDeliveryModal(false);
  };

  const onCloseInventoryUsageModal = () => {
    setOpenInventoryUsageModal(false);
  };

  const rangePresets: TimeRangePickerProps["presets"] = [
    { label: "Today", value: [dayjs().startOf('day'), dayjs().endOf('day')] },
    { label: "Yesterday", value: [dayjs().add(-1, "d"), dayjs()] },
    { label: "Last 7 Days", value: [dayjs().add(-7, "d"), dayjs()] },
    { label: "Last 14 Days", value: [dayjs().add(-14, "d"), dayjs()] },
    { label: "Last 30 Days", value: [dayjs().add(-30, "d"), dayjs()] },
    { label: "Last 90 Days", value: [dayjs().add(-90, "d"), dayjs()] },
  ];

  return {
    openSalesModal,
    onCloseSalesModal,
    setSalesDateTimeRange,
    salesDateTimeRange,
    setOpenSalesModal,

    openPurchaseModal,
    onClosePurchaseModal,
    setOpenPurchaseModal,
    purchaseDateTimeRange,
    setPurchaseDateTimeRange,

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
    setInventoryUsageDateTimeRange,
    setOpenInventoryUsageModal,
    onCloseInventoryUsageModal,
    inventoryUsageDateTimeRange,



    generateReportHandler,
    isGenerateButtonDisabled,
    rangePresets,
    handleTabChange,
    activeTab,
    setActiveTab,

    setParams,
  };
};
