import { useEffect, useMemo, useState } from "react";
import {
    Button, DatePicker, Form, Input, Modal, Radio, Select, Typography, message,
} from "antd";
import { CalendarOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useAppDispatch } from "src/store";
import {
    ActivityLocationType, ActivityPriority, ActivityType, LeadActivity,
    createLeadActivity, updateLeadActivity,
} from "@services/crm/leadActivities";
import { fetchAllLeads } from "@services/crm/leads";
import { fetchAllCustomers } from "@services/customers";
import { fetchAllUsersFlat } from "@services/users";
import { THEME_C } from "@utils/getPrimaryColor";

const { Text } = Typography;
const { TextArea } = Input;

const C = THEME_C;

const ACTIVITY_TYPES: { value: ActivityType; label: string }[] = [
    { value: "call", label: "Call" },
    { value: "email", label: "Email" },
    { value: "meeting", label: "Meeting" },
    { value: "demo", label: "Demo" },
    { value: "note", label: "Note" },
    { value: "task", label: "Task" },
    { value: "whatsapp", label: "WhatsApp" },
    { value: "site_visit", label: "Site Visit" },
    { value: "ticket", label: "Ticket" },
    { value: "other", label: "Other" },
];

const PRIORITIES: { value: ActivityPriority; label: string }[] = [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
    { value: "urgent", label: "Urgent" },
];

const LOCATION_TYPES: { value: ActivityLocationType; label: string }[] = [
    { value: "online", label: "Online" },
    { value: "in_person", label: "In Person" },
    { value: "phone", label: "Phone" },
];

interface ActivityFormModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    activity?: LeadActivity | null;
    /** Pre-select an entity when creating from a lead/customer detail page */
    defaultEntity?: { type: "lead" | "customer"; id: string };
    defaultDate?: Date;
}

