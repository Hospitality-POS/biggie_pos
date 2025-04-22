import React, { useState, useRef, useEffect } from "react";
import { useDispatch } from "react-redux";
import {
    Modal,
    Form,
    Input,
    InputNumber,
    Button,
    Typography,
    Divider,
    Card,
    Tooltip,
    Space,
    App,
    DatePicker,
    Row,
    Col,
    Switch
} from "antd";
import {
    MailOutlined,
    CopyOutlined,
    FilePdfOutlined,
    UserOutlined,
    PhoneOutlined,
    EyeOutlined,
    EyeInvisibleOutlined
} from "@ant-design/icons";
import { createGiftCard, sendGiftCard } from "@services/customers";
import moment from "moment";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const issueGiftCard = (customerId, customerName, email, phone, amount, message, priceVisible) => {
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
        price_visible: priceVisible
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

const GiftCardModal = ({
    currentCustomer,
    isGiftCardModalVisible,
    setIsGiftCardModalVisible,
    isNewRecipientModalVisible,
    setIsNewRecipientModalVisible,
    isPreviewModalVisible,
    setIsPreviewModalVisible,
    isSendEmailModalVisible,
    setIsSendEmailModalVisible,
    setCurrentGiftCard,
    currentGiftCard,
    onGiftCardCreated,
    clientName,
    primaryColor
}) => {
    const dispatch = useDispatch();
    const [giftCardForm] = Form.useForm();
    const [newRecipientForm] = Form.useForm();
    const [emailForm] = Form.useForm();
    const giftCardRef = useRef(null);
    const [savingPDF, setSavingPDF] = useState(false);
    const [isPriceVisible, setIsPriceVisible] = useState(true);

    const { message: messageApi } = App.useApp();

    useEffect(() => {
        // Set default values when forms are initialized
        if (isGiftCardModalVisible) {
            const defaultMessage = `Welcome to ${clientName}! We're delighted to have you as our valued customer.`;
            giftCardForm.resetFields();
            giftCardForm.setFieldsValue({
                message: defaultMessage,
                price_visible: true
            });
            setIsPriceVisible(true);
        }

        if (isNewRecipientModalVisible) {
            const defaultMessage = `Welcome to ${clientName}! We're delighted to have you as our valued customer.`;
            newRecipientForm.resetFields();
            newRecipientForm.setFieldsValue({
                message: defaultMessage,
                expiry_date: moment().add(3, 'months'),
                price_visible: true
            });
            setIsPriceVisible(true);
        }
    }, [isGiftCardModalVisible, isNewRecipientModalVisible, giftCardForm, newRecipientForm, clientName]);

    // Update price visibility in current gift card
    useEffect(() => {
        if (currentGiftCard && currentGiftCard.price_visible !== isPriceVisible) {
            setCurrentGiftCard(prev => ({
                ...prev,
                price_visible: isPriceVisible
            }));
        }
    }, [isPriceVisible, currentGiftCard, setCurrentGiftCard]);

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
                cardMessage,
                values.price_visible
            );

            setCurrentGiftCard(giftCard);
            setIsPriceVisible(values.price_visible);
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
                cardMessage,
                values.price_visible
            );

            // Add expiry date from the form
            giftCard.expiry_date = values.expiry_date.toISOString();

            setCurrentGiftCard(giftCard);
            setIsPriceVisible(values.price_visible);
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

                // Notify parent component that gift card was created
                onGiftCardCreated(response.payload);

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

    const togglePriceVisibility = (checked) => {
        setIsPriceVisible(checked);
        if (currentGiftCard) {
            setCurrentGiftCard(prev => ({
                ...prev,
                price_visible: checked
            }));
        }
    };

    return (
        <>
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
                    <Form.Item
                        name="price_visible"
                        label="Show Amount on Gift Card"
                        valuePropName="checked"
                        initialValue={true}
                        tooltip="Toggle to show or hide the amount on the gift card"
                    >
                        <Switch
                            checkedChildren={<EyeOutlined />}
                            unCheckedChildren={<EyeInvisibleOutlined />}
                            defaultChecked
                        />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Modal for non-customers */}
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

                        <Form.Item
                            name="price_visible"
                            label="Show Amount on Gift Card"
                            valuePropName="checked"
                            initialValue={true}
                            style={{ flex: 1 }}
                            tooltip="Toggle to show or hide the amount on the gift card"
                        >
                            <Switch
                                checkedChildren={<EyeOutlined />}
                                unCheckedChildren={<EyeInvisibleOutlined />}
                                defaultChecked
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
                                Export PDF
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
                extra={
                    <Tooltip title={isPriceVisible ? "Hide price" : "Show price"}>
                        <Switch
                            checkedChildren={<EyeOutlined />}
                            unCheckedChildren={<EyeInvisibleOutlined />}
                            checked={isPriceVisible}
                            onChange={togglePriceVisibility}
                        />
                    </Tooltip>
                }
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
                                        {currentGiftCard.customer_id ? currentCustomer?.customer_name : currentGiftCard.customer_name}
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

                                {(isPriceVisible || currentGiftCard.price_visible) && (
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
                                )}

                                <div style={{ width: isPriceVisible ? "48%" : "100%", textAlign: "left", marginBottom: "15px" }}>
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

                            <div style={{ textAlign: "center", marginTop: "20px" }}>
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

            {/* Send Email Modal */}
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

                            <Form.Item
                                label="Show Amount on Gift Card"
                                tooltip="Toggle to show or hide the amount on the gift card"
                            >
                                <Switch
                                    checkedChildren={<EyeOutlined />}
                                    unCheckedChildren={<EyeInvisibleOutlined />}
                                    checked={isPriceVisible}
                                    onChange={togglePriceVisibility}
                                />
                            </Form.Item>
                        </>
                    )}

                    <Paragraph type="secondary">
                        The gift card will be sent to this email address along with instructions on how to redeem it.
                    </Paragraph>
                </Form>
            </Modal>
        </>
    );
};

export default GiftCardModal;