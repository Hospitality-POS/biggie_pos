import { ProDescriptions } from "@ant-design/pro-components";

const ExpandedRowContent = ({ record }) => {
  const { pin, username, createdAt, phone } = record;
  const formattedCreatedAt = new Date(createdAt).toLocaleString();

  const data = [
    {
      title: "Username",
      dataIndex: "username",
      value: username,
    },
    {
      title: "Pin",
      dataIndex: "pin",
      value: pin,
    },
    {
      title: "Phone No.",
      dataIndex: "phone",
      value: phone,
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
      dataSource={{ pin, username, createdAt: formattedCreatedAt, phone }}
      columns={data}
    />
  );
};

export default ExpandedRowContent;
