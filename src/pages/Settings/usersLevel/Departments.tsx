import { useEffect, useRef, useState } from "react";
import { ActionType, ProTable } from "@ant-design/pro-components";
import {
    ApartmentOutlined, DeleteOutlined, EditOutlined,
    EyeOutlined, MoreOutlined, PlusOutlined, TeamOutlined,
} from "@ant-design/icons";
import {
    App, Avatar, Button, Drawer, Dropdown, Form, Input,
    Modal, Select, Space, Tag, Typography, message,
} from "antd";
import { useAppDispatch } from "../../../store";
import {
    fetchAllDepartments, getDepartmentById, createDepartment,
    updateDepartment, deleteDepartment, getDepartmentMembers,
    Department, DepartmentMember,
} from "@services/crm/departments";
import { fetchUserRoles } from "@services/users";
import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";

const { Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const C = {
    primary: "#6c1c2c",
    primaryLight: "#f9f0f2",
    green: "#10b981",
    red: "#ef4444",
    blue: "#3b82f6",
    purple: "#8b5cf6",
    orange: "#f59e0b",
    teal: "#0d9488",
    subText: "#64748b",
    darkText: "#0f172a",
    border: "#e2e8f0",
    bg: "#f8fafc",
};

// ── Department Form Modal ─────────────────────────────────────────────────────
interface DeptFormModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    department?: Department | null;
    mode?: "add" | "edit";
    departments?: Department[];   // for parent selector
}

const DeptFormModal: React.FC<DeptFormModalProps> = ({
    visible, onClose, onSuccess, department, mode = "add", departments = [],
}) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const dispatch = useAppDispatch();
    const isEdit = mode === "edit";

    const { data: rolesData } = useQuery({
        queryKey: ["roles-list"],
        queryFn: fetchUserRoles,
        staleTime: 60_000,
        enabled: visible,
    });
    const roles = Array.isArray(rolesData) ? rolesData : [];

    useEffect(() => {
        if (!visible) return;
        if (isEdit && department) {
            form.setFieldsValue({
                ...department,
                parent_id: typeof department.parent_id === "object" ? (department.parent_id as any)?._id : department.parent_id,
                associated_roles: ((department.associated_roles || []) as any[]).map((r: any) => r._id ?? r),
            });
        } else {
            form.resetFields();
        }
    }, [visible, mode, department, form]);

    const handleSubmit = async (values: any) => {
        setLoading(true);
        try {
            const tenant_id = JSON.parse(localStorage.getItem("tenant") || "{}")?._id;
            const payload = { ...values, tenant_id };
            if (isEdit && department?._id) {
                await dispatch(updateDepartment({ id: department._id, data: payload })).unwrap();
            } else {
                await dispatch(createDepartment(payload)).unwrap();
            }
            form.resetFields();
            onClose();
            onSuccess?.();
        } catch { } finally { setLoading(false); }
    };

    // Exclude self from parent dropdown when editing
    const parentOptions = departments.filter(d => !isEdit || d._id !== department?._id);

    return (
        <Modal
            open={visible}
            onCancel={() => { if (!loading) { form.resetFields(); onClose(); } }}
            destroyOnClose style={{ top: 20 }} width="min(560px, 96vw)" footer={null}
            styles={{ body: { padding: "20px 24px 24px", maxHeight: "80vh", overflowY: "auto" } }}
            title={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ background: isEdit ? "#eff6ff" : C.primaryLight, borderRadius: 7, padding: "4px 6px", color: isEdit ? C.blue : C.primary, fontSize: 14, lineHeight: 1 }}>
                        {isEdit ? <EditOutlined /> : <ApartmentOutlined />}
                    </div>
                    <Text strong style={{ fontSize: 14 }}>{isEdit ? "Edit Department" : "New Department"}</Text>
                </div>
            }
        >
            <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 4 }}>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <Form.Item name="name" label="Department Name" rules={[{ required: true }]} style={{ flex: "1 1 220px" }}>
                        <Input placeholder="e.g. Sales, Field Agents" style={{ borderRadius: 8 }} autoFocus />
                    </Form.Item>
                    <Form.Item name="code" label="Short Code" style={{ flex: "1 1 120px" }}>
                        <Input placeholder="SALES" style={{ borderRadius: 8, textTransform: "uppercase" }} maxLength={10} />
                    </Form.Item>
                </div>

                <Form.Item name="description" label="Description">
                    <TextArea rows={2} style={{ borderRadius: 8 }} />
                </Form.Item>

                {parentOptions.length > 0 && (
                    <Form.Item name="parent_id" label="Parent Department (optional)">
                        <Select placeholder="Select parent department" allowClear>
                            {parentOptions.map(d => (
                                <Option key={d._id} value={d._id}>{d.name}{d.code ? ` (${d.code})` : ""}</Option>
                            ))}
                        </Select>
                    </Form.Item>
                )}

                {roles.length > 0 && (
                    <Form.Item name="associated_roles" label="Associated Roles (optional)">
                        <Select mode="multiple" placeholder="Which roles belong to this department?" allowClear>
                            {roles.map((r: any) => (
                                <Option key={r._id} value={r._id}>{r.role_type}</Option>
                            ))}
                        </Select>
                    </Form.Item>
                )}

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <Form.Item name="color" label="Color (hex)" style={{ flex: "1 1 130px" }}>
                        <Input placeholder="#6c1c2c" style={{ borderRadius: 8 }} maxLength={7} />
                    </Form.Item>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                    <Button block onClick={() => { form.resetFields(); onClose(); }} disabled={loading} style={{ borderRadius: 8, height: 38 }}>Cancel</Button>
                    <Button block type="primary" htmlType="submit" loading={loading}
                        style={{ background: C.primary, borderColor: C.primary, borderRadius: 8, height: 38, fontWeight: 500 }}>
                        {isEdit ? "Update Department" : "Create Department"}
                    </Button>
                </div>
            </Form>
        </Modal>
    );
};

