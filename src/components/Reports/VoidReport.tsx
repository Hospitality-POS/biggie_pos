import React, { useRef } from "react";
import { Modal, Table, Typography, Button, Spin } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import { useReactToPrint } from "react-to-print";
import { useAppSelector } from "../../store";
import moment from "moment";
import useSystemDetails from "@hooks/useSystemDetails";
import { COOP_NAME } from "@utils/config";

interface VoidReportProps {
  openM: boolean;
  onCloseM: () => void;
  startDate: any;
  endDate: any;
}

const VoidReportModal: React.FC<VoidReportProps> = ({
  openM,
  onCloseM,
  startDate,
  endDate,
}) => {
  const componentRef = useRef<HTMLDivElement>(null);
  const { BRAND_NAME1 } = useSystemDetails();

  // Get data from Redux store
  const { voidedReport: data, loading, error } = useAppSelector(
    (state) => state.Report
  );

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    onAfterPrint: onCloseM,
  });

  const getTotalAmount = (orderItems: any[]) =>
    orderItems?.reduce((total, item) => total + (item.total_amount || 0), 0);

  const overallTotal = data?.reduce(
    (acc, item) => acc + getTotalAmount(item.orderItems),
    0
  );

  const columns = [
    {
      title: "Product",
      dataIndex: "name",
      key: "name",
      render: (text: string) => (
        <Typography.Text style={{ fontWeight: "bold" }}>{text}</Typography.Text>
      ),
    },
    {
      title: "Amount (Ksh)",
      dataIndex: "orderItems",
      key: "amount",
      align: "right" as const,
      render: (orderItems: any[]) => (
        <Typography.Text style={{ fontWeight: "bold" }}>
          {getTotalAmount(orderItems).toFixed(2)}
        </Typography.Text>
      ),
    },
  ];

  const expandedColumns = [
    {
      title: "QTY",
      dataIndex: "quantity",
      key: "quantity",
      align: "center" as const,
      render: (quantity: number) => quantity.toFixed(1),
    },
    {
      title: "Item",
      dataIndex: "name",
      key: "name",
      render: (text: string) => (
        <Typography.Text style={{ fontWeight: "bold" }}>{text}</Typography.Text>
      ),
    },
    {
      title: "Price (Ksh)",
      dataIndex: "amount",
      key: "price",
      align: "right" as const,
      render: (amount: number) => amount.toFixed(2),
    },
  ];

  if (error) return null;

  return (
    <>
      {loading ? (
        <Spin
          size="large"
          tip="Generating Voided Bills Report, please wait..."
          style={{ display: "flex", justifyContent: "center", marginTop: "20%" }}
        />
      ) : (
        <Modal
          open={openM}
          onCancel={onCloseM}
          width={800}
          footer={[
            <Button key="print" type="primary" onClick={handlePrint}>
              Print
            </Button>,
            <Button
              key="close"
              danger
              icon={<CloseOutlined />}
              onClick={onCloseM}
            >
              Close
            </Button>,
          ]}
        >
          <div ref={componentRef} style={{ padding: 24 }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <Typography.Title level={3} style={{ marginBottom: 8 }}>
                {BRAND_NAME1}
              </Typography.Title>
              <Typography.Title level={4} style={{ marginBottom: 16 }}>
                Voided Bills Report
              </Typography.Title>

              <Typography.Text style={{ display: "block" }}>
                From: {moment(startDate).format("MMM-DD-YYYY H:MM A")}
              </Typography.Text>
              <Typography.Text style={{ display: "block" }}>
                To: {moment(endDate).format("MMM-DD-YYYY H:MM A")}
              </Typography.Text>
            </div>

            <Table
              columns={columns}
              dataSource={data?.map((item: any) => ({
                key: item.id,
                name: item.name,
                orderItems: item.orderItems,
              }))}
              pagination={false}
              bordered
              size="middle"
              expandedRowRender={(record) => (
                <Table
                  columns={expandedColumns}
                  dataSource={record.orderItems.map((orderItem, index) => ({
                    key: index,
                    name: orderItem.name,
                    quantity: orderItem.quantity,
                    amount: orderItem.amount,
                  }))}
                  pagination={false}
                  bordered
                  size="small"
                />
              )}
              style={{ marginBottom: 24 }}
            />

            <div style={{ textAlign: "center", marginTop: 24 }}>
              <Typography.Text
                style={{ display: "block", fontWeight: "bold" }}
              >
                Overall Total: Ksh {overallTotal?.toLocaleString()}
              </Typography.Text>
              <Typography.Text style={{ display: "block" }}>
                Powered by: {COOP_NAME}
              </Typography.Text>
              <Typography.Text type="secondary" style={{ display: "block" }}>
                Generated on {moment().format("MMM/DD/YYYY H:MM A")}
              </Typography.Text>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default VoidReportModal;
