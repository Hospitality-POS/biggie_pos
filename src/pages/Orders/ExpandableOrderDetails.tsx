import { ProDescriptions } from "@ant-design/pro-components";

const ExpandedRowContent = ({ record }) => {
  const { order_no, username, createdAt, served_by, order_payments } = record;
  
  const formattedCreatedAt = new Date(createdAt).toLocaleString();




  const paymentData = order_payments?.map((payment) => ({
    title: payment?.name,
    value: `Ksh.${payment?.amount?.toLocaleString()}`,
  }));

  

  const singlePaymentDisplay =
    paymentData?.length === 1 ? (
      <span>
        {paymentData[0]?.title} - {paymentData[0]?.value}
      </span>
    ) : (
      <ul style={{ listStyleType: "none", paddingLeft: 0, marginTop:0 }}>
        {paymentData?.map((payment) => (
          <li key={payment?.title}>
            {payment?.title} - {payment?.value}
          </li>
        ))}
      </ul>
    );

  const data = [
    {
      title: "Payment(s)",
      render: () => singlePaymentDisplay,
    },
    {
      title: "Served by",
      dataIndex: ["served_by", "username"],
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
      tooltip="Contains more information about the order"
      layout="horizontal"
      title="Additional Information"
      dataSource={{
        order_no,
        username,
        createdAt: formattedCreatedAt,
        served_by
      }}
      columns={data}
    />
  );
};

export default ExpandedRowContent;
