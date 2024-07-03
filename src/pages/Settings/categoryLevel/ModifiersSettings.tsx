import { DeleteOutlined, EditOutlined, PushpinOutlined, UserOutlined } from "@ant-design/icons";
import { ActionType, ProTable } from "@ant-design/pro-components";
import { deleteModifierAddon, getAllModifierAddons } from "@services/modifierAddons";
import { Button, Tag, Tooltip } from "antd";
import React, { useRef } from "react";
import ExpandedRowContent from "./ModifierAddonExpand";
import ModifiersModal from "@components/MODALS/pro/ModifiersModal";
import ShowConfirm from "@utils/ConfirmUtil";

function ModifiersSettings() { 
    const actionRef = useRef<ActionType>();
     const expandedRowRender = (record: any) => {
       return <ExpandedRowContent record={record} actionRef={actionRef} />;
     };

     
   const actionColumn = {
     title: "Actions",
     dataIndex: "actions",
     hideInSearch: true,
     render: (_, record) => [
       <Tooltip key="edit" title="Edit">
       <ModifiersModal actionRef={actionRef} edit={true} data={record} />
       </Tooltip>,
       <Tooltip key="delete" title="Delete">
         <Button
           type="link"
           danger
           icon={<DeleteOutlined />}
           onClick={async() => {
             const confirmed = await ShowConfirm({
               title: `Are you sure you want to delete ${record?.name}?`,
               position: true,
             });
             if (confirmed) {
               await deleteModifierAddon({ _id: record?._id });
               actionRef?.current?.reload();
             }
           }}
         />
       </Tooltip>,
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
      }}
      toolBarRender={() => [
        <ModifiersModal actionRef={actionRef} edit={false} />,
      ]}
    />
  );
}

export default ModifiersSettings;
