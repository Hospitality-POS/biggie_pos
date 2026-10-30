import React, { useState } from "react";
import { Modal, Typography } from "antd";
import PatientPicker from "./PatientPicker";
import { searchPermissionFor, useHealthcareAccess } from "./shared";

const { Text } = Typography;

/**
 * Step one of a walk-in task (an outside prescription, a lab request form):
 * find or register the person, then carry on.
 */
const PatientPickModal: React.FC<{
  open: boolean;
  title: string;
  hint?: string;
  okText?: string;
  onClose: () => void;
  onPicked: (customerId: string) => void;
}> = ({ open, title, hint, okText = "Continue", onClose, onPicked }) => {
  const access = useHealthcareAccess();
  const [customerId, setCustomerId] = useState<string>();
  const close = () => {
    setCustomerId(undefined);
    onClose();
  };
  return (
    <Modal
      title={title}
      open={open}
      onCancel={close}
      okText={okText}
      okButtonProps={{ disabled: !customerId }}
      onOk={() => {
        if (!customerId) return;
        onPicked(customerId);
        setCustomerId(undefined);
      }}
      destroyOnClose
    >
      {hint && (
        <Text type="secondary" style={{ display: "block", marginBottom: 10 }}>
          {hint}
        </Text>
      )}
      <PatientPicker value={customerId} onChange={setCustomerId} canRegister={access.managePatients} permission={searchPermissionFor(access)} />
    </Modal>
  );
};

export default PatientPickModal;
