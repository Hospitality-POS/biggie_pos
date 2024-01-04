import React from "react";
import { Button, Space, DatePicker } from "antd";
import PurchaseReportModal from "../../../components/Reports/PurchaseReport";
import { useReport } from "../hooks/useReport";

const { RangePicker } = DatePicker;

interface PurchaseReportProps {
  open: boolean;
  onClose: () => void;
}

const PurchaseReport: React.FC<PurchaseReportProps> = ({ open, onClose }) => {
  const {
    purchaseDateRange,
    setPurchaseDateRange,
    generateReportHandler,
    isGenerateButtonDisabled,
    rangePresets,
  } = useReport("purchase");

  return (
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
        onClick={generateReportHandler}
        disabled={isGenerateButtonDisabled}
      >
        Generate Purchase Report
      </Button>
      <PurchaseReportModal
        openM={open}
        onCloseM={onClose}
        startDate={purchaseDateRange[0]}
        endDate={purchaseDateRange[1]}
      />
    </Space>
  );
};

export default PurchaseReport;
