import { DeleteOutlined, RetweetOutlined } from "@ant-design/icons";
import { ActionType, ProTable } from "@ant-design/pro-components";
import AddonsModal from "@components/MODALS/pro/AddonsModal";
import { deleteAddon } from "@services/modifierAddons";
import { useMutation } from "@tanstack/react-query";
import { Button, message, Popconfirm, Space, Tooltip } from "antd";
import React, { useRef } from "react";

interface ExpandedRowContentProps {
  record: any;
  actionRef?: React.RefObject<ActionType>;
  parentReload: () => void;
}

const ExpandedRowContent: React.FC<ExpandedRowContentProps> = ({
  record,
  actionRef,
  parentReload,
}) => {
  // A separate actionRef for the nested table
  const nestedTableRef = useRef<ActionType>();

  const DeleteAddonMutation = useMutation(deleteAddon, {
    onSuccess: () => {
      nestedTableRef.current?.reload();
      parentReload();
      message.success("Addon deleted successfully");
    },
    onError: () => message.error("Failed to delete addon"),
  });

  const actionColumn = {
    title: "Actions",
    dataIndex: "actions",
    hideInSearch: true,
    render: (_: any, record: any) => [
      <Space>
        <Tooltip key="edit" title="Edit">
          <AddonsModal
            actionRef={nestedTableRef}
            parentReload={parentReload}
            edit={true}
            data={record}
          />
        </Tooltip>
        <Popconfirm
          title="Are you sure you want to delete this addon?"
          onConfirm={() => DeleteAddonMutation.mutate(record._id)}
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
    <>
      <ProTable
        bordered
        size="small"
        rowKey="_id"
        actionRef={nestedTableRef}
        columns={[
          {
            title: "Addon Name",
            dataIndex: "name",
            key: "name",
            valueType: "text",
          },
          {
            title: "Created At",
            dataIndex: "createdAt",
            key: "createdAt",
            valueType: "date",
          },
          {
            title: "Updated At",
            dataIndex: "updatedAt",
            key: "updatedAt",
            valueType: "date",
          },
          actionColumn,
        ]}
        headerTitle={false}
        search={false}
        options={false}
        dataSource={record.addons}
        pagination={false}
        toolBarRender={() => [
          <AddonsModal
            actionRef={nestedTableRef}
            parentReload={parentReload}
            modifierId={record?._id}
          />,
          <Tooltip title="Refresh">
            <Button
              onClick={() => {
                nestedTableRef.current?.reload();
                parentReload();
              }}
              icon={<RetweetOutlined />}
              key="refreshAddons"
            >
              Refresh
            </Button>
          </Tooltip>,
        ]}
      />
    </>
  );
};

export default ExpandedRowContent;
