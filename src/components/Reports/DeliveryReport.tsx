import React, { useRef } from "react";
import { Modal, Table, Typography, Button, Spin } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import { useAppSelector } from "../../store";
import moment from "moment";
import useSystemDetails from "@hooks/useSystemDetails";
import { COOP_NAME } from "@utils/config";

interface DeliveryReportProps {
  openM: boolean;
  onCloseM: () => void;
  startDate: any;
  endDate: any;
}

const DeliveryReportModal: React.FC<DeliveryReportProps> = ({
  openM,
  onCloseM,
  startDate,
  endDate,
}) => {
  const componentRef = useRef<HTMLDivElement>(null);
  const { BRAND_NAME1 } = useSystemDetails();

  // Get data from Redux store
  const {
    deliveryReport: data,
    loading,
    error,
  } = useAppSelector((state) => state.Report);

  const columns = [
    {
      title: "Item Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Quantity",
      dataIndex: "quantity",
      key: "quantity",
      align: "right" as const,
      render: (value: number) => value.toFixed(1),
    },
    {
      title: "Unit",
      dataIndex: "uom",
      key: "uom",
      align: "right" as const,
    },
  ];

  if (error) return null;

  return (
    <>
      {loading ? (
        <Spin
          size="large"
          fullscreen
          tip="Generating Delivery Report..."
        />
      ) : (
        <Modal
          open={openM}
          onCancel={onCloseM}
          width={800}
          footer={[
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
                Delivery Report
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
                key: item.inventory_id,
                name: item.name,
                quantity: item.quantity,
                uom: item.uom,
              }))}
              pagination={false}
              bordered
              size="middle"
              style={{ marginBottom: 24 }}
            />

            <div style={{ textAlign: "center", marginTop: 24 }}>
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

export default DeliveryReportModal;
