import { useRef, useState } from "react";
import { PlusOutlined, NotificationOutlined } from "@ant-design/icons";
import { Typography, Button } from "antd";
import { Campaign } from "@services/crm/campaigns";
import { CampaignTable, CampaignTableHandle } from "./CampaignTable";
import { CampaignFormModal } from "./CampaignFormModal";
import { CampaignDetailDrawer } from "./CampaignDetailDrawer";

const { Text } = Typography;

const C = {
    primary: "#6c1c2c",
    primaryLight: "#f9f0f2",
    subText: "#64748b",
    darkText: "#0f172a",
    border: "#e2e8f0",
} as const;

const Campaigns = () => {
    const tableRef = useRef<CampaignTableHandle>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selected, setSelected] = useState<Campaign | null>(null);
    const [mode, setMode] = useState<"add" | "edit">("add");

    const handleAdd = () => { setMode("add"); setSelected(null); setFormOpen(true); };
    const handleEdit = (c: Campaign) => { setMode("edit"); setSelected(c); setFormOpen(true); };
    const handleView = (c: Campaign) => { setSelected(c); setDrawerOpen(true); };
    const handleSuccess = () => tableRef.current?.reload();

    return (
        <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, padding: "16px 20px 14px", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ background: C.primaryLight, borderRadius: 7, padding: "5px 7px", color: C.primary, fontSize: 16, lineHeight: 1 }}>
                        <NotificationOutlined />
                    </div>
                    <div>
                        <Text strong style={{ fontSize: 15, color: C.darkText, display: "block", lineHeight: 1.3 }}>Campaign Management</Text>
                        <Text style={{ fontSize: 11, color: C.subText }}>Track marketing campaigns &amp; ROI</Text>
                    </div>
                </div>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}
                    style={{ background: C.primary, borderColor: C.primary, borderRadius: 8, height: 36, fontSize: 13 }}>
                    New Campaign
                </Button>
            </div>

            <div style={{ padding: "16px 20px" }}>
                <CampaignTable ref={tableRef} onView={handleView} onEdit={handleEdit} />
            </div>

            <CampaignFormModal
                visible={formOpen} mode={mode} campaign={selected}
                onClose={() => setFormOpen(false)} onSuccess={handleSuccess}
            />
            <CampaignDetailDrawer
                open={drawerOpen} campaign={selected}
                onClose={() => setDrawerOpen(false)}
            />
        </div>
    );
};

export default Campaigns;