import { useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  ProTable,
  ActionType,
} from "@ant-design/pro-components";
import {
  Typography,
  Card,
  Button,
  Popconfirm,
  message,
  Space,
  Tag,
} from "antd";
import {
  PrinterOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import AddEditPrinterModal from "@components/MODALS/pro/AddEditPrinterModal";
import { deletePrinter, getAllPrinters } from "@services/printer";


const { Title } = Typography;

function PrinterManagement() {
  const actionRef = useRef<ActionType>();
  const deletePrinterMutation = useMutation(deletePrinter, {
    onSuccess: () => {
      actionRef.current?.reload();
      message.success("Printer deleted successfully");
    },
    onError: () => message.error("Failed to delete printer"),
  });

  const columns = [
    {
      title: "Printer Name",
      dataIndex: "name",
      fieldProps: {
        placeholder: "Enter Printer Name",
      },
      key: "name",
    },
    {
      title: "Main Category",
      dataIndex: ["main_category", "name"],
      search: false,
      fieldProps: {
        placeholder: "Enter Main Category",
      },
      key: "main_category",
    },
    {
      title: "Connection Type",
      dataIndex: "connectionType",
      search: false,
      fieldProps: {
        placeholder: "Enter Connection Type",
      },
    },
    {
      title: "IP Address",
      dataIndex: "ipAddr",
      copyable: true,
      fieldProps: {
        placeholder: "Enter IP Address",
      },
      key: "ip",
    },
    {
      title: "Status",
      dataIndex: "status",
      search: false,
      fieldProps: {
        placeholder: "Enter Status",
      },
      render: (_, record: any) => (
        <Tag color={record.status === "online" ? "green" : "red"}>
          {record.status}
        </Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      search: false,
      render: (_, record: any) => (
        <Space>
          <AddEditPrinterModal
            actionRef={actionRef}
            edit={true}
            data={record}
          />

          <Popconfirm
            title="Are you sure you want to delete this printer?"
            onConfirm={() => deletePrinterMutation.mutate(record._id)}
            okText="Yes"
            cancelText="No"
          >
            <Button danger icon={<DeleteOutlined />} size="small" type="primary">
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title={
        <Title level={3}>
          <PrinterOutlined /> Printer Management
        </Title>
      }
      style={{ maxWidth: "1500px", width: "100%", margin: "0 auto" }}
      extra={<AddEditPrinterModal actionRef={actionRef} edit={false} />}
    >
      <ProTable
        rowKey="_id"
        request={async (param) => {
          const data = await getAllPrinters(param);

          return {
            data: data,
            success: true,
            total: data.length,
          };
        }}
        columns={columns}
        actionRef={actionRef}
        search={{
          searchText: "Search Printer",
          resetText: "Reset",
          labelWidth: "auto",
        }}
        pagination={
          {
            // showSizeChanger: true,
            // showQuickJumper: true,
          }
        }
      />
    </Card>
  );
}

export default PrinterManagement;
