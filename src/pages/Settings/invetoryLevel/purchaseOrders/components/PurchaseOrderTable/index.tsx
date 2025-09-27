import React, { useState } from "react";
import {
  Button,
  Dropdown,
  Space,
  Table,
  Tag,
  Typography,
  Progress,
  Descriptions,
  Divider,
  Modal,
  Flex,
} from "antd";
import {
  DeleteOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  TruckOutlined,
  StopOutlined,
  MoreOutlined,
  FileTextOutlined,
  PrinterOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
} from "@ant-design/icons";
import { ProTable } from "@ant-design/pro-components";
import type { ActionType, ParamsType } from "@ant-design/pro-components";
import { PurchaseOrder, PurchaseOrderItem } from "../../types";
import { usePurchaseOrders } from "../../hooks/usePurchaseOrders";
import AddEditPurchaseOrderModal from "../AddEditPurchaseOrderModal";
import { useRef } from "react";

const { Title } = Typography;

interface PurchaseOrderTableProps {
  actionRef: React.RefObject<ActionType>;
  onDeletePO: (id: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
  onPrintPO: (record: PurchaseOrder) => void;
  onExportToExcel: (data: PurchaseOrder[]) => void;
  onExportToPDF: (data: PurchaseOrder[]) => void;
  onBulkPrint: () => void;
  onGenerateSummary: () => void;
  onFetchData: (
    params: any,
    sort?: any,
    filter?: any
  ) => Promise<{
    data: PurchaseOrder[];
    success: boolean;
    total: number;
  }>;
}

export const PurchaseOrderTable: React.FC<PurchaseOrderTableProps> = ({
  onDeletePO,
  onUpdateStatus,
  onPrintPO,
  onExportToExcel,
  onExportToPDF,
  onBulkPrint,
  onGenerateSummary,
}) => {
  const [selectedRows, setSelectedRows] = useState<PurchaseOrder[]>([]);
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);

  const actionRef = useRef<ActionType>();

  const { fetchPurchaseOrders, deletePurchaseOrder, updateStatus } =
    usePurchaseOrders();

