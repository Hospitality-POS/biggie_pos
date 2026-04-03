import { useRef } from "react";
import {
  ActionType,
  ParamsType,
  ProTable,
} from "@ant-design/pro-components";
import { Tooltip } from "antd/lib";
import { Button, message, Popconfirm, Space } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { deletePaymentMethod, fetchAllPaymentMethods } from "@services/paymentMethod";
import AddProPaymentMethodSettingsModal from "@components/MODALS/pro/AddProPaymentSettingsModal";
import { useMutation } from "@tanstack/react-query";

const PaymentsMethodSettings = () => {
  const paymentRef = useRef<ActionType>();

  const DeletePaymentMethodMutation = useMutation(deletePaymentMethod, {
    onSuccess: () => {
      paymentRef.current?.reload();
      message.success("Payment method deleted successfully");
    },
    onError: () => message.error("Failed to delete payment method"),
  });

  const columns = [
    {
      title: "Payment Method",
      dataIndex: "name",
      hideInSearch: false,
      fieldProps: {
        placeholder: "Enter payment method",
      },
    },
    {
      title: "Actions",
      dataIndex: "actions",
      hideInSearch: true,
      render: (_: any, record: ParamsType) => [
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
    },
  ];

  return (
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
      tableAlertRender={({ selectedRowKeys }) => (
        <p>You have selected {selectedRowKeys.length}</p>
      )}
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
  );
};

export default PaymentsMethodSettings;