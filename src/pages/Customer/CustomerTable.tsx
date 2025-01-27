import { useRef } from "react";
import {
    ActionType,
    ProFormInstance,
    ProTable,
} from "@ant-design/pro-components";
import ExpandedRowContent from "./ExpandableCustomer";
import { fetchAllCustomers } from "@services/customers";


const CustomersTable = () => {
    const actionRef = useRef<ActionType>();
    const ref = useRef<ProFormInstance>();

    const expandedRowRender = (record: any) => {
        return <ExpandedRowContent record={record} />;
    };

    return (
        <>
            <ProTable
                rowKey="_id"
                cardBordered
                pagination={{
                    pageSize: 5,
                    showQuickJumper: true,
                    showSizeChanger: true,
                    showTotal: (total, range) => (
                        <div>{`Showing ${range[0]}-${range[1]} of ${total} total clients`}</div>
                    ),
                }}
                columns={[

                    {
                        title: "Customer Name.",
                        dataIndex: "customer_name",
                        hideInSearch: false,
                        copyable: false,
                        fieldProps: {
                            placeholder: "Enter Customer Name",
                        },
                    },
                    {
                        title: "Customer Code.",
                        dataIndex: "code",
                        hideInSearch: false,
                        copyable: true,
                        fieldProps: {
                            placeholder: "Enter Customer Code",
                        },
                    },

                    {
                        title: "Customer Email.",
                        dataIndex: "email",
                        hideInSearch: false,
                        copyable: true,
                        fieldProps: {
                            placeholder: "Enter Customer Email",
                        },
                    },

                    {
                        title: "Customer Phone.",
                        dataIndex: "phone",
                        hideInSearch: false,
                        copyable: true,
                        fieldProps: {
                            placeholder: "Enter Customer Phone",
                        },
                    },



                ]}
                request={async (params) => {
                    const data = await fetchAllCustomers(params);
                    return {
                        data: data,
                        success: true,
                        total: data.length,
                    };
                }}
                tableAlertRender={({ selectedRowKeys }) => {
                    return <p>You have selected {selectedRowKeys.length}</p>;
                }}
                formRef={ref}
                actionRef={actionRef}
                rowSelection={{
                    alwaysShowAlert: false,
                    selections: false,
                }}
                scroll={{ x: "inherit" }}
                search={{
                    searchText: "Search Customers",
                    resetText: "Reset",
                    labelWidth: "auto",
                }}
                options={{
                    fullScreen: true,
                }}
                headerTitle="List of All Customers"
                expandable={{
                    expandedRowRender,
                    defaultExpandAllRows: false,
                    expandIconColumnIndex: 1,
                    columnTitle: " ",
                }}
                dateFormatter="string"
            />
        </>
    );
};

export default CustomersTable;
