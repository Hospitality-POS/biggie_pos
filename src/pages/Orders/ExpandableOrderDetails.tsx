import { ProDescriptions } from "@ant-design/pro-components";

const ExpandedRowContent = ({ record }) => {
  const { order_no, username, createdAt, served_by } = record;
  
  const formattedCreatedAt = new Date(createdAt).toLocaleString();

  const data = [
    {
      title: "order no.",
      dataIndex: "order_no",
      value: order_no,
    },
    {
      title: "Served by",
      dataIndex:[ "served_by","username"],
      value: served_by?.username,
    },
    {
      title: "Date created",
      dataIndex: "createdAt",
    },
  ];

  return (
    <ProDescriptions
      size="small"
      style={{ paddingLeft: 28 }}
      tooltip="Contains more information about the user"
      layout="horizontal"
      title="Additional Information"
      dataSource={{ order_no, username, createdAt: formattedCreatedAt,served_by }}
      columns={data}
    />
  );
};

export default ExpandedRowContent;
