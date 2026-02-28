import React, { useEffect, useState } from "react";
import { Button, Form, Space, Alert, Select, Spin } from "antd";
import { ModalForm, ProFormText, ProForm } from "@ant-design/pro-form";
import { DollarOutlined, EditOutlined, LinkOutlined, WarningOutlined } from "@ant-design/icons";
import ShowConfirm from "@utils/ConfirmUtil";
import { addNewPaymentMethod, updateMethod } from "@services/paymentMethod";
import { getAllAccounts } from "@services/accounting/accounts";
import { getCurrentTenantId } from "@services/tenants";

interface AddProPaymentMethodSettingsModalProps {
  actionRef: any;
  edit?: boolean;
  data?: any;
}

const AddProPaymentMethodSettingsModal: React.FC<
  AddProPaymentMethodSettingsModalProps
> = ({ actionRef, edit, data }) => {
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false);
  const [accountingEnabled, setAccountingEnabled] = useState(false);
  const [coaAccounts, setCoaAccounts] = useState<any[]>([]);
  const [loadingCOA, setLoadingCOA] = useState(false);

  // Check if accounting is enabled
  useEffect(() => {
    const checkAccounting = () => {
      try {
        const tenantStr = localStorage.getItem("tenant");
        if (tenantStr) {
          const tenant = JSON.parse(tenantStr);
          const isEnabled = tenant?.accounting_database?.enabled || tenant?.modules?.accounting || false;
          setAccountingEnabled(isEnabled);
        }
      } catch (error) {
        console.error("Error checking accounting status:", error);
      }
    };

    if (open) {
      checkAccounting();
    }
  }, [open]);

  // Fetch COA accounts when modal opens and accounting is enabled
  useEffect(() => {
    const fetchCOAAccounts = async () => {
      if (!accountingEnabled || !open) return;

      setLoadingCOA(true);
      try {
        const shopId = getCurrentTenantId();
        if (!shopId) {
          console.error("No shop ID found");
          return;
        }

        const response = await getAllAccounts({
          shop_id: shopId,
          account_type: "ASSET",
          is_active: true,
        });

        // Filter for Cash and Bank accounts (1100-1199)
        const cashBankAccounts = response.accounts.filter((account: any) => {
          const code = account.account_code;
          return code >= "1100" && code < "1200";
        });

        setCoaAccounts(cashBankAccounts);
      } catch (error) {
        console.error("Error fetching COA accounts:", error);
      } finally {
        setLoadingCOA(false);
      }
    };

    fetchCOAAccounts();
  }, [accountingEnabled, open]);

  useEffect(() => {
    if (open && data) {
      form.setFieldsValue({
        ...data,
      });
    }
  }, [open, data, form]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      form.resetFields();
    }
  };

  return (
    <ModalForm
      width={600}
      open={open}
      onOpenChange={handleOpenChange}
      title={
        <Space>
          <DollarOutlined />
          {edit ? "Edit Payment Method" : "Add New Payment Method"}
        </Space>
      }
      initialValues={edit ? { ...data } : {}}
      trigger={
        edit ? (
          <Button
            key="button"
            size="small"
            icon={
              <EditOutlined
                style={{ color: "#6c1c2c" }}
                onClick={() => form.setFieldsValue(data)}
              />
            }
          >
            Edit
          </Button>
        ) : (
          <Button type="primary" key="button" icon={<DollarOutlined />}>
            New Method
          </Button>
        )
      }
      form={form}
      autoFocusFirstInput
      modalProps={{
        destroyOnClose: true,
        centered: true,
      }}
      onFinish={async (values) => {
        const confirmed = await ShowConfirm({
          title: `Are you sure you want to ${edit ? "update this" : "add new"
            } payment method?`,
          position: true,
        });
        if (confirmed) {
          edit
            ? await updateMethod({ values, _id: data._id })
            : await addNewPaymentMethod(values);
          actionRef.current.reset();
          return true;
        }
      }}
      submitter={{
        searchConfig: {
          resetText: "Cancel",
          submitText: edit ? "Update Method" : "Add Payment Method",
        },
        submitButtonProps: {
          icon: edit ? <EditOutlined /> : <DollarOutlined />,
        },
        resetButtonProps: {
          style: { display: "none" },
        },
      }}
    >
      {accountingEnabled && !edit && (
        <Alert
          message="Accounting Integration Enabled"
          description="Link this payment method to a Chart of Accounts entry to enable automatic journal entries for transactions."
          type="info"
          icon={<LinkOutlined />}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {accountingEnabled && edit && !data?.account_id && (
        <Alert
          message="COA Link Required"
          description="This payment method is not linked to any Chart of Accounts entry. Journal entries will not be created for transactions using this method."
          type="warning"
          icon={<WarningOutlined />}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <ProForm.Group>
        <ProFormText
          hasFeedback
          width="lg"
          name="name"
          label="Payment Method Name"
          rules={[{ required: true, message: "Name is required" }]}
          placeholder="e.g., M-Pesa, Cash, Bank Transfer"
        />
      </ProForm.Group>

      {accountingEnabled && (
        <Form.Item
          name="account_id"
          label={
            <Space>
              <span>Chart of Accounts (COA)</span>
              <LinkOutlined style={{ color: '#1890ff' }} />
            </Space>
          }
          extra={
            coaAccounts.length === 0 && !loadingCOA ? (
              <span style={{ color: '#ff4d4f', fontSize: '12px' }}>
                No Cash/Bank accounts found. Please set up your Chart of Accounts first or reseed default accounts.
              </span>
            ) : (
              <span style={{ color: '#8c8c8c', fontSize: '12px' }}>
                Link to a Cash or Bank account (1100-1199) in your Chart of Accounts. This enables automatic journal entry creation.
              </span>
            )
          }
          style={{ marginTop: 16 }}
        >
          <Select
            showSearch
            placeholder="Select COA account (e.g., 1100 Cash, 1120 M-Pesa)"
            loading={loadingCOA}
            notFoundContent={loadingCOA ? <Spin size="small" /> : "No Cash/Bank accounts found"}
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={coaAccounts.map((account) => ({
              label: `${account.account_code} - ${account.account_name}`,
              value: account._id,
            }))}
            allowClear
          />
        </Form.Item>
      )}

      <ProForm.Group>
        <ProFormText
          width="lg"
          name="description"
          label="Description (Optional)"
          placeholder="Additional notes about this payment method"
        />
      </ProForm.Group>
    </ModalForm>
  );
};

export default AddProPaymentMethodSettingsModal;