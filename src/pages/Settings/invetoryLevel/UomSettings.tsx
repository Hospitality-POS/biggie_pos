import { ActionType, ProTable } from "@ant-design/pro-components";
import { deleteUom, fetchAllUom } from "@services/uom";
import { Button, Popconfirm, Space, Tooltip, message } from "antd";
import {  DeleteOutlined } from "@ant-design/icons";
import  { useRef, useState } from "react";
import UomModal from "@components/MODALS/pro/UomModal";
import { useMutation } from "@tanstack/react-query";

function UomSettings() {
  const [loading, setLoading] = useState(false);
  const actionRef = useRef<ActionType>();



  const deleteUomMutation = useMutation(deleteUom, {
    onSuccess: () => {
      // Refetch uom data after deletion
     actionRef?.current?.reload();
    },
    onError: () => message.error("Failed to delete uom"),
  });
  // Define columns with better styling and more features
  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      fieldProps: {
        autoComplete: "on",
        allowClear: true,
        placeholder: "Enter Name of UoM",
      },

      sorter: true,
    },
    {
      title: "Date Created",
      dataIndex: "createdAt",
      key: "createdAt",
      search: false,
      sorter: true,
      render: (value) => new Date(value).toLocaleDateString(),
    },
    {
        title: "Date Updated",
        dataIndex: "updatedAt",
        key: "updatedAt",
        search: false,
        sorter: true,
        render: (value) => new Date(value).toLocaleDateString(),
    },
    {
      title: "Actions",
      key: "actions",
      search: false,
      render: (_, record) => (
        <Space size="middle">
          <Tooltip title="Edit">
           <UomModal actionRef={actionRef} edit={true} data={record} />
          </Tooltip>
         
            <Popconfirm
              title="Are you sure you want to delete this UoM?"
              onConfirm={() => deleteUomMutation.mutate(record._id)}
              okText="Yes"
              cancelText="No"
            >
              <Button type="primary" danger icon={<DeleteOutlined />} size="small" >
                Delete
              </Button>
            </Popconfirm>
         
        </Space>
      ),
    },
  ];

  // Handle deletion confirmation
  const handleDelete = async (record) => {
    try {
      setLoading(true);
      console.log("Deleting:", record);
      // Assume delete API call here
      message.success(`UoM ${record.name} deleted successfully!`);
    } catch (error) {
      message.error("Failed to delete UoM. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Data request with error handling
  const requestData = async (params, sorter, filter) => {
    try {
      const data = await fetchAllUom(params);
      return {
        data,
        success: true,
        total: data.length,
      };
    } catch (error) {
      message.error("Failed to load UoM data.");
      return { data: [], success: false };
    }
  };

  return (
    <ProTable
      columns={columns}
      actionRef={actionRef}
      rowKey="id"
      loading={loading}
      request={requestData}
      pagination={{ pageSize: 10 }}
      options={{
        density: true,
        fullScreen: true,
        reload: true,
        setting: true,
      }}
      headerTitle="Unit of Measure Settings"
      tableAlertRender={({ selectedRowKeys }) => {
        return <p>You have selected {selectedRowKeys.length}</p>;
      }}
      rowSelection={{
        alwaysShowAlert: false,
        selections: true,
      }}                
      search={{
        searchText: "Search UoM",
        resetText: "Reset",
        labelWidth: "auto",
      }}
      toolBarRender={() => [
       <UomModal actionRef={actionRef} />,
      ]}
    />
  );
}

export default UomSettings;