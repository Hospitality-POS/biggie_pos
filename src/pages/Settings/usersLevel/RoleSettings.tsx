import { ActionType, ProTable } from "@ant-design/pro-components";
import { Button, Popconfirm, Space, Tooltip, message } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { deleteRole, fetchAllRoles } from "@services/Roles";
import RoleModal from "@components/MODALS/pro/RoleModal";

function RoleSettings() {
  const actionRef = useRef<ActionType>();

  const deleteRoleMutation = useMutation(deleteRole, {
    onSuccess: () => {
      actionRef?.current?.reload();
    },
    onError: () => message.error("Failed to delete role"),
  });

  const columns = [
    {
      title: "Role Type",
      dataIndex: "role_type",
      key: "role_type",
      fieldProps: {
        autoComplete: "on",
        allowClear: true,
        placeholder: "Enter Role Type",
      },
      sorter: true,
    },
    {
      title: "Date Created",
      dataIndex: "createdAt",
      key: "createdAt",
      search: false,
      sorter: true,
      render: (value) => new Date(value).toLocaleDateString(),
    },
    {
      title: "Date Updated",
      dataIndex: "updatedAt",
      key: "updatedAt",
      search: false,
      sorter: true,
      render: (value) => new Date(value).toLocaleDateString(),
    },
    {
      title: "Actions",
      key: "actions",
      search: false,
      render: (_, record) => (
        <Space size="middle">
          <Tooltip title="Edit">
            <RoleModal actionRef={actionRef} edit={true} data={record} />
          </Tooltip>
          <Popconfirm
            title="Are you sure you want to delete this role?"
            onConfirm={() => deleteRoleMutation.mutate(record._id)}
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
        </Space>
      ),
    },
  ];

  const requestData = async (params) => {
    try {
      const data = await fetchAllRoles(params);
      return {
        data,
        success: true,
        total: data.length,
      };
    } catch (error) {
      message.error("Failed to load role data.");
      return { data: [], success: false };
    }
  };

  return (
    <ProTable
      columns={columns}
      actionRef={actionRef}
      rowKey="_id"
      request={requestData}
      pagination={{ pageSize: 10 }}
      options={{
        density: true,
        fullScreen: true,
        reload: true,
        setting: true,
      }}
      headerTitle="Role Type Settings"
      tableAlertRender={({ selectedRowKeys }) => (
        <p>You have selected {selectedRowKeys.length} roles</p>
      )}
      rowSelection={{
        alwaysShowAlert: false,
        selections: true,
      }}
      search={{
        searchText: "Search Role",
        resetText: "Reset",
        labelWidth: "auto",
      }}
      toolBarRender={() => [<RoleModal key="addRole" actionRef={actionRef} />]}
      dateFormatter="string"
    />
  );
}

export default RoleSettings;
