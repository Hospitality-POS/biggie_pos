import { ActionType, ProTable } from "@ant-design/pro-components";
import { Button, Popconfirm, Space, Tooltip, message } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { deletePermission, fetchAllPermissions } from "@services/permission";
import PermissionModal from "@components/MODALS/pro/PermissionModal";

function PermissionSettings() {
    const [loading, setLoading] = useState(false);
    const actionRef = useRef<ActionType>();

    const deletePermissionMutation = useMutation(deletePermission, {
        onSuccess: () => {
            // Refetch role data after deletion
            actionRef?.current?.reload();
        },
        onError: () => message.error("Failed to delete permission"),
    });

    // Define columns with styling and feature configuration for roles
    const columns = [
        {
            title: "Name",
            dataIndex: "name",
            key: "name",
            fieldProps: {
                autoComplete: "on",
                allowClear: true,
                placeholder: "Enter permission Name Type",
            },
            sorter: true,
        },
        {
            title: "Group",
            dataIndex: "group_name",
            key: "group_name",
            fieldProps: {
                autoComplete: "on",
                allowClear: true,
                placeholder: "Enter  Group Name",
            },
            sorter: true,
        },
        {
            title: "Route Url",
            dataIndex: "route_url",
            key: "name",
            fieldProps: {
                autoComplete: "on",
                allowClear: true,
                placeholder: "Enter Route Url",
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
                        <PermissionModal actionRef={actionRef} edit={true} data={record} />
                    </Tooltip>

                    <Popconfirm
                        title="Are you sure you want to delete this permission?"
                        onConfirm={() => deletePermissionMutation.mutate(record._id)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Button
                            type="primary"
                            danger
                            icon={<DeleteOutlined />}
                            size="small"
                        >
                            Delete
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    // Data request function with error handling
    const requestData = async (params) => {
        try {
            const data = await fetchAllPermissions(params);
            return {
                data,
                success: true,
                total: data.length,
            };
        } catch (error) {
            message.error("Failed to load permission data.");
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
            headerTitle=" Permission Settings"
            tableAlertRender={({ selectedRowKeys }) => (
                <p>You have selected {selectedRowKeys.length} permissions</p>
            )}
            rowSelection={{
                alwaysShowAlert: false,
                selections: true,
            }}
            search={{
                searchText: "Search Permission",
                resetText: "Reset",
                labelWidth: "auto",
            }}
            toolBarRender={() => [<PermissionModal actionRef={actionRef} />]}
            dateFormatter="string"
        />
    );
}

export default PermissionSettings;