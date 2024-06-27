import { ActionType, ProTable } from "@ant-design/pro-components";
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
          title: "Description",
          dataIndex: "description",
          valueType: "text",
          hideInSearch: true,
        },

        {
          title: "Status",
          dataIndex: "status",
          valueType: "text",
          hideInSearch: true,
        },
      ]}
      request={async () => {
        const response = await fetch(
          "https://randomuser.me/api/?results=5&inc=name,gender,email,nat&noinfo"
        );
        return response.json();
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
