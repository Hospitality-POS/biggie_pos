import { useEffect, useRef, useState, useMemo } from "react";
import { Button, Typography } from "antd";
import {
    CalendarOutlined, CreditCardOutlined, GiftOutlined,
    LockOutlined, MessageOutlined, StarOutlined, UserAddOutlined,
    UserOutlined, WalletOutlined, TeamOutlined,
} from "@ant-design/icons";
import CustomerTable from "./CustomerTable";
import Schedule from "../staff/schedule";
import AdminCustomersTable from "./CustomerTable";
import FeedbackTable from "./FeedbackTable";
import ConsultationTable from "./ConsultationTable";
import SubscriptionPackagesTable from "./SubscriptionPackagesTable";
import CustomerSubscriptionsTable from "./CustomerSubscriptionsTable";
import AddCustomerModal from "./AddCustomerModal";
import Leads from "@pages/Lead/Leads";
import { getPermissionChecker } from "@utils/getPermissionChecker";
import { usePrimaryColor } from "@context/PrimaryColorContext";

const { Text } = Typography;

// ── Dynamic colors will be generated from primary color context ──────────────────

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
            hasDala: tenant?.modules?.dala === true,
        };
    } catch {
        return { hasPOS: true, hasAccounting: false, hasMteja: false, hasDala: false };
    }
};

const getPosMode = (): string => localStorage.getItem("posMode") ?? "service";

// ── Tab config ─────────────────────────────────────────────────────────────
type TabItem = {
    key: string;
    label: string;
    icon: React.ReactNode;
    permissionKey: string;
    comingSoon?: boolean;
};

const getTabConfig = (): TabItem[] => {
    const isHospital = getPosMode() === "hospital";
    const { hasMteja, hasPOS, hasDala } = getTenantFlags();
    const customerLabel = hasDala ? "Clients" : "Customers";

    if (isHospital) {
        return [
            { key: "customers", label: "Patients", icon: <UserOutlined />, permissionKey: "CUSTOMERS_VIEW" },
            { key: "schedule", label: "Appointments", icon: <CalendarOutlined />, permissionKey: "CONSULTATIONS_VIEW_SLOTS" },
            { key: "consultations", label: "Consultations", icon: <StarOutlined />, permissionKey: "CONSULTATIONS_VIEW" },
            { key: "packages", label: "Packages", icon: <CreditCardOutlined />, permissionKey: "GIFT_CARDS_VIEW" },
            { key: "subscriptions", label: "Subscriptions", icon: <WalletOutlined />, permissionKey: "GIFT_CARDS_VIEW" },
        ];
    }

    if (hasMteja && hasPOS) {
        return [
            { key: "leads", label: "Leads", icon: <TeamOutlined />, permissionKey: "CRM_LEADS_VIEW" },
            { key: "customers", label: customerLabel, icon: <UserOutlined />, permissionKey: "CUSTOMERS_VIEW" },
            { key: "packages", label: "Packages", icon: <CreditCardOutlined />, permissionKey: "GIFT_CARDS_VIEW" },
            { key: "subscriptions", label: "Subscriptions", icon: <WalletOutlined />, permissionKey: "GIFT_CARDS_VIEW" },
            ...(!hasDala ? [{ key: "schedule", label: "Bookings", icon: <CalendarOutlined />, permissionKey: "SCHEDULES_VIEW" }] : []),
            { key: "consultations", label: "Consultations", icon: <StarOutlined />, permissionKey: "CONSULTATIONS_VIEW" },
            { key: "feedback", label: "Feedback", icon: <MessageOutlined />, permissionKey: "FEEDBACK_VIEW" },
            { key: "giftCards", label: "Gift Cards", icon: <GiftOutlined />, permissionKey: "GIFT_CARDS_VIEW" },
        ];
    }

    if (hasMteja) {
        return [
            { key: "leads", label: "Leads", icon: <TeamOutlined />, permissionKey: "CRM_LEADS_VIEW" },
            { key: "customers", label: customerLabel, icon: <UserOutlined />, permissionKey: "CUSTOMERS_VIEW" },
            ...(!hasDala ? [{ key: "schedule", label: "Bookings", icon: <CalendarOutlined />, permissionKey: "SCHEDULES_VIEW" }] : []),
        ];
    }

    return [
        { key: "customers", label: customerLabel, icon: <UserOutlined />, permissionKey: "CUSTOMERS_VIEW" },
        { key: "packages", label: "Packages", icon: <CreditCardOutlined />, permissionKey: "GIFT_CARDS_VIEW" },
        { key: "subscriptions", label: "Subscriptions", icon: <WalletOutlined />, permissionKey: "GIFT_CARDS_VIEW" },
        ...(!hasDala ? [{ key: "schedule", label: "Bookings", icon: <CalendarOutlined />, permissionKey: "SCHEDULES_VIEW" }] : []),
        { key: "consultations", label: "Consultations", icon: <StarOutlined />, permissionKey: "CONSULTATIONS_VIEW" },
        { key: "feedback", label: "Feedback", icon: <MessageOutlined />, permissionKey: "FEEDBACK_VIEW" },
        { key: "giftCards", label: "Gift Cards", icon: <GiftOutlined />, permissionKey: "GIFT_CARDS_VIEW" },
    ];
};

