import { useEffect, useRef, useState } from "react";
import { Button, Typography } from "antd";
import {
    CalendarOutlined, CreditCardOutlined, GiftOutlined,
    MessageOutlined, StarOutlined, UserAddOutlined,
    UserOutlined, WalletOutlined,
} from "@ant-design/icons";
import CustomerTable from "./CustomerTable";
import Schedule from "../staff/schedule";
import AdminCustomersTable from "./CustomerTable";
import FeedbackTable from "./FeedbackTable";
import ConsultationTable from "./ConsultationTable";
import SubscriptionPackagesTable from "./SubscriptionPackagesTable";
import CustomerSubscriptionsTable from "./CustomerSubscriptionsTable";
import AddCustomerModal from "./AddCustomerModal";

const { Text } = Typography;

// ── Palette ────────────────────────────────────────────────────────────────
const C = {
    primary: "#6c1c2c",
    primaryLight: "#f9f0f2",
    subText: "#64748b",
    darkText: "#0f172a",
    border: "#e2e8f0",
    bg: "#f8fafc",
};

// ── Mobile hook ────────────────────────────────────────────────────────────
const useIsMobile = () => {
    const [v, setV] = useState(window.innerWidth < 768);
    useEffect(() => {
        const h = () => setV(window.innerWidth < 768);
        window.addEventListener("resize", h);
        return () => window.removeEventListener("resize", h);
    }, []);
    return v;
};

// ── Tenant flags ───────────────────────────────────────────────────────────
const getTenantFlags = () => {
    try {
        const stored = localStorage.getItem("tenant");
        if (!stored) return { hasPOS: true, hasAccounting: false, hasMteja: false };
        const tenant = JSON.parse(stored);
        return {
            hasPOS: !!(tenant?.pos_integration?.enabled ?? true),
            hasAccounting: !!(tenant?.accounting_database?.enabled || tenant?.modules?.accounting),
            hasMteja: tenant?.modules?.crm === true,
        };
    } catch {
        return { hasPOS: true, hasAccounting: false, hasMteja: false };
    }
};

const getPosMode = (): string =>
    localStorage.getItem("posMode") ?? "service";

// ── Tab config ─────────────────────────────────────────────────────────────
type TabItem = { key: string; label: string; icon: React.ReactNode };

const getTabConfig = (): TabItem[] => {
    const posMode = getPosMode();
    const isHospital = posMode === "hospital";

    if (isHospital) {
        // Hospital: patients, appointments, consultations, packages — no gift cards / feedback
        return [
            { key: "customers", label: "Patients", icon: <UserOutlined /> },
            { key: "schedule", label: "Appointments", icon: <CalendarOutlined /> },
            { key: "consultations", label: "Consultations", icon: <StarOutlined /> },
            { key: "packages", label: "Packages", icon: <CreditCardOutlined /> },
            { key: "subscriptions", label: "Subscriptions", icon: <WalletOutlined /> },
        ];
    }

    return [
        { key: "customers", label: "Customers", icon: <UserOutlined /> },
        { key: "packages", label: "Packages", icon: <CreditCardOutlined /> },
        { key: "subscriptions", label: "Subscriptions", icon: <WalletOutlined /> },
        { key: "schedule", label: "Bookings", icon: <CalendarOutlined /> },
        { key: "consultations", label: "Consultations", icon: <StarOutlined /> },
        { key: "feedback", label: "Feedback", icon: <MessageOutlined /> },
        { key: "giftCards", label: "Gift Cards", icon: <GiftOutlined /> },
    ];
};

// ── TabNav ─────────────────────────────────────────────────────────────────
const TabNav = ({
    tabs,
    active,
    onChange,
}: {
    tabs: TabItem[];
    active: string;
    onChange: (key: string) => void;
}) => (
    <div style={{
        display: "flex", flexWrap: "wrap", gap: 6,
        padding: "0 0 16px", borderBottom: `1px solid ${C.border}`,
        marginBottom: 20,
    }}>
        {tabs.map((tab) => {
            const isActive = tab.key === active;
            return (
                <button
                    key={tab.key}
                    onClick={() => onChange(tab.key)}
                    style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        padding: "6px 14px", borderRadius: 20, cursor: "pointer",
                        fontSize: 13, fontWeight: isActive ? 600 : 400,
                        border: isActive ? `1.5px solid ${C.primary}` : `1px solid ${C.border}`,
                        background: isActive ? C.primary : "#fff",
                        color: isActive ? "#fff" : C.subText,
                        transition: "all 0.15s",
                        outline: "none",
                    }}
                >
                    <span style={{ fontSize: 13, lineHeight: 1 }}>{tab.icon}</span>
                    {tab.label}
                </button>
            );
        })}
    </div>
);

