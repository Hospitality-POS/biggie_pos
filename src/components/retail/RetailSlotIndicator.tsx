import React, { useState } from 'react';
import { Badge, Tooltip, Modal, List, Tag, Button, Spin, Typography, Space } from 'antd';
import {
    SwapOutlined,
    TableOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
} from '@ant-design/icons';
import { useRetailQueue } from '@context/RetailQueueContext';
import { usePrimaryColor } from '@context/PrimaryColorContext';

interface RetailSlotIndicatorProps {
    onQueueOrder: () => Promise<void>;
}

const RetailSlotIndicator: React.FC<RetailSlotIndicatorProps> = ({ onQueueOrder }) => {
    const {
        activeTable,
        activeLocation,
        availableTables,
        occupiedTables,
        isLoadingSlots,
        refreshSlots,
        queueOrderAndNext,
    } = useRetailQueue();

    const primaryColor = usePrimaryColor();
    const [queueModalOpen, setQueueModalOpen] = useState(false);
    const [queuing, setQueuing] = useState(false);

    const handleQueueAndNext = async () => {
        setQueuing(true);
        try {
            await onQueueOrder();
            const { nextTable } = await queueOrderAndNext();
            setQueueModalOpen(false);
        } finally {
            setQueuing(false);
        }
    };

    // Still loading — show spinner
    if (isLoadingSlots) {
        return <Spin size="small" style={{ marginRight: 8 }} />;
    }

    // No active table — show nothing at all
    if (!activeTable) return null;

    return (
        <>
            {/* Active slot badge — always visible */}
            <Tooltip title={`Location: ${activeLocation?.name || '—'} · Slot: ${activeTable.name}`}>
                <Badge
                    count={occupiedTables.length || 0}
                    offset={[-4, 4]}
                    style={{ backgroundColor: '#faad14' }}
                    showZero={false}
                >
                    <Button
                        type="default"
                        icon={<TableOutlined />}
                        onClick={() => setQueueModalOpen(true)}
                        size="small"
                        style={{
                            borderColor: primaryColor,
                            color: primaryColor,
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            backgroundColor: 'rgba(255,255,255,0.15)',
                            borderRadius: 6,
                        }}
                    >
                        {activeLocation?.name} · {activeTable.name}
                    </Button>
                </Badge>
            </Tooltip>

            {/* Queue management modal */}
            <Modal
                title={
                    <Space>
                        <SwapOutlined style={{ color: primaryColor }} />
                        <span>Queue Management</span>
                    </Space>
                }
                open={queueModalOpen}
                onCancel={() => setQueueModalOpen(false)}
                footer={null}
                width={440}
            >
                {/* Current active slot */}
                <div style={{
                    background: '#f6ffed',
                    border: `1px solid ${primaryColor}`,
                    borderRadius: 8,
                    padding: '12px 16px',
                    marginBottom: 16,
                }}>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        Currently serving
                    </Typography.Text>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <TableOutlined style={{ color: primaryColor, fontSize: 18 }} />
                        <Typography.Text strong style={{ fontSize: 15 }}>
                            {activeLocation?.name}
                        </Typography.Text>
                        <Typography.Text type="secondary">·</Typography.Text>
                        <Typography.Text strong style={{ fontSize: 15 }}>
                            {activeTable.name}
                        </Typography.Text>
                        <Tag color="green">Active</Tag>
                    </div>
                </div>

                {/* Queue next customer — only show if there are available slots */}
                {availableTables.length > 0 && (
                    <Button
                        type="primary"
                        block
                        size="large"
                        icon={<SwapOutlined />}
                        loading={queuing}
                        onClick={handleQueueAndNext}
                        style={{ backgroundColor: primaryColor, marginBottom: 16 }}
                    >
                        Queue Order & Serve Next Customer
                    </Button>
                )}

                {/* Available slots */}
                {availableTables.length > 0 && (
                    <>
                        <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                            Available slots ({availableTables.length})
                        </Typography.Text>
                        <List
                            size="small"
                            dataSource={availableTables.slice(0, 5)}
                            renderItem={(t) => (
                                <List.Item style={{ padding: '6px 0' }}>
                                    <Space>
                                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                                        <span>{t.name}</span>
                                        <Tag color="green" style={{ fontSize: 11 }}>Free</Tag>
                                    </Space>
                                </List.Item>
                            )}
                        />
                    </>
                )}

                {/* Occupied/queued slots */}
                {occupiedTables.length > 0 && (
                    <>
                        <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', margin: '12px 0 8px' }}>
                            Queued / In progress ({occupiedTables.length})
                        </Typography.Text>
                        <List
                            size="small"
                            dataSource={occupiedTables.slice(0, 5)}
                            renderItem={(t) => (
                                <List.Item style={{ padding: '6px 0' }}>
                                    <Space>
                                        <ClockCircleOutlined style={{ color: '#faad14' }} />
                                        <span>{t.name}</span>
                                        <Tag color="orange" style={{ fontSize: 11 }}>Queued</Tag>
                                    </Space>
                                </List.Item>
                            )}
                        />
                    </>
                )}

                <Button
                    type="link"
                    icon={<SwapOutlined />}
                    onClick={refreshSlots}
                    style={{ marginTop: 8, padding: 0 }}
                >
                    Refresh slots
                </Button>
            </Modal>
        </>
    );
};

export default RetailSlotIndicator;