// ── Locked tab placeholder ─────────────────────────────────────────────────
const LockedTab = ({ label }: { label: string }) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px", gap: 12, color: "#94a3b8", textAlign: "center" }}>
        <LockOutlined style={{ fontSize: 32, color: "#cbd5e1" }} />
        <Text style={{ fontSize: 14, color: "#94a3b8" }}>
            You don't have permission to access <strong>{label}</strong>.
        </Text>
        <Text style={{ fontSize: 12, color: "#cbd5e1" }}>Contact your administrator to request access.</Text>
    </div>
);

// ── Coming Soon placeholder ────────────────────────────────────────────────
const ComingSoon = ({ label }: { label: string }) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px", gap: 12, textAlign: "center" }}>
        <StarOutlined style={{ fontSize: 32, color: "#cbd5e1" }} />
        <Text style={{ fontSize: 16, fontWeight: 500, color: "#64748b" }}>Coming Soon!</Text>
        <Text style={{ fontSize: 13, color: "#94a3b8" }}>
            The <strong>{label}</strong> feature is currently under development.
        </Text>
        <Text style={{ fontSize: 12, color: "#cbd5e1" }}>We're working hard to bring this to you as soon as possible.</Text>
    </div>
);

// ── TabNav ─────────────────────────────────────────────────────────────────
const TabNav = ({
    tabs, active, onChange, colors,
}: {
    tabs: (TabItem & { allowed: boolean })[];
    active: string;
    onChange: (key: string) => void;
    colors: any;
}) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "0 0 16px", borderBottom: `1px solid ${colors.border}`, marginBottom: 20 }}>
        {tabs.map((tab) => {
            const isActive = tab.key === active;
            const isDisabled = !tab.allowed || tab.comingSoon;
            return (
                <button
                    key={tab.key}
                    onClick={() => !isDisabled && onChange(tab.key)}
                    title={!tab.allowed ? "You don't have permission to access this section" : tab.comingSoon ? "Coming soon" : undefined}
                    style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        padding: "6px 14px", borderRadius: 20,
                        cursor: isDisabled ? "not-allowed" : "pointer",
                        fontSize: 13, fontWeight: isActive ? 600 : 400, outline: "none",
                        border: isActive ? `1.5px solid ${colors.primary}` : `1px solid ${colors.border}`,
                        background: isActive ? colors.primary : "#fff",
                        color: isActive ? "#fff" : isDisabled ? "#cbd5e1" : colors.subText,
                        transition: "all 0.15s",
                        opacity: isDisabled ? 0.5 : 1,
                        position: "relative",
                    }}
                >
                    <span style={{ fontSize: 13, lineHeight: 1 }}>{tab.icon}</span>
                    {tab.label}
                    {tab.comingSoon && (
                        <span style={{ fontSize: 9, marginLeft: 4, background: "#f0f0f0", padding: "2px 4px", borderRadius: 4, color: "#666", fontWeight: 400 }}>
                            Soon
                        </span>
                    )}
                </button>
            );
        })}
    </div>
);

