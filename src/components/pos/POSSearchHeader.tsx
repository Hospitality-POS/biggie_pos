import React from "react";
import { Input, Button } from "antd";
import { SearchOutlined, RollbackOutlined } from "@ant-design/icons";

interface POSSearchHeaderProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onBack: () => void;
  placeholder?: string;
  primaryColor: string;
}

export const POSSearchHeader: React.FC<POSSearchHeaderProps> = ({
  searchTerm,
  onSearchChange,
  onBack,
  placeholder = "Search items…",
  primaryColor,
}) => {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 12,
      }}
    >
      <Input
        placeholder={placeholder}
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        allowClear
        prefix={<SearchOutlined style={{ color: primaryColor, fontSize: 16 }} />}
        style={{
          borderRadius: 8,
          fontSize: 13,
          height: 36,
        }}
      />
      <Button
        type="default"
        icon={<RollbackOutlined style={{ color: primaryColor }} />}
        onClick={onBack}
        style={{
          height: 36,
          borderRadius: 8,
          borderColor: `${primaryColor}40`,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        title="Back to categories"
      />
    </div>
  );
};

export default POSSearchHeader;
