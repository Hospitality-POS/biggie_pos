import { useState } from "react";
import { TimeRangePickerProps } from "antd/lib";
import sharedRangePresets from "@utils/DateRangeUtils";

export const useReport = (reportType: string) => {
  const [openSalesModal, setOpenSalesModal] = useState(false);
  const [openVoidedModal, setOpenVoidedModal] = useState(false);
  const [openPurchaseModal, setOpenPurchaseModal] = useState(false);
  const [openDeliveryModal, setOpenDeliveryModal] = useState(false);
  const [openInventoryUsageModal, setOpenInventoryUsageModal] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("sale");

  const [salesDateTimeRange, setSalesDateTimeRange] = useState<[string, string]>(["", ""]);
  const [voidedDateTimeRange, setVoidedDateTimeRange] = useState<[string, string]>(["", ""]);
  const [purchaseDateTimeRange, setPurchaseDateTimeRange] = useState<[string, string]>(["", ""]);
  const [deliveryDateTimeRange, setDeliveryDateTimeRange] = useState<[string, string]>(["", ""]);
  const [inventoryUsageDateTimeRange, setInventoryUsageDateTimeRange] = useState<[string, string]>(["", ""]);
  const [vatDateTimeRange, setVATDateTimeRange] = useState<[string, string]>(["", ""]);
  const [openVATModal, setOpenVATModal] = useState(false);

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

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setOpenSalesModal(false);
    setOpenPurchaseModal(false);
    setOpenVoidedModal(false);
    setOpenDeliveryModal(false);
    setOpenInventoryUsageModal(false);
    setOpenVATModal(false);
  };

  const generateReportHandler = (_overrides?: {
    commission?: number;
    createdBy?: string;
    servedBy?: string;
    locationId?: string;
    shop_id?: string;
  }) => {
    if (reportType === "sale" && salesDateTimeRange[0] && salesDateTimeRange[1]) {
      setOpenSalesModal(true);
    } else if (reportType === "purchase" && purchaseDateTimeRange[0] && purchaseDateTimeRange[1]) {
      setOpenPurchaseModal(true);
    } else if (reportType === "voided" && voidedDateTimeRange[0] && voidedDateTimeRange[1]) {
      setOpenVoidedModal(true);
    } else if (reportType === "delivery" && deliveryDateTimeRange[0] && deliveryDateTimeRange[1]) {
      setOpenDeliveryModal(true);
    } else if (reportType === "inventory_usage" && inventoryUsageDateTimeRange[0] && inventoryUsageDateTimeRange[1]) {
      setOpenInventoryUsageModal(true);
    } else if (reportType === "vat" && vatDateTimeRange[0] && vatDateTimeRange[1]) {
      setOpenVATModal(true);
    }
  };

  const isGenerateButtonDisabled =
    (reportType === "sale" && (!salesDateTimeRange[0] || !salesDateTimeRange[1])) ||
    (reportType === "purchase" && (!purchaseDateTimeRange[0] || !purchaseDateTimeRange[1])) ||
    (reportType === "voided" && (!voidedDateTimeRange[0] || !voidedDateTimeRange[1])) ||
    (reportType === "delivery" && (!deliveryDateTimeRange[0] || !deliveryDateTimeRange[1])) ||
    (reportType === "inventory_usage" && (!inventoryUsageDateTimeRange[0] || !inventoryUsageDateTimeRange[1])) ||
    (reportType === "vat" && (!vatDateTimeRange[0] || !vatDateTimeRange[1]));

  const onCloseSalesModal = () => setOpenSalesModal(false);
  const onClosePurchaseModal = () => setOpenPurchaseModal(false);
  const onCloseVoidedModal = () => setOpenVoidedModal(false);
  const onCloseDeliveryModal = () => setOpenDeliveryModal(false);
  const onCloseInventoryUsageModal = () => setOpenInventoryUsageModal(false);
  const onCloseVATModal = () => setOpenVATModal(false);

  const rangePresets = sharedRangePresets() as TimeRangePickerProps["presets"];

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

    openVATModal,
    onCloseVATModal,
    setVATDateTimeRange,
    vatDateTimeRange,
    setOpenVATModal,

    params,
    setParams,
  };
};
