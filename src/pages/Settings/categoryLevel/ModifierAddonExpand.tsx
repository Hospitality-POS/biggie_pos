import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { ActionType, ProTable } from "@ant-design/pro-components";
import { Button, Tooltip } from "antd";
import { useRef } from "react";

const ExpandedRowContent = ({ record }) => {
  const actionRef = useRef<ActionType>();

   const actionColumn = {
     title: "Actions",
     dataIndex: "actions",
     hideInSearch: true,
     render: (_, record) => [
       <Tooltip key="edit" title="Edit">
         <Button icon={<EditOutlined />} type="text"></Button>
         {/* <SubCategoryModal data={record} edit={true} actionRef={actionRef} /> */}
       </Tooltip>,
       <Tooltip key="delete" title="Delete">
         <Button
           type="link"
           danger
           icon={<DeleteOutlined />}
        //    onClick={() => handleDeleteClick(record)}
         />
       </Tooltip>,
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
          <Button type="primary">Add Addon</Button>,
          <Button onClick={() => actionRef.current?.reload()}>Refresh</Button>,
        ]}
      />
    </>
  );
};

export default ExpandedRowContent;