const ActivityFormModal: React.FC<ActivityFormModalProps> = ({
    open, onClose, onSuccess, activity, defaultEntity, defaultDate,
}) => {
    const [form] = Form.useForm();
    const dispatch = useAppDispatch();
    const [submitting, setSubmitting] = useState(false);
    const [entityType, setEntityType] = useState<"lead" | "customer">(defaultEntity?.type || "lead");
    const [activityType, setActivityType] = useState<ActivityType>("call");
    const [locationType, setLocationType] = useState<ActivityLocationType | undefined>(undefined);

    const isEditMode = !!activity;
    const shopId = JSON.parse(localStorage.getItem("shop") || "{}")?._id || localStorage.getItem("shopId") || "";

    const { data: leadsData } = useQuery({
        queryKey: ["leads", "picker"],
        queryFn: () => fetchAllLeads({ shop_id: shopId, limit: 500 }),
        enabled: open && entityType === "lead",
        staleTime: 30_000,
    });
    const { data: customersData } = useQuery({
        queryKey: ["customers", "picker"],
        queryFn: () => fetchAllCustomers({ limit: 500 }),
        enabled: open && entityType === "customer",
        staleTime: 30_000,
    });
    const { data: usersData } = useQuery({
        queryKey: ["users", "flat"],
        queryFn: fetchAllUsersFlat,
        enabled: open && activityType === "meeting",
        staleTime: 60_000,
    });

    const leadOptions = useMemo(() => (leadsData?.leads || []).map((l: any) => ({
        label: l.entity_type === "company" ? (l.company_name || "Unnamed Company") : (l.lead_name || "Unnamed Individual"),
        value: l._id,
    })), [leadsData]);

    const customerOptions = useMemo(() => {
        const list = Array.isArray(customersData) ? customersData : customersData?.data || [];
        return list.map((c: any) => ({
            label: c.company_name || c.customer_name || c.name || "Unnamed",
            value: c._id,
        }));
    }, [customersData]);

    const userOptions = useMemo(() => (usersData || []).map((u: any) => ({
        label: u.fullname || u.username,
        value: u._id,
    })), [usersData]);

    useEffect(() => {
        if (!open) return;
        if (isEditMode && activity) {
            const leadId = typeof activity.lead_id === "object" ? activity.lead_id?._id : activity.lead_id;
            const customerId = typeof activity.customer_id === "object" ? activity.customer_id?._id : activity.customer_id;
            setEntityType(leadId ? "lead" : "customer");
            setActivityType(activity.type);
            setLocationType(activity.location_type);
            form.setFieldsValue({
                entity_id: leadId || customerId,
                type: activity.type,
                subject: activity.subject,
                description: activity.description,
                activity_date: activity.activity_date ? dayjs(activity.activity_date) : dayjs(),
                priority: activity.priority || "medium",
                location_type: activity.location_type,
                meeting_link: activity.meeting_link,
                attendees: (activity.attendees || []).map((a: any) => (typeof a === "object" ? a._id : a)),
                next_action_date: activity.next_action_date ? dayjs(activity.next_action_date) : undefined,
            });
        } else {
            form.resetFields();
            setEntityType(defaultEntity?.type || "lead");
            setActivityType("call");
            setLocationType(undefined);
            form.setFieldsValue({
                entity_id: defaultEntity?.id,
                type: "call",
                priority: "medium",
                activity_date: defaultDate ? dayjs(defaultDate) : dayjs(),
            });
        }
    }, [open, isEditMode, activity, defaultEntity, defaultDate, form]);

    const handleSubmit = async (values: any) => {
        setSubmitting(true);
        try {
            const payload: any = {
                type: values.type,
                subject: values.subject,
                description: values.description,
                activity_date: values.activity_date?.toISOString(),
                priority: values.priority,
                next_action_date: values.next_action_date?.toISOString(),
                shop_id: shopId,
            };
            if (entityType === "lead") payload.lead_id = values.entity_id;
            else payload.customer_id = values.entity_id;

            if (values.type === "meeting") {
                payload.location_type = values.location_type;
                if (values.location_type === "online") payload.meeting_link = values.meeting_link;
                payload.attendees = values.attendees || [];
            }

            if (isEditMode && activity) {
                await dispatch(updateLeadActivity({ id: activity._id, data: payload }) as any).unwrap();
            } else {
                if (!values.entity_id) {
                    message.error(`Please select a ${entityType}`);
                    setSubmitting(false);
                    return;
                }
                await dispatch(createLeadActivity(payload) as any).unwrap();
            }
            onSuccess?.();
            onClose();
        } catch {
            /* error toast already shown by thunk */
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            open={open}
            onCancel={onClose}
            destroyOnClose
            width="min(560px, 96vw)"
            title={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ background: C.primaryLight, borderRadius: 7, padding: "4px 6px", color: C.primary, fontSize: 14, lineHeight: 1 }}>
                        {isEditMode ? <EditOutlined /> : <CalendarOutlined />}
                    </div>
                    <Text strong style={{ fontSize: 14 }}>{isEditMode ? "Edit Activity" : "New Activity"}</Text>
                </div>
            }
            footer={
                <div style={{ display: "flex", gap: 10 }}>
                    <Button block onClick={onClose} style={{ borderRadius: 8, height: 38 }}>Cancel</Button>
                    <Button block type="primary" loading={submitting} onClick={() => form.submit()}
                        icon={isEditMode ? <EditOutlined /> : <PlusOutlined />}
                        style={{ background: C.primary, borderColor: C.primary, borderRadius: 8, height: 38 }}>
                        {isEditMode ? "Save Changes" : "Create Activity"}
                    </Button>
                </div>
            }
        >
            <Form form={form} layout="vertical" onFinish={handleSubmit}>
                {!isEditMode && (
                    <Form.Item label="Link To" style={{ marginBottom: 12 }}>
                        <Radio.Group
                            value={entityType}
                            onChange={(e) => { setEntityType(e.target.value); form.setFieldsValue({ entity_id: undefined }); }}
                            style={{ width: "100%" }}
                        >
                            <Radio.Button value="lead" style={{ width: "50%", textAlign: "center" }}>Lead</Radio.Button>
                            <Radio.Button value="customer" style={{ width: "50%", textAlign: "center" }}>Customer</Radio.Button>
                        </Radio.Group>
                    </Form.Item>
                )}

                <Form.Item name="entity_id" label={entityType === "lead" ? "Lead" : "Customer"}
                    rules={[{ required: true, message: `Select a ${entityType}` }]}
                    style={{ marginBottom: 12 }}>
                    <Select
                        showSearch allowClear optionFilterProp="label"
                        placeholder={`Select ${entityType}`}
                        disabled={isEditMode}
                        options={entityType === "lead" ? leadOptions : customerOptions}
                        style={{ borderRadius: 8 }}
                    />
                </Form.Item>

                <div style={{ display: "flex", gap: 10 }}>
                    <Form.Item name="type" label="Activity Type"
                        rules={[{ required: true, message: "Select activity type" }]}
                        style={{ flex: 1, marginBottom: 12 }}>
                        <Select
                            options={ACTIVITY_TYPES}
                            onChange={(v) => setActivityType(v)}
                            style={{ borderRadius: 8 }}
                        />
                    </Form.Item>
                    <Form.Item name="priority" label="Priority" style={{ flex: 1, marginBottom: 12 }}>
                        <Select options={PRIORITIES} style={{ borderRadius: 8 }} />
                    </Form.Item>
                </div>

                <Form.Item name="activity_date" label="Date & Time"
                    rules={[{ required: true, message: "Select date & time" }]}
                    style={{ marginBottom: 12 }}>
                    <DatePicker showTime format="DD MMM YYYY, h:mm A" style={{ width: "100%", borderRadius: 8 }} />
                </Form.Item>

                <Form.Item name="subject" label="Subject" style={{ marginBottom: 12 }}>
                    <Input placeholder="e.g. Follow-up call, Support issue…" style={{ borderRadius: 8 }} />
                </Form.Item>

                <Form.Item name="description" label="Description" style={{ marginBottom: 12 }}>
                    <TextArea rows={3} placeholder="Details…" style={{ borderRadius: 8 }} />
                </Form.Item>

                {activityType === "meeting" && (
                    <>
                        <Form.Item name="location_type" label="Meeting Location"
                            rules={[{ required: true, message: "Select meeting location" }]}
                            style={{ marginBottom: 12 }}>
                            <Select
                                options={LOCATION_TYPES}
                                placeholder="Where will this meeting happen?"
                                onChange={(v) => setLocationType(v)}
                                style={{ borderRadius: 8 }}
                            />
                        </Form.Item>
                        {locationType === "online" && (
                            <Form.Item name="meeting_link" label="Meeting Link"
                                rules={[{ required: true, message: "Add the online meeting link" }]}
                                style={{ marginBottom: 12 }}>
                                <Input placeholder="https://meet.google.com/… or Zoom/Teams link" style={{ borderRadius: 8 }} />
                            </Form.Item>
                        )}
                        <Form.Item name="attendees" label="Invite Team Members" style={{ marginBottom: 12 }}>
                            <Select
                                mode="multiple" allowClear showSearch optionFilterProp="label"
                                placeholder="Select team members to invite"
                                options={userOptions}
                                maxTagCount="responsive"
                                style={{ borderRadius: 8 }}
                            />
                        </Form.Item>
                    </>
                )}

                <Form.Item name="next_action_date" label="Follow-up Date (optional)" style={{ marginBottom: 0 }}>
                    <DatePicker showTime format="DD MMM YYYY, h:mm A" style={{ width: "100%", borderRadius: 8 }} />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default ActivityFormModal;
