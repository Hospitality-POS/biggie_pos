import { useRef, useState } from "react";
import { Button, Typography } from "antd";
import { PlusOutlined, TeamOutlined } from "@ant-design/icons";
import LeadTable, { LeadTableHandle } from "./LeadTable";
import LeadFormModal from "./LeadFormModal";
import LeadDetailDrawer from "./LeadDetailDrawer";
import { Lead, getLeadById } from "@services/crm/leads";

const { Text } = Typography;

const C = {
    primary: "#6c1c2c",
    primaryLight: "#f9f0f2",
    subText: "#64748b",
    darkText: "#0f172a",
    border: "#e2e8f0",
};

interface LeadsProps {
    /** Called when the user clicks "Convert to Customer" in the drawer.
     *  Parent (e.g. Customers.tsx) receives the pre-filled data and opens
     *  AddCustomerModal. If omitted, the drawer handles convert itself. */
    onConvertWithForm?: (prefill: {
        customer_name: string;
        phone?: string;
        email?: string;
        location?: string;
    }) => void;
}

const Leads: React.FC<LeadsProps> = ({ onConvertWithForm }) => {
    const tableRef = useRef<LeadTableHandle>(null);

    const [formOpen, setFormOpen] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [formMode, setFormMode] = useState<"add" | "edit">("add");

    const handleAdd = () => { setFormMode("add"); setSelectedLead(null); setFormOpen(true); };
    const handleEdit = (l: Lead) => { setFormMode("edit"); setSelectedLead(l); setFormOpen(true); };
    const handleView = (l: Lead) => { setSelectedLead(l); setDrawerOpen(true); };
    const handleSuccess = () => tableRef.current?.reload();

    const handleRefreshLead = async () => {
        if (selectedLead) {
            const shopData = localStorage.getItem("shop");
            const shop = shopData ? JSON.parse(shopData) : null;
            const shop_id = shop?._id;
            
            try {
                const updatedLead = await getLeadById(selectedLead._id, shop_id || "");
                if (updatedLead) {
                    setSelectedLead(updatedLead);
                }
            } catch (error) {
                console.error("Error refreshing lead:", error);
            }
        }
    };

    return (
        <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
            {/* Header */}
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                flexWrap: "wrap", gap: 8, padding: "16px 20px 14px",
                borderBottom: `1px solid ${C.border}`,
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ background: C.primaryLight, borderRadius: 7, padding: "5px 7px", color: C.primary, fontSize: 16, lineHeight: 1 }}>
                        <TeamOutlined />
                    </div>
                    <div>
                        <Text strong style={{ fontSize: 15, color: C.darkText, display: "block", lineHeight: 1.3 }}>
                            Lead Management
                        </Text>
                        <Text style={{ fontSize: 11, color: C.subText }}>Track and manage your sales pipeline</Text>
                    </div>
                </div>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}
                    style={{ background: C.primary, borderColor: C.primary, borderRadius: 8, height: 36, fontSize: 13 }}>
                    Add Lead
                </Button>
            </div>

            {/* Table */}
            <div style={{ padding: "16px 20px" }}>
                <LeadTable ref={tableRef} onView={handleView} onEdit={handleEdit} />
            </div>

            {/* Form Modal */}
            <LeadFormModal
                visible={formOpen}
                mode={formMode}
                lead={selectedLead}
                onClose={() => setFormOpen(false)}
                onSuccess={handleSuccess}
            />

            {/* Detail Drawer */}
            <LeadDetailDrawer
                open={drawerOpen}
                lead={selectedLead}
                onClose={() => setDrawerOpen(false)}
                onUpdated={handleSuccess}
                onConvertWithForm={onConvertWithForm}
                onRefreshLead={handleRefreshLead}
            />
        </div>
    );
};

export default Leads;