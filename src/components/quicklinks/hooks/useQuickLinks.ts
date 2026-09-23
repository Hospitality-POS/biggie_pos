import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useNavigate } from "react-router-dom";
import type {
  QuickCreateModal,
  QuickLinkAction,
  QuickLinkModuleFlags,
} from "../types/quicklinks.types";

interface QuickLinksStore {
  isOpen: boolean;
  activeModal: QuickCreateModal;
}

let storeState: QuickLinksStore = {
  isOpen: false,
  activeModal: null,
};

let ninjaInstance: any = null;

const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

export const quickLinksStore = {
  getSnapshot: (): QuickLinksStore => storeState,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  registerInstance: (instance: any) => {
    ninjaInstance = instance;
  },
  unregisterInstance: () => {
    ninjaInstance = null;
  },
  setIsOpen: (isOpen: boolean) => {
    if (storeState.isOpen !== isOpen) {
      storeState = { ...storeState, isOpen };
      emitChange();
    }
  },
  openQuickLinks: () => {
    storeState = { ...storeState, isOpen: true };
    emitChange();
    if (ninjaInstance && typeof ninjaInstance.open === "function") {
      ninjaInstance.open();
    }
  },
  closeQuickLinks: () => {
    storeState = { ...storeState, isOpen: false };
    emitChange();
    if (ninjaInstance && typeof ninjaInstance.close === "function") {
      ninjaInstance.close();
    }
  },
  toggleQuickLinks: () => {
    if (ninjaInstance) {
      if (ninjaInstance.visible) {
        quickLinksStore.closeQuickLinks();
      } else {
        quickLinksStore.openQuickLinks();
      }
    } else {
      if (storeState.isOpen) {
        quickLinksStore.closeQuickLinks();
      } else {
        quickLinksStore.openQuickLinks();
      }
    }
  },
  openModal: (modal: QuickCreateModal) => {
    if (ninjaInstance && typeof ninjaInstance.close === "function") {
      ninjaInstance.close();
    }
    storeState = { isOpen: false, activeModal: modal };
    emitChange();
  },
  closeModal: () => {
    storeState = { ...storeState, activeModal: null };
    emitChange();
  },
};

// Clean, lightweight SVG icons for ninja-keys palette with proper spacing
const ICONS = {
  customer: `<svg style="margin-right: 14px; flex-shrink: 0;" class="ninja-icon" viewBox="0 0 24 24" width="20" height="20" stroke="#3b82f6" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
  supplier: `<svg style="margin-right: 14px; flex-shrink: 0;" class="ninja-icon" viewBox="0 0 24 24" width="20" height="20" stroke="#8b5cf6" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>`,
  bank: `<svg style="margin-right: 14px; flex-shrink: 0;" class="ninja-icon" viewBox="0 0 24 24" width="20" height="20" stroke="#0ea5e9" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="21" x2="21" y2="21"></line><line x1="3" y1="10" x2="21" y2="10"></line><polyline points="5 6 12 3 19 6"></polyline><line x1="6" y1="10" x2="6" y2="21"></line><line x1="10" y1="10" x2="10" y2="21"></line><line x1="14" y1="10" x2="14" y2="21"></line><line x1="18" y1="10" x2="18" y2="21"></line></svg>`,
  journal: `<svg style="margin-right: 14px; flex-shrink: 0;" class="ninja-icon" viewBox="0 0 24 24" width="20" height="20" stroke="#6366f1" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`,
  card: `<svg style="margin-right: 14px; flex-shrink: 0;" class="ninja-icon" viewBox="0 0 24 24" width="20" height="20" stroke="#f59e0b" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>`,
  excel: `<svg style="margin-right: 14px; flex-shrink: 0;" class="ninja-icon" viewBox="0 0 24 24" width="20" height="20" stroke="#16a34a" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="8" y1="13" x2="16" y2="17"></line><line x1="16" y1="13" x2="8" y2="17"></line></svg>`,
  currency: `<svg style="margin-right: 14px; flex-shrink: 0;" class="ninja-icon" viewBox="0 0 24 24" width="20" height="20" stroke="#0d9488" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`,
  invoice: `<svg style="margin-right: 14px; flex-shrink: 0;" class="ninja-icon" viewBox="0 0 24 24" width="20" height="20" stroke="#10b981" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`,
  expense: `<svg style="margin-right: 14px; flex-shrink: 0;" class="ninja-icon" viewBox="0 0 24 24" width="20" height="20" stroke="#ef4444" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>`,
  document: `<svg style="margin-right: 14px; flex-shrink: 0;" class="ninja-icon" viewBox="0 0 24 24" width="20" height="20" stroke="#2563eb" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M9 15l2 2 4-4"></path></svg>`,
  lead: `<svg style="margin-right: 14px; flex-shrink: 0;" class="ninja-icon" viewBox="0 0 24 24" width="20" height="20" stroke="#7c3aed" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`,
  calendar: `<svg style="margin-right: 14px; flex-shrink: 0;" class="ninja-icon" viewBox="0 0 24 24" width="20" height="20" stroke="#0891b2" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
  target: `<svg style="margin-right: 14px; flex-shrink: 0;" class="ninja-icon" viewBox="0 0 24 24" width="20" height="20" stroke="#16a34a" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>`,
  employee: `<svg style="margin-right: 14px; flex-shrink: 0;" class="ninja-icon" viewBox="0 0 24 24" width="20" height="20" stroke="#8b5cf6" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
  property: `<svg style="margin-right: 14px; flex-shrink: 0;" class="ninja-icon" viewBox="0 0 24 24" width="20" height="20" stroke="#2563eb" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="9" y1="22" x2="9" y2="22.01"></line><line x1="15" y1="22" x2="15" y2="22.01"></line><line x1="9" y1="6" x2="9" y2="6.01"></line><line x1="15" y1="6" x2="15" y2="6.01"></line><line x1="9" y1="10" x2="9" y2="10.01"></line><line x1="15" y1="10" x2="15" y2="10.01"></line><line x1="9" y1="14" x2="9" y2="14.01"></line><line x1="15" y1="14" x2="15" y2="14.01"></line></svg>`,
  unit: `<svg style="margin-right: 14px; flex-shrink: 0;" class="ninja-icon" viewBox="0 0 24 24" width="20" height="20" stroke="#0891b2" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`,
  lease: `<svg style="margin-right: 14px; flex-shrink: 0;" class="ninja-icon" viewBox="0 0 24 24" width="20" height="20" stroke="#7c3aed" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`,
  navigation: `<svg style="margin-right: 14px; flex-shrink: 0;" class="ninja-icon" viewBox="0 0 24 24" width="20" height="20" stroke="#64748b" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>`,
};

