import React, { useState, useEffect } from "react";
import {
  Button,
  Card,
  Space,
  message,
  Popconfirm,
  Empty,
  Tag,
  Typography,
  Row,
  Col,
  Tooltip,
} from "antd";
import {
  BankOutlined,
  PlusOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  EditOutlined,
} from "@ant-design/icons";
import {
  fetchSystemSetupDetailsById,
  updateSystemSetup,
  createSystemSetup,
} from "@services/systemsetup";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import BankDetailsModal from "./BankDetailsModal";

const { Text } = Typography;

interface BankDetail {
  _id?: string;
  bank_name: string;
  branch: string;
  account_no: string;
  account_name: string;
  swift_code: string;
  paybill_no: string;
  is_primary: boolean;
}

const BankDetailsSettings: React.FC = () => {
  const queryClient = useQueryClient();
  const [bankDetails, setBankDetails] = useState<BankDetail[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editBank, setEditBank] = useState<BankDetail | null>(null);

  // Fetch existing system settings
  const { data: systemSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["systemSettings"],
    queryFn: fetchSystemSetupDetailsById,
    retry: false,
  });

  // Load bank details from system settings
  useEffect(() => {
    if (systemSettings?.bank_details) {
      // Handle both array and single object formats
      const banks = Array.isArray(systemSettings.bank_details)
        ? systemSettings.bank_details
        : [systemSettings.bank_details];
      setBankDetails(banks);
    }
  }, [systemSettings]);

  // Open modal for adding new bank
  const openAddModal = () => {
    setEditBank(null);
    setModalOpen(true);
  };

  // Open modal for editing bank
  const openEditModal = (bank: BankDetail) => {
    setEditBank(bank);
    setModalOpen(true);
  };

  // Handle save from modal
  const handleSaveBank = (bank: BankDetail) => {
    if (editBank) {
      // Update existing bank
      setBankDetails(
        bankDetails.map((b) =>
          b._id === editBank._id || (b === editBank && !b._id) ? bank : b
        )
      );
    } else {
      // Add new bank
      setBankDetails([...bankDetails, bank]);
    }
    setModalOpen(false);
    setEditBank(null);
  };

  // Remove bank
  const removeBank = (bank: BankDetail) => {
    if (bankDetails.length === 1) {
      message.warning("At least one bank must be configured");
      return;
    }
    const newBanks = bankDetails.filter((b) => b !== bank);
    // If we removed the primary bank, make the first remaining bank primary
    if (bank.is_primary && newBanks.length > 0) {
      newBanks[0].is_primary = true;
    }
    setBankDetails(newBanks);
  };

  // Set primary bank
  const setPrimaryBank = (bank: BankDetail) => {
    setBankDetails(
      bankDetails.map((b) => ({
        ...b,
        is_primary: b === bank,
      }))
    );
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (systemSettings?._id) {
        return updateSystemSetup({ _id: systemSettings._id, data });
      } else {
        return createSystemSetup(data);
      }
    },
    onSuccess: () => {
      message.success("Bank details saved successfully");
      queryClient.invalidateQueries({ queryKey: ["systemSettings"] });
    },
    onError: (error: any) => {
      if (error?.response?.data?.error === "Only one bank can be marked as primary") {
        message.error("Please select only one primary bank");
      } else {
        message.error("Failed to save bank details");
      }
    },
  });

  // Handle save all
  const handleSaveAll = async () => {
    // Validate banks
    for (let i = 0; i < bankDetails.length; i++) {
      const bank = bankDetails[i];
      if (!bank.bank_name) {
        message.error(`Bank ${i + 1}: Bank name is required`);
        return;
      }
      if (!bank.account_no) {
        message.error(`Bank ${i + 1}: Account number is required`);
        return;
      }
      if (!bank.account_name) {
        message.error(`Bank ${i + 1}: Account name is required`);
        return;
      }
    }

    // Ensure exactly one primary bank
    const primaryCount = bankDetails.filter((b) => b.is_primary).length;
    if (primaryCount === 0 && bankDetails.length > 0) {
      bankDetails[0].is_primary = true;
    }

    try {
      await saveMutation.mutateAsync({ bank_details: bankDetails });
    } catch (error) {
      // Error handled in mutation
    }
  };

  return (
    <div style={{ padding: "16px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Text strong style={{ fontSize: 16 }}>
          Bank Details
        </Text>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openAddModal}
          style={{ borderRadius: 6 }}
        >
          Add Bank
        </Button>
      </div>

      {isLoadingSettings ? (
        <div style={{ textAlign: "center", padding: 40 }}>Loading...</div>
      ) : bankDetails.length === 0 ? (
        <Empty
          description="No bank details configured"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
            Add First Bank
          </Button>
        </Empty>
      ) : (
        <>
          <Row gutter={[16, 16]}>
            {bankDetails.map((bank, index) => (
              <Col xs={24} sm={12} lg={8} key={bank._id || index}>
                <Card
                  style={{
                    borderColor: bank.is_primary ? "#52c41a" : "#d9d9d9",
                borderWidth: bank.is_primary ? 2 : 1,
                height: "100%",
              }}
                  extra={
                    <Space>
                      {bank.is_primary && (
                        <Tag color="success" icon={<CheckCircleOutlined />}>
                          Primary
                        </Tag>
                      )}
                      <Tooltip title="Edit bank">
                        <Button
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => openEditModal(bank)}
                        />
                      </Tooltip>
                      <Popconfirm
                        title="Remove this bank?"
                        description="Are you sure you want to remove this bank?"
                        onConfirm={() => removeBank(bank)}
                        okText="Yes"
                        cancelText="No"
                      >
                        <Button
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          disabled={bankDetails.length === 1}
                        />
                      </Popconfirm>
                    </Space>
                  }
                >
                  <div style={{ marginBottom: 12 }}>
                    <Space size="small">
                      <BankOutlined style={{ color: "#1890ff", fontSize: 18 }} />
                      <Text strong style={{ fontSize: 14 }}>
                        {bank.bank_name || "Unnamed Bank"}
                      </Text>
                    </Space>
                  </div>

                  {bank.branch && (
                    <div style={{ marginBottom: 8 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Branch: {bank.branch}
                      </Text>
                    </div>
                  )}

                  <div style={{ marginBottom: 8 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Account: {bank.account_no || "Not set"}
                    </Text>
                  </div>

                  {bank.account_name && (
                    <div style={{ marginBottom: 8 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {bank.account_name}
                      </Text>
                    </div>
                  )}

                  {bank.swift_code && (
                    <div style={{ marginBottom: 8 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        SWIFT: {bank.swift_code}
                      </Text>
                    </div>
                  )}

                  {bank.paybill_no && (
                    <div style={{ marginBottom: 8 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Paybill: {bank.paybill_no}
                      </Text>
                    </div>
                  )}

                  {!bank.is_primary && (
                    <div style={{ marginTop: 12 }}>
                      <Button
                        type="link"
                        size="small"
                        onClick={() => setPrimaryBank(bank)}
                        style={{ padding: 0 }}
                      >
                        Set as Primary
                      </Button>
                    </div>
                  )}
                </Card>
              </Col>
            ))}
          </Row>

          <div style={{ marginTop: 24, textAlign: "right" }}>
            <Button
              type="primary"
              onClick={handleSaveAll}
              loading={saveMutation.isPending}
              style={{ borderRadius: 6, minWidth: 120 }}
            >
              Save Changes
            </Button>
          </div>
        </>
      )}

      <BankDetailsModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditBank(null);
        }}
        onSave={handleSaveBank}
        editBank={editBank}
        isOnlyBank={bankDetails.length === 0}
      />
    </div>
  );
};

export default BankDetailsSettings;
