import React, { useState, useEffect } from "react";
import { Modal, Button, Input, Space, Typography, Empty } from "antd";
import { ModalForm } from "@ant-design/pro-components";
import {
    SignatureOutlined,
    BankOutlined,
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    CheckOutlined,
    CloseOutlined,
    EnvironmentOutlined,
    AimOutlined,
} from "@ant-design/icons";
import {
    STORAGE_KEYS,
    getFromStorage,
    updateInStorage,
    deleteFromStorage,
} from "../services/esign.api";
import type { LibraryItem } from "../types/esign.types";

const { Text } = Typography;

export interface LibraryModalProps {
    trigger?: JSX.Element;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onClose?: () => void;
    onSelect: (data: string, type: string, position?: { x: number; y: number }) => void;
    onEnterPlacingMode: (item: LibraryItem) => void;
    onAddNew?: () => void;
    type: "signature" | "stamp";
}

export const LibraryModal: React.FC<LibraryModalProps> = ({
    trigger,
    open,
    onOpenChange,
    onClose,
    onSelect,
    onEnterPlacingMode,
    onAddNew,
    type,
}) => {
    const [internalOpen, setInternalOpen] = useState(false);
    const isControlled = open !== undefined;
    const modalOpen = isControlled ? open : internalOpen;

    const handleOpenChange = (v: boolean) => {
        if (!isControlled) setInternalOpen(v);
        onOpenChange?.(v);
        if (!v) {
            onClose?.();
        }
    };

    const [editingItem, setEditingItem] = useState<LibraryItem | null>(null);
    const [editLabel, setEditLabel] = useState("");
    const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);

    const storageKey = type === "stamp" ? STORAGE_KEYS.STAMPS : STORAGE_KEYS.SIGNATURES;

    useEffect(() => {
        if (modalOpen) {
            setLibraryItems(getFromStorage(storageKey));
            setEditingItem(null);
            setEditLabel("");
        }
    }, [modalOpen, type, storageKey]);

    const handleSaveEdit = () => {
        if (editingItem && editLabel.trim()) {
            updateInStorage(storageKey, editingItem.id, { name: editLabel.trim() });
            setEditingItem(null);
            setEditLabel("");
            setLibraryItems(getFromStorage(storageKey));
        }
    };

    const handleDelete = (id: string) => {
        Modal.confirm({
            title: "Delete from Library",
            content: "Are you sure you want to remove this item from your library?",
            okText: "Delete",
            okButtonProps: { danger: true },
            onOk: () => {
                deleteFromStorage(storageKey, id);
                setLibraryItems(getFromStorage(storageKey));
            },
        });
    };

    const handleUse = (item: LibraryItem) => {
        Modal.confirm({
            title: `Place ${type === "stamp" ? "Stamp" : "Signature"}`,
            content: (
                <div>
                    <p style={{ marginBottom: 16 }}>
                        How would you like to place this {type === "stamp" ? "stamp" : "signature"}?
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <Button
                            block
                            icon={<EnvironmentOutlined />}
                            onClick={() => {
                                onSelect(item.data, item.type);
                                Modal.destroyAll();
                            }}
                        >
                            Place at center of current page
                        </Button>
                        <Button
                            block
                            icon={<AimOutlined />}
                            type="primary"
                            onClick={() => {
                                onEnterPlacingMode(item);
                                Modal.destroyAll();
                                onClose();
                            }}
                        >
                            Click to place on document
                        </Button>
                    </div>
                </div>
            ),
            okText: "Cancel",
            cancelText: null,
            onOk: () => undefined,
        });
    };

    return (
        <ModalForm
            trigger={trigger}
            open={modalOpen}
            onOpenChange={handleOpenChange}
            title={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {type === "stamp" ? (
                        <BankOutlined style={{ color: "#1677ff", fontSize: 18 }} />
                    ) : (
                        <SignatureOutlined style={{ color: "#1677ff", fontSize: 18 }} />
                    )}
                    <span style={{ fontWeight: 600 }}>
                        {type === "stamp" ? "Company Stamp Library" : "Signature Library"}
                    </span>
                </div>
            }
            submitter={false}
            modalProps={{
                destroyOnClose: true,
                centered: true,
                footer: null,
                onCancel: () => handleOpenChange(false),
            }}
            width={640}
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <Text type="secondary" style={{ fontSize: 13 }}>
                    Saved reusable {type === "stamp" ? "stamps" : "signatures"} for rapid document placement.
                </Text>
                {onAddNew && (
                    <Button type="primary" size="small" icon={<PlusOutlined />} onClick={onAddNew}>
                        Add New
                    </Button>
                )}
            </div>

            {libraryItems.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 0" }}>
                    <Empty
                        description={`No ${type === "stamp" ? "stamps" : "signatures"} saved yet`}
                        style={{ marginBottom: 16 }}
                    />
                    {onAddNew && (
                        <Button type="primary" icon={<PlusOutlined />} onClick={onAddNew}>
                            Create {type === "stamp" ? "Stamp" : "Signature"}
                        </Button>
                    )}
                </div>
            ) : (
                <div style={{ maxHeight: 460, overflowY: "auto", padding: "4px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
                        {libraryItems.map((item) => {
                            const isEditing = editingItem?.id === item.id;
                            return (
                                <div
                                    key={item.id}
                                    style={{
                                        border: "1px solid #e5e7eb",
                                        borderRadius: 10,
                                        padding: 12,
                                        background: "#fff",
                                        display: "flex",
                                        flexDirection: "column",
                                        justifyContent: "space-between",
                                        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                                    }}
                                >
                                    <div
                                        style={{
                                            height: 80,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            background: "#f9fafb",
                                            borderRadius: 8,
                                            marginBottom: 10,
                                            padding: 8,
                                        }}
                                    >
                                        <img
                                            src={item.data}
                                            alt={item.name}
                                            style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }}
                                        />
                                    </div>

                                    {isEditing ? (
                                        <Space.Compact style={{ width: "100%", marginBottom: 8 }}>
                                            <Input
                                                size="small"
                                                value={editLabel}
                                                onChange={(e) => setEditLabel(e.target.value)}
                                                autoFocus
                                            />
                                            <Button size="small" type="primary" icon={<CheckOutlined />} onClick={handleSaveEdit} />
                                            <Button size="small" icon={<CloseOutlined />} onClick={() => setEditingItem(null)} />
                                        </Space.Compact>
                                    ) : (
                                        <div
                                            style={{
                                                fontSize: 13,
                                                fontWeight: 600,
                                                color: "#111827",
                                                marginBottom: 8,
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
                                            }}
                                            title={item.name}
                                        >
                                            {item.name}
                                        </div>
                                    )}

                                    <div style={{ display: "flex", gap: 6 }}>
                                        <Button
                                            size="small"
                                            type="primary"
                                            onClick={() => handleUse(item)}
                                            style={{ flex: 1, borderRadius: 6, fontWeight: 500 }}
                                        >
                                            Use
                                        </Button>
                                        <Button
                                            size="small"
                                            icon={<EditOutlined />}
                                            onClick={() => {
                                                setEditingItem(item);
                                                setEditLabel(item.name || "");
                                            }}
                                            style={{ borderRadius: 6 }}
                                        />
                                        <Button
                                            size="small"
                                            danger
                                            icon={<DeleteOutlined />}
                                            onClick={() => handleDelete(item.id)}
                                            style={{ borderRadius: 6 }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </ModalForm>
    );
};

export default LibraryModal;
