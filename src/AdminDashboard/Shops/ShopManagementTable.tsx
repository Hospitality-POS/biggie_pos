import { useRef } from "react";
import { ActionType, ProTable } from "@ant-design/pro-components";
import { Tooltip, Button, Space, Popconfirm, message, Badge } from "antd";
import {
  DeleteOutlined,
  EyeOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { deleteShop, fetchAllShops } from "@services/shops";
import AddEditShopModal from "@components/MODALS/pro/AddEditShopModal";
import { useNavigate } from "react-router-dom";
import { Spa } from "@mui/icons-material";

const ShopManagementTable = () => {
  const tableRef = useRef<ActionType>();
  const navigate = useNavigate();

  const DeleteShopMutation = useMutation(deleteShop, {
    onSuccess: () => {
      tableRef.current?.reload();
      message.success("Shop deleted successfully");
    },
    onError: () => message.error("Failed to delete shop"),
  });

  const handleShopClick = (shopId: string) => {
    localStorage.setItem("shopId", shopId);

    // ✅ NEW: Smart navigation based on enabled modules
    const storedTenant = localStorage.getItem("tenant");
    const tenant = storedTenant ? JSON.parse(storedTenant) : null;

    const hasPOS = !!(tenant?.pos_integration?.enabled ?? true);
    const hasAccounting = !!(
      tenant?.accounting_database?.enabled ||
      tenant?.modules?.accounting
    );

    // Navigate based on enabled modules
    if (hasAccounting && !hasPOS) {
      // Accounting only → go to /accounting
      navigate("/accounting");
    } else {
      // POS enabled (or both) → go to /tables
      navigate("/tables");
    }
  };

  const actionColumn = {
    title: "Actions",
    dataIndex: "actions",
    hideInSearch: true,
    render: (_, record: any) => (
      <Space size="middle">
        <Tooltip title="View Shop">
          <Button
            type="primary"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleShopClick(record._id)}
          >
            View
          </Button>
        </Tooltip>
        <Tooltip title="Edit Shop">
          <AddEditShopModal edit={true} actionRef={tableRef} data={record} />
        </Tooltip>
        <Popconfirm
          title="Are you sure you want to delete this shop?"
          onConfirm={() => DeleteShopMutation.mutate(record._id)}
          okText="Yes"
          cancelText="No"
        >
          <Tooltip title="Delete Shop">
            <Button type="primary" danger icon={<DeleteOutlined />} size="small">
              Delete
            </Button>
          </Tooltip>
        </Popconfirm>
      </Space>
    ),
  };

  return (
    <ProTable
      rowKey="_id"
      cardBordered
      pagination={{
        pageSize: 5,
        showQuickJumper: true,
        showSizeChanger: true,
        showTotal: (total, range) => (
          <div>{`Showing ${range[0]}-${range[1]} of ${total} total shops`}</div>
        ),
      }}
      columns={[
        {
          title: "Branch Name",
          dataIndex: "name",
          key: "name",
          copyable: true,
          ellipsis: true,
          tip: "Branch name will be unique across system",
          formItemProps: {
            rules: [{ required: true, message: "Branch name is required" }],
          },
        },
        {
          title: "Location",
          dataIndex: "location",
          hideInSearch: false,
          fieldProps: {
            placeholder: "Enter Branch location",
          },
        },
        {
          title: "Daily Revenue",
          dataIndex: "daily_revenue",
          hideInSearch: true,
          valueType: "money",
          render: (_, record) => {
            return `Ksh. ${record?.daily_revenue?.toLocaleString() || 0}`;
          },
        },
        {
          title: "Staff Count",
          dataIndex: "staff_count",
          hideInSearch: true,
          sorter: (a, b) => a.staff_count - b.staff_count,
          render: (_, record) => {
            return (
              <Space>
                <UserAddOutlined />
                <span>{record?.staff_count}</span>
              </Space>
            );
          },
        },
        actionColumn,
      ]}
      request={async (params) => {
        const data = await fetchAllShops(params);
        return {
          data: data,
          success: true,
          total: data.length,
        };
      }}
      tableAlertRender={({ selectedRowKeys }) => {
        return <p>Selected {selectedRowKeys.length} shops</p>;
      }}
      actionRef={tableRef}
      options={{
        fullScreen: true,
        setting: true,
        density: true,
        reload: true,
      }}
      rowSelection={{
        alwaysShowAlert: false,
        selections: false,
      }}
      search={{
        searchText: "Search Branch",
        resetText: "Reset",
        labelWidth: "auto",
      }}
      dateFormatter="string"
      headerTitle="Branch Management"
      toolBarRender={() => [
        <AddEditShopModal edit={false} actionRef={tableRef} />,
      ]}
    />
  );
};

export default ShopManagementTable;