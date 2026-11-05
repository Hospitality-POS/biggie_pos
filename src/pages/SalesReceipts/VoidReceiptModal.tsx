import React, { useEffect, useState } from "react";
import { Alert, Input, Modal, Typography } from "antd";
import { StopOutlined } from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { SalesReceipt, voidSalesReceipt } from "@services/accounting/salesReceipts";

const { Text } = Typography;

const fmt = (v: number) =>
    (v || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Asks for a reason, then voids the receipt. The API reverses (voids) the
 * receipt's journal entry and refreshes the balance of any linked invoice.
 */
const VoidReceiptModal: React.FC<{
    receipt: Pick<SalesReceipt, "_id" | "receipt_no" | "status" | "grand_total"> & { journal_entry_id?: any; invoice_id?: any } | null;
    onClose: () => void;
    onVoided: () => void;
}> = ({ receipt, onClose, onVoided }) => {
    const [reason, setReason] = useState("");
    useEffect(() => { if (receipt) setReason(""); }, [receipt]);

    const mutation = useMutation({
        mutationFn: () => voidSalesReceipt(receipt!._id, reason.trim()),
        onSuccess: () => {
            onVoided();
            onClose();
        },
    });

    const journalNo = typeof receipt?.journal_entry_id === "object" ? receipt?.journal_entry_id?.entry_no : undefined;
    const invoiceNo = typeof receipt?.invoice_id === "object" ? receipt?.invoice_id?.order_no : undefined;

    return (
        <Modal
            open={!!receipt}
            onCancel={onClose}
            title={<span><StopOutlined style={{ color: "#dc2626", marginRight: 8 }} />Void {receipt?.receipt_no}</span>}
            okText="Void Receipt"
            okButtonProps={{ danger: true, disabled: !reason.trim(), loading: mutation.isLoading }}
            onOk={() => mutation.mutate()}
            destroyOnClose
        >
            <Text style={{ display: "block", marginBottom: 12 }}>
                This cancels the sale of <Text strong>KES {fmt(receipt?.grand_total ?? 0)}</Text>. It can't be undone.
            </Text>
            {receipt?.status === "Posted" && (
                <Alert
                    type="warning" showIcon style={{ marginBottom: 12 }}
                    message="The ledger will be reversed"
                    description={
                        <>
                            Journal entry {journalNo ? <Text code>{journalNo}</Text> : "for this receipt"} will be voided, removing
                            the revenue, tax and cash it recorded.
                            {invoiceNo && <> Invoice <Text strong>{invoiceNo}</Text> will show this payment as removed.</>}
                        </>
                    }
                />
            )}
            <Text strong style={{ display: "block", marginBottom: 6 }}>Reason</Text>
            <Input.TextArea
                autoFocus rows={3} maxLength={300} showCount
                value={reason} onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Duplicate entry, customer returned goods, wrong amount"
            />
        </Modal>
    );
};

export default VoidReceiptModal;
