import React, { useMemo, useState } from "react";
import {
  UserOutlined,
  DollarCircleOutlined,
  PrinterOutlined,
  LockOutlined,
  FontColorsOutlined,
  BankOutlined,
  BellOutlined,
  HomeOutlined,
  BookOutlined,
  SettingOutlined,
  GlobalOutlined,
  ScanOutlined,
  CloudSyncOutlined,
  WhatsAppOutlined,
  PercentageOutlined,
  TagOutlined,
  FormOutlined,
  MedicineBoxOutlined,
} from "@ant-design/icons";
import { Tabs } from "antd";
import { useQuery } from "@tanstack/react-query";
import Profile from "./Profile";
import PaymentDetailsSettings from "../paymentMethodLevel/PaymentDetailsSettings";
import PaymentsMethodSettings from "../paymentMethodLevel/PaymentSettings";
import PrinterSettings from "./PrinterSettings";
import PrivacySettings from "./PrivacySettings";
import ReceiptAppearanceSettings from "./ReceiptAppearanceSettings";
import BankDetailsSettings from "./BankDetailsSettings";
import NotificationSettings from "./NotificationSettings";

import HotelSettings from "./HotelSettings";
import HealthcareSettings from "./HealthcareSettings";
import TransactionLocking from "./TransactionLocking";
import PayrollSettings from "./PayrollSettings";
import AccessSettings from "./AccessSettings";
import DataSyncSettings from "./DataSyncSettings";
import FormsSettings from "./FormsSettings";
import ChartOfAccountsSettings from "./ChartOfAccountsSettings";
import VatPanel from "../taxes/VatPanel";
import CateringLevyPanel from "../taxes/CateringLevyPanel";
import CurrencyPage from "@pages/Currency/CurrencyPage";
import WhatsAppIntegrationSettings from "./WhatsAppIntegrationSettings";
import SettingsShell, { SettingSection } from "@components/Settings/SettingsShell";
import { fetchShop } from "@services/shops";
import { makePermissionChecker } from "@utils/accessControl";
import { useTenantModules } from "@hooks/useTenantModules";
import { useAppSelector } from "src/store";

