import React, { useRef, useState, useEffect } from "react";
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
import {
    AlertOutlined,
    CheckCircleOutlined,
    GiftOutlined,
    MailOutlined,
    EyeOutlined,
    EditOutlined,
    CopyOutlined,
    HistoryOutlined,
    FilePdfOutlined,
    UserAddOutlined,
    UserOutlined,
    PhoneOutlined,
    CalendarOutlined,
    BarsOutlined
} from "@ant-design/icons";
import {
    Tag,
    Button,
    Modal,
    Form,
    Input,
    InputNumber,
    Space,
    Card,
    Typography,
    Divider,
    Tabs,
    Table,
    Tooltip,
    Popconfirm,
    App,
    Radio,
    DatePicker,
    Row,
    Col
} from "antd";
import { useDispatch } from "react-redux";
import { createGiftCard, sendGiftCard, fetchAllGiftCards } from "@services/customers";
import moment from "moment";

const { Title, Paragraph, Text } = Typography;
const { TabPane } = Tabs;
const { TextArea } = Input;

const issueGiftCard = (customerId, customerName, email, phone, amount, message) => {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 12; i++) {
        if (i > 0 && i % 4 === 0) code += '-';
        code += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    const safeMessage = message || "";
    const card = {
        card_no: `GC-${Math.floor(Math.random() * 10000)}`,
        code: code,
        amount,
        message: safeMessage,
        expiry_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        status: true,
    };

    // Add customer details based on which type it is
    if (customerId) {
        card.customer_id = customerId;
    } else {
        card.customer_name = customerName;
        card.email = email;
        card.phone = phone;
    }

    return card;
};

