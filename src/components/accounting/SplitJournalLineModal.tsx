import React, { useEffect, useState } from "react";
import { Select, Typography, message } from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    getJournalEntryById,
    updateJournalEntry,
    JournalLine,
} from "@services/accounting/journals";
import { getAllAccounts, ChartOfAccount } from "@services/accounting/accounts";
import SplitAccountsModal, { SplitRow } from "./SplitAccountsModal";

const { Text } = Typography;

// Splits one line of a saved journal entry across several accounts on the
// same side and saves the entry, so it stays balanced. Ledger only — a source
// document (invoice, bill, bank transaction) isn't changed.

interface Props {
    /** The entry to split a line of; the modal is open while this is set. */
    entryId: string | null;
    /** Starts on this line. */
    lineIndex?: number;
    /** Otherwise starts on the line posted to this account, e.g. the ledger being viewed. */
    accountId?: string;
    onClose: () => void;
    onSaved?: () => void;
}

const fmtAmount = (n: number) => n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const lineAccountId = (l: JournalLine) => (typeof l.account_id === "object" ? l.account_id._id : l.account_id);
const lineAmount = (l: JournalLine) => l.debit || l.credit || 0;
const lineLabel = (l: JournalLine) => {
    const acc = typeof l.account_id === "object" ? l.account_id : null;
    const name = acc ? `${acc.account_code} — ${acc.account_name}` : `${l.account_code || ""} — ${l.account_name || ""}`;
    return `${name} · ${(l.debit || 0) > 0 ? "Dr" : "Cr"} ${fmtAmount(lineAmount(l))}`;
};

const SplitJournalLineModal: React.FC<Props> = ({ entryId, lineIndex, accountId, onClose, onSaved }) => {
    const queryClient = useQueryClient();
    const open = !!entryId;
    const [index, setIndex] = useState<number | null>(null);

    const { data } = useQuery({
        queryKey: ["journal-entry", entryId],
        queryFn: () => getJournalEntryById(entryId as string),
        enabled: open,
    });
    const entry = data?.entry && data.entry._id === entryId ? data.entry : undefined;
    const editable = !!entry && entry.status !== "Voided" && !entry.period_locked;

    const { data: accountsData } = useQuery({
        queryKey: ["chart-of-accounts-je"],
        // All branches' accounts, same as the journal form
        queryFn: () => getAllAccounts({ is_active: true } as Parameters<typeof getAllAccounts>[0]),
        enabled: open,
        staleTime: 60_000,
    });
    const accountOptions = ((accountsData?.accounts || []) as ChartOfAccount[])
        .filter((a) => a.is_active && a.allows_direct_posting !== false)
        .map((a) => ({ label: `${a.account_code} — ${a.account_name}`, value: a._id }));

    // Pick the starting line once the entry has loaded
    useEffect(() => {
        if (!open) {
            setIndex(null);
            return;
        }
        if (!entry) return;
        if (!editable) {
            message.warning(
                entry.status === "Voided"
                    ? "Voided entries can't be split"
                    : "This entry is in a locked period and can't be split"
            );
            onClose();
            return;
        }
        const withAmount = (i: number) => i >= 0 && lineAmount(entry.lines[i]) > 0;
        const byAccount = accountId ? entry.lines.findIndex((l) => lineAccountId(l) === accountId && lineAmount(l) > 0) : -1;
        const start =
            lineIndex !== undefined && withAmount(lineIndex) ? lineIndex
                : byAccount >= 0 ? byAccount
                    : entry.lines.findIndex((l) => lineAmount(l) > 0);
        setIndex(start >= 0 ? start : null);
        // Only when a different entry loads, not on every refetch
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, entry?._id]);

    const line = entry && index !== null ? entry.lines[index] || null : null;

    const splitMutation = useMutation({
        mutationFn: (rows: SplitRow[]) => {
            const e = entry;
            if (!e) return Promise.reject(new Error("Entry not loaded"));
            const lines = e.lines.flatMap((l, i) => {
                const base = {
                    _id: l._id,
                    account_id: lineAccountId(l),
                    debit: l.debit || 0,
                    credit: l.credit || 0,
                    description: l.description || undefined,
                    customer_id: l.customer_id,
                    supplier_id: l.supplier_id,
                };
                if (i !== index) return [base];
                const isDebit = (l.debit || 0) > 0;
                // The first split row keeps the original line's id and party
                return rows.map((r, j) => ({
                    _id: j === 0 ? l._id : undefined,
                    account_id: r.account_id,
                    debit: isDebit ? r.amount : 0,
                    credit: isDebit ? 0 : r.amount,
                    description: r.description || undefined,
                    customer_id: j === 0 ? l.customer_id : undefined,
                    supplier_id: j === 0 ? l.supplier_id : undefined,
                }));
            });
            return updateJournalEntry(e._id, {
                entry_date: e.entry_date,
                description: e.description,
                reference: e.reference,
                lines,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
            queryClient.invalidateQueries({ queryKey: ["journal-entry", entryId] });
            queryClient.invalidateQueries({ queryKey: ["journal-entry-form", entryId] });
            queryClient.invalidateQueries({ queryKey: ["account-ledger"] });
            queryClient.invalidateQueries({ queryKey: ["account-ledger-all"] });
            onSaved?.();
            onClose();
        },
    });

    const splittable = (entry?.lines || [])
        .map((l, i) => ({ l, i }))
        .filter(({ l }) => lineAmount(l) > 0);

    return (
        <SplitAccountsModal
            open={open && !!line}
            resetKey={`${entryId}-${index}`}
            total={line ? lineAmount(line) : 0}
            title={entry ? `Split ${entry.entry_no} across accounts` : "Split across accounts"}
            subtitle={
                line
                    ? `${(line.debit || 0) > 0 ? "Debit" : "Credit"} of ${fmtAmount(lineAmount(line))} — saved to the entry straight away`
                    : undefined
            }
            header={
                splittable.length > 1 ? (
                    <div style={{ marginBottom: 4 }}>
                        <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
                            Line to split
                        </Text>
                        <Select
                            style={{ width: "100%" }}
                            value={index ?? undefined}
                            onChange={setIndex}
                            options={splittable.map(({ l, i }) => ({ label: lineLabel(l), value: i }))}
                        />
                    </div>
                ) : undefined
            }
            initialRows={
                line
                    ? [
                        { account_id: lineAccountId(line), amount: lineAmount(line), description: line.description },
                        { account_id: "", amount: 0, description: line.description },
                    ]
                    : undefined
            }
            defaultDescription={line?.description}
            accountOptions={accountOptions}
            onClose={onClose}
            onApply={(rows) => !splitMutation.isLoading && splitMutation.mutate(rows)}
        />
    );
};

export default SplitJournalLineModal;
