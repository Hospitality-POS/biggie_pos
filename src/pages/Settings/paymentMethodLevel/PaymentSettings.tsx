import { useRef, useState, useEffect } from "react";
import {
  ActionType,
  ParamsType,
  ProTable,
} from "@ant-design/pro-components";
import { Tooltip, Tag } from "antd/lib";
import { Button, message, Popconfirm, Space } from "antd";
import { DeleteOutlined, LinkOutlined, CheckCircleOutlined, WarningOutlined } from "@ant-design/icons";
import { deletePaymentMethod, fetchAllPaymentMethods } from "@services/paymentMethod";
import AddProPaymentMethodSettingsModal from "@components/MODALS/pro/AddProPaymentSettingsModal";
import { useMutation } from "@tanstack/react-query";

const PaymentsMethodSettings = () => {
  const paymentRef = useRef<ActionType>();
  const [accountingEnabled, setAccountingEnabled] = useState(false);

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

    checkAccounting();

    // Listen for tenant updates
    const handleTenantUpdate = () => checkAccounting();
    window.addEventListener('tenantUpdated', handleTenantUpdate);

    return () => {
      window.removeEventListener('tenantUpdated', handleTenantUpdate);
    };
  }, []);

  const DeletePaymentMethodMutation = useMutation(deletePaymentMethod, {
    onSuccess: () => {
      paymentRef.current?.reload();
      message.success("Payment method deleted successfully");
    },
    onError: () => message.error("Failed to delete payment method"),
  });

  const actionColumn = {
    title: "Actions",
    dataIndex: "actions",
    hideInSearch: true,
    render: (_, record: ParamsType) => [
      <Space key="actions">
        <Tooltip key="edit" title="Edit">
          <AddProPaymentMethodSettingsModal
            edit={true}
            actionRef={paymentRef}
            data={record}
          />
        </Tooltip>
        <Popconfirm
          key="delete"
          title="Are you sure you want to delete this payment method?"
          onConfirm={() => DeletePaymentMethodMutation.mutate(record._id)}
          okText="Yes"
          cancelText="No"
        >
          <Button
            type="primary"
            danger
            icon={<DeleteOutlined />}
            size="small"
          >
            Delete
          </Button>
        </Popconfirm>
      </Space>,
    ],
  };

  // Add accounting status column if accounting is enabled
  const accountingStatusColumn = accountingEnabled ? {
    title: "Accounting Status",
    dataIndex: "account_id",
    hideInSearch: true,
    width: 160,
    render: (account_id: string) => {
      if (account_id) {
        return (
          <Tooltip title="Linked to Chart of Accounts - Journal entries will be created">
            <Tag icon={<CheckCircleOutlined />} color="success">
              COA Linked
            </Tag>
          </Tooltip>
        );
      }
      return (
        <Tooltip title="Not linked - Journal entries will be skipped for this payment method">
          <Tag icon={<WarningOutlined />} color="warning">
            Not Linked
          </Tag>
        </Tooltip>
      );
    },
  } : null;

  const columns = [
    {
      title: "Payment Method",
      dataIndex: "name",
      hideInSearch: false,
      fieldProps: {
        placeholder: "Enter payment method",
      },
    },
    accountingStatusColumn,
    actionColumn,
  ].filter(Boolean); // Remove null columns

  return (
    <>
      {accountingEnabled && (
        <div style={{
          marginBottom: 16,
          padding: '12px 16px',
          backgroundColor: '#e6f7ff',
          borderRadius: '6px',
          border: '1px solid #91d5ff'
        }}>
          <Space>
            <LinkOutlined style={{ color: '#1890ff', fontSize: '16px' }} />
            <div>
              <div style={{ color: '#1890ff', fontWeight: 600, marginBottom: 4 }}>
                Accounting Integration Active
              </div>
              <div style={{ color: '#096dd9', fontSize: '13px' }}>
                Link payment methods to your Chart of Accounts to enable automatic journal entries for all transactions.
              </div>
            </div>
          </Space>
        </div>
      )}

      <ProTable
        rowKey="_id"
        cardBordered
        pagination={{
          pageSize: 5,
          showQuickJumper: false,
          showTotal: (total, range) => (
            <div>{`Showing ${range[0]}-${range[1]} of ${total} total items`}</div>
          ),
        }}
        columns={columns}
        request={async (param) => {
          const data = await fetchAllPaymentMethods(param);

          return {
            data: data,
            success: true,
            total: data.length,
          };
        }}
        tableAlertRender={({ selectedRowKeys }) => {
          return <p>You have selected {selectedRowKeys.length}</p>;
        }}
        actionRef={paymentRef}
        rowSelection={{
          alwaysShowAlert: false,
          selections: false,
        }}
        search={{
          searchText: "Search Method",
          resetText: "Reset",
          labelWidth: "auto",
        }}
        dateFormatter="string"
        headerTitle="List of Payment Methods"
        toolBarRender={() => [
          <AddProPaymentMethodSettingsModal
            key="add"
            actionRef={paymentRef}
          />,
        ]}
      />
    </>
  );
};

export default PaymentsMethodSettings;