// ── LeadPrefill type ───────────────────────────────────────────────────────
type LeadPrefill = {
    customer_name?: string;
    phone?: string;
    email?: string;
    location?: string;
};

// ── Main ───────────────────────────────────────────────────────────────────
function Customers() {
    const isMobile = useIsMobile();
    const { hasPOS, hasAccounting, hasMteja, hasDala } = getTenantFlags();
    const can = useMemo(() => getPermissionChecker(), []);
    const ALL_TABS = useMemo(() => getTabConfig(), []);
    const tabsWithAccess = useMemo(
        () => ALL_TABS.map((t) => ({ ...t, allowed: can(t.permissionKey) })),
        [ALL_TABS, can]
    );

    // Use primary color context instead of hardcoded colors
    const contextResult = usePrimaryColor();
    const primaryColor = contextResult?.primaryColor || '#6c1c2c';
    
    // Generate color palette based on primary color (same logic as CalendarView)
    const generateColorPalette = (primary: string) => {
        // Default to the primary color and generate complementary colors
        return {
            primary: primary,
            primaryLight: primary + '20', // Add transparency for light variant
            subText: '#64748b',
            darkText: '#0f172a',
            border: '#e2e8f0',
            bg: '#f8fafc',
        };
    };
    
    const colors = generateColorPalette(primaryColor);

    const isHospital = getPosMode() === "hospital";
    const showOnlyCustomers = !isHospital && ((hasAccounting && !hasPOS) || !hasMteja);

    const defaultTab = useMemo(() => {
        const first = tabsWithAccess.find((t) => t.allowed && !t.comingSoon);
        return first?.key ?? "customers";
    }, [tabsWithAccess]);

    // ── State ──────────────────────────────────────────────────────────────
    const [addCustomerVisible, setAddCustomerVisible] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<any>(null);
    const [modalMode, setModalMode] = useState<"add" | "edit">("add");
    const [leadPrefill, setLeadPrefill] = useState<LeadPrefill | undefined>(undefined);
    const [activeTab, setActiveTab] = useState(defaultTab);
    const customerTableRef = useRef<any>(null);

    // ── Customer modal handlers ────────────────────────────────────────────
    const handleAddCustomer = () => {
        setModalMode("add");
        setEditingCustomer(null);
        setLeadPrefill(undefined);
        setAddCustomerVisible(true);
    };

    const handleEditCustomer = (customer: any) => {
        setModalMode("edit");
        setEditingCustomer(customer);
        setLeadPrefill(undefined);
        setAddCustomerVisible(true);
    };

    const handleCloseModal = () => {
        setAddCustomerVisible(false);
        setEditingCustomer(null);
        setLeadPrefill(undefined);
        setModalMode("add");
    };

    const handleCustomerAdded = () => customerTableRef.current?.reload();

    /**
     * Called by the Leads page → LeadDetailDrawer when user clicks
     * "Convert to Customer". Receives pre-filled data from the lead,
     * opens AddCustomerModal in lead-conversion mode.
     */
    const handleConvertLeadToCustomer = (prefill: LeadPrefill) => {
        setLeadPrefill(prefill);
        setEditingCustomer(null);
        setModalMode("add");
        setAddCustomerVisible(true);
    };

    /**
     * Called after AddCustomerModal successfully saves a customer that
     * was created from a lead. Switches to the customers tab and reloads.
     */
    const handleCustomerCreatedFromLead = () => {
        setActiveTab("customers");
        setTimeout(() => customerTableRef.current?.reload(), 300);
    };

    // ── Tab renderer ──────────────────────────────────────────────────────
    const activeTabCfg = tabsWithAccess.find((t) => t.key === activeTab);

    const renderTab = () => {
        if (!activeTabCfg?.allowed) return <LockedTab label={activeTabCfg?.label ?? activeTab} />;
        if (activeTabCfg?.comingSoon) return <ComingSoon label={activeTabCfg.label} />;

        switch (activeTab) {
            case "customers":
                return <CustomerTable ref={customerTableRef} onEditCustomer={handleEditCustomer} />;
            case "leads":
                // Pass the convert callback so LeadDetailDrawer can trigger AddCustomerModal
                return <Leads onConvertWithForm={handleConvertLeadToCustomer} />;
            case "packages":
                return <SubscriptionPackagesTable />;
            case "subscriptions":
                return <CustomerSubscriptionsTable />;
            case "schedule":
                return <Schedule />;
            case "consultations":
                return <ConsultationTable />;
            case "feedback":
                return <FeedbackTable />;
            case "giftCards":
                return <AdminCustomersTable nonCustomerEnabled={true} />;
            default:
                return null;
        }
    };

    // ── Shared header ──────────────────────────────────────────────────────
    const Header = ({ showAdd }: { showAdd: boolean }) => (
        <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexWrap: "wrap", gap: 8,
            padding: isMobile ? "14px 14px 12px" : "16px 20px 14px",
            borderBottom: `1px solid ${colors.border}`,
        }}>
            <div>
                <Text strong style={{ fontSize: isMobile ? 15 : 17, color: colors.darkText, display: "block", lineHeight: 1.3 }}>
                    {isHospital ? "Patient Management" : (hasDala ? "Client Management" : "Customer Management")}
                </Text>
                <Text style={{ fontSize: 11, color: colors.subText, lineHeight: 1.3 }}>
                    {showOnlyCustomers
                        ? `Manage your ${isHospital ? "patients" : (hasDala ? "clients" : "customers")}` 
                        : hasMteja
                            ? `${hasDala ? "Clients" : "Customers"}, leads & bookings`
                            : isHospital
                                ? "Patients, appointments, services & more"
                                : `${hasDala ? "Clients" : "Customers"}, subscriptions, bookings & more`}
                </Text>
            </div>
            {showAdd && can("CUSTOMERS_CREATE") && (
                <Button
                    type="primary" icon={<UserAddOutlined />} onClick={handleAddCustomer}
                    style={{
                        background: colors.primary, borderColor: colors.primary, borderRadius: 8,
                        height: isMobile ? 34 : 36, fontSize: isMobile ? 12 : 13,
                    }}
                >
                    {isMobile ? "Add" : "Add Customer"}
                </Button>
            )}
        </div>
    );

    // ── Wrapper card ───────────────────────────────────────────────────────
    const wrap = (content: React.ReactNode, showAdd = true) => (
        <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: 12, overflow: "hidden" }}>
            <Header showAdd={showAdd} />
            <div style={{ padding: isMobile ? "14px 14px" : "16px 20px" }}>
                {content}
            </div>
        </div>
    );

    // ── Shared AddCustomerModal — used for both normal add/edit and lead conversion
    const customerModal = (
        <AddCustomerModal
            visible={addCustomerVisible}
            onClose={handleCloseModal}
            onSuccess={leadPrefill ? handleCustomerCreatedFromLead : handleCustomerAdded}
            customer={editingCustomer}
            mode={modalMode}
            leadPrefill={leadPrefill}
        />
    );

    // ── Customers-only view ────────────────────────────────────────────────
    if (showOnlyCustomers) {
        return (
            <>
                {wrap(
                    can("CUSTOMERS_VIEW")
                        ? <CustomerTable ref={customerTableRef} onEditCustomer={handleEditCustomer} />
                        : <LockedTab label="Customers" />
                )}
                {customerModal}
            </>
        );
    }

    // ── Full tabbed view ───────────────────────────────────────────────────
    return (
        <>
            {wrap(
                <>
                    <TabNav tabs={tabsWithAccess} active={activeTab} onChange={setActiveTab} colors={colors} />
                    {renderTab()}
                </>,
                // Only show "Add Customer" button when on the customers tab
                activeTab === "customers",
            )}
            {customerModal}
        </>
    );
}

export default Customers;