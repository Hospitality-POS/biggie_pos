import { useRef } from "react";
import {
    ActionType,
    ParamsType,
    ProTable,
} from "@ant-design/pro-components";
import { Tooltip } from "antd/lib";
import { Button, message, Popconfirm, Space } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { deletePaymentDetail, fetchAllPaymentDetails } from "@services/paymentMethod";
import AddProPaymentDetailModal from "@components/MODALS/pro/AddProPaymentDetailModal";
import { useMutation } from "@tanstack/react-query";

const PaymentDetailsSettings = () => {
    const paymentRef = useRef<ActionType>();

    const DeletePaymentDetailMutation = useMutation(deletePaymentDetail, {
        onSuccess: () => {
            paymentRef.current?.reload();
            message.success("Payment method deleted successfully");
        },
        onError: () => message.error("Failed to delete payment method"),
    });

    const actionColumn = {
        title: "Actions",
        dataIndex: "actions",
        hideInSearch: true,
        render: (_, record: ParamsType) => [
            <Space>
                <Tooltip key="edit" title="Edit">
                    <AddProPaymentDetailModal
                        edit={true}
                        actionRef={paymentRef}
                        data={record}
                    />
                </Tooltip>
                <Popconfirm
                    title="Are you sure you want to delete this payment detail?"
                    onConfirm={() => DeletePaymentDetailMutation.mutate(record._id)}
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
            </Space>,
        ],
    };

    return (
        <>
            <ProTable
                rowKey="_id"
                cardBordered
                pagination={{
                    pageSize: 5,
                    showQuickJumper: false,
                    showTotal: (total, range) => (
                        <div>{`Showing ${range[0]}-${range[1]} of ${total} total items`}</div>
                    ),
                }}
                columns={[
                    {
                        title: "Method",
                        dataIndex: "name",
                        hideInSearch: false,
                        fieldProps: {
                            placeholder: "Enter payment method",
                        },
                    },

                    actionColumn,
                ]}
                request={async (param) => {
                    const data = await fetchAllPaymentDetails(param);

                    return {
                        data: data,
                        success: true,
                        total: data.length,
                    };
                }}
                tableAlertRender={({ selectedRowKeys }) => {
                    return <p>You have selected {selectedRowKeys.length}</p>;
                }}
                actionRef={paymentRef}
                rowSelection={{
                    alwaysShowAlert: false,
                    selections: false,
                }}
                search={{
                    searchText: "Search item",
                    resetText: "Reset",
                    labelWidth: "auto",
                }}
                dateFormatter="string"
                headerTitle="List of Payment Details"
                toolBarRender={() => [
                    <AddProPaymentDetailModal
                        actionRef={paymentRef}
                    />,
                ]}
            />
        </>
    );
};

export default PaymentDetailsSettings;