  // Status render function
  const renderStatus = (status: string) => {
    const statusConfig = {
      pending: {
        icon: <ClockCircleOutlined />,
        color: "orange",
        text: "Pending",
      },
      approved: {
        icon: <CheckCircleOutlined />,
        color: "green",
        text: "Approved",
      },
      partially_delivered: {
        icon: <TruckOutlined />,
        color: "blue",
        text: "Partial",
      },
      fully_delivered: {
        icon: <CheckCircleOutlined />,
        color: "success",
        text: "Delivered",
      },
      cancelled: { icon: <StopOutlined />, color: "red", text: "Cancelled" },
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    return (
      <Tag
        color={config?.color}
        icon={config?.icon}
        aria-label={`${config?.text} status`}
      >
        {config?.text}
      </Tag>
    );
  };

  // Toggle row expansion
  const handleExpand = (expanded: boolean, record: PurchaseOrder) => {
    if (expanded) {
      setExpandedRowKeys([...expandedRowKeys, record._id]);
    } else {
      setExpandedRowKeys(
        expandedRowKeys.filter((key: string) => key !== record._id)
      );
    }
  };

  // Handle delete purchase order
  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: "Confirm Delete",
      content: "Are you sure you want to delete this purchase order?",
      onOk: async () => {
        const { success } = await deletePurchaseOrder(id);
        if (success) {
          actionRef.current?.reload();
        }
      },
    });
  };

  // Handle status update
  const handleStatusUpdate = async (params: ParamsType) => {
    const { success } = await updateStatus(params);
    if (success) {
      actionRef.current?.reload();
    }
  };

  // Row selection
  const rowSelection = {
    selectedRowKeys: selectedRows.map((row: PurchaseOrder) => row._id),
    onChange: (_: React.Key[], selectedRows: PurchaseOrder[]) => {
      setSelectedRows(selectedRows);
    },
    preserveSelectedRowKeys: true,
  };

  // Selected rows actions
  const selectedRowActions = (
    <Space>
      <Button
        type="text"
        icon={<PrinterOutlined />}
        onClick={() => onBulkPrint()}
        disabled={selectedRows.length === 0}
      >
        Print Selected
      </Button>
      <Button
        type="text"
        icon={<FileExcelOutlined />}
        onClick={() => onExportToExcel(selectedRows)}
        disabled={selectedRows.length === 0}
      >
        Export to Excel
      </Button>
      <Button
        type="text"
        icon={<FilePdfOutlined />}
        onClick={() => onExportToPDF(selectedRows)}
        disabled={selectedRows.length === 0}
      >
        Export to PDF
      </Button>
      <Button
        type="text"
        danger
        icon={<DeleteOutlined />}
        onClick={() => {
          Modal.confirm({
            title: "Confirm Delete",
            content: `Are you sure you want to delete ${selectedRows.length} selected purchase orders?`,
            onOk: () => {
              selectedRows.forEach((row: PurchaseOrder) =>
                handleDelete(row._id)
              );
              setSelectedRows([]);
            },
          });
        }}
        disabled={selectedRows.length === 0}
      >
        Delete Selected
      </Button>
    </Space>
  );

  // Expanded row render
  const expandedRowRender = (record: PurchaseOrder) => (
    <div style={{ padding: "16px", background: "#fafafa" }}>
      <Title level={5} style={{ marginBottom: "16px" }}>
        PO Details - {record.po_number}
      </Title>
      <Descriptions bordered size="small" column={2}>
        <Descriptions.Item label="Supplier">
          {record.supplier_id?.name || "N/A"}
          {record.supplier_id?.contact && ` (${record.supplier_id.contact})`}
        </Descriptions.Item>
        <Descriptions.Item label="Created">
          {new Date(record.createdAt).toLocaleString()}
        </Descriptions.Item>
        <Descriptions.Item label="Created By">
          {record.created_by?.name || "System"}
        </Descriptions.Item>
        <Descriptions.Item label="Total Items">
          {record.po_items?.length || 0}
        </Descriptions.Item>
        <Descriptions.Item label="Notes" span={2}>
          {record.notes || "No notes available"}
        </Descriptions.Item>
      </Descriptions>

      <Divider orientation="left" style={{ margin: "16px 0" }}>
        Items
      </Divider>
      <Table
        dataSource={record.po_items || []}
        rowKey="_id"
        pagination={false}
        size="small"
        columns={[
          { title: "Item", dataIndex: ["inventory_id", "name"], key: "name" },
          { title: "Unit", dataIndex: ["unit_id", "name"], key: "unit" },
          {
            title: "Quantity",
            key: "quantity",
            render: (_: any, item: PurchaseOrderItem) => (
              <span>
                {item.quantity_received || 0} / {item.quantity_ordered}
              </span>
            ),
          },
          {
            title: "Price",
            key: "price",
            render: (_: any, item: PurchaseOrderItem) => (
              <span>Ksh. {item.unit_price?.toLocaleString()}</span>
            ),
          },
          {
            title: "Total",
            key: "total",
            render: (_: any, item: PurchaseOrderItem) => (
              <span style={{ fontWeight: "bold" }}>
                Ksh.{" "}
                {(item.quantity_ordered * item.unit_price)?.toLocaleString()}
              </span>
            ),
          },
        ]}
      />
    </div>
  );

  // Table columns
  const columns = [
    {
      title: "PO Code",
      dataIndex: "po_number",
      width: 100,
      fixed: "left",
      fieldProps: {
        placeholder: "Enter PO code",
      },
      render: (text: string) => (
        <Tag
          color="blue"
          style={{ fontWeight: "bold" }}
          aria-label="Purchase Order Code"
        >
          {text}
        </Tag>
      ),
    },
    {
      title: "Supplier",
      dataIndex: ["supplier_id", "name"],
      width: 150,
      search: false,
      ellipsis: true,
      render: (text: string, record: PurchaseOrder) => (
        <span>{text || "N/A"}</span>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      align: "center",
      fixed: "center",
      search: false,
      render: renderStatus,
      filters: [
        { text: "Pending", value: "pending" },
        { text: "Approved", value: "approved" },
        { text: "Partial", value: "partially_delivered" },
        { text: "Delivered", value: "fully_delivered" },
        { text: "Cancelled", value: "cancelled" },
      ],
      onFilter: (value: string, record: PurchaseOrder) =>
        record.status === value,
    },
    {
      title: "Amount",
      dataIndex: "total_amount",
      width: 120,
      search: false,
      sorter: (a: PurchaseOrder, b: PurchaseOrder) =>
        a.total_amount - b.total_amount,
      render: (amount: number) => (
        <span style={{ fontWeight: "bold" }} aria-label="Purchase Order Amount">
          Ksh. {amount?.toLocaleString() || "0"}
        </span>
      ),
    },
    {
      title: "Delivery",
      search: false,
      dataIndex: "delivery_percentage",
      width: 140,
      render: (_: any, record: PurchaseOrder) => (
        <Space
          direction="vertical"
          size={2}
          style={{ width: "100%" }}
          aria-label="Purchase Order Delivery"
        >
          <Progress
            percent={record.delivery_percentage || 0}
            size="small"
            status={record.delivery_percentage === 100 ? "success" : "active"}
            strokeColor={
              record.delivery_percentage === 100 ? "#52c41a" : "#1890ff"
            }
          />
          <div style={{ textAlign: "center", fontSize: 12 }}>
            {record.delivery_percentage || 0}% Complete
          </div>
        </Space>
      ),
    },
    {
      title: "Expected",
      dataIndex: "expected_delivery_date",
      align: "center",
      search: false,
      fixed: "center",
      render: (dateString: string) => {
        if (!dateString) return <Tag>Not set</Tag>;
        const date = new Date(dateString);
        const today = new Date();
        const isOverdue =
          date < today && date.toDateString() !== today.toDateString();
        return (
          <Tag
            color={isOverdue ? "error" : "processing"}
            aria-label="Purchase Order Expected Delivery Date"
          >
            {date.toLocaleDateString()}
          </Tag>
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      search: false,
      fixed: "right",
      render: (_: any, record: PurchaseOrder) => (
        <Dropdown
          disabled={record.status === "cancelled"}
          menu={{
            items: [
              {
                key: "print",
                icon: <PrinterOutlined />,
                label: "Print PO",
                onClick: () => onPrintPO(record),
              },
              {
                key: "edit",
                icon: (
                  <AddEditPurchaseOrderModal
                    actionRef={actionRef}
                    data={record}
                    edit
                    key={`edit-PO-${JSON.stringify(record)}`}
                  />
                ),
              },
              record.status === "pending" && {
                key: "approve",
                icon: <CheckCircleOutlined />,
                label: "Approve",
                onClick: () =>
                  handleStatusUpdate({ id: record._id, status: "approved" }),
              },
              record.status === "pending" && {
                key: "cancel",
                icon: <StopOutlined />,
                label: "Cancel",
                danger: true,
                onClick: () =>
                  handleStatusUpdate({ id: record._id, status: "cancelled" }),
              },
              {
                key: "delete",
                icon: <DeleteOutlined />,
                label: "Delete",
                danger: true,
                onClick: () => onDeletePO(record._id),
              },
            ].filter(Boolean) as any[],
          }}
          trigger={["hover"]}
        >
          <Button
            type="text"
            icon={<MoreOutlined />}
            aria-label="Purchase Order Actions"
          />
        </Dropdown>
      ),
    },
  ];

  return (
    <div className="purchase-order-table" aria-label="Purchase Order Table">
      <ProTable<PurchaseOrder>
        rowKey="_id"
        headerTitle="Purchase Orders"
        search={{
          labelWidth: "auto",
          span: { xs: 24, sm: 12, md: 8, lg: 6, xl: 6, xxl: 4 },
          searchText: "Search",
          resetText: "Reset",
          layout: "vertical",
        }}
        rowSelection={rowSelection}
        actionRef={actionRef}
        expandable={{
          expandedRowRender,
          expandedRowKeys,
          onExpand: handleExpand,
        }}
        columns={columns}
        request={async (params, sort, filter) => {
          const { data, total } = await fetchPurchaseOrders({
            ...params,
            sorter: sort,
            ...filter,
          });
          return {
            data,
            total,
            success: true,
          };
        }}
        scroll={{ x: 1200 }}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          pageSizeOptions: ["10", "20", "50", "100"],
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} of ${total} items`,
        }}
        tableAlertRender={({ selectedRowKeys }) => {
          if (selectedRowKeys.length > 0) {
            return (
              <Flex justify="space-between" align="center" gap={16}>
                <Typography.Text>
                  {selectedRowKeys.length} selected
                </Typography.Text>
                {selectedRowActions}
              </Flex>
            );
          }
          return null;
        }}
        toolBarRender={() => [
          <AddEditPurchaseOrderModal key="add-PO" actionRef={actionRef} />,
          <Button
            key="generate-summary"
            icon={<FileTextOutlined />}
            onClick={() => onGenerateSummary()}
          >
            Generate Summary
          </Button>,
        ]}
        options={{
          density: true,
          fullScreen: true,
          reload: () => actionRef.current?.reload(),
          setting: {
            draggable: true,
            checkedReset: true,
          },
        }}
        rowClassName={(record) => {
          if (record.status === "cancelled") return "row-cancelled";
          if (record.delivery_percentage === 100) return "row-delivered";
          return "";
        }}
      />
    </div>
  );
};

export default PurchaseOrderTable;