const AdminCustomersTable = ({ nonCustomerEnabled = false }) => {
    const dispatch = useDispatch();
    const actionRef = useRef();
    const formRef = useRef();
    const giftCardRef = useRef(null);
    const [isGiftCardModalVisible, setIsGiftCardModalVisible] = useState(false);
    const [isNewRecipientModalVisible, setIsNewRecipientModalVisible] = useState(false);
    const [isPreviewModalVisible, setIsPreviewModalVisible] = useState(false);
    const [isSendEmailModalVisible, setIsSendEmailModalVisible] = useState(false);
    const [isViewGiftCardsModalVisible, setIsViewGiftCardsModalVisible] = useState(false);
    const [isAllGiftCardsModalVisible, setIsAllGiftCardsModalVisible] = useState(false);
    const [currentCustomer, setCurrentCustomer] = useState(null);
    const [giftCardForm] = Form.useForm();
    const [newRecipientForm] = Form.useForm();
    const [emailForm] = Form.useForm();
    const [currentGiftCard, setCurrentGiftCard] = useState(null);
    const [customerGiftCards, setCustomerGiftCards] = useState([]);
    const [allGiftCards, setAllGiftCards] = useState([]);
    const [loadingGiftCards, setLoadingGiftCards] = useState(false);
    const [loadingAllGiftCards, setLoadingAllGiftCards] = useState(false);
    const [clientName, setClientName] = useState("Relia Pos");
    const [savingPDF, setSavingPDF] = useState(false);
    const [primaryColor, setPrimaryColor] = useState("#9a6e44");
    const [activeTabKey, setActiveTabKey] = useState("customers");

    const { message: messageApi } = App.useApp();

    useEffect(() => {
        const storedTenant = localStorage.getItem("tenant");
        const tenant = storedTenant ? JSON.parse(storedTenant) : null;
        if (tenant && tenant.primary_color) {
            setPrimaryColor(tenant.primary_color);
        }
    }, []);

    useEffect(() => {
        const storedTenant = localStorage.getItem("tenant");
        const tenant = storedTenant ? JSON.parse(storedTenant) : null;
        const name = tenant ? tenant.name : "Relia Pos";
        setClientName(name);
    }, []);

    const getLastVisit = (visits) => {
        if (!visits?.length) return "No visits";
        const latestVisit = visits.reduce((prev, curr) =>
            new Date(curr.createdAt) > new Date(prev.createdAt) ? curr : prev
        );
        return latestVisit.createdAt;
    };

    const showGiftCardModal = (record) => {
        setCurrentCustomer(record);
        const defaultMessage = `Welcome to ${clientName}! We're delighted to have you as our valued customer.`;
        giftCardForm.resetFields();
        giftCardForm.setFieldsValue({
            message: defaultMessage
        });
        setIsGiftCardModalVisible(true);
    };

    const showNewRecipientModal = () => {
        newRecipientForm.resetFields();
        const defaultMessage = `Welcome to ${clientName}! We're delighted to have you as our valued customer.`;
        newRecipientForm.setFieldsValue({
            message: defaultMessage,
            expiry_date: moment().add(3, 'months')
        });
        setIsNewRecipientModalVisible(true);
    };

    const showGiftCardsHistory = async (record) => {
        setCurrentCustomer(record);
        setIsViewGiftCardsModalVisible(true);
        setLoadingGiftCards(true);

        try {
            const giftCards = await fetchAllGiftCards(record);
            setCustomerGiftCards(giftCards);
        } catch (error) {
            console.error("Failed to fetch gift cards:", error);
            messageApi.error("Failed to load gift cards");
        } finally {
            setLoadingGiftCards(false);
        }
    };

    const showAllGiftCards = async () => {
        setIsAllGiftCardsModalVisible(true);
        setLoadingAllGiftCards(true);

        try {
            // Fix: Call fetchAllGiftCards without parameters to get all gift cards
            const response = await fetchAllGiftCards();
            setAllGiftCards(response);
        } catch (error) {
            console.error("Failed to fetch all gift cards:", error);
            messageApi.error("Failed to load gift cards");
        } finally {
            setLoadingAllGiftCards(false);
        }
    };

    const handleGiftCardSubmit = async () => {
        try {
            const values = await giftCardForm.validateFields();

            const defaultMessage = `Welcome to ${clientName}! We're delighted to have you as our valued customer.`;
            const cardMessage = (values.message === undefined || values.message === null)
                ? defaultMessage
                : values.message;

            const giftCard = issueGiftCard(
                currentCustomer._id,
                currentCustomer.customer_name,
                currentCustomer.email,
                currentCustomer.phone,
                values.amount,
                cardMessage
            );

            setCurrentGiftCard(giftCard);
            setIsGiftCardModalVisible(false);
            setIsPreviewModalVisible(true);
        } catch (error) {
            console.error("Gift card form validation failed:", error);
        }
    };

    const handleNewRecipientSubmit = async () => {
        try {
            const values = await newRecipientForm.validateFields();

            const defaultMessage = `Welcome to ${clientName}! We're delighted to have you as our valued customer.`;
            const cardMessage = (values.message === undefined || values.message === null)
                ? defaultMessage
                : values.message;

            const giftCard = issueGiftCard(
                null, // No customer_id for non-customers
                values.customer_name,
                values.email,
                values.phone,
                values.amount,
                cardMessage
            );

            // Add expiry date from the form
            giftCard.expiry_date = values.expiry_date.toISOString();

            setCurrentGiftCard(giftCard);
            setIsNewRecipientModalVisible(false);
            setIsPreviewModalVisible(true);
        } catch (error) {
            console.error("New recipient form validation failed:", error);
        }
    };

    const handleCreateGiftCard = async () => {
        try {
            // Make a copy of the current gift card to send
            const giftCardToCreate = { ...currentGiftCard };

            const response = await dispatch(createGiftCard(giftCardToCreate));

            if (response && response.payload) {
                messageApi.success("Gift certificate created successfully");

                // If the gift card was created for an existing customer, add it to the list
                if (giftCardToCreate.customer_id && currentCustomer) {
                    setCustomerGiftCards(prev => [...prev, { ...giftCardToCreate, _id: response.payload._id }]);
                }

                // Add the new gift card to allGiftCards if that list is loaded
                if (allGiftCards.length > 0) {
                    setAllGiftCards(prev => [...prev, { ...giftCardToCreate, _id: response.payload._id }]);
                }

                setIsPreviewModalVisible(false);
            } else {
                messageApi.error("Failed to create gift card");
            }
        } catch (error) {
            console.error("Error creating gift card:", error);
            messageApi.error("Failed to create gift card: " + error.message);
        }
    };

    const handleSendEmail = async () => {
        try {
            const values = await emailForm.validateFields();

            const storedTenant = localStorage.getItem("tenant");
            const tenant = storedTenant ? JSON.parse(storedTenant) : null;

            const customerName = currentGiftCard.customer_id
                ? currentCustomer?.customer_name
                : currentGiftCard.customer_name;

            const payload = {
                email: values.email,
                giftCard: { ...currentGiftCard },
                customerName: customerName,
                tenant: tenant
            };

            try {
                const response = await dispatch(sendGiftCard(payload));

                if (response && response.payload && response.payload.success) {
                    messageApi.success("Gift card sent successfully!");

                    setIsSendEmailModalVisible(false);

                    // Don't close the preview modal automatically
                    // setIsPreviewModalVisible(false);

                    // Reset form fields
                    emailForm.resetFields();
                } else {
                    messageApi.error("Failed to send gift card email");
                }
            } catch (error) {
                console.error("Error sending gift card:", error);
                messageApi.error("Failed to send gift card: " + error.message);
            }
        } catch (error) {
            console.error("Email form validation failed:", error);
            messageApi.error("Please fill in all required fields");
        }
    };

    const copyGiftCardCode = (code) => {
        navigator.clipboard.writeText(code)
            .then(() => {
                messageApi.success("Gift card code copied to clipboard");
            })
            .catch(() => {
                messageApi.error("Failed to copy code");
            });
    };

    const saveGiftCardAsPDF = () => {
        if (!giftCardRef.current) return;

        setSavingPDF(true);
        try {
            const originalContent = document.body.innerHTML;
            const originalBodyStyle = document.body.style.cssText;

            const giftCardHTML = giftCardRef.current.outerHTML;

            document.body.innerHTML = `
                <style>
                    @media print {
                        body { margin: 0; padding: 40px; }
                        @page { size: A4; margin: 0; }
                    }
                </style>
                <div style="display: flex; justify-content: center; padding: 20px;">
                    ${giftCardHTML}
                </div>
            `;

            window.print();

            setTimeout(() => {
                document.body.innerHTML = originalContent;
                document.body.style.cssText = originalBodyStyle;
                setSavingPDF(false);
                messageApi.success('Print dialog opened. Save as PDF in your browser print options.');
            }, 500);
        } catch (error) {
            console.error('Error printing gift card:', error);
            messageApi.error('Failed to print gift card');
            setSavingPDF(false);
        }
    };

    const giftCardColumns = [
        // {
        //     title: "Code",
        //     dataIndex: "code",
        //     key: "code",
        //     render: (text) => (
        //         <Space>
        //             <Text copyable={false}>{text}</Text>
        //             <Tooltip title="Copy Code">
        //                 <Button
        //                     type="text"
        //                     icon={<CopyOutlined />}
        //                     onClick={() => copyGiftCardCode(text)}
        //                 />
        //             </Tooltip>
        //         </Space>
        //     ),
        // },
        {
            title: "Amount",
            dataIndex: "amount",
            key: "amount",
            render: (amount) => `KSh ${amount}`,
        },
        {
            title: "Recipient",
            dataIndex: "customer_name",
            key: "recipient",
            render: (name, record) => record.customer_name || (record.customer_id ? record.customer_id.customer_name : "Unknown"),
        },
        {
            title: "Email",
            dataIndex: "email",
            key: "email",
        },
        {
            title: "Issue Date",
            dataIndex: "createdAt",
            key: "createdAt",
            render: (date) => date ? new Date(date).toLocaleDateString() : "N/A",
        },
        {
            title: "Expiry Date",
            dataIndex: "expiry_date",
            key: "expiry_date",
            render: (date) => new Date(date).toLocaleDateString(),
        },
        {
            title: "Status",
            dataIndex: "status",
            key: "status",
            render: (status) => {
                let color = 'red';
                let displayText = 'Inactive';

                if (status === true) {
                    color = 'green';
                    displayText = 'Active';
                } else if (status === false) {
                    color = 'red';
                    displayText = 'Inactive';
                }

                return (
                    <Tag color={color}>
                        {displayText}
                    </Tag>
                );
            },
        },
        {
            title: "Actions",
            key: "actions",
            render: (_, record) => (
                <Space>
                    <Button
                        icon={<EyeOutlined />}
                        onClick={() => {
                            setCurrentGiftCard(record);
                            // If viewing a customer's gift card, set the current customer
                            if (record.customer_id && currentCustomer?._id === record.customer_id) {
                                // Current customer already set
                            } else if (record.customer_id) {
                                // This is a gift card for a customer, but we're viewing all gift cards
                                setCurrentCustomer({ _id: record.customer_id });
                            } else {
                                // This is a gift card for a non-customer
                                setCurrentCustomer(null);
                            }
                            setIsPreviewModalVisible(true);
                        }}
                    >
                        Preview
                    </Button>
                    <Button
                        icon={<MailOutlined />}
                        onClick={() => {
                            setCurrentGiftCard(record);
                            emailForm.setFieldsValue({ email: record.email || currentCustomer?.email || "" });
                            setIsSendEmailModalVisible(true);
                        }}
                    >
                        Share
                    </Button>
                </Space>
            ),
        },
    ];

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
                const lastVisitDate = record?.visits?.[0]?.createdAt
                    ? new Date(record.visits[0].createdAt)
                    : null;
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
        {
            title: "Actions",
            key: "actions",
            search: false,
            render: (_, record) => (
                <Space>
                    <Button
                        type="primary"
                        icon={<GiftOutlined />}
                        onClick={() => showGiftCardModal(record)}
                    >
                        Issue Gift Card
                    </Button>
                    <Button
                        icon={<HistoryOutlined />}
                        onClick={() => showGiftCardsHistory(record)}
                    >
                        View Gift Cards
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <App>
            {nonCustomerEnabled && (
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                        <Button
                            icon={<BarsOutlined />}
                            onClick={showAllGiftCards}
                        >
                            View All Gift Certificates
                        </Button>
                    </div>
                    <div>
                        <Button
                            type="primary"
                            icon={<UserAddOutlined />}
                            onClick={showNewRecipientModal}
                            style={{ background: primaryColor, borderColor: primaryColor }}
                        >
                            Create Gift Card for Non-Customer
                        </Button>
                    </div>
                </div>
            )}

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

            {/* Modal for existing customers */}
            <Modal
                title={`Issue Gift Card for ${currentCustomer?.customer_name || ""}`}
                open={isGiftCardModalVisible}
                onOk={handleGiftCardSubmit}
                onCancel={() => setIsGiftCardModalVisible(false)}
            >
                <Form form={giftCardForm} layout="vertical">
                    <Form.Item
                        name="amount"
                        label="Gift Card Amount"
                        rules={[{ required: true, message: "Please enter the gift card amount" }]}
                    >
                        <InputNumber
                            min={1}
                            prefix="KSh"
                            style={{ width: "100%" }}
                            placeholder="Enter amount"
                        />
                    </Form.Item>
                    <Form.Item
                        name="message"
                        label="Personalized Message"
                        initialValue={`Welcome to ${clientName}! We're delighted to have you as our valued customer.`}
                    >
                        <TextArea
                            rows={4}
                            placeholder="Add a personalized message for the gift card"
                        />
                    </Form.Item>
                </Form>
            </Modal>

            {/* New Modal for non-customers */}
            <Modal
                title="Issue Gift Card for New Recipient"
                open={isNewRecipientModalVisible}
                onOk={handleNewRecipientSubmit}
                onCancel={() => setIsNewRecipientModalVisible(false)}
                width={700}
            >
                <Form form={newRecipientForm} layout="vertical">
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <Form.Item
                            name="customer_name"
                            label="Recipient Name"
                            rules={[{ required: true, message: "Please enter recipient name" }]}
                            style={{ flex: 1 }}
                        >
                            <Input
                                prefix={<UserOutlined />}
                                placeholder="Enter recipient name"
                            />
                        </Form.Item>

                        <Form.Item
                            name="email"
                            label="Email"
                            rules={[
                                { required: true, message: "Please enter recipient email" },
                                { type: 'email', message: "Please enter a valid email" }
                            ]}
                            style={{ flex: 1 }}
                        >
                            <Input
                                prefix={<MailOutlined />}
                                placeholder="Enter recipient email"
                            />
                        </Form.Item>
                    </div>

                    <div style={{ display: 'flex', gap: '16px' }}>
                        <Form.Item
                            name="phone"
                            label="Phone Number"
                            rules={[{ required: true, message: "Please enter recipient phone" }]}
                            style={{ flex: 1 }}
                        >
                            <Input
                                prefix={<PhoneOutlined />}
                                placeholder="Enter phone number"
                            />
                        </Form.Item>

                        <Form.Item
                            name="amount"
                            label="Gift Card Amount"
                            rules={[{ required: true, message: "Please enter the gift card amount" }]}
                            style={{ flex: 1 }}
                        >
                            <InputNumber
                                min={1}
                                prefix="KSh"
                                style={{ width: "100%" }}
                                placeholder="Enter amount"
                            />
                        </Form.Item>
                    </div>

                    <div style={{ display: 'flex', gap: '16px' }}>
                        <Form.Item
                            name="expiry_date"
                            label="Expiry Date"
                            rules={[{ required: true, message: "Please select expiry date" }]}
                            style={{ flex: 1 }}
                            initialValue={moment().add(3, 'months')}
                        >
                            <DatePicker
                                style={{ width: '100%' }}
                                format="YYYY-MM-DD"
                                disabledDate={(current) => {
                                    // Can not select days before today
                                    return current && current < moment().endOf('day');
                                }}
                            />
                        </Form.Item>
                    </div>

                    <Form.Item
                        name="message"
                        label="Personalized Message"
                        initialValue={`Welcome to ${clientName}! We're delighted to have you as our valued customer.`}
                    >
                        <TextArea
                            rows={4}
                            placeholder="Add a personalized message for the gift card"
                        />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Gift Card Preview Modal */}
            <Modal
                title="Gift Certificate Preview"
                open={isPreviewModalVisible}
                footer={
                    <Row gutter={[8, 8]}>
                        <Col xs={24} sm={12} md={6}>
                            <Button
                                block
                                onClick={() => setIsPreviewModalVisible(false)}
                            >
                                Close
                            </Button>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <Button
                                block
                                type="primary"
                                icon={<FilePdfOutlined />}
                                loading={savingPDF}
                                onClick={saveGiftCardAsPDF}
                            >
                                export PDF
                            </Button>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <Button
                                block
                                type="primary"
                                onClick={handleCreateGiftCard}
                            >
                                Create Gift Card
                            </Button>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <Button
                                block
                                type="primary"
                                icon={<MailOutlined />}
                                onClick={() => {
                                    emailForm.setFieldsValue({
                                        email: currentGiftCard.customer_id
                                            ? currentCustomer?.email || ""
                                            : currentGiftCard.email || ""
                                    });
                                    setIsSendEmailModalVisible(true);
                                }}
                            >
                                Share Email
                            </Button>
                        </Col>
                    </Row>
                }
                onCancel={() => setIsPreviewModalVisible(false)}
                width={500}
            >
                {currentGiftCard && (
                    <Card
                        ref={giftCardRef}
                        bordered
                        style={{
                            background: `#f8f0e5`,
                            color: "#9a6e44",
                            borderRadius: "8px"
                        }}
                    >
                        <div style={{ padding: "16px", textAlign: "center" }}>
                            <Title level={2} style={{ color: "#9a6e44", margin: "8px 0", textTransform: "uppercase", letterSpacing: "2px", fontWeight: 300 }}>
                                Gift Certificate
                            </Title>
                            <Divider style={{ background: "rgba(154,110,68,0.2)", margin: "12px 0" }} />

                            <div style={{ display: "flex", justifyContent: "center", margin: "20px 0" }}>
                                <div style={{ textAlign: "center" }}>
                                    <div style={{ fontSize: "32px", fontWeight: 300, textTransform: "uppercase", letterSpacing: "2px", color: "#9a6e44" }}>
                                        Treat <span style={{ fontStyle: "italic", fontWeight: 300, textTransform: "none", color: "#b08968" }}>yourself</span>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", marginTop: "20px" }}>
                                <div style={{ width: "48%", textAlign: "left", marginBottom: "15px" }}>
                                    <div style={{ color: "#9a6e44", fontWeight: 500, marginBottom: "5px" }}>To:</div>
                                    <div style={{
                                        backgroundColor: "white",
                                        padding: "12px",
                                        borderRadius: "4px",
                                        color: "#333",
                                        minHeight: "42px"
                                    }}>
                                        {currentGiftCard.customer_id ? currentGiftCard?.customer_id?.customer_name : currentGiftCard.customer_name}
                                    </div>
                                </div>

                                <div style={{ width: "48%", textAlign: "left", marginBottom: "15px" }}>
                                    <div style={{ color: "#9a6e44", fontWeight: 500, marginBottom: "5px" }}>From:</div>
                                    <div style={{
                                        backgroundColor: "white",
                                        padding: "12px",
                                        borderRadius: "4px",
                                        color: "#333",
                                        minHeight: "42px"
                                    }}>
                                        {clientName}
                                    </div>
                                </div>

                                <div style={{ width: "48%", textAlign: "left", marginBottom: "15px" }}>
                                    <div style={{ color: "#9a6e44", fontWeight: 500, marginBottom: "5px" }}>Amount:</div>
                                    <div style={{
                                        backgroundColor: "white",
                                        padding: "12px",
                                        borderRadius: "4px",
                                        color: "#333",
                                        minHeight: "42px"
                                    }}>
                                        KSh {currentGiftCard.amount}
                                    </div>
                                </div>

                                <div style={{ width: "48%", textAlign: "left", marginBottom: "15px" }}>
                                    <div style={{ color: "#9a6e44", fontWeight: 500, marginBottom: "5px" }}>Valid to:</div>
                                    <div style={{
                                        backgroundColor: "white",
                                        padding: "12px",
                                        borderRadius: "4px",
                                        color: "#333",
                                        minHeight: "42px"
                                    }}>
                                        {new Date(currentGiftCard.expiry_date).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                            <div style={{
                                backgroundColor: "white",
                                padding: "15px",
                                margin: "20px 0",
                                borderRadius: "8px",
                                fontFamily: "monospace",
                                letterSpacing: "2px",
                                fontSize: "22px",
                                color: "#333",
                                border: "1px solid #e8d5c4"
                            }}>
                                {currentGiftCard.code}
                            </div>

                            <Paragraph style={{ fontSize: "14px", color: "#757575", margin: "20px 0", textAlign: "center" }}>
                                Our gift certificates are valid for three months from the date of issue. Please note that they must be used within this period, as they cannot be extended or redeemed after expiration.
                            </Paragraph>

                            <div style={{ textAlign: "right", marginTop: "20px" }}>
                                <div style={{
                                    display: "inline-block",
                                    width: "80px",
                                    height: "80px",
                                    borderRadius: "50%",
                                    border: "1px solid #9a6e44",
                                    textAlign: "center",
                                    lineHeight: "80px",
                                    fontSize: "24px",
                                    color: "#9a6e44",
                                    fontWeight: 300
                                }}>
                                    {clientName.substring(0, 1)}
                                </div>
                            </div>
                        </div>
                    </Card>
                )}
            </Modal>

            {/* Send Email Modal - Updated */}
            <Modal
                title="Share Gift Card"
                open={isSendEmailModalVisible}
                onOk={handleSendEmail}
                onCancel={() => setIsSendEmailModalVisible(false)}
                okText="Send Email"
                okButtonProps={{ icon: <MailOutlined /> }}
            >
                <Form form={emailForm} layout="vertical">
                    <Form.Item
                        name="email"
                        label="Recipient Email"
                        rules={[
                            { required: true, message: "Please enter the recipient's email" },
                            { type: "email", message: "Please enter a valid email" }
                        ]}
                    >
                        <Input
                            placeholder="Enter email address"
                            prefix={<MailOutlined />}
                        />
                    </Form.Item>

                    {currentGiftCard && (
                        <>
                            <Form.Item label="Gift Card Amount">
                                <InputNumber
                                    min={1}
                                    value={currentGiftCard.amount}
                                    onChange={(value) => {
                                        setCurrentGiftCard(prev => ({
                                            ...prev,
                                            amount: value
                                        }));
                                    }}
                                    prefix="KSh"
                                    style={{ width: "100%" }}
                                />
                            </Form.Item>

                            <Form.Item label="Gift Card Code">
                                <Input
                                    value={currentGiftCard.code}
                                    readOnly
                                    addonAfter={
                                        <Tooltip title="Copy Code">
                                            <CopyOutlined
                                                onClick={() => copyGiftCardCode(currentGiftCard.code)}
                                                style={{ cursor: 'pointer' }}
                                            />
                                        </Tooltip>
                                    }
                                />
                            </Form.Item>

                            <Form.Item label="Message">
                                <TextArea
                                    rows={3}
                                    value={currentGiftCard.message || `Welcome to ${clientName}! We're delighted to have you as our valued customer.`}
                                    onChange={(e) => {
                                        setCurrentGiftCard(prev => ({
                                            ...prev,
                                            message: e.target.value || `Welcome to ${clientName}! We're delighted to have you as our valued customer.`
                                        }));
                                    }}
                                />
                            </Form.Item>
                        </>
                    )}

                    <Paragraph type="secondary">
                        The gift card will be sent to this email address along with instructions on how to redeem it.
                    </Paragraph>
                </Form>
            </Modal>

            {/* View Customer Gift Cards Modal */}
            <Modal
                title={`Gift Cards for ${currentCustomer?.customer_name || ""}`}
                open={isViewGiftCardsModalVisible}
                onCancel={() => setIsViewGiftCardsModalVisible(false)}
                footer={[
                    <Button key="close" onClick={() => setIsViewGiftCardsModalVisible(false)}>
                        Close
                    </Button>,
                    <Button
                        key="new"
                        type="primary"
                        icon={<GiftOutlined />}
                        onClick={() => {
                            setIsViewGiftCardsModalVisible(false);
                            showGiftCardModal(currentCustomer);
                        }}
                    >
                        Issue New Gift Card
                    </Button>,
                ]}
                width={900}
                bodyStyle={{ maxHeight: "70vh", overflow: "auto" }}
            >
                <Table
                    columns={giftCardColumns}
                    dataSource={customerGiftCards}
                    rowKey="_id"
                    loading={loadingGiftCards}
                    pagination={{ pageSize: 5 }}
                    locale={{ emptyText: "No gift cards found for this customer" }}
                    scroll={{ x: 800 }}
                    size="middle"
                />
            </Modal>

            {/* All Gift Cards Modal (New) */}
            <Modal
                title="All Gift Certificates"
                open={isAllGiftCardsModalVisible}
                onCancel={() => setIsAllGiftCardsModalVisible(false)}
                footer={[
                    <Button key="close" onClick={() => setIsAllGiftCardsModalVisible(false)}>
                        Close
                    </Button>,
                    <Button
                        key="new"
                        type="primary"
                        icon={<UserAddOutlined />}
                        onClick={() => {
                            setIsAllGiftCardsModalVisible(false);
                            showNewRecipientModal();
                        }}
                    >
                        New Non-Customer Gift Card
                    </Button>,
                ]}
                width={1000}
                bodyStyle={{ maxHeight: "70vh", overflow: "auto" }}
            >
                <Tabs defaultActiveKey="all" onChange={(key) => setActiveTabKey(key)}>
                    <TabPane tab="All Gift Cards" key="all">
                        <Table
                            columns={giftCardColumns}
                            dataSource={allGiftCards}
                            rowKey="_id"
                            loading={loadingAllGiftCards}
                            pagination={{ pageSize: 10 }}
                            locale={{ emptyText: "No gift cards found" }}
                            scroll={{ x: 850 }}
                            size="middle"
                        />
                    </TabPane>
                    <TabPane tab="Non-Customer Gift Cards" key="nonCustomers">
                        <Table
                            columns={giftCardColumns}
                            dataSource={allGiftCards.filter(card => !card.customer_id)}
                            rowKey="_id"
                            loading={loadingAllGiftCards}
                            pagination={{ pageSize: 10 }}
                            locale={{ emptyText: "No non-customer gift cards found" }}
                            scroll={{ x: 850 }}
                            size="middle"
                        />
                    </TabPane>
                    <TabPane tab="Customer Gift Cards" key="customers">
                        <Table
                            columns={giftCardColumns}
                            dataSource={allGiftCards.filter(card => card.customer_id)}
                            rowKey="_id"
                            loading={loadingAllGiftCards}
                            pagination={{ pageSize: 10 }}
                            locale={{ emptyText: "No customer gift cards found" }}
                            scroll={{ x: 850 }}
                            size="middle"
                        />
                    </TabPane>
                </Tabs>
            </Modal>
        </App>
    );
};

export default AdminCustomersTable;