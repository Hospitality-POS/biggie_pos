import { UserOutlined } from "@ant-design/icons";
import { ActionType, ProTable } from "@ant-design/pro-components";
import { getAllModifierAddons } from "@services/modifierAddons";
import { Tag } from "antd";
import React, { useRef } from "react";

function ModifiersSettings() {
    const actionRef = useRef<ActionType>();
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
          title: "Name",
          dataIndex: "name",
          valueType: "text",
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
          title: "created_at",
          dataIndex: "createdAt",
          valueType: "dateTime",
          hideInSearch: true,
        },
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
      options={{
        fullScreen: true,
      }}
      rowSelection={{
        alwaysShowAlert: false,
        selections: false,
      }}
      search={{
        searchText: "Search Add-ons",
        resetText: "Reset",
        labelWidth: "auto",
      }}
    />
  );
}

export default ModifiersSettings;
