import { useRef } from "react";
import { ActionType, ProTable } from "@ant-design/pro-components";
import { Popconfirm, Tag, Space, Typography, Button, message } from "antd";
import { deleteDelivery, fetchAllDeliveries } from "@services/deliveries";
import { DeleteOutlined } from "@ant-design/icons";
import ExpandedDeliveryItems from "./ExpandedDeliveryItems";
import AcceptDeliveryModal from "@components/MODALS/pro/AcceptDeliveryModal";
import { useMutation } from "@tanstack/react-query";

const { Text } = Typography;

const DeliverySettings = () => {
  const deliveryRef = useRef<ActionType>();
  
   const deleteDeliveryMutation = useMutation(deleteDelivery, {
    onSuccess: () => {
      deliveryRef.current?.reload();
      message.success("Delivery deleted successfully");
    },
    onError: () => message.error("Failed to delete delivery"),
  });

  const actionColumn = {
    title: "Actions",
    dataIndex: "actions",
    hideInSearch: true,
    render: (_, record: any) => (
      <Space size="middle">
        <AcceptDeliveryModal
          actionRef={deliveryRef}
          data={record}
          edit={true}
        />

        <Popconfirm
          title="Are you sure you want to delete this delivery?"
          onConfirm={() => deleteDeliveryMutation.mutate(record._id)}
          okText="Yes"
          cancelText="No"
        >
          <Button type="primary" danger icon={<DeleteOutlined />}>
            Delete
          </Button>
        </Popconfirm>
      </Space>
    ),
  };

  return (
    <ProTable
      rowKey="_id"
      cardBordered
      pagination={{
        pageSize: 10,
        showQuickJumper: true,
        showSizeChanger: true,
        showTotal: (total, range) => (
          <Text type="secondary">{`Showing ${range[0]}-${range[1]} of ${total} deliveries`}</Text>
        ),
      }}
      columns={[
        {
          title: "Delivery Code",
          dataIndex: "code",
          hideInSearch: false,
          fieldProps: {
            placeholder: "Enter Delivery Code",
          },
          sorter: true,
        },
        {
          title: "Delivered By",
          dataIndex: "delivered_by",
          hideInSearch: false,
          fieldProps: {
            placeholder: "Enter Deliverer Name",
          },
          sorter: true,
        },
        {
          title: "Supplier",
          dataIndex: ["supplier_id", "name"],
          hideInSearch: true,
          render: (_, record) => record?.supplier_id?.name,
        },
        {
          title: "Supplier Contact",
          dataIndex: ["supplier_id", "phone"],
          hideInSearch: true,
          copyable: true,
        },
        {
          title: "Received By",
          dataIndex: ["received_by", "fullname"],
          hideInSearch: true,
          render: (_, record) => record?.received_by?.fullname,
        },
        {
          title: "Delivery Status",
          dataIndex: "delivery_status",
          hideInSearch: true,
          render: (status) => (
            <Tag color={status ? "success" : "error"}>
              {status ? "Delivered" : "Pending"}
            </Tag>
          ),
        },
        {
          title: "Created At",
          dataIndex: "createdAt",
          hideInSearch: true,
          valueType: "dateTime",
          sorter: true,
        },
        actionColumn,
      ]}
      request={async (params) => {
        const data = await fetchAllDeliveries(params);
        return {
          data,
          success: true,
          total: data.length,
        };
      }}
      actionRef={deliveryRef}
      search={{
        labelWidth: "auto",
        filterType: "light",
      }}
      dateFormatter="string"
      scroll={{ x: "100%" }}
      options={{
        fullScreen: true,
      }}
      headerTitle={
        <Text strong style={{ fontSize: "18px" }}>
          List of Deliveries
        </Text>
      }
      expandable={{
        expandedRowRender: (record) => (
          <ExpandedDeliveryItems record={record} />
        ),
      }}
      toolBarRender={() => [
        <AcceptDeliveryModal edit={false} actionRef={deliveryRef}/>
      ]}
    />
  );
};

export default DeliverySettings;
