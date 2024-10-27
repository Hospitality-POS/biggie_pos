import {
  DeleteOutlined,
  EditOutlined,
  PushpinOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { ActionType, ProTable } from "@ant-design/pro-components";
import {
  deleteModifierAddon,
  getAllModifierAddons,
} from "@services/modifierAddons";
import { Button, message, Popconfirm, Space, Tag, Tooltip } from "antd";
import { RefObject, useRef, useState } from "react";
import ExpandedRowContent from "./ModifierAddonExpand";
import ModifiersModal from "@components/MODALS/pro/ModifiersModal";
import { useMutation } from "@tanstack/react-query";

function ModifiersSettings() {
  const actionRef = useRef<ActionType>();
  // Keep track of expanded rows to force their refresh
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);

  const DeleteModifierMutation = useMutation(deleteModifierAddon, {
    onSuccess: () => {
      actionRef.current?.reload();
      message.success("Modifier deleted successfully");
    },
    onError: () => message.error("Failed to delete modifier"),
  });

  const expandedRowRender = (record: any) => {
    return (
      <ExpandedRowContent
        record={record}
        actionRef={actionRef as React.RefObject<ActionType>}
        parentReload={() => actionRef.current?.reload()}
      />
    );
  };

  const actionColumn = {
    title: "Actions",
    dataIndex: "actions",
    hideInSearch: true,
    render: (_: any, record: any) => [
      <Space>
        <Tooltip key="edit" title="Edit">
          <ModifiersModal actionRef={actionRef} edit={true} data={record} />
        </Tooltip>
        <Popconfirm
          title="Are you sure you want to delete this modifier?"
          onConfirm={() => DeleteModifierMutation.mutate(record._id)}
          okText="Yes"
          cancelText="No"
        >
          <Button
            key="delete"
            size="small"
            type="primary"
            danger
            icon={<DeleteOutlined />}
          >
            Delete
          </Button>
        </Popconfirm>
      </Space>,
    ],
  };

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
      columns={[
        {
          title: "Modifier Name",
          dataIndex: "name",
          valueType: "text",
          fieldProps: {
            placeholder: "Enter modifier name",
          },
        },
        {
          title: "Created By",
          dataIndex: ["createdBy", "fullname"],
          valueType: "text",
          hideInSearch: true,
          render: (text) => (
            <Tag color={text ? "green" : "error"}>
              {text ? (
                <>
                  <UserOutlined /> {text}
                </>
              ) : (
                "Deleted"
              )}
            </Tag>
          ),
        },
        {
          title: "Date Created",
          dataIndex: "createdAt",
          valueType: "dateTime",
          hideInSearch: true,
        },
        {
          title: "Date Updated",
          dataIndex: "updatedAt",
          valueType: "dateTime",
          hideInSearch: true,
        },
        actionColumn,
      ]}
      request={async (params) => {
        const data = await getAllModifierAddons(params);
        return {
          data: data,
          success: true,
          total: data.length,
        };
      }}
      tableAlertRender={({ selectedRowKeys }) => {
        return <p>You have selected {selectedRowKeys.length}</p>;
      }}
      actionRef={actionRef}
      headerTitle="List of Modifiers and Addons"
      options={{
        fullScreen: true,
      }}
      rowSelection={{
        alwaysShowAlert: false,
        selections: false,
      }}
      search={{
        searchText: "Search Modifiers",
        resetText: "Reset",
        labelWidth: "auto",
      }}
      expandable={{
        expandedRowRender,
        defaultExpandAllRows: false,
        expandIconColumnIndex: 1,
        columnTitle: " ",
        expandedRowKeys,
        onExpandedRowsChange: (keys) => setExpandedRowKeys(keys as string[]),
      }}
      toolBarRender={() => [
        <ModifiersModal actionRef={actionRef} edit={false} />,
      ]}
    />
  );
}

export default ModifiersSettings;