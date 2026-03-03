import React, { useEffect, useRef, useState } from "react";
import { Button, Form, Space, Tag, Typography } from "antd";
import { ModalForm, ProFormText } from "@ant-design/pro-form";
import { EditOutlined, ShopOutlined, CoffeeOutlined } from "@ant-design/icons";
import ShowConfirm from "@utils/ConfirmUtil";
import { ProFormTextArea } from "@ant-design/pro-components";
import { createShop, updateShop } from "@services/shops";
import { usePrimaryColor } from "@context/PrimaryColorContext";

interface ShopModalProps {
  actionRef: any;
  edit?: boolean;
  data?: any;
}

const AddEditShopModal: React.FC<ShopModalProps> = ({ actionRef, edit, data }) => {
  const [form] = Form.useForm();
  const formRef = useRef();
  const [open, setOpen] = useState(false);
  const [posMode, setPosMode] = useState<'restaurant' | 'retail'>(
    data?.pos_mode || 'restaurant'
  );

  const primaryColor = usePrimaryColor();

  // Resolve tenant config once
  const storedTenant = localStorage.getItem("tenant");
  const tenant = storedTenant ? JSON.parse(storedTenant) : null;
  const hasPOS = !!(tenant?.pos_integration?.enabled ?? true);
  const hasAccounting = !!(
    tenant?.accounting_database?.enabled || tenant?.modules?.accounting
  );
  const isAccountingOnly = hasAccounting && !hasPOS;

  useEffect(() => {
    if (open && data) {
      form.setFieldsValue({
        ...data,
        manager: {
          value: data?.manager?._id,
          label: data?.manager?.name,
        },
      });
      setPosMode(data?.pos_mode || 'restaurant');
    }
  }, [open, data, form]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      form.resetFields();
      setPosMode('restaurant');
    }
  };

  return (
    <ModalForm
      open={open}
      onOpenChange={handleOpenChange}
      title={
        <Space>
          <ShopOutlined />
          {edit ? "Edit Shop" : "Add New Branch"}
        </Space>
      }
      initialValues={
        edit
          ? {
            ...data,
            manager: {
              value: data?.manager?._id,
              label: data?.manager?.name,
            },
          }
          : {}
      }
      trigger={
        edit ? (
          <Button
            key="button"
            size="small"
            icon={<EditOutlined style={{ color: primaryColor }} onClick={() => form.setFieldsValue(data)} />}
          >
            Edit
          </Button>
        ) : (
          <Button type="primary" key="button" icon={<ShopOutlined />}>
            New Branch
          </Button>
        )
      }
      autoFocusFirstInput
      modalProps={{
        destroyOnClose: true,
        centered: true,
        width: "500px",
      }}
      onFinish={async (values) => {
        const confirmed = await ShowConfirm({
          title: `Are you sure you want to ${edit ? "update this" : "add new"} shop?`,
          position: true,
        });
        if (confirmed) {
          edit
            ? await updateShop({ ...values, _id: data?._id, pos_mode: posMode })
            : await createShop({ ...values, pos_mode: posMode });
          actionRef.current.reset();
          return true;
        }
      }}
      form={form}
      formRef={formRef}
      submitter={{
        searchConfig: {
          resetText: "Cancel",
          submitText: edit ? "Edit Shop" : "Add Shop",
        },
      }}
    >
      <ProFormText
        width="lg"
        name="name"
        label="Branch Name"
        rules={[{ required: true, message: "Branch name is required" }]}
        placeholder="Enter Branch name"
      />
      <ProFormTextArea
        width="lg"
        name="location"
        label="Location"
        rules={[{ required: true, message: "Location is required" }]}
        placeholder="Enter complete shop location"
      />

      {/* ── POS Mode Selector — hidden for accounting-only tenants ───────── */}
      {!isAccountingOnly && (
        <Form.Item label="POS Mode" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>

            {/* Restaurant option */}
            <div
              onClick={() => setPosMode('restaurant')}
              style={{
                flex: 1,
                border: `2px solid ${posMode === 'restaurant' ? primaryColor : '#d9d9d9'}`,
                borderRadius: 8,
                padding: '12px 16px',
                cursor: 'pointer',
                backgroundColor: posMode === 'restaurant' ? `${primaryColor}10` : '#fafafa',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <CoffeeOutlined style={{
                fontSize: 28,
                color: posMode === 'restaurant' ? primaryColor : '#bbb',
              }} />
              <Typography.Text strong style={{
                color: posMode === 'restaurant' ? primaryColor : '#888',
                fontSize: 13,
              }}>
                Restaurant
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 11, textAlign: 'center' }}>
                Table-first flow. Customers sit, orders go to kitchen.
              </Typography.Text>
              {posMode === 'restaurant' && (
                <Tag color="success" style={{ fontSize: 11, marginTop: 2 }}>Selected</Tag>
              )}
            </div>

            {/* Retail option */}
            <div
              onClick={() => setPosMode('retail')}
              style={{
                flex: 1,
                border: `2px solid ${posMode === 'retail' ? primaryColor : '#d9d9d9'}`,
                borderRadius: 8,
                padding: '12px 16px',
                cursor: 'pointer',
                backgroundColor: posMode === 'retail' ? `${primaryColor}10` : '#fafafa',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <ShopOutlined style={{
                fontSize: 28,
                color: posMode === 'retail' ? primaryColor : '#bbb',
              }} />
              <Typography.Text strong style={{
                color: posMode === 'retail' ? primaryColor : '#888',
                fontSize: 13,
              }}>
                Retail
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 11, textAlign: 'center' }}>
                Products-first flow. Queue orders per slot.
              </Typography.Text>
              {posMode === 'retail' && (
                <Tag color="success" style={{ fontSize: 11, marginTop: 2 }}>Selected</Tag>
              )}
            </div>
          </div>
        </Form.Item>
      )}
    </ModalForm>
  );
};

export default AddEditShopModal;