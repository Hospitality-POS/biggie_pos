import { UserOutlined } from "@ant-design/icons";
import { ActionType, ProTable } from "@ant-design/pro-components";
import { getAllModifierAddons } from "@services/modifierAddons";
import { Button, Tag } from "antd";
import React, { useRef } from "react";
import ExpandedRowContent from "./ModifierAddonExpand";

function ModifiersSettings() { 
    const actionRef = useRef<ActionType>();
     const expandedRowRender = (record: any) => {
       return <ExpandedRowContent record={record} />;
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
      expandable={{
          expandedRowRender,
          defaultExpandAllRows: false,
          expandIconColumnIndex: 1,
          columnTitle: " ",
        }}
        toolBarRender={() => [
          <Button type="primary">Add Modifier</Button>
        ]}
    />
  );
}

export default ModifiersSettings;
