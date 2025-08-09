import { useRef } from "react";
import { ActionType, ProTable } from "@ant-design/pro-components";
import { Button, message, Popconfirm, Space, Tag, Image, Tooltip, Dropdown } from "antd";
import { deleteInventory, fetchAllInventory } from "@services/inventory";
import AddEditProInventoryModal from "@components/MODALS/pro/AddEditProInventoryModal";
import {
  DeleteOutlined,
  ShoppingCartOutlined,
  ToolOutlined,
  SwapOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  StopOutlined,
  EyeOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  FilePdfOutlined
} from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import jsPDF from "jspdf";
import * as XLSX from 'xlsx';

const InventorySettings = () => {
  const paymentRef = useRef<ActionType>();

  const deleteInventoryMutation = useMutation(deleteInventory, {
    onSuccess: () => {
      paymentRef.current?.reload();
      message.success("Inventory deleted successfully");
    },
    onError: () => message.error("Failed to delete inventory"),
  });

  // Usage type render function
  const renderUsageType = (usageType: string) => {
    const usageTypeConfig = {
      selling: { icon: <ShoppingCartOutlined />, color: 'green', text: 'For Sale' },
      internal: { icon: <ToolOutlined />, color: 'orange', text: 'Internal' },
      both: { icon: <SwapOutlined />, color: 'blue', text: 'Both' }
    };

    const config = usageTypeConfig[usageType as keyof typeof usageTypeConfig];

    return (
      <Tag color={config?.color} icon={config?.icon}>
        {config?.text}
      </Tag>
    );
  };

  // Status render function
  const renderStatus = (status: string) => {
    const statusConfig = {
      active: { icon: <CheckCircleOutlined />, color: 'success', text: 'Active' },
      inactive: { icon: <StopOutlined />, color: 'default', text: 'Inactive' },
      discontinued: { icon: <WarningOutlined />, color: 'warning', text: 'Discontinued' }
    };

    const config = statusConfig[status as keyof typeof statusConfig];

    return (
      <Tag color={config?.color} icon={config?.icon}>
        {config?.text}
      </Tag>
    );
  };

  // Stock level render function
  const renderStockLevel = (record: any) => {
    const { quantity, min_viable_quantity } = record;

    if (!min_viable_quantity) {
      return (
        <span style={{ color: '#1890ff' }}>
          {quantity?.toLocaleString()}
        </span>
      );
    }

    const isLowStock = quantity <= min_viable_quantity;
    const isCritical = quantity <= (min_viable_quantity * 0.5);

    return (
      <Space>
        <span style={{
          color: isCritical ? '#ff4d4f' : isLowStock ? '#faad14' : '#52c41a',
          fontWeight: isLowStock ? 'bold' : 'normal'
        }}>
          {quantity?.toLocaleString()}
        </span>
        {isLowStock && (
          <Tooltip title={`Low stock! Minimum: ${min_viable_quantity}`}>
            <WarningOutlined style={{ color: isCritical ? '#ff4d4f' : '#faad14' }} />
          </Tooltip>
        )}
      </Space>
    );
  };

  // Price render function
  const renderPrice = (record: any) => {
    const { price, supplier_price, usage_type } = record;

    // Don't show price for internal-only items
    if (usage_type === 'internal') {
      return <span style={{ color: '#8c8c8c' }}>N/A</span>;
    }

    if (!price) {
      return <span style={{ color: '#ff4d4f' }}>No price set</span>;
    }

    const margin = supplier_price && price ?
      ((price - supplier_price) / price * 100).toFixed(1) : null;

    return (
      <Space direction="vertical" size={2}>
        <span style={{ fontWeight: 'bold' }}>
          Ksh. {price?.toLocaleString()}
        </span>
        {supplier_price && (
          <span style={{ fontSize: '12px', color: '#8c8c8c' }}>
            Cost: Ksh. {supplier_price?.toLocaleString()}
          </span>
        )}
        {margin && (
          <Tag
            size="small"
            color={parseFloat(margin) > 20 ? 'green' : parseFloat(margin) > 10 ? 'orange' : 'red'}
          >
            {margin}% margin
          </Tag>
        )}
      </Space>
    );
  };
  const exportToExcel = async () => {
    try {
      const data = await fetchAllInventory({});

      const exportData = data.map(item => ({
        Code: item.code,
        Name: item.name,
        Price: item.price,
        'Supplier Cost': item.supplier_price,
        Subcategory: item.category_id?.name || '',
        Quantity: item.quantity,
        Status: item.min_viable_quantity >= item.quantity ? 'Out of Stock' : 'In Stock',
        Unit: item.unit_id?.name || '',
        'Min Viable Quantity': item.min_viable_quantity
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Inventory");

      // Auto-size columns
      const colWidths = Object.keys(exportData[0] || {}).map(key => ({
        wch: Math.max(key.length, 15)
      }));
      ws['!cols'] = colWidths;

      XLSX.writeFile(wb, `inventory_${new Date().toISOString().split('T')[0]}.xlsx`);
      message.success("Excel file exported successfully");
    } catch (error) {

      message.error("Failed to export Excel file");
    }
  };

  // Export to PDF function
  const exportToPDF = async () => {
    try {
      const data = await fetchAllInventory({});

      const doc = new jsPDF();

      // Add title
      doc.setFontSize(16);
      doc.text('Inventory Report', 14, 15);

      // Add date
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 25);

      // Prepare table data
      const tableData = data.map(item => [
        item.code,
        item.name,
        `Ksh. ${item.price?.toLocaleString()}`,
        `Ksh. ${item.supplier_price?.toLocaleString()}`,
        item.category_id?.name || '',
        item.quantity,
        item.min_viable_quantity >= item.quantity ? 'Out of Stock' : 'In Stock',
        item.unit_id?.name || ''
      ]);

      // Add table
      doc.autoTable({
        head: [['Code', 'Name', 'Price', 'Supplier Cost', 'Category', 'Quantity', 'Status', 'Unit']],
        body: tableData,
        startY: 35,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] },
        alternateRowStyles: { fillColor: [245, 245, 245] }
      });

      doc.save(`inventory_${new Date().toISOString().split('T')[0]}.pdf`);
      message.success("PDF file exported successfully");
    } catch (error) {
      message.error("Failed to export PDF file");
    }
  };

  const exportMenuItems = [
    {
      key: 'excel',
      label: 'Export to Excel',
      icon: <FileExcelOutlined />,
      onClick: exportToExcel
    },
    {
      key: 'pdf',
      label: 'Export to PDF',
      icon: <FilePdfOutlined />,
      onClick: exportToPDF
    }
  ];
  const actionColumn = {
    title: "Actions",
    dataIndex: "actions",
    hideInSearch: true,
    width: 150,
    fixed: 'right' as const,
    render: (_, record: any) => [
      <Space size="small" key={record._id}>
        <AddEditProInventoryModal
          actionRef={paymentRef}
          data={record}
          edit={true}
        />
        <Popconfirm
          title="Delete Inventory Item"
          description="Are you sure you want to delete this inventory item? This action cannot be undone."
          onConfirm={() => deleteInventoryMutation.mutate(record._id)}
          okText="Yes, Delete"
          cancelText="Cancel"
          okButtonProps={{ danger: true }}
        >
          <Button
            type="primary"
            danger
            icon={<DeleteOutlined />}
            size="small"
            title="Delete item"
          >
            Delete
          </Button>
        </Popconfirm>
      </Space>
    ],
  };

  return (
    <>
      <ProTable
        rowKey="_id"
        cardBordered
        scroll={{ x: 1200 }}
        pagination={{
          pageSize: 10,
          showQuickJumper: true,
          showSizeChanger: true,
          showTotal: (total, range) => (
            <div>{`Showing ${range[0]}-${range[1]} of ${total} total items`}</div>
          ),
        }}
        columns={[
          {
            title: "Image",
            dataIndex: "thumbnail",
            hideInSearch: true,
            width: 80,
            render: (_, record) => {
              if (record?.thumbnail) {
                return (
                  <Image
                    width={50}
                    height={50}
                    src={record.thumbnail}
                    style={{ objectFit: 'cover', borderRadius: 4 }}
                    placeholder={
                      <div style={{
                        width: 50,
                        height: 50,
                        backgroundColor: '#f5f5f5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 4
                      }}>
                        <EyeOutlined style={{ color: '#8c8c8c' }} />
                      </div>
                    }
                  />
                );
              }
              return (
                <div style={{
                  width: 50,
                  height: 50,
                  backgroundColor: '#f5f5f5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 4
                }}>
                  <EyeOutlined style={{ color: '#8c8c8c' }} />
                </div>
              );
            },
          },
          {
            title: "Code",
            dataIndex: "code",
            hideInSearch: false,
            width: 120,
            fieldProps: {
              placeholder: "Enter Code",
            },
            sorter: true,
            render: (text) => (
              <code style={{
                background: '#f6f8fa',
                padding: '2px 6px',
                borderRadius: 3,
                fontSize: '12px'
              }}>
                {text}
              </code>
            ),
          },
          {
            title: "Product Name",
            dataIndex: "name",
            hideInSearch: false,
            fieldProps: {
              placeholder: "Enter Product Name",
            },
            sorter: true,
            ellipsis: true,
            render: (text, record) => (
              <Space direction="vertical" size={2}>
                <span style={{ fontWeight: 'bold' }}>{text}</span>
                {record.desc && (
                  <span style={{
                    fontSize: '12px',
                    color: '#8c8c8c',
                    display: 'block',
                    maxWidth: 200,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {record.desc}
                  </span>
                )}
              </Space>
            ),
          },
          {
            title: "Category",
            dataIndex: "subcategory_id",
            hideInSearch: true,
            width: 120,
            render: (_, record) => {
              return record?.subcategory_id?.name ? (
                <Tag color="blue">{record.subcategory_id.name}</Tag>
              ) : (
                <span style={{ color: '#8c8c8c' }}>No category</span>
              );
            },
          },
          {
            title: "Usage Type",
            dataIndex: "usage_type",
            hideInSearch: true,
            width: 110,
            render: (_, record) => renderUsageType(record.usage_type),
            filters: [
              { text: 'For Sale', value: 'selling' },
              { text: 'Internal', value: 'internal' },
              { text: 'Both', value: 'both' },
            ],
          },
          {
            title: "Stock Level",
            dataIndex: "quantity",
            hideInSearch: true,
            width: 120,
            sorter: true,
            render: (_, record) => (
              <Space direction="vertical" size={2}>
                {renderStockLevel(record)}
                <span style={{ fontSize: '12px', color: '#8c8c8c' }}>
                  {record?.unit_id?.name || 'units'}
                </span>
                {record.min_viable_quantity && (
                  <span style={{ fontSize: '11px', color: '#8c8c8c' }}>
                    Min: {record.min_viable_quantity}
                  </span>
                )}
              </Space>
            ),
          },
          {
            title: "Pricing",
            dataIndex: "price",
            hideInSearch: true,
            width: 150,
            render: (_, record) => renderPrice(record),
          },
          // {
          //   title: "Supplier",
          //   dataIndex: "supplier_id",
          //   hideInSearch: true,
          //   width: 120,
          //   render: (_, record) => {
          //     if (record?.supplier_id?.name) {
          //       return (
          //         <Tooltip title={record.supplier_id.name}>
          //           <Tag color="purple">
          //             {record.supplier_id.name.length > 10
          //               ? `${record.supplier_id.name.substring(0, 10)}...`
          //               : record.supplier_id.name}
          //           </Tag>
          //         </Tooltip>
          //       );
          //     }
          //     return <span style={{ color: '#8c8c8c' }}>No supplier</span>;
          //   },
          // },
          // {
          //   title: "Location",
          //   dataIndex: "location",
          //   hideInSearch: true,
          //   width: 120,
          //   render: (text) => text ? (
          //     <Tag color="geekblue">{text}</Tag>
          //   ) : (
          //     <span style={{ color: '#8c8c8c' }}>Not set</span>
          //   ),
          // },
          {
            title: "Status",
            dataIndex: "status",
            hideInSearch: true,
            width: 100,
            render: (_, record) => renderStatus(record.status),
            filters: [
              { text: 'Active', value: 'active' },
              { text: 'Inactive', value: 'inactive' },
              { text: 'Discontinued', value: 'discontinued' },
            ],
          },
          actionColumn,
        ]}
        request={async (params, sort, filter) => {
          try {
            // Convert ProTable params to your API format
            const queryParams = {
              ...params,
              current: params.current || 1,
              pageSize: params.pageSize || 10,
              // Add sorting
              ...(sort && Object.keys(sort).length > 0 && {
                sortField: Object.keys(sort)[0],
                sortOrder: Object.values(sort)[0] === 'ascend' ? 'asc' : 'desc'
              }),
              // Add filtering
              ...(filter && Object.keys(filter).length > 0 && {
                ...filter
              })
            };

            const data = await fetchAllInventory(queryParams);
            console.log('Fetched inventory data:', data);
            return {
              data: data,
              success: true,
              total: data.length,
            };
          } catch (error) {
            console.error('Error fetching inventory:', error);
            message.error('Failed to fetch inventory data');
            return {
              data: [],
              success: false,
              total: 0,
            };
          }
        }}
        tableAlertRender={({ selectedRowKeys, selectedRows }) => {
          const totalValue = selectedRows.reduce((sum, row) => {
            return sum + ((row.price || 0) * (row.quantity || 0));
          }, 0);

          return (
            <Space>
              <span>
                Selected {selectedRowKeys.length} items
              </span>
              {totalValue > 0 && (
                <span>
                  Total value: <strong>Ksh. {totalValue.toLocaleString()}</strong>
                </span>
              )}
            </Space>
          );
        }}
        actionRef={paymentRef}
        rowSelection={{
          alwaysShowAlert: true,
          selections: [
            {
              key: 'all',
              text: 'Select All',
              onSelect: () => { },
            },
            {
              key: 'none',
              text: 'Clear Selection',
              onSelect: () => { },
            },
            {
              key: 'invert',
              text: 'Invert Selection',
              onSelect: () => { },
            },
          ],
        }}
        search={{
          searchText: "Search",
          resetText: "Reset",
          labelWidth: "auto",
          collapsed: false,
          collapseRender: (collapsed) => collapsed ? 'Expand' : 'Collapse',
        }}
        dateFormatter="string"
        headerTitle="Product Inventory Management"
        toolBarRender={() => [
          <AddEditProInventoryModal actionRef={paymentRef} key="add" />,
          <Dropdown
            key="export"
            menu={{ items: exportMenuItems }}
            placement="bottomRight"
          >
            <Button type="primary" icon={<DownloadOutlined />}>
              Export Data
            </Button>
          </Dropdown>
        ]}
        options={{
          setting: {
            listsHeight: 400,
          },
          reload: true,
          density: true,
          fullScreen: true,
        }}
      />
    </>
  );
};

export default InventorySettings;