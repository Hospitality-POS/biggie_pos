import React, { useState } from "react";
import { Button, Tooltip } from "antd";
import { WarningOutlined } from "@ant-design/icons";
import { useDamagesSetting } from "@hooks/useDamagesSetting";
import RecordDamageModal from "@components/store/RecordDamageModal";

// Inventory row / card: record this item as damaged. Shown only when damage
// tracking is on (System Setup → Inventory Controls).
export const DamageButton: React.FC<{
  record: any;
  onChanged?: () => void;
  size?: "small" | "middle";
}> = ({ record, onChanged, size = "small" }) => {
  const [open, setOpen] = useState(false);
  const damagesOn = useDamagesSetting();
  if (!damagesOn || !record?._id) return null;
  return (
    <>
      <Tooltip title="Record damage">
        <Button
          size={size}
          icon={<WarningOutlined />}
          onClick={() => setOpen(true)}
          style={{ borderRadius: 6, color: "#dc2626", borderColor: "#fecaca", ...(size === "small" ? { height: 28, width: 28, padding: 0 } : { width: 38, padding: 0, borderRadius: 8 }) }}
        />
      </Tooltip>
      {open && (
        <RecordDamageModal
          open={open}
          item={{ kind: "inventory", _id: record._id, name: record.name, price: record.price }}
          onClose={() => setOpen(false)}
          onSaved={onChanged}
        />
      )}
    </>
  );
};

export default DamageButton;
