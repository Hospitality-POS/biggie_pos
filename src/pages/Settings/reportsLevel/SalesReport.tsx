import React from "react";
import { Button, Space, DatePicker } from "antd";
import SalesReportModal from "../../../components/Reports/SalesReport";
import { useReport } from "../hooks/useReport";

const { RangePicker } = DatePicker;

interface SalesReportProps {
  open: boolean;
  onClose: () => void;
}

const SalesReport: React.FC<SalesReportProps> = ({ open, onClose }) => {
  const {
    salesDateRange,
    setSalesDateRange,
    isGenerateButtonDisabled,
    generateReportHandler,
    rangePresets,
  } = useReport("sale");

  return (
    <Space direction="vertical" size={16}>
      <RangePicker
        presets={rangePresets}
        onChange={(dates) =>
          setSalesDateRange([
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
        Generate Sales Report
      </Button>
      <SalesReportModal
        openM={open}
        onCloseM={onClose}
        startDate={salesDateRange[0]}
        endDate={salesDateRange[1]}
      />
    </Space>
  );
};

export default SalesReport;
