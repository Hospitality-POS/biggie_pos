import { useState } from "react";
import dayjs from "dayjs";
import {
  generatePurchaseReport,
  generateSalesReport,
} from "@features/Report/reportActions";
import { useAppDispatch } from "../../../store";
import { TimeRangePickerProps } from "antd/lib";

export const useReport = (reportType: string) => {
  const [openSalesModal, setOpenSalesModal] = useState(false);
  const [openPurchaseModal, setOpenPurchaseModal] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("sale");
  const [salesDateTimeRange, setSalesDateTimeRange] = useState<[string, string]>([
    "",
    "",
  ]); // Updated to handle both date and time
  const [purchaseDateTimeRange, setPurchaseDateTimeRange] = useState<[string, string]>([
    "",
    "",
  ]); // Updated to handle both date and time

  const dispatch = useAppDispatch();

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setOpenSalesModal(false);
    setOpenPurchaseModal(false);
  };

  const generateReportHandler = () => {
    let formattedPayload: { startDate: string; endDate: string } = {
      startDate: "",
      endDate: "",
    };

    if (reportType === "sale" && salesDateTimeRange[0] && salesDateTimeRange[1]) {
      formattedPayload = {
        startDate: salesDateTimeRange[0],
        endDate: salesDateTimeRange[1],
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
    }
  };

  const isGenerateButtonDisabled =
    (reportType === "sale" && (!salesDateTimeRange[0] || !salesDateTimeRange[1])) ||
    (reportType === "purchase" &&
      (!purchaseDateTimeRange[0] || !purchaseDateTimeRange[1]));

  const onCloseSalesModal = () => {
    setOpenSalesModal(false);
  };

  const onClosePurchaseModal = () => {
    setOpenPurchaseModal(false);
  };

  const rangePresets: TimeRangePickerProps["presets"] = [
    { label: "Last 7 Days", value: [dayjs().add(-7, "d"), dayjs()] },
    { label: "Last 14 Days", value: [dayjs().add(-14, "d"), dayjs()] },
    { label: "Last 30 Days", value: [dayjs().add(-30, "d"), dayjs()] },
    { label: "Last 90 Days", value: [dayjs().add(-90, "d"), dayjs()] },
  ];

  return {
    onCloseSalesModal,
    onClosePurchaseModal,
    generateReportHandler,
    isGenerateButtonDisabled,
    rangePresets,
    handleTabChange,
    activeTab,
    openSalesModal,
    openPurchaseModal,
    setSalesDateTimeRange, // Updated state setter
    setPurchaseDateTimeRange, // Updated state setter
    purchaseDateTimeRange,
    salesDateTimeRange,
    setActiveTab,
    setOpenSalesModal,
    setOpenPurchaseModal,
  };
};
