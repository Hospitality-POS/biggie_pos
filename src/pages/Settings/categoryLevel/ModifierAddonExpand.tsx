import { ActionType, ProTable } from "@ant-design/pro-components";
import { Button } from "antd";
import { useRef } from "react";

const ExpandedRowContent = ({ record }) => {
  const actionRef = useRef<ActionType>();
  
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
