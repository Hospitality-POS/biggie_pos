import { useRef } from "react";
import { ActionType, ProTable } from "@ant-design/pro-components";
import { Button, message, Popconfirm, Tag } from "antd";
import { deleteInventory, fetchAllInventory } from "@services/inventory";
import AddEditProInventoryModal from "@components/MODALS/pro/AddEditProInventoryModal";
import { DeleteOutlined } from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";

const InventorySettings = () => {
  const paymentRef = useRef<ActionType>();

  const deleteInventoryMutation = useMutation(deleteInventory, {
    onSuccess: () => {
      paymentRef.current?.reload();
      message.success("Printer deleted successfully");
    },
    onError: () => message.error("Failed to delete printer"),
  });

  const actionColumn = {
    title: "Actions",
    dataIndex: "actions",
    hideInSearch: true,
    render: (_, record: any) => [
      <Tag color="success" key={record._id}>
        <AddEditProInventoryModal
          actionRef={paymentRef}
          data={record}
          edit={true}
        />
      </Tag>,
      <Popconfirm
        title="Are you sure you want to delete this inventory?"
        onConfirm={() => deleteInventoryMutation.mutate(record._id)}
        okText="Yes"
        cancelText="No"
      >
        <Tag color="error" key={record._id} style={{ cursor: "pointer" }}>
          <DeleteOutlined />
          Delete
        </Tag>
      </Popconfirm>,
    ],
  };

  return (
    <>
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
        columns={[
          {
            title: "code",
            dataIndex: "code",
            hideInSearch: false,
            fieldProps: {
              placeholder: "Enter Code",
            },
            sorter: true,
          },
          {
            title: "Name",
            dataIndex: "name",
            hideInSearch: false,
            fieldProps: {
              placeholder: "Enter Product Name",
            },
            sorter: true,
          },
          {
            title: "Price",
            dataIndex: "price",
            hideInSearch: true,
            valueType: "money",
            render: (_, record) => {
              return `ksh. ${record?.price?.toLocaleString()}`;
            },
          },
          {
            title: "Subcategory",
            dataIndex: "subcategory_id",
            hideInSearch: true,
            render: (_, record) => {
              return record?.subcategory_id?.name;
            },
          },
          {
            title: "Quantity",
            dataIndex: "quantity",
            hideInSearch: true,
            valueType: "digit",
          },
          {
            title: "Unit",
            dataIndex: "unit_id",
            hideInSearch: true,
            render: (_, record) => {
              return record?.unit_id?.name;
            },
          },
          actionColumn,
        ]}
        request={async (param) => {
          const data = await fetchAllInventory(param);
          // console.log(data);
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
          searchText: "Search Inventory",
          resetText: "Reset",
          labelWidth: "auto",
        }}
        dateFormatter="string"
        headerTitle="List of Product Inventory"
        toolBarRender={() => [
          <AddEditProInventoryModal actionRef={paymentRef} />,
        ]}
      />
    </>
  );
};

export default InventorySettings;
