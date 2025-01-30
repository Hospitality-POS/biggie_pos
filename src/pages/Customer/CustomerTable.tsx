import React, { useRef } from "react";
import {
    ProTable,
    ActionType,
    ProFormInstance,
} from "@ant-design/pro-components";
import { fetchAllCustomers } from "@services/customers";
import ExpandedRowContent from "./ExpandableCustomer";
import parsePhoneNumberFromString, {
    formatIncompletePhoneNumber,
} from "libphonenumber-js";
import { AlertOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { Tag } from "antd";

const CustomersTable: React.FC = () => {
    const actionRef = useRef<ActionType>();
    const formRef = useRef<ProFormInstance>();

    const getLastVisit = (visits: { createdAt: string }[]): string => {
        if (!visits?.length) return "No visits";
        const latestVisit = visits.reduce((prev, curr) =>
            new Date(curr.createdAt) > new Date(prev.createdAt) ? curr : prev
        );
        return latestVisit.createdAt;
    };

    const columns = [
        {
            title: "Code",
            dataIndex: "code",
            copyable: true,
            fieldProps: { placeholder: "Enter Customer Code" },
        },
        {
            title: "Name",
            dataIndex: "customer_name",
            fieldProps: { placeholder: "Enter Customer Name" },
        },
        {
            title: "Email",
            dataIndex: "email",
            copyable: true,
            fieldProps: { placeholder: "Enter Customer Email" },
        },
        {
            title: "Phone",
            dataIndex: "phone",
            copyable: true,
            search: false,
            render: (phone) => <span>{phone}</span>,
        },
        {
            title: "Status",
            dataIndex: "lastVisit",
            hideInSearch: true,
            valueType: "text",
            render: (_, record) => {
                const lastVisitDate = record?.visits?.[0]?.createdAt ? new Date(record.visits[0].createdAt) : null;
                const currentDate = new Date();
                const hasExceeded14Days = lastVisitDate
                    ? (currentDate - lastVisitDate) / (1000 * 60 * 60 * 24) > 14
                    : false;

                return (
                    <>
                        {lastVisitDate ? (
                            hasExceeded14Days ? (
                                <Tag color="red" icon={<AlertOutlined />}>
                                    Overdue
                                </Tag>
                            ) : (
                                <Tag color="green" icon={<CheckCircleOutlined />}>
                                    Recent
                                </Tag>
                            )
                        ) : (
                            <Tag color="gray" icon={<AlertOutlined />}>
                                No Visits
                            </Tag>
                        )}
                    </>
                );
            },
        },

        {
            title: "Last Visit",
            key: "lastVisit",
            search: false,
            render: (_, record) => {
                const lastVisit = getLastVisit(record.visits || []);
                return lastVisit !== "No visits"
                    ? new Date(lastVisit).toLocaleString()
                    : "No visits";
            },
        },
    ];

    return (
        <ProTable
            rowKey="_id"
            columns={columns}
            request={async (params) => {
                const data = await fetchAllCustomers(params);
                return { data, success: true, total: data.length };
            }}
            actionRef={actionRef}
            formRef={formRef}
            cardBordered
            pagination={{
                pageSize: 5,
                showQuickJumper: true,
                showSizeChanger: true,
                showTotal: (total, range) =>
                    `Showing ${range[0]}-${range[1]} of ${total} total clients`,
            }}
            search={{
                searchText: "Search Customers",
                resetText: "Reset",
                labelWidth: "auto",
            }}
            headerTitle="List of All Customers"
            tableAlertRender={({ selectedRowKeys }) => (
                <p>You have selected {selectedRowKeys.length} items</p>
            )}
            expandable={{
                expandedRowRender: (record) => <ExpandedRowContent record={record} />,
            }}
            options={{ fullScreen: true }}
            scroll={{ x: "100%" }}
            rowSelection={{ alwaysShowAlert: false }}
        />
    );
};

export default CustomersTable;
