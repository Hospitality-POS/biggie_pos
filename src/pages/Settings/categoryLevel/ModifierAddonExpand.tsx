import { DeleteOutlined, RetweetOutlined } from "@ant-design/icons";
import { ActionType, ProTable } from "@ant-design/pro-components";
import AddonsModal from "@components/MODALS/pro/AddonsModal";
import { deleteAddon } from "@services/modifierAddons";
import ShowConfirm from "@utils/ConfirmUtil";
import { Button, Space, Tooltip } from "antd";
import React, { RefObject } from "react";

interface ExpandedRowContentProps {
  record: any;
  actionRef: RefObject<ActionType>;
}

const ExpandedRowContent: React.FC<ExpandedRowContentProps> = ({
  record,
  actionRef,
}) => {
  const actionColumn = {
    title: "Actions",
    dataIndex: "actions",
    hideInSearch: true,
    render: (_: any, record: any) => [
      <Space>
        <Tooltip key="edit" title="Edit">
          <AddonsModal actionRef={actionRef} edit={true} data={record} />
        </Tooltip>

        <Tooltip key="delete" title="Delete">
          <Button
            key="delete"
            danger
            icon={<DeleteOutlined />}
            onClick={async () => {
              const confirmed = await ShowConfirm({
                title: `Are you sure you want to delete ${record?.name}?`,
                position: true,
              });
              if (confirmed) {
                await deleteAddon({ _id: record?._id });
                actionRef.current?.reload();
              }
            }}
          >
            Delete
          </Button>
        </Tooltip>
      </Space>,
    ],
  };

  return (
    <>
      <ProTable
        bordered
        size="small"
        rowKey="_id"
        actionRef={actionRef}
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
          <AddonsModal actionRef={actionRef} edit={false} data={record} />,
          <Tooltip title="Refresh">
            <Button
              onClick={() => actionRef.current?.reload()}
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