export const useQuickLinks = (customFlags?: QuickLinkModuleFlags) => {
  const current = useSyncExternalStore(
    quickLinksStore.subscribe,
    quickLinksStore.getSnapshot
  );
  const navigate = useNavigate();

  const openQuickLinks = useCallback(() => {
    quickLinksStore.openQuickLinks();
  }, []);

  const closeQuickLinks = useCallback(() => {
    quickLinksStore.closeQuickLinks();
  }, []);

  const toggleQuickLinks = useCallback(() => {
    quickLinksStore.toggleQuickLinks();
  }, []);

  const openModal = useCallback((modal: QuickCreateModal) => {
    quickLinksStore.openModal(modal);
  }, []);

  const closeModal = useCallback(() => {
    quickLinksStore.closeModal();
  }, []);

  // Determine user admin role from localStorage
  const isAdmin = useMemo(() => {
    try {
      const stored = localStorage.getItem("user");
      if (!stored) return false;
      const u = JSON.parse(stored);
      return u?.role === "admin" || u?.isAdmin === true;
    } catch {
      return false;
    }
  }, []);

  // Read module flags from props or localStorage with full property compatibility
  const moduleFlags: Required<QuickLinkModuleFlags> = useMemo(() => {
    try {
      const storedTenant = localStorage.getItem("tenant");
      const tenantData = storedTenant ? JSON.parse(storedTenant) : null;

      // POS flag
      const hasPOS =
        customFlags?.hasPOS !== undefined
          ? !!customFlags.hasPOS
          : tenantData?.pos_integration?.enabled !== false;

      // Accounting flag: checks accounting_database.enabled OR modules.accounting OR pesa_integration.enabled
      const hasAccounting =
        customFlags?.hasAccounting !== undefined
          ? !!customFlags.hasAccounting
          : !tenantData ||
            tenantData?.accounting_database?.enabled === true ||
            tenantData?.modules?.accounting === true ||
            tenantData?.pesa_integration?.enabled === true;

      // CRM flag: checks modules.crm OR mteja_integration.enabled
      const hasMteja =
        customFlags?.hasMteja !== undefined
          ? !!customFlags.hasMteja
          : !tenantData ||
            tenantData?.modules?.crm === true ||
            tenantData?.mteja_integration?.enabled === true;

      // HR & Payroll flag: checks modules.payroll OR modules.bandu OR bandu_integration.enabled
      const hasBandu =
        customFlags?.hasBandu !== undefined
          ? !!customFlags.hasBandu
          : !tenantData ||
            tenantData?.modules?.payroll === true ||
            tenantData?.modules?.bandu === true ||
            tenantData?.bandu_integration?.enabled === true;

      // Real Estate flag: checks modules.dala OR modules.real_estate OR dala_integration.enabled
      const hasDala =
        customFlags?.hasDala !== undefined
          ? !!customFlags.hasDala
          : !tenantData ||
            tenantData?.modules?.dala === true ||
            tenantData?.modules?.real_estate === true ||
            tenantData?.dala_integration?.enabled === true;

      return { hasPOS, hasAccounting, hasMteja, hasBandu, hasDala };
    } catch {
      return {
        hasPOS: customFlags?.hasPOS ?? true,
        hasAccounting: customFlags?.hasAccounting ?? true,
        hasMteja: customFlags?.hasMteja ?? true,
        hasBandu: customFlags?.hasBandu ?? true,
        hasDala: customFlags?.hasDala ?? true,
      };
    }
  }, [customFlags]);

  // Generate complete categorized list of actions
  const generateActions = useCallback((): QuickLinkAction[] => {
    const actions: QuickLinkAction[] = [];

    // ── 1. People ──────────────────────────────────────────────────────────
    actions.push(
      {
        id: "customer",
        title: "Customer",
        section: "People",
        keywords: "customer client person user add new contact",
        hotkey: "alt+c",
        icon: ICONS.customer,
        handler: () => openModal("customer"),
      },
      {
        id: "vendor",
        title: "Vendor / Supplier",
        section: "People",
        keywords: "vendor supplier merchant provider add new supplier",
        hotkey: "alt+v",
        icon: ICONS.supplier,
        handler: () => openModal("supplier"),
      }
    );

    // ── 2. Accounting ──────────────────────────────────────────────────────
    if (moduleFlags.hasAccounting) {
      actions.push(
        {
          id: "coa",
          title: "Chart of Account",
          section: "Accounting",
          keywords: "coa account general ledger chart of accounts finance add account",
          icon: ICONS.bank,
          handler: () => openModal("coa"),
        },
        {
          id: "journal",
          title: "Journal Entry",
          section: "Accounting",
          keywords: "journal debit credit ledger entry transaction double entry",
          hotkey: "alt+j",
          icon: ICONS.journal,
          handler: () => openModal("journal"),
        },
        {
          id: "payment-method",
          title: "Payment Method",
          section: "Accounting",
          keywords: "payment method mpesa cash bank card settings",
          icon: ICONS.card,
          handler: () => openModal("payment-method"),
        },
        {
          id: "bank-statement",
          title: "Bank Statement Import",
          section: "Accounting",
          keywords: "bank statement import excel statement reconciliation upload file",
          icon: ICONS.excel,
          handler: () => navigate("/accounting/bank-statements"),
        },
        {
          id: "currencies",
          title: "Currency Settings",
          section: "Accounting",
          keywords: "currency settings ksh usd fx exchange rate multi currency",
          icon: ICONS.currency,
          handler: () => navigate("/accounting/currencies"),
        }
      );
    }

    // ── 3. Transactions ────────────────────────────────────────────────────
    if (moduleFlags.hasPOS || moduleFlags.hasAccounting) {
      if (moduleFlags.hasPOS) {
        actions.push({
          id: "invoice",
          title: "Invoice / Quote",
          section: "Transactions",
          keywords: "invoice quote bill order proforma sale invoice quotation",
          hotkey: "alt+i",
          icon: ICONS.invoice,
          handler: () => openModal("invoice"),
        });
      }
      if (moduleFlags.hasAccounting) {
        actions.push({
          id: "income-expense",
          title: "Expense / Bill",
          section: "Transactions",
          keywords: "expense bill expenditure payment cash outflow record money out",
          hotkey: "alt+e",
          icon: ICONS.expense,
          handler: () => openModal("income-expense"),
        });
      }
    }

    // ── 4. Documents ───────────────────────────────────────────────────────
    actions.push({
      id: "document-center",
      title: "Document Center",
      section: "Documents",
      keywords: "document center docs files upload attachments pdf drive folder",
      hotkey: "alt+d",
      icon: ICONS.document,
      handler: () => navigate("/documents"),
    });

    // ── 5. CRM ─────────────────────────────────────────────────────────────
    if (moduleFlags.hasMteja) {
      actions.push(
        {
          id: "crm-customer",
          title: "New Customer",
          section: "CRM",
          keywords: "crm customer new client account contact mteja",
          icon: ICONS.customer,
          handler: () => openModal("customer"),
        },
        {
          id: "crm-lead",
          title: "New Lead",
          section: "CRM",
          keywords: "crm lead prospect opportunity new lead sales pipeline",
          hotkey: "alt+l",
          icon: ICONS.lead,
          handler: () => navigate("/crm/leads"),
        },
        {
          id: "crm-quote",
          title: "New Quote",
          section: "CRM",
          keywords: "crm quote quotation estimate proposal price offer",
          hotkey: "alt+q",
          icon: ICONS.invoice,
          handler: () => openModal("quote"),
        },
        {
          id: "crm-calendar",
          title: "Activity Calendar",
          section: "CRM",
          keywords: "activity calendar meeting task appointment schedule crm reminders",
          icon: ICONS.calendar,
          handler: () => navigate("/crm/calendar"),
        },
        {
          id: "crm-campaign",
          title: "New Campaign",
          section: "CRM",
          keywords: "campaign marketing blast promo email sms promotion",
          icon: ICONS.lead,
          handler: () => navigate("/crm/campaigns"),
        },
        {
          id: "crm-target",
          title: "New Sales Target",
          section: "CRM",
          keywords: "sales target goal quota kpi performance crm revenue target",
          icon: ICONS.target,
          handler: () => navigate("/crm/sales-targets"),
        }
      );
    }

    // ── 6. HR & Payroll ────────────────────────────────────────────────────
    if (moduleFlags.hasBandu) {
      actions.push(
        {
          id: "employee",
          title: "Add Employee",
          section: "HR & Payroll",
          keywords: "employee staff worker add employee new hire hr bandu personnel",
          icon: ICONS.employee,
          handler: () => navigate("/hr/employees"),
        },
        {
          id: "payroll",
          title: "Process Payroll",
          section: "HR & Payroll",
          keywords: "payroll salary wage payslip pay process payroll bandu hr compensation",
          icon: ICONS.invoice,
          handler: () => navigate("/hr/payroll"),
        }
      );
    }

    // ── 7. Real Estate ─────────────────────────────────────────────────────
    if (moduleFlags.hasDala) {
      actions.push(
        {
          id: "property",
          title: "New Property",
          section: "Real Estate",
          keywords: "property building real estate estate dala land asset plot house",
          icon: ICONS.property,
          handler: () => navigate("/dala/properties"),
        },
        {
          id: "unit",
          title: "Add Unit",
          section: "Real Estate",
          keywords: "unit apartment room flat office shop space dala floor",
          icon: ICONS.unit,
          handler: () => navigate("/dala/units"),
        },
        {
          id: "sale",
          title: "Property Sale",
          section: "Real Estate",
          keywords: "property sale purchase sell title deed commission dala buyer",
          icon: ICONS.invoice,
          handler: () => navigate("/dala/sales"),
        },
        {
          id: "lease",
          title: "Create Lease",
          section: "Real Estate",
          keywords: "lease contract rental agreement tenancy rent dala agreement",
          icon: ICONS.lease,
          handler: () => navigate("/dala/leases"),
        },
        {
          id: "tenant",
          title: "Add Tenant",
          section: "Real Estate",
          keywords: "tenant renter occupant add tenant resident dala leaseholder rent collection",
          icon: ICONS.customer,
          handler: () => navigate("/dala/rent-collection"),
        }
      );
    }

    // ── 8. Navigation & Quick Jumps ─────────────────────────────────────────
    actions.push(
      {
        id: "jump-pos",
        title: "Go to POS & Tables",
        section: "Navigation",
        keywords: "pos tables restaurant shop duka cash register order sale cashier",
        icon: ICONS.navigation,
        handler: () => navigate("/tables"),
      },
      {
        id: "jump-inventory",
        title: "Go to Inventory",
        section: "Navigation",
        keywords: "inventory stock items products warehouse catalog supplies",
        icon: ICONS.navigation,
        handler: () => navigate("/inventory"),
      },
      {
        id: "jump-reports",
        title: "Go to Reports & Analytics",
        section: "Navigation",
        keywords: "reports analytics sales summary financial statements dashboard",
        icon: ICONS.navigation,
        handler: () => navigate("/reports"),
      }
    );

    if (isAdmin) {
      actions.push({
        id: "jump-admin-dashboard",
        title: "Go to Admin Dashboard",
        section: "Navigation",
        keywords: "admin dashboard hq headquarters switch to admin backend",
        icon: ICONS.navigation,
        handler: () => navigate("/admin/dashboard"),
      });
    }

    return actions;
  }, [moduleFlags, isAdmin, navigate, openModal]);

  return {
    isOpen: current.isOpen,
    activeModal: current.activeModal,
    moduleFlags,
    isAdmin,
    openQuickLinks,
    closeQuickLinks,
    toggleQuickLinks,
    openModal,
    closeModal,
    generateActions,
  };
};