// ── Department Detail Drawer ──────────────────────────────────────────────────
interface DeptDetailDrawerProps {
    open: boolean;
    onClose: () => void;
    deptId: string | null;
    onEdit: (d: Department) => void;
}

const DeptDetailDrawer: React.FC<DeptDetailDrawerProps> = ({ open, onClose, deptId, onEdit }) => {
    const { data: dept, isLoading } = useQuery({
        queryKey: ["department-detail", deptId],
        queryFn: () => getDepartmentById(deptId!),
        enabled: open && !!deptId,
        staleTime: 30_000,
    });
    const { data: membersData } = useQuery({
        queryKey: ["department-members", deptId],
        queryFn: () => getDepartmentMembers(deptId!),
        enabled: open && !!deptId,
        staleTime: 30_000,
    });
    const members: DepartmentMember[] = membersData?.members || [];

    if (!open) return null;

    return (
        <Drawer
            open={open} onClose={onClose} placement="right" width="min(480px, 98vw)" destroyOnClose
            styles={{ body: { padding: "16px 20px", background: C.bg } }}
            title={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ background: C.primaryLight, borderRadius: 7, padding: "4px 6px", color: C.primary, fontSize: 14, lineHeight: 1 }}>
                        <ApartmentOutlined />
                    </div>
                    <div>
                        <Text strong style={{ fontSize: 14 }}>{dept?.name ?? "Department"}</Text>
                        {dept?.code && <Tag style={{ marginLeft: 6, fontSize: 10, borderRadius: 4, border: "none", background: "#f1f5f9" }}>{dept.code}</Tag>}
                    </div>
                </div>
            }
            extra={dept && <Button size="small" icon={<EditOutlined />} onClick={() => onEdit(dept)}>Edit</Button>}
        >
            {dept && (
                <>
                    {/* Stats */}
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
                        {[
                            { label: "Members", value: dept.member_count ?? members.length, color: C.blue },
                            { label: "Targets", value: dept.targets?.length ?? 0, color: C.primary },
                            { label: "Budgets", value: dept.budgets?.length ?? 0, color: C.teal },
                            { label: "Sub-depts", value: dept.children?.length ?? 0, color: C.purple },
                        ].map(s => (
                            <div key={s.label} style={{ flex: "1 1 100px", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
                                <Text strong style={{ fontSize: 20, color: s.color, display: "block" }}>{s.value}</Text>
                                <Text style={{ fontSize: 11, color: C.subText }}>{s.label}</Text>
                            </div>
                        ))}
                    </div>

                    {/* Details */}
                    <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
                        {dept.description && (
                            <div style={{ padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
                                <Text style={{ fontSize: 10, color: C.subText, display: "block" }}>Description</Text>
                                <Text style={{ fontSize: 12 }}>{dept.description}</Text>
                            </div>
                        )}
                        {dept.parent_id && (
                            <div style={{ padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
                                <Text style={{ fontSize: 10, color: C.subText, display: "block" }}>Parent Department</Text>
                                <Text style={{ fontSize: 12 }}>{typeof dept.parent_id === "object" ? dept.parent_id.name : dept.parent_id}</Text>
                            </div>
                        )}
                        {dept.head_user_id && (
                            <div style={{ padding: "6px 0" }}>
                                <Text style={{ fontSize: 10, color: C.subText, display: "block" }}>Head</Text>
                                <Text style={{ fontSize: 12 }}>
                                    {typeof dept.head_user_id === "object" ? dept.head_user_id.fullname : dept.head_user_id}
                                </Text>
                            </div>
                        )}
                    </div>

                    {/* Sub-departments */}
                    {(dept.children?.length ?? 0) > 0 && (
                        <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
                            <Text strong style={{ fontSize: 11, color: C.purple, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 8 }}>
                                Sub-Departments
                            </Text>
                            {dept.children!.map(child => (
                                <div key={child._id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: `1px solid ${C.border}` }}>
                                    <ApartmentOutlined style={{ color: C.purple, fontSize: 12 }} />
                                    <Text style={{ fontSize: 12 }}>{child.name}</Text>
                                    {child.code && <Tag style={{ fontSize: 10, border: "none", background: "#f1f5f9" }}>{child.code}</Tag>}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Members */}
                    <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px" }}>
                        <Text strong style={{ fontSize: 11, color: C.blue, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 10 }}>
                            Members ({members.length})
                        </Text>
                        {members.length === 0 ? (
                            <Text style={{ fontSize: 12, color: C.subText }}>No members assigned yet.</Text>
                        ) : (
                            members.map(m => (
                                <div key={m._id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
                                    <Avatar size={28} src={m.thumbnail} style={{ background: C.primaryLight, color: C.primary, fontSize: 11, flexShrink: 0 }}>
                                        {m.fullname?.[0]?.toUpperCase()}
                                    </Avatar>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <Text style={{ fontSize: 12, fontWeight: 500, display: "block" }}>{m.fullname}</Text>
                                        <Text style={{ fontSize: 11, color: C.subText }}>{m.email}</Text>
                                    </div>
                                    {m.roleId && (
                                        <Tag style={{ fontSize: 10, border: "none", background: "#eff6ff", color: C.blue }}>
                                            {(m.roleId as any).role_type}
                                        </Tag>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}
        </Drawer>
    );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const Departments = () => {
    const actionRef = useRef<ActionType>();
    const queryClient = useQueryClient();
    const dispatch = useAppDispatch();

    const [formOpen, setFormOpen] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selected, setSelected] = useState<Department | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [mode, setMode] = useState<"add" | "edit">("add");

    // Pre-fetch departments for parent selector in form
    const { data: allDepts } = useQuery({
        queryKey: ["departments"],
        queryFn: fetchAllDepartments,
        staleTime: 60_000,
    });
    const departments = allDepts?.departments || [];

    const handleAdd = () => { setMode("add"); setSelected(null); setFormOpen(true); };
    const handleEdit = (d: Department) => { setMode("edit"); setSelected(d); setFormOpen(true); setDrawerOpen(false); };
    const handleView = (d: Department) => { setSelectedId(d._id); setDrawerOpen(true); };

    const handleDelete = (id: string) => {
        Modal.confirm({
            title: "Delete Department?",
            content: "Members will be unassigned from this department. This cannot be undone.",
            okText: "Delete",
            okType: "danger",
            onOk: async () => {
                try {
                    await dispatch(deleteDepartment(id)).unwrap();
                    actionRef.current?.reload();
                    queryClient.invalidateQueries({ queryKey: ["departments"] });
                } catch { message.error("Failed to delete department"); }
            },
        });
    };

    const handleSuccess = () => {
        actionRef.current?.reload();
        queryClient.invalidateQueries({ queryKey: ["departments"] });
    };

    const columns = [
        {
            title: "Department", dataIndex: "name",
            render: (name: string, r: Department) => (
                <Space size={8}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: r.color || C.primary, flexShrink: 0 }} />
                    <div>
                        <Text strong style={{ fontSize: 13 }}>{name}</Text>
                        {r.code && <Tag style={{ marginLeft: 6, fontSize: 10, border: "none", background: "#f1f5f9" }}>{r.code}</Tag>}
                        {r.description && <Text style={{ fontSize: 11, color: C.subText, display: "block" }} ellipsis={{ tooltip: r.description }}>{r.description}</Text>}
                    </div>
                </Space>
            ),
        },
        {
            title: "Head", dataIndex: "head_user_id", search: false,
            render: (h: any) => h
                ? <Text style={{ fontSize: 12 }}>{h.fullname || h.username}</Text>
                : <Text style={{ fontSize: 12, color: "#94a3b8" }}>—</Text>,
        },
        {
            title: "Parent", dataIndex: "parent_id", search: false,
            render: (p: any) => p
                ? <Text style={{ fontSize: 12, color: C.purple }}>{p.name ?? p}</Text>
                : <Text style={{ fontSize: 12, color: "#94a3b8" }}>—</Text>,
        },
        {
            title: "Roles", dataIndex: "associated_roles", search: false,
            render: (roles: any[]) => roles?.length
                ? <Text style={{ fontSize: 12, color: C.blue }}>{roles.length} role{roles.length > 1 ? "s" : ""}</Text>
                : <Text style={{ fontSize: 12, color: "#94a3b8" }}>—</Text>,
        },
        {
            title: "Actions", key: "actions", search: false, fixed: "right" as const, width: 56,
            render: (_: any, r: Department) => (
                <Dropdown trigger={["click"]} menu={{
                    items: [
                        { key: "view", icon: <EyeOutlined />, label: "View Details", onClick: () => handleView(r) },
                        { key: "edit", icon: <EditOutlined />, label: "Edit Department", onClick: () => handleEdit(r) },
                        { key: "delete", icon: <DeleteOutlined />, label: "Delete", danger: true, onClick: () => handleDelete(r._id) },
                    ]
                }}>
                    <Button type="text" icon={<MoreOutlined />} style={{ borderRadius: 6 }} />
                </Dropdown>
            ),
        },
    ];

    return (
        <App>
            <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, padding: "16px 20px 14px", borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ background: C.primaryLight, borderRadius: 7, padding: "5px 7px", color: C.primary, fontSize: 16, lineHeight: 1 }}>
                            <ApartmentOutlined />
                        </div>
                        <div>
                            <Text strong style={{ fontSize: 15, color: C.darkText, display: "block", lineHeight: 1.3 }}>Departments</Text>
                            <Text style={{ fontSize: 11, color: C.subText }}>Tenant-wide organisational units</Text>
                        </div>
                    </div>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}
                        style={{ background: C.primary, borderColor: C.primary, borderRadius: 8, height: 36, fontSize: 13 }}>
                        New Department
                    </Button>
                </div>

                <div style={{ padding: "16px 20px" }}>
                    <ProTable<Department>
                        rowKey="_id"
                        columns={columns}
                        actionRef={actionRef}
                        request={async (params) => {
                            const res = await fetchAllDepartments({ search: params.name });
                            return { data: res.departments, success: true, total: res.total };
                        }}
                        cardBordered={false}
                        pagination={{ pageSize: 15, showSizeChanger: true }}
                        search={{ searchText: "Search", resetText: "Reset", labelWidth: "auto" }}
                        headerTitle={
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <TeamOutlined style={{ color: C.primary }} />
                                <Text strong style={{ fontSize: 14 }}>All Departments</Text>
                            </div>
                        }
                        options={{ reload: () => { actionRef.current?.reload(); queryClient.invalidateQueries({ queryKey: ["departments"] }); } }}
                        scroll={{ x: "100%" }}
                        size="small"
                    />
                </div>
            </div>

            <DeptFormModal
                visible={formOpen} mode={mode} department={selected} departments={departments}
                onClose={() => setFormOpen(false)} onSuccess={handleSuccess}
            />
            <DeptDetailDrawer
                open={drawerOpen} deptId={selectedId}
                onClose={() => setDrawerOpen(false)} onEdit={handleEdit}
            />
        </App>
    );
};

export default Departments;