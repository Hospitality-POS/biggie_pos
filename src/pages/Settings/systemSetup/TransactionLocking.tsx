import React, { useState } from "react";
import {
    Card, Row, Col, Button, Tag, Typography, Modal, Form, DatePicker, Input, Space,
} from "antd";
import { LockOutlined, UnlockOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import {
    getTransactionLocks,
    setTransactionLock,
    removeTransactionLock,
    LockModule,
    TransactionLock,
} from "@services/accounting/transaction-lock";

const { Text, Title } = Typography;

const MODULES: { key: LockModule; label: string; description: string }[] = [
    { key: "Sales", label: "Sales", description: "Invoices, quotes, sales receipts and related payments" },
    { key: "Purchases", label: "Purchases", description: "Bills, expenses and supplier payments" },
    { key: "Banking", label: "Banking", description: "Bank reconciliations, statement imports and transfers" },
    { key: "Accountant", label: "Accountant", description: "Manual journals, adjustments and chart-of-accounts changes" },
];

const TransactionLocking: React.FC = () => {
    const shopId = localStorage.getItem("shopId") || "";
    const queryClient = useQueryClient();
    const [form] = Form.useForm();
    const [unlockForm] = Form.useForm();
    const [editing, setEditing] = useState<{ module: LockModule; lock?: TransactionLock } | null>(null);
    const [unlocking, setUnlocking] = useState<TransactionLock | null>(null);

    const { data, isLoading } = useQuery({
        queryKey: ["transaction-locks", shopId],
        queryFn: () => getTransactionLocks(shopId),
        enabled: !!shopId,
    });

    const setMutation = useMutation({
        mutationFn: setTransactionLock,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["transaction-locks", shopId] });
            setEditing(null);
            form.resetFields();
        },
    });

    const removeMutation = useMutation({
        mutationFn: removeTransactionLock,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["transaction-locks", shopId] });
            setUnlocking(null);
            unlockForm.resetFields();
        },
    });

    const lockByModule: Record<string, TransactionLock> = {};
    (data?.locks || []).forEach((l) => { lockByModule[l.module] = l; });

    const openLockModal = (module: LockModule) => {
        const existing = lockByModule[module];
        form.setFieldsValue({
            lock_date: existing ? dayjs(existing.lock_date) : dayjs(),
            reason: existing?.reason || "",
            password: "",
            confirmPassword: "",
        });
        setEditing({ module, lock: existing });
    };

    const handleSave = async (values: any) => {
        if (!editing) return;
        if (values.password !== values.confirmPassword) {
            form.setFields([
                { name: "confirmPassword", errors: ["Passwords do not match"] },
            ]);
            return;
        }
        await setMutation.mutateAsync({
            shop_id: shopId,
            module: editing.module,
            lock_date: values.lock_date.toISOString(),
            reason: values.reason,
            password: values.password,
        });
    };

    const handleUnlock = async (values: any) => {
        if (!unlocking) return;
        await removeMutation.mutateAsync({ id: unlocking._id, password: values.password });
    };

    return (
        <div style={{ padding: 16 }}>
            <Title level={4} style={{ marginBottom: 8 }}>Transaction Locking</Title>
            <Text type="secondary" style={{ display: "block", marginBottom: 24 }}>
                Locking prevents users from creating, editing or deleting transactions recorded on or before the specified date.
            </Text>

            <Row gutter={[16, 16]}>
                {MODULES.map((m) => {
                    const lock = lockByModule[m.key];
                    const isLocked = !!lock;
                    return (
                        <Col xs={24} md={12} lg={12} key={m.key}>
                            <Card
                                loading={isLoading}
                                size="small"
                                title={
                                    <Space>
                                        {isLocked ? <LockOutlined style={{ color: "#cf1322" }} /> : <UnlockOutlined style={{ color: "#389e0d" }} />}
                                        <Text strong>{m.label}</Text>
                                        {isLocked && <Tag color="red">Locked</Tag>}
                                    </Space>
                                }
                                extra={
                                    isLocked ? (
                                        <Space size={4}>
                                            <Button type="primary" size="small" onClick={() => openLockModal(m.key)}>Edit Lock</Button>
                                            <Button size="small" danger onClick={() => lock && setUnlocking(lock)}>
                                                Unlock
                                            </Button>
                                        </Space>
                                    ) : (
                                        <Button size="small" onClick={() => openLockModal(m.key)}>Set Lock</Button>
                                    )
                                }
                            >
                                <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 8 }}>{m.description}</Text>
                                {isLocked ? (
                                    <>
                                        <Text strong style={{ color: "#cf1322" }}>
                                            Locked up to {dayjs(lock.lock_date).format("DD MMM YYYY")}
                                        </Text>
                                        {lock.reason && (
                                            <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 4 }}>
                                                Reason: {lock.reason}
                                            </Text>
                                        )}
                                    </>
                                ) : (
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        You have not locked the transactions in this module.
                                    </Text>
                                )}
                            </Card>
                        </Col>
                    );
                })}
            </Row>

            <Modal
                title={editing?.lock ? `Edit ${editing.module} Lock` : `Lock ${editing?.module}`}
                open={!!editing}
                onCancel={() => { setEditing(null); form.resetFields(); }}
                onOk={() => form.submit()}
                confirmLoading={setMutation.isLoading}
                destroyOnClose
            >
                <Form form={form} layout="vertical" onFinish={handleSave}>
                    <Form.Item
                        name="lock_date"
                        label="Lock Date"
                        rules={[{ required: true, message: "Lock date is required" }]}
                    >
                        <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" />
                    </Form.Item>
                    <Form.Item
                        name="reason"
                        label="Reason"
                        rules={[{ required: true, message: "Reason is required" }]}
                    >
                        <Input.TextArea rows={3} placeholder="Why are you locking this period?" />
                    </Form.Item>
                    <Form.Item
                        name="password"
                        label="Password"
                        rules={[{ required: true, message: "Password is required" }]}
                    >
                        <Input.Password placeholder="Set a password to control unlocking" />
                    </Form.Item>
                    <Form.Item
                        name="confirmPassword"
                        label="Confirm Password"
                        rules={[{ required: true, message: "Please confirm the password" }]}
                    >
                        <Input.Password placeholder="Confirm the password" />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title={`Unlock ${unlocking?.module}`}
                open={!!unlocking}
                onCancel={() => { setUnlocking(null); unlockForm.resetFields(); }}
                onOk={() => unlockForm.submit()}
                confirmLoading={removeMutation.isLoading}
                destroyOnClose
            >
                <Form form={unlockForm} layout="vertical" onFinish={handleUnlock}>
                    <Form.Item
                        name="password"
                        label="Password"
                        rules={[{ required: true, message: "Password is required to unlock" }]}
                    >
                        <Input.Password placeholder="Enter the lock password" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default TransactionLocking;
