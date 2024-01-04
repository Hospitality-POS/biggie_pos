import { useState } from "react";
import dayjs from "dayjs";
import {
  generatePurchaseReport,
  generateSalesReport,
} from "../../../features/Report/reportActions";
import { useAppDispatch } from "../../../store";
import { TimeRangePickerProps } from "antd/lib";

export const useReport = (reportType: string) => {
  const [openSalesModal, setOpenSalesModal] = useState(false);
  const [openPurchaseModal, setOpenPurchaseModal] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("sale");
  const [salesDateRange, setSalesDateRange] = useState<[string, string]>([
    "",
    "",
  ]);
  const [purchaseDateRange, setPurchaseDateRange] = useState<[string, string]>([
    "",
    "",
  ]);

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

    if (reportType === "sale" && salesDateRange[0] && salesDateRange[1]) {
      formattedPayload = {
        startDate: salesDateRange[0],
        endDate: salesDateRange[1],
      };
      dispatch(generateSalesReport(formattedPayload));
      setOpenSalesModal(true);
      console.log(openSalesModal);
      
    } else if (
      reportType === "purchase" &&
      purchaseDateRange[0] &&
      purchaseDateRange[1]
    ) {
      formattedPayload = {
        startDate: purchaseDateRange[0],
        endDate: purchaseDateRange[1],
      };
      dispatch(generatePurchaseReport(formattedPayload));
      setOpenPurchaseModal(true);
    }
  };

  const isGenerateButtonDisabled =
    (reportType === "sale" && (!salesDateRange[0] || !salesDateRange[1])) ||
    (reportType === "purchase" &&
      (!purchaseDateRange[0] || !purchaseDateRange[1]));

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
    setSalesDateRange,
    setPurchaseDateRange,
    purchaseDateRange,
    salesDateRange,
    setActiveTab,
    setOpenSalesModal,
    setOpenPurchaseModal
  };
};
