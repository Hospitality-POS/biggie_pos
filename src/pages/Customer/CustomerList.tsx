import { useEffect, useRef, useState, useMemo } from "react";
import { Button, Typography } from "antd";
import {
    CalendarOutlined, CreditCardOutlined, GiftOutlined,
    LockOutlined, MessageOutlined, StarOutlined, UserAddOutlined,
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
import { getPermissionChecker } from "@utils/getPermissionChecker";

const { Text } = Typography;

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

const getPosMode = (): string => localStorage.getItem("posMode") ?? "service";

// ── Tab config ─────────────────────────────────────────────────────────────
type TabItem = {
    key: string;
    label: string;
    icon: React.ReactNode;
    /** Permission required to view this tab. Admins always pass. */
    permissionKey: string;
};

const getTabConfig = (): TabItem[] => {
    const isHospital = getPosMode() === "hospital";

    if (isHospital) {
        return [
            { key: "customers", label: "Patients", icon: <UserOutlined />, permissionKey: "CUSTOMERS_VIEW" },
            { key: "schedule", label: "Appointments", icon: <CalendarOutlined />, permissionKey: "CONSULTATIONS_VIEW_SLOTS" },
            { key: "consultations", label: "Consultations", icon: <StarOutlined />, permissionKey: "CONSULTATIONS_VIEW" },
            { key: "packages", label: "Packages", icon: <CreditCardOutlined />, permissionKey: "GIFT_CARDS_VIEW" },
            { key: "subscriptions", label: "Subscriptions", icon: <WalletOutlined />, permissionKey: "GIFT_CARDS_VIEW" },
        ];
    }

    return [
        { key: "customers", label: "Customers", icon: <UserOutlined />, permissionKey: "CUSTOMERS_VIEW" },
        { key: "packages", label: "Packages", icon: <CreditCardOutlined />, permissionKey: "GIFT_CARDS_VIEW" },
        { key: "subscriptions", label: "Subscriptions", icon: <WalletOutlined />, permissionKey: "GIFT_CARDS_VIEW" },
        { key: "schedule", label: "Bookings", icon: <CalendarOutlined />, permissionKey: "SCHEDULES_VIEW" },
        { key: "consultations", label: "Consultations", icon: <StarOutlined />, permissionKey: "CONSULTATIONS_VIEW" },
        { key: "feedback", label: "Feedback", icon: <MessageOutlined />, permissionKey: "FEEDBACK_VIEW" },
        { key: "giftCards", label: "Gift Cards", icon: <GiftOutlined />, permissionKey: "GIFT_CARDS_VIEW" },
    ];
};

// ── Locked tab placeholder ─────────────────────────────────────────────────
const LockedTab = ({ label }: { label: string }) => (
    <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "60px 24px", gap: 12,
        color: "#94a3b8", textAlign: "center",
    }}>
        <LockOutlined style={{ fontSize: 32, color: "#cbd5e1" }} />
        <Text style={{ fontSize: 14, color: "#94a3b8" }}>
            You don't have permission to access <strong>{label}</strong>.
        </Text>
        <Text style={{ fontSize: 12, color: "#cbd5e1" }}>
            Contact your administrator to request access.
        </Text>
    </div>
);

// ── TabNav ─────────────────────────────────────────────────────────────────
const TabNav = ({
    tabs,
    active,
    onChange,
}: {
    tabs: (TabItem & { allowed: boolean })[];
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
                    onClick={() => tab.allowed && onChange(tab.key)}
                    title={!tab.allowed ? "You don't have permission to access this section" : undefined}
                    style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        padding: "6px 14px", borderRadius: 20,
                        cursor: tab.allowed ? "pointer" : "not-allowed",
                        fontSize: 13, fontWeight: isActive ? 600 : 400,
                        border: isActive ? `1.5px solid ${C.primary}` : `1px solid ${C.border}`,
                        background: isActive ? C.primary : "#fff",
                        color: isActive ? "#fff" : tab.allowed ? C.subText : "#cbd5e1",
                        transition: "all 0.15s",
                        outline: "none",
                        opacity: tab.allowed ? 1 : 0.5,
                    }}
                >
                    <span style={{ fontSize: 13, lineHeight: 1 }}>
                        {tab.allowed ? tab.icon : <LockOutlined />}
                    </span>
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

    // Admin users bypass all checks via makePermissionChecker(isAdmin=true)
    const can = useMemo(() => getPermissionChecker(), []);

    const ALL_TABS = useMemo(() => getTabConfig(), []);

    // Attach allowed flag to each tab
    const tabsWithAccess = useMemo(
        () => ALL_TABS.map((t) => ({ ...t, allowed: can(t.permissionKey) })),
        [ALL_TABS, can]
    );

    const isHospital = getPosMode() === "hospital";
    const showOnlyCustomers = !isHospital && ((hasAccounting && !hasPOS) || !hasMteja);

    // Default to first tab the user can actually access
    const defaultTab = useMemo(() => {
        const first = tabsWithAccess.find((t) => t.allowed);
        return first?.key ?? "customers";
    }, [tabsWithAccess]);

    const [addCustomerModalVisible, setAddCustomerModalVisible] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<any>(null);
    const [modalMode, setModalMode] = useState<"add" | "edit">("add");
    const [activeTab, setActiveTab] = useState(defaultTab);
    const customerTableRef = useRef<any>(null);

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

    const activeTabCfg = tabsWithAccess.find((t) => t.key === activeTab);

    const renderTab = () => {
        // Permission check before rendering content
        if (!activeTabCfg?.allowed) {
            return <LockedTab label={activeTabCfg?.label ?? activeTab} />;
        }
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
                        ? `Manage your ${isHospital ? "patients" : "customers"}`
                        : isHospital
                            ? "Patients, appointments, services & more"
                            : "Customers, subscriptions, bookings & more"}
                </Text>
            </div>
            {/* Add button: only shown if user can create customers */}
            {showAdd && can("CUSTOMERS_CREATE") && (
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

    // ── Customers only view ──────────────────────────────────────────────
    if (showOnlyCustomers) {
        return (
            <>
                {wrap(
                    can("CUSTOMERS_VIEW")
                        ? <CustomerTable ref={customerTableRef} onEditCustomer={handleEditCustomer} />
                        : <LockedTab label="Customers" />,
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
                    <TabNav tabs={tabsWithAccess} active={activeTab} onChange={setActiveTab} />
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