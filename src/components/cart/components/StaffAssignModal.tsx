import React, { useEffect, useMemo, useState } from "react";
import { Modal, Input, List, Checkbox, Typography, Flex } from "antd";
import { fetchAllUsersFlat } from "../../../services/users";

const { Text } = Typography;

interface StaffAssignModalProps {
  open: boolean;
  onClose: () => void;
  servedByIds: string[];
  onSave: (newUserIds: string[]) => Promise<void>;
  updating?: boolean;
}

export const StaffAssignModal: React.FC<StaffAssignModalProps> = ({
  open,
  onClose,
  servedByIds,
  onSave,
  updating = false,
}) => {
  const [staffList, setStaffList] = useState<{ value: string; label: string }[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [pendingServedByIds, setPendingServedByIds] = useState<string[]>([]);
  const [staffSearch, setStaffSearch] = useState("");
  const [staffPage, setStaffPage] = useState(1);
  const [staffPageSize, setStaffPageSize] = useState(15);

  useEffect(() => {
    if (!open) return;
    setPendingServedByIds(servedByIds);
    setStaffSearch("");
    setStaffPage(1);

    const loadStaff = async () => {
      setLoadingStaff(true);
      try {
        const users = await fetchAllUsersFlat();
        const filtered = (users || [])
          .map((u: any) => ({
            value: u._id,
            label: u.username || u.fullname || u.email || "Unknown",
          }))
          .sort((a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label));
        setStaffList(filtered);
      } catch (e) {
        console.error("Failed to load staff list", e);
      } finally {
        setLoadingStaff(false);
      }
    };
    loadStaff();
  }, [open, servedByIds]);

  const filteredStaff = useMemo(() => {
    const term = staffSearch.trim().toLowerCase();
    if (!term) return staffList;
    return staffList.filter((s) => s.label.toLowerCase().includes(term));
  }, [staffList, staffSearch]);

  const toggleStaff = (id: string) => {
    setPendingServedByIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <Modal
      title="Assign staff members"
      open={open}
      onOk={() => onSave(pendingServedByIds)}
      onCancel={onClose}
      confirmLoading={updating}
      okText="Save"
      cancelText="Cancel"
      width={560}
      destroyOnClose
    >
      <Input
        placeholder="Search staff by name…"
        value={staffSearch}
        onChange={(e) => {
          setStaffSearch(e.target.value);
          setStaffPage(1);
        }}
        allowClear
        style={{ marginBottom: 12 }}
      />
      {loadingStaff ? (
        <Text style={{ fontSize: 13, color: "#64748b" }}>Loading staff…</Text>
      ) : filteredStaff.length === 0 ? (
        <Text style={{ fontSize: 13, color: "#64748b" }}>No staff found</Text>
      ) : (
        <>
          <Flex align="center" justify="space-between" style={{ marginBottom: 8 }}>
            <Text style={{ fontSize: 12, color: "#64748b" }}>
              {pendingServedByIds.length} selected
            </Text>
          </Flex>
          <List
            bordered
            size="small"
            dataSource={filteredStaff}
            pagination={{
              current: staffPage,
              pageSize: staffPageSize,
              onChange: (page, size) => {
                setStaffPage(page);
                if (size) setStaffPageSize(size);
              },
              showSizeChanger: true,
              pageSizeOptions: ["10", "15", "30", "50"],
            }}
            renderItem={(staff) => (
              <List.Item key={staff.value}>
                <Checkbox
                  checked={pendingServedByIds.includes(staff.value)}
                  onChange={() => toggleStaff(staff.value)}
                >
                  {staff.label}
                </Checkbox>
              </List.Item>
            )}
          />
        </>
      )}
    </Modal>
  );
};

export default StaffAssignModal;
