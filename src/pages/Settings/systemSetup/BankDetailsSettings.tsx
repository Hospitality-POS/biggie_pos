import React, { useState, useEffect } from "react";
import {
  Button,
  Card,
  Space,
  message,
  Popconfirm,
  Empty,
  Typography,
  Row,
  Col,
  Tooltip,
} from "antd";
import {
  BankOutlined,
  PlusOutlined,
  DeleteOutlined,
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

const BankDetailsSettings: React.FC = () => {
  const queryClient = useQueryClient();
  const [bankDetails, setBankDetails] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  const { data: systemSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["systemSettings"],
    queryFn: fetchSystemSetupDetailsById,
    retry: false,
  });

  useEffect(() => {
    if (systemSettings?.bank_details) {
      const banks = Array.isArray(systemSettings.bank_details)
        ? systemSettings.bank_details.filter((b: unknown) => typeof b === "string" && b.trim())
        : [];
      setBankDetails(banks);
    }
  }, [systemSettings]);

  const openAddModal = () => {
    setEditIndex(null);
    setModalOpen(true);
  };

  const openEditModal = (index: number) => {
    setEditIndex(index);
    setModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (data: { bank_details: string[] }) => {
      if (systemSettings?._id) {
        return updateSystemSetup({ _id: systemSettings._id, data });
      } else {
        return createSystemSetup(data);
      }
    },
    onSuccess: () => {
      message.success("Bank details saved");
      queryClient.invalidateQueries({ queryKey: ["systemSettings"] });
    },
    onError: () => {
      message.error("Failed to save bank details");
    },
  });

  const persistBanks = (updated: string[]) => {
    setBankDetails(updated);
    saveMutation.mutate({ bank_details: updated });
  };

  const handleSave = (text: string) => {
    let updated: string[];
    if (editIndex !== null) {
      updated = [...bankDetails];
      updated[editIndex] = text;
    } else {
      updated = [...bankDetails, text];
    }
    setModalOpen(false);
    setEditIndex(null);
    persistBanks(updated);
  };

  const removeBank = (index: number) => {
    persistBanks(bankDetails.filter((_, i) => i !== index));
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
        <div>
          <Text strong style={{ fontSize: 16 }}>Bank / Payment Details</Text>
          <Text type="secondary" style={{ display: "block", fontSize: 12, marginTop: 2 }}>
            Each block appears separately on printed invoices. Add one entry per bank or payment method.
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openAddModal}
          style={{ borderRadius: 6 }}
        >
          Add Entry
        </Button>
      </div>

      {isLoadingSettings ? (
        <div style={{ textAlign: "center", padding: 40 }}>Loading...</div>
      ) : bankDetails.length === 0 ? (
        <Empty
          description="No bank or payment details configured"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <div style={{ marginBottom: 12 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Example entries:
            </Text>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 8, flexWrap: "wrap" }}>
              <div style={{ background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: 6, padding: "8px 12px", fontFamily: "monospace", fontSize: 11, color: "#475569", whiteSpace: "pre", textAlign: "left" }}>
                {"Equity Bank\nWestlands Branch\nAcc: 1234567890\nSwift: EQBLKENA"}
              </div>
              <div style={{ background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: 6, padding: "8px 12px", fontFamily: "monospace", fontSize: 11, color: "#475569", whiteSpace: "pre", textAlign: "left" }}>
                {"M-Pesa Paybill: 522522\nAccount No: 0712345678"}
              </div>
            </div>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
            Add First Entry
          </Button>
        </Empty>
      ) : (
        <>
          <Row gutter={[16, 16]}>
            {bankDetails.map((detail, index) => (
              <Col xs={24} sm={12} lg={8} key={index}>
                <Card
                  size="small"
                  style={{ height: "100%", borderColor: "#e2e8f0" }}
                  extra={
                    <Space>
                      <Tooltip title="Edit">
                        <Button
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => openEditModal(index)}
                        />
                      </Tooltip>
                      <Popconfirm
                        title="Remove this entry?"
                        onConfirm={() => removeBank(index)}
                        okText="Yes"
                        cancelText="No"
                      >
                        <Button danger size="small" icon={<DeleteOutlined />} />
                      </Popconfirm>
                    </Space>
                  }
                  title={
                    <Space size="small">
                      <BankOutlined style={{ color: "#1890ff" }} />
                      <Text style={{ fontSize: 12 }}>Entry {index + 1}</Text>
                    </Space>
                  }
                >
                  <pre
                    style={{
                      margin: 0,
                      fontFamily: "monospace",
                      fontSize: 12,
                      color: "#374151",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      lineHeight: 1.7,
                    }}
                  >
                    {detail}
                  </pre>
                </Card>
              </Col>
            ))}
          </Row>

          {saveMutation.isLoading && (
            <div style={{ marginTop: 12, textAlign: "right", fontSize: 12, color: "#6b7280" }}>
              Saving…
            </div>
          )}
        </>
      )}

      <BankDetailsModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditIndex(null);
        }}
        onSave={handleSave}
        editValue={editIndex !== null ? bankDetails[editIndex] : null}
      />
    </div>
  );
};

export default BankDetailsSettings;