// ── Main ───────────────────────────────────────────────────────────────────
function Customers() {
    const isMobile = useIsMobile();
    const { hasPOS, hasAccounting, hasMteja } = getTenantFlags();

    const [addCustomerModalVisible, setAddCustomerModalVisible] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<any>(null);
    const [modalMode, setModalMode] = useState<"add" | "edit">("add");
    const [activeTab, setActiveTab] = useState("customers");
    const customerTableRef = useRef<any>(null);

    const ALL_TABS = getTabConfig();
    const isHospital = getPosMode() === "hospital";
    // Hospital always shows full tabs (appointments are core, not Mteja-gated)
    // Other modes: hide tabs if Mteja not enabled or accounting-only
    const showOnlyCustomers = !isHospital && ((hasAccounting && !hasPOS) || !hasMteja);

    const handleCustomerAdded = () => customerTableRef.current?.reload();

    const handleAddCustomer = () => {
        setModalMode("add");
        setEditingCustomer(null);
        setAddCustomerModalVisible(true);
    };

    const handleEditCustomer = (customer: any) => {
        setModalMode("edit");
        setEditingCustomer(customer);
        setAddCustomerModalVisible(true);
    };

    const handleCloseModal = () => {
        setAddCustomerModalVisible(false);
        setEditingCustomer(null);
        setModalMode("add");
    };

    const renderTab = () => {
        switch (activeTab) {
            case "customers": return <CustomerTable ref={customerTableRef} onEditCustomer={handleEditCustomer} />;
            case "packages": return <SubscriptionPackagesTable />;
            case "subscriptions": return <CustomerSubscriptionsTable />;
            case "schedule": return <Schedule />;
            case "consultations": return <ConsultationTable />;
            case "feedback": return <FeedbackTable />;
            case "giftCards": return <AdminCustomersTable nonCustomerEnabled={true} />;
            default: return null;
        }
    };

    // ── Shared header ────────────────────────────────────────────────────
    const Header = ({ showAdd }: { showAdd: boolean }) => (
        <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexWrap: "wrap", gap: 8,
            padding: isMobile ? "14px 14px 12px" : "16px 20px 14px",
            borderBottom: `1px solid ${C.border}`,
        }}>
            <div>
                <Text strong style={{ fontSize: isMobile ? 15 : 17, color: C.darkText, display: "block", lineHeight: 1.3 }}>
                    {isHospital ? "Patient Management" : "Customer Management"}
                </Text>
                <Text style={{ fontSize: 11, color: C.subText, lineHeight: 1.3 }}>
                    {showOnlyCustomers
                        ? `Manage your ${getPosMode() === "hospital" ? "patients" : "customers"}`
                        : getPosMode() === "hospital"
                            ? "Patients, appointments, services & more"
                            : "Customers, subscriptions, bookings & more"}
                </Text>
            </div>
            {showAdd && (
                <Button
                    type="primary" icon={<UserAddOutlined />} onClick={handleAddCustomer}
                    style={{
                        background: C.primary, borderColor: C.primary, borderRadius: 8,
                        height: isMobile ? 34 : 36, fontSize: isMobile ? 12 : 13,
                    }}
                >
                    {isMobile ? "Add" : "Add Customer"}
                </Button>
            )}
        </div>
    );

    // ── Wrapper card ─────────────────────────────────────────────────────
    const wrap = (content: React.ReactNode, showAdd = true) => (
        <div style={{
            background: "#fff",
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            overflow: "hidden",
        }}>
            <Header showAdd={showAdd} />
            <div style={{ padding: isMobile ? "14px 14px" : "16px 20px" }}>
                {content}
            </div>
        </div>
    );

    // ── Customers only (no Mteja, or accounting-only) ────────────────────
    if (showOnlyCustomers) {
        return (
            <>
                {wrap(
                    <CustomerTable ref={customerTableRef} onEditCustomer={handleEditCustomer} />,
                )}
                <AddCustomerModal
                    visible={addCustomerModalVisible}
                    onClose={handleCloseModal}
                    onSuccess={handleCustomerAdded}
                    customer={editingCustomer}
                    mode={modalMode}
                />
            </>
        );
    }

    // ── Mteja enabled: full tabs ─────────────────────────────────────────
    return (
        <>
            {wrap(
                <>
                    <TabNav tabs={ALL_TABS} active={activeTab} onChange={setActiveTab} />
                    {renderTab()}
                </>,
                activeTab === "customers",
            )}
            <AddCustomerModal
                visible={addCustomerModalVisible}
                onClose={handleCloseModal}
                onSuccess={handleCustomerAdded}
                customer={editingCustomer}
                mode={modalMode}
            />
        </>
    );
}

export default Customers;