const SystemSetup: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("payment-detail");

  const shopId = localStorage.getItem("shopId");

  const { data: shopData } = useQuery({
    queryKey: ["shop", shopId],
    queryFn: () => fetchShop(shopId!),
    enabled: !!shopId,
  });

  const isHotelMode = shopData?.pos_mode === "hotel";
  const isHospitalMode = shopData?.pos_mode === "hospital";

  const storedTenant = localStorage.getItem("tenant");
  const tenant = storedTenant ? JSON.parse(storedTenant) : null;

  const hasPOS = !!(tenant?.pos_integration?.enabled ?? true);
  const hasAccounting = !!(
    tenant?.accounting_database?.enabled ||
    tenant?.modules?.accounting
  );
  // Bandu HR module — shown unless explicitly disabled
  const hasBandu = tenant?.modules?.bandu_hr !== false;
  // WhatsApp integrations (incl. chat marketplace) require the Mteja module
  const { hasMteja } = useTenantModules();

  const { user } = useAppSelector((state) => state.auth);
  const rolePermissions: string[] =
    (user as any)?.rolePermissions ?? (user as any)?.permissions ?? [];
  const can = makePermissionChecker(rolePermissions, user?.role === "admin");
  // Same gate the currencies nav item used before it moved here.
  const canSeeCurrencies = can("ACCOUNTING_COA_VIEW");

  const sections = useMemo<SettingSection[]>(() => {
    const list: SettingSection[] = [
      {
        key: "payment-detail",
        label: "Payment Methods",
        description: "Checkout methods, till & paybill details",
        icon: <DollarCircleOutlined />,
        color: "#10b981",
        bg: "#f0fdf4",
        group: "Payments",
        render: () => (
          <Tabs
            defaultActiveKey="methods"
            items={[
              {
                key: "methods",
                label: "Payment Methods",
                children: <PaymentsMethodSettings />,
              },
              {
                key: "details",
                label: "Payment Details",
                children: <PaymentDetailsSettings />,
              },
            ]}
          />
        ),
      },
      {
        key: "bank-details",
        label: "Bank Details",
        description: "Bank accounts shown on receipts",
        icon: <BankOutlined />,
        color: "#3b82f6",
        bg: "#eff6ff",
        group: "Payments",
        render: () => <BankDetailsSettings />,
      },
    ];

    if (hasPOS) {
      list.push(
        {
          key: "printer-settings",
          label: "Printer Settings",
          description: "Receipt printers & print agents",
          icon: <PrinterOutlined />,
          color: "#8b5cf6",
          bg: "#f5f3ff",
          group: "POS & Receipts",
          render: () => <PrinterSettings />,
        },
        {
          key: "receipt-appearance",
          label: "Receipt Appearance",
          description: "Font size & receipt styling",
          icon: <FontColorsOutlined />,
          color: "#0d9488",
          bg: "#f0fdfa",
          group: "POS & Receipts",
          render: () => <ReceiptAppearanceSettings />,
        },
        {
          key: "privacy",
          label: "Privacy",
          description: "Cart visibility, printing & warranty",
          icon: <LockOutlined />,
          color: "#f59e0b",
          bg: "#fffbeb",
          group: "POS & Receipts",
          render: () => <PrivacySettings />,
        }
      );
    }

    // Client forms need customers (POS); employee forms need Bandu HR
    if (hasPOS || hasBandu) {
      list.push({
        key: "forms-plans",
        label: "Forms & Plans",
        description: "Forms, e-sign & plans for clients and employees",
        icon: <FormOutlined />,
        color: "#8b5cf6",
        bg: "#f5f3ff",
        group: "Add-ons",
        render: () => <FormsSettings hasClients={hasPOS} hasEmployees={hasBandu} />,
      });
    }

    list.push(
      {
        key: "profile",
        label: "System Profile",
        description: "Business name, contacts & KRA pin",
        icon: <UserOutlined />,
        color: "#3b82f6",
        bg: "#eff6ff",
        group: "General",
        render: () => <Profile />,
      },
      {
        key: "notification-settings",
        label: "Notifications",
        description: "Alerts & notification channels",
        icon: <BellOutlined />,
        color: "#f59e0b",
        bg: "#fffbeb",
        group: "General",
        render: () => <NotificationSettings />,
      },
      {
        key: "data-sync",
        label: "Data Sync",
        description: "Secondary database backup & schedule",
        icon: <CloudSyncOutlined />,
        color: "#0ea5e9",
        bg: "#f0f9ff",
        group: "General",
        render: () => <DataSyncSettings />,
      },
    );

    if (hasBandu) {
      list.push(
        {
          key: "payroll-settings",
          label: "Payroll",
          description: "First-month pay & proration",
          icon: <DollarCircleOutlined />,
          color: "#0d9488",
          bg: "#f0fdfa",
          group: "HR & Payroll",
          render: () => <PayrollSettings />,
        },
        {
          key: "access-settings",
          label: "Access",
          description: "Biometrics & device clock-in",
          icon: <ScanOutlined />,
          color: "#6366f1",
          bg: "#eef2ff",
          group: "HR & Payroll",
          render: () => <AccessSettings />,
        }
      );
    }

    if (hasAccounting) {
      list.push(
        {
          key: "transaction-locking",
          label: "Transaction Locking",
          description: "Lock periods for accounting entries",
          icon: <LockOutlined />,
          color: "#ef4444",
          bg: "#fef2f2",
          group: "Accounting",
          render: () => <TransactionLocking />,
        },
        {
          key: "chart-of-accounts",
          label: "Chart of Accounts",
          description: "Default account mappings",
          icon: <BookOutlined />,
          color: "#6366f1",
          bg: "#eef2ff",
          group: "Accounting",
          render: () => <ChartOfAccountsSettings />,
        },
        {
          key: "vat",
          label: "VAT",
          description: "VAT for this branch only",
          icon: <TagOutlined />,
          color: "#2563eb",
          bg: "#eff6ff",
          group: "Accounting",
          render: () => <VatPanel scope="branch" />,
        },
        {
          key: "catering-levy",
          label: "Catering Levy",
          description: "Tourism levy for this branch only",
          icon: <PercentageOutlined />,
          color: "#0d9488",
          bg: "#f0fdfa",
          group: "Accounting",
          render: () => <CateringLevyPanel scope="branch" />,
        }
      );
    }

    if (canSeeCurrencies) {
      list.push({
        key: "currencies",
        label: "Currencies",
        description: "Multi-currency & exchange rates",
        badge: "Beta",
        icon: <GlobalOutlined />,
        color: "#0d9488",
        bg: "#f0fdfa",
        group: hasAccounting ? "Accounting" : "General",
        render: () => <CurrencyPage />,
      });
    }

    if (hasMteja) {
      list.push({
        key: "integrations-whatsapp",
        label: "WhatsApp",
        description: "Chat marketplace & sender registration",
        icon: <WhatsAppOutlined />,
        color: "#25D366",
        bg: "#f0fdf4",
        group: "Integrations",
        render: () => <WhatsAppIntegrationSettings />,
      });
    }

    if (isHotelMode) {
      list.push({
        key: "hotel-settings",
        label: "Hotel Settings",
        description: "Check-in, WiFi & room policies",
        icon: <HomeOutlined />,
        color: "#8b5cf6",
        bg: "#f5f3ff",
        group: "Hotel",
        render: () => <HotelSettings />,
      });
    }

    if (isHospitalMode && hasPOS) {
      list.push({
        key: "healthcare-settings",
        label: "Healthcare",
        description: "Patients, queue, prescriptions & expiry",
        icon: <MedicineBoxOutlined />,
        color: "#0ea5e9",
        bg: "#f0f9ff",
        group: "Healthcare",
        render: () => <HealthcareSettings />,
      });
    }

    return list;
  }, [hasPOS, hasBandu, hasAccounting, isHotelMode, isHospitalMode, canSeeCurrencies, hasMteja]);

  return (
    <SettingsShell
      title="System Setup"
      subtitle={`Configure payments, printing, privacy and integrations${shopData?.name ? ` for ${shopData.name}` : ""}`}
      icon={<SettingOutlined />}
      sections={sections}
      activeKey={activeTab}
      onChange={setActiveTab}
    />
  );
};

export default SystemSetup;
