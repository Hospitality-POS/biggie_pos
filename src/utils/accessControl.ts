export type ModuleScope = "core" | "pos" | "hr" | "accounting" | "crm" | "dala";

// ─── Feature module names (UI grouping labels) ────────────────────────────────

export const MODULES = {
    // ── Core / POS ──────────────────────────────────────────────────────────
    CART: "Cart",
    CATEGORIES: "Categories",
    CONSULTATIONS: "Consultations",
    CUSTOMERS: "Customers",
    DELIVERY: "Delivery",
    DOCUMENTS: "Documents",
    EMAIL_REPORTS: "Email Reports",
    FAQ: "FAQ",
    FEEDBACK: "Feedback",
    GALLERY: "Gallery",
    GIFT_CARDS: "Gift Cards",
    INVENTORY: "Inventory",
    MODIFIERS_ADDONS: "Modifiers & Addons",
    NOTIFICATIONS: "Notifications",
    OMNICHANNEL: "Conversations",
    ORDERS: "Orders",
    PAYMENT_METHODS: "Payment Methods",
    PERMISSIONS: "Permissions",
    PRODUCTS: "Products",
    PURCHASE_ORDERS: "Purchase Orders",
    RECIPES: "Recipes",
    REPORTS: "Reports",
    ROLES: "Roles",
    SCHEDULES: "Schedules",
    SHIFTS: "Shifts",
    SHOPS: "Shops",
    SUPPLIERS: "Suppliers",
    SYSTEM_SETUP: "System Setup",
    TABLES: "Tables",
    TRANSFERS: "Transfers",
    UOM: "Units of Measure",
    USERS: "Users",
    // ── HR module ────────────────────────────────────────────────────────────
    HR_LEAVE: "HR · Leave Management",
    HR_ATTENDANCE: "HR · Attendance",
    // ── Accounting module ────────────────────────────────────────────────────
    ACCOUNTING_DASHBOARD: "Accounting · Dashboard",
    ACCOUNTING_COA: "Accounting · Chart of Accounts",
    ACCOUNTING_JOURNALS: "Accounting · Journal Entries",
    ACCOUNTING_INVOICES: "Accounting · Invoices & Bills",
    ACCOUNTING_INCOME: "Accounting · Income & Expenses",
    ACCOUNTING_NOTES: "Accounting · Credit & Debit Notes",
    ACCOUNTING_BANK_STATEMENTS: "Accounting · Bank Statements",
    ACCOUNTING_RECONCILIATION: "Accounting · Bank Reconciliation",
    ACCOUNTING_REPORTS: "Accounting · Financial Reports",
    // ── CRM / Mteja module ───────────────────────────────────────────────────
    CRM_LEADS: "CRM · Leads",
    CRM_CAMPAIGNS: "CRM · Campaigns",
    CRM_SALES_TARGETS: "CRM · Sales Targets",
    CRM_SALES_BUDGETS: "CRM · Sales Budgets",
    CRM_LEAD_ACTIVITIES: "CRM · Lead Activities",
    CRM_LEAD_WORKFLOWS: "CRM · Lead Workflows",
    // ── Dala / Real Estate module ─────────────────────────────────────────────
    DALA_DASHBOARD: "Dala · Dashboard",
    DALA_PROPERTIES: "Dala · Properties",
    DALA_PROPERTY_TYPES: "Dala · Property Types",
    DALA_SALES: "Dala · Sales",
    DALA_LEASES: "Dala · Leases",
    DALA_COMMISSIONS: "Dala · Commissions",
    DALA_RENT_COLLECTION: "Dala · Rent Collection",
    DALA_MAINTENANCE: "Dala · Maintenance",
    DALA_REPORTS: "Dala · Reports",
} as const;

export type ModuleKey = keyof typeof MODULES;

// ─── Action types ─────────────────────────────────────────────────────────────

export type ActionType = "create" | "read" | "update" | "delete" | "special";

// ─── Permission definition ────────────────────────────────────────────────────

export interface Permission {
    key: string;
    label: string;
    module: string;
    action: ActionType;
    moduleScope: ModuleScope;
}

// ─── All permissions ──────────────────────────────────────────────────────────

export const PERMISSIONS: Record<string, Permission> = {

    // ══════════════════════════════════════════════════════════════════════════
    // CORE PERMISSIONS  (moduleScope: "core")
    // ══════════════════════════════════════════════════════════════════════════

    // ── CART ──────────────────────────────────────────────────────────────────

    CART_VIEW_ITEMS: { key: "CART_VIEW_ITEMS", label: "View Cart Items", module: MODULES.CART, action: "read", moduleScope: "pos" },
    CART_CREATE: { key: "CART_CREATE", label: "Create Cart", module: MODULES.CART, action: "create", moduleScope: "pos" },
    CART_UPDATE: { key: "CART_UPDATE", label: "Update Cart", module: MODULES.CART, action: "update", moduleScope: "pos" },
    CART_GET: { key: "CART_GET", label: "Get Cart Details", module: MODULES.CART, action: "read", moduleScope: "pos" },
    CART_ADD_ITEM: { key: "CART_ADD_ITEM", label: "Add Item to Cart", module: MODULES.CART, action: "create", moduleScope: "pos" },
    CART_UPDATE_ITEM: { key: "CART_UPDATE_ITEM", label: "Update Cart Item", module: MODULES.CART, action: "update", moduleScope: "pos" },
    CART_DELETE_ITEM: { key: "CART_DELETE_ITEM", label: "Delete Cart Item", module: MODULES.CART, action: "delete", moduleScope: "pos" },
    CART_DELETE_ALL_ITEMS: { key: "CART_DELETE_ALL_ITEMS", label: "Clear All Cart Items", module: MODULES.CART, action: "delete", moduleScope: "pos" },
    CART_SEND_TO_KITCHEN: { key: "CART_SEND_TO_KITCHEN", label: "Send Cart to Kitchen", module: MODULES.CART, action: "special", moduleScope: "pos" },
    CART_VOID: { key: "CART_VOID", label: "Void Cart", module: MODULES.CART, action: "special", moduleScope: "pos" },
    CART_TRANSFER_ITEMS: { key: "CART_TRANSFER_ITEMS", label: "Transfer Cart Items to Another Table", module: MODULES.CART, action: "special", moduleScope: "pos" },
    CART_PRINT_INVOICE: { key: "CART_PRINT_INVOICE", label: "Print Invoice", module: MODULES.CART, action: "special", moduleScope: "pos" },
    CART_VIEW_INVOICES: { key: "CART_VIEW_INVOICES", label: "View All Invoices", module: MODULES.CART, action: "read", moduleScope: "pos" },
    CART_REPRINT_INVOICE: { key: "CART_REPRINT_INVOICE", label: "Re-Print Invoice", module: MODULES.CART, action: "special", moduleScope: "pos" },
    CART_VIEW_ACTIVE_SUBSCRIPTIONS: { key: "CART_VIEW_ACTIVE_SUBSCRIPTIONS", label: "View Customer Active Subscriptions for Cart", module: MODULES.CART, action: "read", moduleScope: "pos" },

    // ── CATEGORIES ────────────────────────────────────────────────────────────

    CATEGORIES_VIEW: { key: "CATEGORIES_VIEW", label: "View Categories", module: MODULES.CATEGORIES, action: "read", moduleScope: "pos" },
    CATEGORIES_CREATE: { key: "CATEGORIES_CREATE", label: "Create Category", module: MODULES.CATEGORIES, action: "create", moduleScope: "pos" },
    CATEGORIES_UPDATE: { key: "CATEGORIES_UPDATE", label: "Update Category", module: MODULES.CATEGORIES, action: "update", moduleScope: "pos" },
    CATEGORIES_DELETE: { key: "CATEGORIES_DELETE", label: "Delete Category", module: MODULES.CATEGORIES, action: "delete", moduleScope: "pos" },
    SUB_CATEGORIES_VIEW: { key: "SUB_CATEGORIES_VIEW", label: "View Sub-Categories", module: MODULES.CATEGORIES, action: "read", moduleScope: "pos" },
    SUB_CATEGORIES_CREATE: { key: "SUB_CATEGORIES_CREATE", label: "Create Sub-Category", module: MODULES.CATEGORIES, action: "create", moduleScope: "pos" },
    SUB_CATEGORIES_UPDATE: { key: "SUB_CATEGORIES_UPDATE", label: "Update Sub-Category", module: MODULES.CATEGORIES, action: "update", moduleScope: "pos" },
    SUB_CATEGORIES_DELETE: { key: "SUB_CATEGORIES_DELETE", label: "Delete Sub-Category", module: MODULES.CATEGORIES, action: "delete", moduleScope: "pos" },
    MAIN_CATEGORIES_VIEW: { key: "MAIN_CATEGORIES_VIEW", label: "View Main Categories", module: MODULES.CATEGORIES, action: "read", moduleScope: "pos" },
    MAIN_CATEGORIES_CREATE: { key: "MAIN_CATEGORIES_CREATE", label: "Create Main Category", module: MODULES.CATEGORIES, action: "create", moduleScope: "pos" },
    MAIN_CATEGORIES_UPDATE: { key: "MAIN_CATEGORIES_UPDATE", label: "Update Main Category", module: MODULES.CATEGORIES, action: "update", moduleScope: "pos" },
    MAIN_CATEGORIES_DELETE: { key: "MAIN_CATEGORIES_DELETE", label: "Delete Main Category", module: MODULES.CATEGORIES, action: "delete", moduleScope: "pos" },

    // ── CONSULTATIONS ─────────────────────────────────────────────────────────

    CONSULTATIONS_VIEW: { key: "CONSULTATIONS_VIEW", label: "View Consultations", module: MODULES.CONSULTATIONS, action: "read", moduleScope: "core" },
    CONSULTATIONS_VIEW_ONE: { key: "CONSULTATIONS_VIEW_ONE", label: "View Consultation Details", module: MODULES.CONSULTATIONS, action: "read", moduleScope: "core" },
    CONSULTATIONS_CREATE: { key: "CONSULTATIONS_CREATE", label: "Create Consultation", module: MODULES.CONSULTATIONS, action: "create", moduleScope: "core" },
    CONSULTATIONS_UPDATE: { key: "CONSULTATIONS_UPDATE", label: "Update Consultation", module: MODULES.CONSULTATIONS, action: "update", moduleScope: "core" },
    CONSULTATIONS_UPDATE_STATUS: { key: "CONSULTATIONS_UPDATE_STATUS", label: "Update Consultation Status", module: MODULES.CONSULTATIONS, action: "update", moduleScope: "core" },
    CONSULTATIONS_DELETE: { key: "CONSULTATIONS_DELETE", label: "Delete Consultation", module: MODULES.CONSULTATIONS, action: "delete", moduleScope: "core" },
    CONSULTATIONS_VIEW_SLOTS: { key: "CONSULTATIONS_VIEW_SLOTS", label: "View Available Time Slots", module: MODULES.CONSULTATIONS, action: "read", moduleScope: "core" },
    CONSULTATIONS_VIEW_UPCOMING: { key: "CONSULTATIONS_VIEW_UPCOMING", label: "View Upcoming Consultations", module: MODULES.CONSULTATIONS, action: "read", moduleScope: "core" },
    CONSULTATIONS_SEND_REMINDER: { key: "CONSULTATIONS_SEND_REMINDER", label: "Send Consultation Reminder", module: MODULES.CONSULTATIONS, action: "special", moduleScope: "core" },

    // ── CUSTOMERS ─────────────────────────────────────────────────────────────

    CUSTOMERS_VIEW: { key: "CUSTOMERS_VIEW", label: "View Customers", module: MODULES.CUSTOMERS, action: "read", moduleScope: "core" },
    CUSTOMERS_VIEW_ONE: { key: "CUSTOMERS_VIEW_ONE", label: "View Customer Details", module: MODULES.CUSTOMERS, action: "read", moduleScope: "core" },
    CUSTOMERS_CREATE: { key: "CUSTOMERS_CREATE", label: "Create Customer", module: MODULES.CUSTOMERS, action: "create", moduleScope: "core" },
    CUSTOMERS_UPDATE: { key: "CUSTOMERS_UPDATE", label: "Update Customer", module: MODULES.CUSTOMERS, action: "update", moduleScope: "core" },
    CUSTOMERS_LOG_VISIT: { key: "CUSTOMERS_LOG_VISIT", label: "Log Customer Visit", module: MODULES.CUSTOMERS, action: "special", moduleScope: "core" },
    CUSTOMERS_CLOCK_IN_OUT: { key: "CUSTOMERS_CLOCK_IN_OUT", label: "Staff Clock In/Out (Legacy POS)", module: MODULES.CUSTOMERS, action: "special", moduleScope: "core" },

    // ── DELIVERY ──────────────────────────────────────────────────────────────

    DELIVERY_VIEW: { key: "DELIVERY_VIEW", label: "View Deliveries", module: MODULES.DELIVERY, action: "read", moduleScope: "pos" },
    DELIVERY_CREATE: { key: "DELIVERY_CREATE", label: "Create Delivery", module: MODULES.DELIVERY, action: "create", moduleScope: "pos" },
    DELIVERY_UPDATE: { key: "DELIVERY_UPDATE", label: "Update Delivery", module: MODULES.DELIVERY, action: "update", moduleScope: "pos" },
    DELIVERY_DELETE: { key: "DELIVERY_DELETE", label: "Delete Delivery", module: MODULES.DELIVERY, action: "delete", moduleScope: "pos" },
    DELIVERY_VIEW_BY_DATE_RANGE: { key: "DELIVERY_VIEW_BY_DATE_RANGE", label: "View Delivery Items by Date Range", module: MODULES.DELIVERY, action: "read", moduleScope: "pos" },
    DELIVERY_PRINT_NOTE: { key: "DELIVERY_PRINT_NOTE", label: "Print Delivery Note", module: MODULES.DELIVERY, action: "special", moduleScope: "pos" },

    // ── DOCUMENTS ─────────────────────────────────────────────────────────────

    DOCUMENTS_VIEW: { key: "DOCUMENTS_VIEW", label: "View Documents", module: MODULES.DOCUMENTS, action: "read", moduleScope: "core" },
    DOCUMENTS_VIEW_ONE: { key: "DOCUMENTS_VIEW_ONE", label: "View Document Details", module: MODULES.DOCUMENTS, action: "read", moduleScope: "core" },
    DOCUMENTS_CREATE: { key: "DOCUMENTS_CREATE", label: "Create Document", module: MODULES.DOCUMENTS, action: "create", moduleScope: "core" },
    DOCUMENTS_UPDATE: { key: "DOCUMENTS_UPDATE", label: "Update Document", module: MODULES.DOCUMENTS, action: "update", moduleScope: "core" },
    DOCUMENTS_DELETE: { key: "DOCUMENTS_DELETE", label: "Delete Document", module: MODULES.DOCUMENTS, action: "delete", moduleScope: "core" },
    DOCUMENTS_MANAGE_FOLDERS: { key: "DOCUMENTS_MANAGE_FOLDERS", label: "Create / Update / Delete Folders", module: MODULES.DOCUMENTS, action: "special", moduleScope: "core" },
    DOCUMENTS_UPLOAD_ATTACHMENTS: { key: "DOCUMENTS_UPLOAD_ATTACHMENTS", label: "Upload Attachments", module: MODULES.DOCUMENTS, action: "create", moduleScope: "core" },
    DOCUMENTS_UPDATE_STATUS: { key: "DOCUMENTS_UPDATE_STATUS", label: "Update Document Status", module: MODULES.DOCUMENTS, action: "update", moduleScope: "core" },
    DOCUMENTS_SEARCH: { key: "DOCUMENTS_SEARCH", label: "Search Documents", module: MODULES.DOCUMENTS, action: "read", moduleScope: "core" },
    DOCUMENTS_EMBED: { key: "DOCUMENTS_EMBED", label: "Generate AI Embeddings (Single & Batch)", module: MODULES.DOCUMENTS, action: "special", moduleScope: "core" },

    // ── EMAIL REPORTS ─────────────────────────────────────────────────────────

    EMAIL_SEND_SALES_REPORT: { key: "EMAIL_SEND_SALES_REPORT", label: "Send Sales Report Email", module: MODULES.EMAIL_REPORTS, action: "special", moduleScope: "core" },
    EMAIL_SEND_PURCHASE_REPORT: { key: "EMAIL_SEND_PURCHASE_REPORT", label: "Send Purchase Report Email", module: MODULES.EMAIL_REPORTS, action: "special", moduleScope: "core" },
    EMAIL_SEND_PURCHASE_ORDER: { key: "EMAIL_SEND_PURCHASE_ORDER", label: "Send Purchase Order Email", module: MODULES.EMAIL_REPORTS, action: "special", moduleScope: "core" },
    EMAIL_SEND_PURCHASE_ORDER_BULK: { key: "EMAIL_SEND_PURCHASE_ORDER_BULK", label: "Send Bulk Purchase Order Report Email", module: MODULES.EMAIL_REPORTS, action: "special", moduleScope: "core" },
    EMAIL_SEND_DELIVERY_NOTE: { key: "EMAIL_SEND_DELIVERY_NOTE", label: "Send Delivery Note Email", module: MODULES.EMAIL_REPORTS, action: "special", moduleScope: "core" },
    EMAIL_SEND_INVENTORY_REPORT: { key: "EMAIL_SEND_INVENTORY_REPORT", label: "Send Inventory Report Email", module: MODULES.EMAIL_REPORTS, action: "special", moduleScope: "core" },
    EMAIL_SEND_FINANCIAL_REPORT: { key: "EMAIL_SEND_FINANCIAL_REPORT", label: "Send Financial Report Email", module: MODULES.EMAIL_REPORTS, action: "special", moduleScope: "core" },
    EMAIL_SEND_ATTENDANCE_REPORT: { key: "EMAIL_SEND_ATTENDANCE_REPORT", label: "Send Attendance Report Email", module: MODULES.EMAIL_REPORTS, action: "special", moduleScope: "hr" },
    EMAIL_SEND_LEAVE_APPLICATION: { key: "EMAIL_SEND_LEAVE_APPLICATION", label: "Send Leave Application Confirmation Email", module: MODULES.EMAIL_REPORTS, action: "special", moduleScope: "hr" },
    EMAIL_SEND_LEAVE_HR_NOTIFICATION: { key: "EMAIL_SEND_LEAVE_HR_NOTIFICATION", label: "Send Leave HR Notification Email", module: MODULES.EMAIL_REPORTS, action: "special", moduleScope: "hr" },
    EMAIL_SEND_LEAVE_APPROVAL: { key: "EMAIL_SEND_LEAVE_APPROVAL", label: "Send Leave Approval Email", module: MODULES.EMAIL_REPORTS, action: "special", moduleScope: "hr" },
    EMAIL_SEND_LEAVE_REJECTION: { key: "EMAIL_SEND_LEAVE_REJECTION", label: "Send Leave Rejection Email", module: MODULES.EMAIL_REPORTS, action: "special", moduleScope: "hr" },

    // ── FAQ ───────────────────────────────────────────────────────────────────

    FAQ_CATEGORIES_VIEW: { key: "FAQ_CATEGORIES_VIEW", label: "View FAQ Categories", module: MODULES.FAQ, action: "read", moduleScope: "core" },
    FAQ_CATEGORIES_CREATE: { key: "FAQ_CATEGORIES_CREATE", label: "Create FAQ Category", module: MODULES.FAQ, action: "create", moduleScope: "core" },
    FAQ_CATEGORIES_UPDATE: { key: "FAQ_CATEGORIES_UPDATE", label: "Update FAQ Category", module: MODULES.FAQ, action: "update", moduleScope: "core" },
    FAQ_CATEGORIES_DELETE: { key: "FAQ_CATEGORIES_DELETE", label: "Delete FAQ Category", module: MODULES.FAQ, action: "delete", moduleScope: "core" },
    FAQ_VIEW: { key: "FAQ_VIEW", label: "View FAQs", module: MODULES.FAQ, action: "read", moduleScope: "core" },
    FAQ_CREATE: { key: "FAQ_CREATE", label: "Create FAQ", module: MODULES.FAQ, action: "create", moduleScope: "core" },
    FAQ_UPDATE: { key: "FAQ_UPDATE", label: "Update FAQ", module: MODULES.FAQ, action: "update", moduleScope: "core" },
    FAQ_DELETE: { key: "FAQ_DELETE", label: "Delete FAQ", module: MODULES.FAQ, action: "delete", moduleScope: "core" },

    // ── FEEDBACK ──────────────────────────────────────────────────────────────

    FEEDBACK_VIEW: { key: "FEEDBACK_VIEW", label: "View All Feedback", module: MODULES.FEEDBACK, action: "read", moduleScope: "core" },
    FEEDBACK_VIEW_ANONYMOUS: { key: "FEEDBACK_VIEW_ANONYMOUS", label: "View Anonymous Feedback", module: MODULES.FEEDBACK, action: "read", moduleScope: "core" },
    FEEDBACK_VIEW_AUTHENTICATED: { key: "FEEDBACK_VIEW_AUTHENTICATED", label: "View Authenticated Feedback", module: MODULES.FEEDBACK, action: "read", moduleScope: "core" },
    FEEDBACK_CREATE_ANONYMOUS: { key: "FEEDBACK_CREATE_ANONYMOUS", label: "Submit Anonymous Feedback", module: MODULES.FEEDBACK, action: "create", moduleScope: "core" },

    // ── GALLERY ───────────────────────────────────────────────────────────────

    GALLERY_VIEW: { key: "GALLERY_VIEW", label: "View Gallery Images", module: MODULES.GALLERY, action: "read", moduleScope: "core" },
    GALLERY_UPLOAD: { key: "GALLERY_UPLOAD", label: "Upload Image", module: MODULES.GALLERY, action: "create", moduleScope: "core" },
    GALLERY_UPDATE: { key: "GALLERY_UPDATE", label: "Update Image", module: MODULES.GALLERY, action: "update", moduleScope: "core" },
    GALLERY_DELETE: { key: "GALLERY_DELETE", label: "Delete Image", module: MODULES.GALLERY, action: "delete", moduleScope: "core" },
    GALLERY_TOGGLE_STATUS: { key: "GALLERY_TOGGLE_STATUS", label: "Toggle Image Active Status", module: MODULES.GALLERY, action: "special", moduleScope: "core" },

    // ── GIFT CARDS ────────────────────────────────────────────────────────────

    GIFT_CARDS_VIEW: { key: "GIFT_CARDS_VIEW", label: "View Gift Cards", module: MODULES.GIFT_CARDS, action: "read", moduleScope: "pos" },
    GIFT_CARDS_VIEW_ONE: { key: "GIFT_CARDS_VIEW_ONE", label: "Look Up Gift Card by Code", module: MODULES.GIFT_CARDS, action: "read", moduleScope: "pos" },
    GIFT_CARDS_CREATE: { key: "GIFT_CARDS_CREATE", label: "Create Gift Card", module: MODULES.GIFT_CARDS, action: "create", moduleScope: "pos" },
    GIFT_CARDS_UPDATE: { key: "GIFT_CARDS_UPDATE", label: "Update Gift Card", module: MODULES.GIFT_CARDS, action: "update", moduleScope: "pos" },
    GIFT_CARDS_SEND_EMAIL: { key: "GIFT_CARDS_SEND_EMAIL", label: "Send Gift Card via Email", module: MODULES.GIFT_CARDS, action: "special", moduleScope: "pos" },

    // ── INVENTORY ─────────────────────────────────────────────────────────────

    INVENTORY_VIEW: { key: "INVENTORY_VIEW", label: "View Inventory", module: MODULES.INVENTORY, action: "read", moduleScope: "pos" },
    INVENTORY_VIEW_ONE: { key: "INVENTORY_VIEW_ONE", label: "View Inventory Item Details", module: MODULES.INVENTORY, action: "read", moduleScope: "pos" },
    INVENTORY_CREATE: { key: "INVENTORY_CREATE", label: "Add Inventory Item", module: MODULES.INVENTORY, action: "create", moduleScope: "pos" },
    INVENTORY_UPDATE: { key: "INVENTORY_UPDATE", label: "Edit Inventory Item", module: MODULES.INVENTORY, action: "update", moduleScope: "pos" },
    INVENTORY_DELETE: { key: "INVENTORY_DELETE", label: "Delete Inventory Item", module: MODULES.INVENTORY, action: "delete", moduleScope: "pos" },
    INVENTORY_DELETE_MULTIPLE: { key: "INVENTORY_DELETE_MULTIPLE", label: "Delete Multiple Inventory Items", module: MODULES.INVENTORY, action: "delete", moduleScope: "pos" },
    INVENTORY_DELETE_ALL: { key: "INVENTORY_DELETE_ALL", label: "Delete All Inventory Items", module: MODULES.INVENTORY, action: "delete", moduleScope: "pos" },
    INVENTORY_IMPORT: { key: "INVENTORY_IMPORT", label: "Import Inventory from Excel", module: MODULES.INVENTORY, action: "create", moduleScope: "pos" },
    INVENTORY_ANALYSE_IMPORT: { key: "INVENTORY_ANALYSE_IMPORT", label: "Analyse Inventory Import File", module: MODULES.INVENTORY, action: "special", moduleScope: "pos" },
    INVENTORY_DOWNLOAD_TEMPLATE: { key: "INVENTORY_DOWNLOAD_TEMPLATE", label: "Download Inventory Import Template", module: MODULES.INVENTORY, action: "special", moduleScope: "pos" },
    INVENTORY_VIEW_NOTIFICATIONS: { key: "INVENTORY_VIEW_NOTIFICATIONS", label: "View Inventory Low Stock Alerts", module: MODULES.INVENTORY, action: "read", moduleScope: "pos" },
    INVENTORY_VIEW_USAGE_BY_DATE: { key: "INVENTORY_VIEW_USAGE_BY_DATE", label: "View Inventory Usage by Date Range", module: MODULES.INVENTORY, action: "read", moduleScope: "pos" },

    // ── TRANSFERS ─────────────────────────────────────────────────────────────

    TRANSFERS_VIEW: { key: "TRANSFERS_VIEW", label: "View Transfers", module: MODULES.TRANSFERS, action: "read", moduleScope: "pos" },
    TRANSFERS_VIEW_ONE: { key: "TRANSFERS_VIEW_ONE", label: "View Transfer Details", module: MODULES.TRANSFERS, action: "read", moduleScope: "pos" },
    TRANSFERS_CREATE: { key: "TRANSFERS_CREATE", label: "Create Transfer", module: MODULES.TRANSFERS, action: "create", moduleScope: "pos" },
    TRANSFERS_APPROVE: { key: "TRANSFERS_APPROVE", label: "Approve Transfer", module: MODULES.TRANSFERS, action: "special", moduleScope: "pos" },
    TRANSFERS_COMPLETE: { key: "TRANSFERS_COMPLETE", label: "Complete Transfer", module: MODULES.TRANSFERS, action: "special", moduleScope: "pos" },
    TRANSFERS_REJECT: { key: "TRANSFERS_REJECT", label: "Reject Transfer", module: MODULES.TRANSFERS, action: "special", moduleScope: "pos" },
    TRANSFERS_CANCEL: { key: "TRANSFERS_CANCEL", label: "Cancel Transfer", module: MODULES.TRANSFERS, action: "special", moduleScope: "pos" },
    TRANSFERS_VIEW_PENDING: { key: "TRANSFERS_VIEW_PENDING", label: "View Pending Transfers", module: MODULES.TRANSFERS, action: "read", moduleScope: "pos" },
    TRANSFERS_VIEW_STATS: { key: "TRANSFERS_VIEW_STATS", label: "View Transfer Statistics", module: MODULES.TRANSFERS, action: "read", moduleScope: "pos" },

    // ── MODIFIERS & ADDONS ────────────────────────────────────────────────────

    MODIFIERS_VIEW: { key: "MODIFIERS_VIEW", label: "View Modifiers", module: MODULES.MODIFIERS_ADDONS, action: "read", moduleScope: "pos" },
    MODIFIERS_CREATE: { key: "MODIFIERS_CREATE", label: "Create Modifier", module: MODULES.MODIFIERS_ADDONS, action: "create", moduleScope: "pos" },
    MODIFIERS_UPDATE: { key: "MODIFIERS_UPDATE", label: "Update Modifier", module: MODULES.MODIFIERS_ADDONS, action: "update", moduleScope: "pos" },
    MODIFIERS_DELETE: { key: "MODIFIERS_DELETE", label: "Delete Modifier", module: MODULES.MODIFIERS_ADDONS, action: "delete", moduleScope: "pos" },
    ADDONS_VIEW: { key: "ADDONS_VIEW", label: "View Addons", module: MODULES.MODIFIERS_ADDONS, action: "read", moduleScope: "pos" },
    ADDONS_CREATE: { key: "ADDONS_CREATE", label: "Create Addon", module: MODULES.MODIFIERS_ADDONS, action: "create", moduleScope: "pos" },
    ADDONS_UPDATE: { key: "ADDONS_UPDATE", label: "Update Addon", module: MODULES.MODIFIERS_ADDONS, action: "update", moduleScope: "pos" },
    ADDONS_DELETE: { key: "ADDONS_DELETE", label: "Delete Addon", module: MODULES.MODIFIERS_ADDONS, action: "delete", moduleScope: "pos" },

    // ── NOTIFICATIONS ─────────────────────────────────────────────────────────

    NOTIFICATIONS_VIEW: { key: "NOTIFICATIONS_VIEW", label: "View All Notifications", module: MODULES.NOTIFICATIONS, action: "read", moduleScope: "core" },
    NOTIFICATIONS_VIEW_MY: { key: "NOTIFICATIONS_VIEW_MY", label: "View My Notifications", module: MODULES.NOTIFICATIONS, action: "read", moduleScope: "core" },
    NOTIFICATIONS_VIEW_SYSTEM: { key: "NOTIFICATIONS_VIEW_SYSTEM", label: "View System Notifications", module: MODULES.NOTIFICATIONS, action: "read", moduleScope: "core" },
    NOTIFICATIONS_VIEW_ADMIN_DASHBOARD: { key: "NOTIFICATIONS_VIEW_ADMIN_DASHBOARD", label: "View Admin Dashboard Notifications", module: MODULES.NOTIFICATIONS, action: "read", moduleScope: "core" },
    NOTIFICATIONS_CREATE: { key: "NOTIFICATIONS_CREATE", label: "Create Notification", module: MODULES.NOTIFICATIONS, action: "create", moduleScope: "core" },
    NOTIFICATIONS_BULK_CREATE: { key: "NOTIFICATIONS_BULK_CREATE", label: "Create Bulk Notifications", module: MODULES.NOTIFICATIONS, action: "create", moduleScope: "core" },
    NOTIFICATIONS_UPDATE: { key: "NOTIFICATIONS_UPDATE", label: "Update Notification", module: MODULES.NOTIFICATIONS, action: "update", moduleScope: "core" },
    NOTIFICATIONS_DELETE: { key: "NOTIFICATIONS_DELETE", label: "Delete Notification", module: MODULES.NOTIFICATIONS, action: "delete", moduleScope: "core" },
    NOTIFICATIONS_BULK_DELETE: { key: "NOTIFICATIONS_BULK_DELETE", label: "Bulk Delete Notifications", module: MODULES.NOTIFICATIONS, action: "delete", moduleScope: "core" },
    NOTIFICATIONS_MARK_READ: { key: "NOTIFICATIONS_MARK_READ", label: "Mark Notification as Read", module: MODULES.NOTIFICATIONS, action: "special", moduleScope: "core" },
    NOTIFICATIONS_MARK_ALL_READ: { key: "NOTIFICATIONS_MARK_ALL_READ", label: "Mark All Notifications as Read", module: MODULES.NOTIFICATIONS, action: "special", moduleScope: "core" },
    NOTIFICATIONS_DELETE_EXPIRED: { key: "NOTIFICATIONS_DELETE_EXPIRED", label: "Delete Expired Notifications", module: MODULES.NOTIFICATIONS, action: "delete", moduleScope: "core" },
    NOTIFICATIONS_VIEW_ANALYTICS: { key: "NOTIFICATIONS_VIEW_ANALYTICS", label: "View Notification Analytics", module: MODULES.NOTIFICATIONS, action: "read", moduleScope: "core" },

    // ── OMNICHANNEL (Conversations) ───────────────────────────────────────────

    OMNICHANNEL_VIEW: { key: "OMNICHANNEL_VIEW", label: "View Conversations", module: MODULES.OMNICHANNEL, action: "read", moduleScope: "core" },
    OMNICHANNEL_SEND_MESSAGE: { key: "OMNICHANNEL_SEND_MESSAGE", label: "Send Message", module: MODULES.OMNICHANNEL, action: "create", moduleScope: "core" },
    OMNICHANNEL_MANAGE_CONVERSATIONS: { key: "OMNICHANNEL_MANAGE_CONVERSATIONS", label: "Manage Conversations (Assign / Status)", module: MODULES.OMNICHANNEL, action: "update", moduleScope: "core" },
    OMNICHANNEL_MANAGE_CHANNELS: { key: "OMNICHANNEL_MANAGE_CHANNELS", label: "Manage Channels (Connect / Disconnect)", module: MODULES.OMNICHANNEL, action: "special", moduleScope: "core" },
    OMNICHANNEL_SEND_TEMPLATE: { key: "OMNICHANNEL_SEND_TEMPLATE", label: "Send Template Message", module: MODULES.OMNICHANNEL, action: "special", moduleScope: "core" },

    // ── ORDERS ────────────────────────────────────────────────────────────────

    ORDERS_VIEW: { key: "ORDERS_VIEW", label: "View Orders", module: MODULES.ORDERS, action: "read", moduleScope: "pos" },
    ORDERS_DELETE: { key: "ORDERS_DELETE", label: "Delete Order", module: MODULES.ORDERS, action: "delete", moduleScope: "pos" },
    ORDERS_UPDATE: { key: "ORDERS_UPDATE", label: "Update Order", module: MODULES.ORDERS, action: "update", moduleScope: "pos" },
    ORDERS_UPDATE_TIMESTAMP: { key: "ORDERS_UPDATE_TIMESTAMP", label: "Update Order Timestamp", module: MODULES.ORDERS, action: "special", moduleScope: "pos" },
    ORDERS_UPDATE_ITEM: { key: "ORDERS_UPDATE_ITEM", label: "Update Order Item", module: MODULES.ORDERS, action: "update", moduleScope: "pos" },
    ORDERS_DELETE_ITEM: { key: "ORDERS_DELETE_ITEM", label: "Delete Order Item", module: MODULES.ORDERS, action: "delete", moduleScope: "pos" },
    ORDERS_VIEW_DASHBOARD: { key: "ORDERS_VIEW_DASHBOARD", label: "View Dashboard Summary", module: MODULES.ORDERS, action: "read", moduleScope: "pos" },
    ORDERS_VIEW_ADMIN_DASHBOARD: { key: "ORDERS_VIEW_ADMIN_DASHBOARD", label: "View Admin Dashboard Summary", module: MODULES.ORDERS, action: "read", moduleScope: "pos" },
    ORDERS_VIEW_BEST_SELLERS: { key: "ORDERS_VIEW_BEST_SELLERS", label: "View Best Sellers", module: MODULES.ORDERS, action: "read", moduleScope: "pos" },
    ORDERS_VIEW_SALES_CHART: { key: "ORDERS_VIEW_SALES_CHART", label: "View Sales Chart", module: MODULES.ORDERS, action: "read", moduleScope: "pos" },
    ORDERS_REPOST_PAYMENT: { key: "ORDERS_REPOST_PAYMENT", label: "Repost Order Payment", module: MODULES.ORDERS, action: "special", moduleScope: "pos" },

    // ── PAYMENT METHODS ───────────────────────────────────────────────────────

    PAYMENT_METHODS_VIEW: { key: "PAYMENT_METHODS_VIEW", label: "View Payment Methods", module: MODULES.PAYMENT_METHODS, action: "read", moduleScope: "pos" },
    PAYMENT_METHODS_CREATE: { key: "PAYMENT_METHODS_CREATE", label: "Create Payment Method", module: MODULES.PAYMENT_METHODS, action: "create", moduleScope: "pos" },
    PAYMENT_METHODS_UPDATE: { key: "PAYMENT_METHODS_UPDATE", label: "Update Payment Method", module: MODULES.PAYMENT_METHODS, action: "update", moduleScope: "pos" },
    PAYMENT_METHODS_DELETE: { key: "PAYMENT_METHODS_DELETE", label: "Delete Payment Method", module: MODULES.PAYMENT_METHODS, action: "delete", moduleScope: "pos" },
    PAYMENT_DETAILS_VIEW: { key: "PAYMENT_DETAILS_VIEW", label: "View Payment Details", module: MODULES.PAYMENT_METHODS, action: "read", moduleScope: "pos" },
    PAYMENT_DETAILS_CREATE: { key: "PAYMENT_DETAILS_CREATE", label: "Create Payment Detail", module: MODULES.PAYMENT_METHODS, action: "create", moduleScope: "pos" },
    PAYMENT_DETAILS_UPDATE: { key: "PAYMENT_DETAILS_UPDATE", label: "Update Payment Detail", module: MODULES.PAYMENT_METHODS, action: "update", moduleScope: "pos" },
    PAYMENT_DETAILS_DELETE: { key: "PAYMENT_DETAILS_DELETE", label: "Delete Payment Detail", module: MODULES.PAYMENT_METHODS, action: "delete", moduleScope: "pos" },
    PAYMENT_MAKE_SUBSCRIPTION: { key: "PAYMENT_MAKE_SUBSCRIPTION", label: "Make Subscription Payment", module: MODULES.PAYMENT_METHODS, action: "special", moduleScope: "pos" },

    // ── PERMISSIONS ───────────────────────────────────────────────────────────

    PERMISSIONS_VIEW: { key: "PERMISSIONS_VIEW", label: "View Permissions", module: MODULES.PERMISSIONS, action: "read", moduleScope: "core" },
    PERMISSIONS_CREATE: { key: "PERMISSIONS_CREATE", label: "Create Permission", module: MODULES.PERMISSIONS, action: "create", moduleScope: "core" },
    PERMISSIONS_UPDATE: { key: "PERMISSIONS_UPDATE", label: "Update Permission", module: MODULES.PERMISSIONS, action: "update", moduleScope: "core" },
    PERMISSIONS_DELETE: { key: "PERMISSIONS_DELETE", label: "Delete Permission", module: MODULES.PERMISSIONS, action: "delete", moduleScope: "core" },

    // ── PRODUCTS ──────────────────────────────────────────────────────────────

    PRODUCTS_VIEW: { key: "PRODUCTS_VIEW", label: "View Products", module: MODULES.PRODUCTS, action: "read", moduleScope: "pos" },
    PRODUCTS_CREATE: { key: "PRODUCTS_CREATE", label: "Create Product", module: MODULES.PRODUCTS, action: "create", moduleScope: "pos" },
    PRODUCTS_UPDATE: { key: "PRODUCTS_UPDATE", label: "Update Product", module: MODULES.PRODUCTS, action: "update", moduleScope: "pos" },
    PRODUCTS_DELETE: { key: "PRODUCTS_DELETE", label: "Delete Product", module: MODULES.PRODUCTS, action: "delete", moduleScope: "pos" },

    // ── PURCHASE ORDERS ───────────────────────────────────────────────────────

    PURCHASE_ORDERS_VIEW: { key: "PURCHASE_ORDERS_VIEW", label: "View Purchase Orders", module: MODULES.PURCHASE_ORDERS, action: "read", moduleScope: "pos" },
    PURCHASE_ORDERS_VIEW_ONE: { key: "PURCHASE_ORDERS_VIEW_ONE", label: "View Purchase Order Details", module: MODULES.PURCHASE_ORDERS, action: "read", moduleScope: "pos" },
    PURCHASE_ORDERS_CREATE: { key: "PURCHASE_ORDERS_CREATE", label: "Create Purchase Order", module: MODULES.PURCHASE_ORDERS, action: "create", moduleScope: "pos" },
    PURCHASE_ORDERS_UPDATE: { key: "PURCHASE_ORDERS_UPDATE", label: "Update Purchase Order", module: MODULES.PURCHASE_ORDERS, action: "update", moduleScope: "pos" },
    PURCHASE_ORDERS_UPDATE_STATUS: { key: "PURCHASE_ORDERS_UPDATE_STATUS", label: "Update Purchase Order Status", module: MODULES.PURCHASE_ORDERS, action: "update", moduleScope: "pos" },
    PURCHASE_ORDERS_DELETE: { key: "PURCHASE_ORDERS_DELETE", label: "Delete Purchase Order", module: MODULES.PURCHASE_ORDERS, action: "delete", moduleScope: "pos" },
    PURCHASE_ORDERS_CREATE_DELIVERY: { key: "PURCHASE_ORDERS_CREATE_DELIVERY", label: "Create Delivery from Purchase Order", module: MODULES.PURCHASE_ORDERS, action: "special", moduleScope: "pos" },
    PURCHASE_ORDERS_VIEW_PENDING_ITEMS: { key: "PURCHASE_ORDERS_VIEW_PENDING_ITEMS", label: "View Pending Items for Purchase Order", module: MODULES.PURCHASE_ORDERS, action: "read", moduleScope: "pos" },
    PURCHASE_ORDERS_VIEW_DELIVERIES: { key: "PURCHASE_ORDERS_VIEW_DELIVERIES", label: "View Deliveries for Purchase Order", module: MODULES.PURCHASE_ORDERS, action: "read", moduleScope: "pos" },

    // ── RECIPES ───────────────────────────────────────────────────────────────

    RECIPES_VIEW: { key: "RECIPES_VIEW", label: "View Recipe", module: MODULES.RECIPES, action: "read", moduleScope: "pos" },
    RECIPES_CREATE: { key: "RECIPES_CREATE", label: "Create Recipe", module: MODULES.RECIPES, action: "create", moduleScope: "pos" },
    RECIPES_UPDATE: { key: "RECIPES_UPDATE", label: "Update Recipe", module: MODULES.RECIPES, action: "update", moduleScope: "pos" },
    RECIPES_DELETE: { key: "RECIPES_DELETE", label: "Delete Recipe", module: MODULES.RECIPES, action: "delete", moduleScope: "pos" },

    // ── REPORTS (POS) ─────────────────────────────────────────────────────────

    REPORTS_ITEM_SALES: { key: "REPORTS_ITEM_SALES", label: "View Item Sales Report", module: MODULES.REPORTS, action: "read", moduleScope: "pos" },
    REPORTS_PURCHASE_SUMMARY: { key: "REPORTS_PURCHASE_SUMMARY", label: "View Payment Methods Summary Report", module: MODULES.REPORTS, action: "read", moduleScope: "pos" },
    REPORTS_VAT_SUMMARY: { key: "REPORTS_VAT_SUMMARY", label: "View VAT Summary Report (POS)", module: MODULES.REPORTS, action: "read", moduleScope: "pos" },

    // ── ROLES ─────────────────────────────────────────────────────────────────

    ROLES_VIEW: { key: "ROLES_VIEW", label: "View Roles", module: MODULES.ROLES, action: "read", moduleScope: "core" },
    ROLES_CREATE: { key: "ROLES_CREATE", label: "Create Role", module: MODULES.ROLES, action: "create", moduleScope: "core" },
    ROLES_UPDATE: { key: "ROLES_UPDATE", label: "Update Role", module: MODULES.ROLES, action: "update", moduleScope: "core" },
    ROLES_DELETE: { key: "ROLES_DELETE", label: "Delete Role", module: MODULES.ROLES, action: "delete", moduleScope: "core" },

    // ── SCHEDULES ─────────────────────────────────────────────────────────────

    SCHEDULES_VIEW: { key: "SCHEDULES_VIEW", label: "View Schedules", module: MODULES.SCHEDULES, action: "read", moduleScope: "pos" },
    SCHEDULES_CREATE: { key: "SCHEDULES_CREATE", label: "Create Schedule", module: MODULES.SCHEDULES, action: "create", moduleScope: "pos" },
    SCHEDULES_UPDATE: { key: "SCHEDULES_UPDATE", label: "Update Schedule", module: MODULES.SCHEDULES, action: "update", moduleScope: "pos" },
    SCHEDULES_DELETE: { key: "SCHEDULES_DELETE", label: "Delete Schedule", module: MODULES.SCHEDULES, action: "delete", moduleScope: "pos" },

    // ── SHIFTS ────────────────────────────────────────────────────────────────

    SHIFTS_VIEW: { key: "SHIFTS_VIEW", label: "View Shifts", module: MODULES.SHIFTS, action: "read", moduleScope: "pos" },
    SHIFTS_CREATE: { key: "SHIFTS_CREATE", label: "Create Shift", module: MODULES.SHIFTS, action: "create", moduleScope: "pos" },
    SHIFTS_UPDATE: { key: "SHIFTS_UPDATE", label: "Update Shift", module: MODULES.SHIFTS, action: "update", moduleScope: "pos" },
    SHIFTS_DELETE: { key: "SHIFTS_DELETE", label: "Delete Shift", module: MODULES.SHIFTS, action: "delete", moduleScope: "pos" },

    // ── SHOPS ─────────────────────────────────────────────────────────────────

    SHOPS_VIEW: { key: "SHOPS_VIEW", label: "View Shops", module: MODULES.SHOPS, action: "read", moduleScope: "pos" },
    SHOPS_VIEW_ONE: { key: "SHOPS_VIEW_ONE", label: "View Shop Details", module: MODULES.SHOPS, action: "read", moduleScope: "pos" },
    SHOPS_CREATE: { key: "SHOPS_CREATE", label: "Create Shop", module: MODULES.SHOPS, action: "create", moduleScope: "pos" },
    SHOPS_UPDATE: { key: "SHOPS_UPDATE", label: "Update Shop", module: MODULES.SHOPS, action: "update", moduleScope: "pos" },
    SHOPS_UPDATE_POS_MODE: { key: "SHOPS_UPDATE_POS_MODE", label: "Update POS Mode (Restaurant / Retail)", module: MODULES.SHOPS, action: "special", moduleScope: "pos" },
    SHOPS_DELETE: { key: "SHOPS_DELETE", label: "Delete Shop", module: MODULES.SHOPS, action: "delete", moduleScope: "pos" },

    // ── SUPPLIERS ─────────────────────────────────────────────────────────────

    SUPPLIERS_VIEW: { key: "SUPPLIERS_VIEW", label: "View Suppliers", module: MODULES.SUPPLIERS, action: "read", moduleScope: "pos" },
    SUPPLIERS_CREATE: { key: "SUPPLIERS_CREATE", label: "Create Supplier", module: MODULES.SUPPLIERS, action: "create", moduleScope: "pos" },
    SUPPLIERS_UPDATE: { key: "SUPPLIERS_UPDATE", label: "Update Supplier", module: MODULES.SUPPLIERS, action: "update", moduleScope: "pos" },
    SUPPLIERS_DELETE: { key: "SUPPLIERS_DELETE", label: "Delete Supplier", module: MODULES.SUPPLIERS, action: "delete", moduleScope: "pos" },

    // ── SYSTEM SETUP ──────────────────────────────────────────────────────────

    SYSTEM_SETUP_VIEW: { key: "SYSTEM_SETUP_VIEW", label: "View System Setup", module: MODULES.SYSTEM_SETUP, action: "read", moduleScope: "core" },
    SYSTEM_SETUP_CREATE: { key: "SYSTEM_SETUP_CREATE", label: "Create System Setup", module: MODULES.SYSTEM_SETUP, action: "create", moduleScope: "core" },
    SYSTEM_SETUP_UPDATE: { key: "SYSTEM_SETUP_UPDATE", label: "Update System Setup", module: MODULES.SYSTEM_SETUP, action: "update", moduleScope: "core" },
    SYSTEM_SETUP_VIEW_PAYMENT_DETAILS: { key: "SYSTEM_SETUP_VIEW_PAYMENT_DETAILS", label: "View System Payment Details", module: MODULES.SYSTEM_SETUP, action: "read", moduleScope: "core" },

    // ── TABLES ────────────────────────────────────────────────────────────────

    TABLES_VIEW: { key: "TABLES_VIEW", label: "View Tables", module: MODULES.TABLES, action: "read", moduleScope: "pos" },
    TABLES_CREATE: { key: "TABLES_CREATE", label: "Create Table", module: MODULES.TABLES, action: "create", moduleScope: "pos" },
    TABLES_UPDATE: { key: "TABLES_UPDATE", label: "Update Table", module: MODULES.TABLES, action: "update", moduleScope: "pos" },
    TABLES_DELETE: { key: "TABLES_DELETE", label: "Delete Table", module: MODULES.TABLES, action: "delete", moduleScope: "pos" },
    TABLES_CREATE_AUTO_SLOT: { key: "TABLES_CREATE_AUTO_SLOT", label: "Create Auto Slot (Retail Mode)", module: MODULES.TABLES, action: "special", moduleScope: "pos" },
    TABLE_LOCATIONS_VIEW: { key: "TABLE_LOCATIONS_VIEW", label: "View Table Locations", module: MODULES.TABLES, action: "read", moduleScope: "pos" },
    TABLE_LOCATIONS_CREATE: { key: "TABLE_LOCATIONS_CREATE", label: "Create Table Location", module: MODULES.TABLES, action: "create", moduleScope: "pos" },
    TABLE_LOCATIONS_UPDATE: { key: "TABLE_LOCATIONS_UPDATE", label: "Update Table Location", module: MODULES.TABLES, action: "update", moduleScope: "pos" },
    TABLE_LOCATIONS_DELETE: { key: "TABLE_LOCATIONS_DELETE", label: "Delete Table Location", module: MODULES.TABLES, action: "delete", moduleScope: "pos" },
    TABLES_TRANSFER_CART_ITEMS: { key: "TABLES_TRANSFER_CART_ITEMS", label: "Transfer Cart Items Between Tables", module: MODULES.TABLES, action: "special", moduleScope: "pos" },

    // ── UNITS OF MEASURE ──────────────────────────────────────────────────────

    UOM_VIEW: { key: "UOM_VIEW", label: "View Units of Measure", module: MODULES.UOM, action: "read", moduleScope: "pos" },
    UOM_CREATE: { key: "UOM_CREATE", label: "Create Unit of Measure", module: MODULES.UOM, action: "create", moduleScope: "pos" },
    UOM_UPDATE: { key: "UOM_UPDATE", label: "Update Unit of Measure", module: MODULES.UOM, action: "update", moduleScope: "pos" },
    UOM_DELETE: { key: "UOM_DELETE", label: "Delete Unit of Measure", module: MODULES.UOM, action: "delete", moduleScope: "pos" },
    UOM_DELETE_MULTIPLE: { key: "UOM_DELETE_MULTIPLE", label: "Delete Multiple Units of Measure", module: MODULES.UOM, action: "delete", moduleScope: "pos" },
    UOM_DELETE_ALL: { key: "UOM_DELETE_ALL", label: "Delete All Units of Measure", module: MODULES.UOM, action: "delete", moduleScope: "pos" },

    // ── USERS ─────────────────────────────────────────────────────────────────

    USERS_VIEW: { key: "USERS_VIEW", label: "View Users", module: MODULES.USERS, action: "read", moduleScope: "core" },
    USERS_VIEW_ONE: { key: "USERS_VIEW_ONE", label: "View User Details", module: MODULES.USERS, action: "read", moduleScope: "core" },
    USERS_CREATE: { key: "USERS_CREATE", label: "Create User", module: MODULES.USERS, action: "create", moduleScope: "core" },
    USERS_UPDATE: { key: "USERS_UPDATE", label: "Update User", module: MODULES.USERS, action: "update", moduleScope: "core" },
    USERS_UPDATE_STATUS: { key: "USERS_UPDATE_STATUS", label: "Update User Status (Active / Suspended / Terminated)", module: MODULES.USERS, action: "special", moduleScope: "core" },
    USERS_DELETE: { key: "USERS_DELETE", label: "Delete User", module: MODULES.USERS, action: "delete", moduleScope: "core" },
    USERS_VIEW_ROLES: { key: "USERS_VIEW_ROLES", label: "View User Roles", module: MODULES.USERS, action: "read", moduleScope: "core" },
    USERS_FETCH_BY_SHOP: { key: "USERS_FETCH_BY_SHOP", label: "Fetch Users by Shop", module: MODULES.USERS, action: "read", moduleScope: "core" },
    USERS_UPDATE_SUBSCRIPTION: { key: "USERS_UPDATE_SUBSCRIPTION", label: "Update Subscription Package", module: MODULES.USERS, action: "special", moduleScope: "core" },
    USERS_VERIFY_COMPANY_CODE: { key: "USERS_VERIFY_COMPANY_CODE", label: "Verify Company Code", module: MODULES.USERS, action: "special", moduleScope: "core" },
    USERS_FETCH_TENANT: { key: "USERS_FETCH_TENANT", label: "Fetch Tenant Details", module: MODULES.USERS, action: "read", moduleScope: "core" },

    // ══════════════════════════════════════════════════════════════════════════
    // HR MODULE  (moduleScope: "hr")
    // Visible / assignable only when tenant.modules.hr === true
    // ══════════════════════════════════════════════════════════════════════════

    HR_LEAVE_APPLY: { key: "HR_LEAVE_APPLY", label: "Apply for Leave", module: MODULES.HR_LEAVE, action: "create", moduleScope: "hr" },
    HR_LEAVE_VIEW: { key: "HR_LEAVE_VIEW", label: "View Leave Requests", module: MODULES.HR_LEAVE, action: "read", moduleScope: "hr" },
    HR_LEAVE_VIEW_ONE: { key: "HR_LEAVE_VIEW_ONE", label: "View Leave Request Details", module: MODULES.HR_LEAVE, action: "read", moduleScope: "hr" },
    HR_LEAVE_APPROVE: { key: "HR_LEAVE_APPROVE", label: "Approve Leave Request", module: MODULES.HR_LEAVE, action: "special", moduleScope: "hr" },
    HR_LEAVE_REJECT: { key: "HR_LEAVE_REJECT", label: "Reject Leave Request", module: MODULES.HR_LEAVE, action: "special", moduleScope: "hr" },
    HR_LEAVE_CANCEL: { key: "HR_LEAVE_CANCEL", label: "Cancel Leave Request", module: MODULES.HR_LEAVE, action: "special", moduleScope: "hr" },
    HR_LEAVE_VIEW_BALANCE: { key: "HR_LEAVE_VIEW_BALANCE", label: "View Leave Balance", module: MODULES.HR_LEAVE, action: "read", moduleScope: "hr" },
    HR_LEAVE_SEED_BALANCE: { key: "HR_LEAVE_SEED_BALANCE", label: "Seed / Reset Leave Entitlements", module: MODULES.HR_LEAVE, action: "special", moduleScope: "hr" },

    HR_ATTENDANCE_CLOCK_IN: { key: "HR_ATTENDANCE_CLOCK_IN", label: "Clock In", module: MODULES.HR_ATTENDANCE, action: "special", moduleScope: "hr" },
    HR_ATTENDANCE_CLOCK_OUT: { key: "HR_ATTENDANCE_CLOCK_OUT", label: "Clock Out", module: MODULES.HR_ATTENDANCE, action: "special", moduleScope: "hr" },
    HR_ATTENDANCE_VIEW_STATUS: { key: "HR_ATTENDANCE_VIEW_STATUS", label: "View Today's Clock Status", module: MODULES.HR_ATTENDANCE, action: "read", moduleScope: "hr" },
    HR_ATTENDANCE_VIEW_MY: { key: "HR_ATTENDANCE_VIEW_MY", label: "View Own Attendance History", module: MODULES.HR_ATTENDANCE, action: "read", moduleScope: "hr" },
    HR_ATTENDANCE_VIEW_ALL: { key: "HR_ATTENDANCE_VIEW_ALL", label: "View All Staff Attendance", module: MODULES.HR_ATTENDANCE, action: "read", moduleScope: "hr" },
    HR_ATTENDANCE_VIEW_REPORT: { key: "HR_ATTENDANCE_VIEW_REPORT", label: "View Attendance Report", module: MODULES.HR_ATTENDANCE, action: "read", moduleScope: "hr" },
    HR_ATTENDANCE_EMAIL_REPORT: { key: "HR_ATTENDANCE_EMAIL_REPORT", label: "Email Attendance Report", module: MODULES.HR_ATTENDANCE, action: "special", moduleScope: "hr" },
    HR_ATTENDANCE_RECONCILE: { key: "HR_ATTENDANCE_RECONCILE", label: "Reconcile Attendance for a Date", module: MODULES.HR_ATTENDANCE, action: "special", moduleScope: "hr" },

    // ══════════════════════════════════════════════════════════════════════════
    // ACCOUNTING MODULE  (moduleScope: "accounting")
    // Visible / assignable only when tenant.modules.accounting === true
    // ══════════════════════════════════════════════════════════════════════════

    ACCOUNTING_DASHBOARD_VIEW: { key: "ACCOUNTING_DASHBOARD_VIEW", label: "View Accounting Dashboard", module: MODULES.ACCOUNTING_DASHBOARD, action: "read", moduleScope: "accounting" },

    ACCOUNTING_COA_VIEW: { key: "ACCOUNTING_COA_VIEW", label: "View Chart of Accounts", module: MODULES.ACCOUNTING_COA, action: "read", moduleScope: "accounting" },
    ACCOUNTING_COA_VIEW_ONE: { key: "ACCOUNTING_COA_VIEW_ONE", label: "View Account Details", module: MODULES.ACCOUNTING_COA, action: "read", moduleScope: "accounting" },
    ACCOUNTING_COA_VIEW_TREE: { key: "ACCOUNTING_COA_VIEW_TREE", label: "View Account Hierarchy Tree", module: MODULES.ACCOUNTING_COA, action: "read", moduleScope: "accounting" },
    ACCOUNTING_COA_VIEW_BY_TYPE: { key: "ACCOUNTING_COA_VIEW_BY_TYPE", label: "View Accounts by Type", module: MODULES.ACCOUNTING_COA, action: "read", moduleScope: "accounting" },
    ACCOUNTING_COA_VIEW_BANK: { key: "ACCOUNTING_COA_VIEW_BANK", label: "View Bank Accounts", module: MODULES.ACCOUNTING_COA, action: "read", moduleScope: "accounting" },
    ACCOUNTING_COA_VIEW_LEDGER: { key: "ACCOUNTING_COA_VIEW_LEDGER", label: "View Account Ledger", module: MODULES.ACCOUNTING_COA, action: "read", moduleScope: "accounting" },
    ACCOUNTING_COA_CREATE: { key: "ACCOUNTING_COA_CREATE", label: "Create Account", module: MODULES.ACCOUNTING_COA, action: "create", moduleScope: "accounting" },
    ACCOUNTING_COA_UPDATE: { key: "ACCOUNTING_COA_UPDATE", label: "Update Account", module: MODULES.ACCOUNTING_COA, action: "update", moduleScope: "accounting" },
    ACCOUNTING_COA_UPDATE_OPENING_BALANCE: { key: "ACCOUNTING_COA_UPDATE_OPENING_BALANCE", label: "Update Account Opening Balance", module: MODULES.ACCOUNTING_COA, action: "update", moduleScope: "accounting" },
    ACCOUNTING_COA_TOGGLE_ACTIVE: { key: "ACCOUNTING_COA_TOGGLE_ACTIVE", label: "Activate / Deactivate Account", module: MODULES.ACCOUNTING_COA, action: "special", moduleScope: "accounting" },
    ACCOUNTING_COA_DELETE: { key: "ACCOUNTING_COA_DELETE", label: "Delete Account", module: MODULES.ACCOUNTING_COA, action: "delete", moduleScope: "accounting" },
    ACCOUNTING_COA_SEED_DEFAULTS: { key: "ACCOUNTING_COA_SEED_DEFAULTS", label: "Seed Default Chart of Accounts", module: MODULES.ACCOUNTING_COA, action: "special", moduleScope: "accounting" },

    ACCOUNTING_JOURNAL_VIEW: { key: "ACCOUNTING_JOURNAL_VIEW", label: "View Journal Entries", module: MODULES.ACCOUNTING_JOURNALS, action: "read", moduleScope: "accounting" },
    ACCOUNTING_JOURNAL_VIEW_ONE: { key: "ACCOUNTING_JOURNAL_VIEW_ONE", label: "View Journal Entry Details", module: MODULES.ACCOUNTING_JOURNALS, action: "read", moduleScope: "accounting" },
    ACCOUNTING_JOURNAL_VIEW_SUMMARY: { key: "ACCOUNTING_JOURNAL_VIEW_SUMMARY", label: "View Journal Entry Summary", module: MODULES.ACCOUNTING_JOURNALS, action: "read", moduleScope: "accounting" },
    ACCOUNTING_JOURNAL_VIEW_BY_SOURCE: { key: "ACCOUNTING_JOURNAL_VIEW_BY_SOURCE", label: "View Journal Entries by Source Document", module: MODULES.ACCOUNTING_JOURNALS, action: "read", moduleScope: "accounting" },
    ACCOUNTING_JOURNAL_CREATE_MANUAL: { key: "ACCOUNTING_JOURNAL_CREATE_MANUAL", label: "Create Manual Journal Entry", module: MODULES.ACCOUNTING_JOURNALS, action: "create", moduleScope: "accounting" },
    ACCOUNTING_JOURNAL_CREATE_EXPENSE: { key: "ACCOUNTING_JOURNAL_CREATE_EXPENSE", label: "Create Direct Expense Journal Entry", module: MODULES.ACCOUNTING_JOURNALS, action: "create", moduleScope: "accounting" },
    ACCOUNTING_JOURNAL_POST: { key: "ACCOUNTING_JOURNAL_POST", label: "Post Journal Entry (Draft → Posted)", module: MODULES.ACCOUNTING_JOURNALS, action: "special", moduleScope: "accounting" },
    ACCOUNTING_JOURNAL_VOID: { key: "ACCOUNTING_JOURNAL_VOID", label: "Void Journal Entry", module: MODULES.ACCOUNTING_JOURNALS, action: "special", moduleScope: "accounting" },

    ACCOUNTING_INVOICE_VIEW: { key: "ACCOUNTING_INVOICE_VIEW", label: "View Invoices & Bills", module: MODULES.ACCOUNTING_INVOICES, action: "read", moduleScope: "accounting" },
    ACCOUNTING_INVOICE_VIEW_ONE: { key: "ACCOUNTING_INVOICE_VIEW_ONE", label: "View Invoice / Bill Details", module: MODULES.ACCOUNTING_INVOICES, action: "read", moduleScope: "accounting" },
    ACCOUNTING_INVOICE_VIEW_SUMMARY: { key: "ACCOUNTING_INVOICE_VIEW_SUMMARY", label: "View Invoice Summary / Stats", module: MODULES.ACCOUNTING_INVOICES, action: "read", moduleScope: "accounting" },
    ACCOUNTING_INVOICE_CREATE: { key: "ACCOUNTING_INVOICE_CREATE", label: "Create Invoice / Supplier Bill", module: MODULES.ACCOUNTING_INVOICES, action: "create", moduleScope: "accounting" },
    ACCOUNTING_INVOICE_UPDATE: { key: "ACCOUNTING_INVOICE_UPDATE", label: "Update Invoice", module: MODULES.ACCOUNTING_INVOICES, action: "update", moduleScope: "accounting" },
    ACCOUNTING_INVOICE_VOID: { key: "ACCOUNTING_INVOICE_VOID", label: "Void Invoice", module: MODULES.ACCOUNTING_INVOICES, action: "special", moduleScope: "accounting" },
    ACCOUNTING_INVOICE_RECORD_PAYMENT: { key: "ACCOUNTING_INVOICE_RECORD_PAYMENT", label: "Record Payment Against Invoice", module: MODULES.ACCOUNTING_INVOICES, action: "special", moduleScope: "accounting" },
    ACCOUNTING_INVOICE_CONVERT_QUOTE: { key: "ACCOUNTING_INVOICE_CONVERT_QUOTE", label: "Convert Quote to Invoice", module: MODULES.ACCOUNTING_INVOICES, action: "special", moduleScope: "accounting" },

    ACCOUNTING_INCOME_POST_DIRECT: { key: "ACCOUNTING_INCOME_POST_DIRECT", label: "Post Direct Income", module: MODULES.ACCOUNTING_INCOME, action: "create", moduleScope: "accounting" },
    ACCOUNTING_INCOME_POST_EXPENSE: { key: "ACCOUNTING_INCOME_POST_EXPENSE", label: "Post Direct Expense", module: MODULES.ACCOUNTING_INCOME, action: "create", moduleScope: "accounting" },
    ACCOUNTING_INCOME_SETTLE_INVOICE: { key: "ACCOUNTING_INCOME_SETTLE_INVOICE", label: "Settle Invoice Payment", module: MODULES.ACCOUNTING_INCOME, action: "special", moduleScope: "accounting" },
    ACCOUNTING_INCOME_VIEW_HISTORY: { key: "ACCOUNTING_INCOME_VIEW_HISTORY", label: "View Income / Expense Payment History", module: MODULES.ACCOUNTING_INCOME, action: "read", moduleScope: "accounting" },

    ACCOUNTING_NOTES_VIEW: { key: "ACCOUNTING_NOTES_VIEW", label: "View Credit / Debit Notes", module: MODULES.ACCOUNTING_NOTES, action: "read", moduleScope: "accounting" },
    ACCOUNTING_NOTES_VIEW_ONE: { key: "ACCOUNTING_NOTES_VIEW_ONE", label: "View Note Details", module: MODULES.ACCOUNTING_NOTES, action: "read", moduleScope: "accounting" },
    ACCOUNTING_NOTES_VIEW_BY_INVOICE: { key: "ACCOUNTING_NOTES_VIEW_BY_INVOICE", label: "View Notes for an Invoice", module: MODULES.ACCOUNTING_NOTES, action: "read", moduleScope: "accounting" },
    ACCOUNTING_NOTES_VIEW_BY_CUSTOMER: { key: "ACCOUNTING_NOTES_VIEW_BY_CUSTOMER", label: "View Credit Notes for a Customer", module: MODULES.ACCOUNTING_NOTES, action: "read", moduleScope: "accounting" },
    ACCOUNTING_NOTES_VIEW_BY_SUPPLIER: { key: "ACCOUNTING_NOTES_VIEW_BY_SUPPLIER", label: "View Debit Notes for a Supplier", module: MODULES.ACCOUNTING_NOTES, action: "read", moduleScope: "accounting" },
    ACCOUNTING_NOTES_CREATE: { key: "ACCOUNTING_NOTES_CREATE", label: "Create Note (Draft)", module: MODULES.ACCOUNTING_NOTES, action: "create", moduleScope: "accounting" },
    ACCOUNTING_NOTES_UPDATE: { key: "ACCOUNTING_NOTES_UPDATE", label: "Update Note", module: MODULES.ACCOUNTING_NOTES, action: "update", moduleScope: "accounting" },
    ACCOUNTING_NOTES_APPROVE: { key: "ACCOUNTING_NOTES_APPROVE", label: "Approve Note", module: MODULES.ACCOUNTING_NOTES, action: "special", moduleScope: "accounting" },
    ACCOUNTING_NOTES_APPLY: { key: "ACCOUNTING_NOTES_APPLY", label: "Apply Note Against Invoice", module: MODULES.ACCOUNTING_NOTES, action: "special", moduleScope: "accounting" },
    ACCOUNTING_NOTES_VOID: { key: "ACCOUNTING_NOTES_VOID", label: "Void Note", module: MODULES.ACCOUNTING_NOTES, action: "special", moduleScope: "accounting" },
    ACCOUNTING_NOTES_DELETE: { key: "ACCOUNTING_NOTES_DELETE", label: "Delete Draft Note", module: MODULES.ACCOUNTING_NOTES, action: "delete", moduleScope: "accounting" },

    ACCOUNTING_BANK_STMT_VIEW: { key: "ACCOUNTING_BANK_STMT_VIEW", label: "View Bank Statement Imports", module: MODULES.ACCOUNTING_BANK_STATEMENTS, action: "read", moduleScope: "accounting" },
    ACCOUNTING_BANK_STMT_VIEW_ONE: { key: "ACCOUNTING_BANK_STMT_VIEW_ONE", label: "View Bank Statement Import Details", module: MODULES.ACCOUNTING_BANK_STATEMENTS, action: "read", moduleScope: "accounting" },
    ACCOUNTING_BANK_STMT_VIEW_SUMMARY: { key: "ACCOUNTING_BANK_STMT_VIEW_SUMMARY", label: "View Bank Statement Import Summary", module: MODULES.ACCOUNTING_BANK_STATEMENTS, action: "read", moduleScope: "accounting" },
    ACCOUNTING_BANK_STMT_IMPORT: { key: "ACCOUNTING_BANK_STMT_IMPORT", label: "Import Bank Statement", module: MODULES.ACCOUNTING_BANK_STATEMENTS, action: "create", moduleScope: "accounting" },
    ACCOUNTING_BANK_STMT_CATEGORIZE: { key: "ACCOUNTING_BANK_STMT_CATEGORIZE", label: "Categorize Bank Transaction", module: MODULES.ACCOUNTING_BANK_STATEMENTS, action: "update", moduleScope: "accounting" },
    ACCOUNTING_BANK_STMT_BULK_CATEGORIZE: { key: "ACCOUNTING_BANK_STMT_BULK_CATEGORIZE", label: "Bulk Categorize Bank Transactions", module: MODULES.ACCOUNTING_BANK_STATEMENTS, action: "update", moduleScope: "accounting" },
    ACCOUNTING_BANK_STMT_EXCLUDE: { key: "ACCOUNTING_BANK_STMT_EXCLUDE", label: "Exclude Bank Transaction", module: MODULES.ACCOUNTING_BANK_STATEMENTS, action: "special", moduleScope: "accounting" },
    ACCOUNTING_BANK_STMT_REAPPLY_RULES: { key: "ACCOUNTING_BANK_STMT_REAPPLY_RULES", label: "Re-Apply Categorization Rules", module: MODULES.ACCOUNTING_BANK_STATEMENTS, action: "special", moduleScope: "accounting" },
    ACCOUNTING_BANK_STMT_PUSH_RECONCILIATION: { key: "ACCOUNTING_BANK_STMT_PUSH_RECONCILIATION", label: "Push Transactions to Reconciliation", module: MODULES.ACCOUNTING_BANK_STATEMENTS, action: "special", moduleScope: "accounting" },
    ACCOUNTING_BANK_STMT_PUSH_JOURNAL: { key: "ACCOUNTING_BANK_STMT_PUSH_JOURNAL", label: "Push Transactions to Journal Entries", module: MODULES.ACCOUNTING_BANK_STATEMENTS, action: "special", moduleScope: "accounting" },
    ACCOUNTING_BANK_STMT_VOID: { key: "ACCOUNTING_BANK_STMT_VOID", label: "Void Bank Statement Import", module: MODULES.ACCOUNTING_BANK_STATEMENTS, action: "special", moduleScope: "accounting" },
    ACCOUNTING_BANK_STMT_COL_MAPPING_VIEW: { key: "ACCOUNTING_BANK_STMT_COL_MAPPING_VIEW", label: "View Column Mappings", module: MODULES.ACCOUNTING_BANK_STATEMENTS, action: "read", moduleScope: "accounting" },
    ACCOUNTING_BANK_STMT_COL_MAPPING_MANAGE: { key: "ACCOUNTING_BANK_STMT_COL_MAPPING_MANAGE", label: "Create / Update / Delete Column Mappings", module: MODULES.ACCOUNTING_BANK_STATEMENTS, action: "special", moduleScope: "accounting" },
    ACCOUNTING_BANK_STMT_CAT_RULE_VIEW: { key: "ACCOUNTING_BANK_STMT_CAT_RULE_VIEW", label: "View Categorization Rules", module: MODULES.ACCOUNTING_BANK_STATEMENTS, action: "read", moduleScope: "accounting" },
    ACCOUNTING_BANK_STMT_CAT_RULE_MANAGE: { key: "ACCOUNTING_BANK_STMT_CAT_RULE_MANAGE", label: "Create / Update / Delete Categorization Rules", module: MODULES.ACCOUNTING_BANK_STATEMENTS, action: "special", moduleScope: "accounting" },
    ACCOUNTING_BANK_STMT_CAT_MAP_VIEW: { key: "ACCOUNTING_BANK_STMT_CAT_MAP_VIEW", label: "View Category Mappings", module: MODULES.ACCOUNTING_BANK_STATEMENTS, action: "read", moduleScope: "accounting" },
    ACCOUNTING_BANK_STMT_CAT_MAP_MANAGE: { key: "ACCOUNTING_BANK_STMT_CAT_MAP_MANAGE", label: "Create / Update / Delete Category Mappings", module: MODULES.ACCOUNTING_BANK_STATEMENTS, action: "special", moduleScope: "accounting" },

    ACCOUNTING_RECON_VIEW: { key: "ACCOUNTING_RECON_VIEW", label: "View Reconciliations", module: MODULES.ACCOUNTING_RECONCILIATION, action: "read", moduleScope: "accounting" },
    ACCOUNTING_RECON_VIEW_ONE: { key: "ACCOUNTING_RECON_VIEW_ONE", label: "View Reconciliation Details", module: MODULES.ACCOUNTING_RECONCILIATION, action: "read", moduleScope: "accounting" },
    ACCOUNTING_RECON_VIEW_UNRECONCILED: { key: "ACCOUNTING_RECON_VIEW_UNRECONCILED", label: "View Unreconciled Journal Entry Lines", module: MODULES.ACCOUNTING_RECONCILIATION, action: "read", moduleScope: "accounting" },
    ACCOUNTING_RECON_OPEN: { key: "ACCOUNTING_RECON_OPEN", label: "Open Reconciliation Session", module: MODULES.ACCOUNTING_RECONCILIATION, action: "create", moduleScope: "accounting" },
    ACCOUNTING_RECON_IMPORT_LINES: { key: "ACCOUNTING_RECON_IMPORT_LINES", label: "Import Statement Lines", module: MODULES.ACCOUNTING_RECONCILIATION, action: "create", moduleScope: "accounting" },
    ACCOUNTING_RECON_ADD_LINE: { key: "ACCOUNTING_RECON_ADD_LINE", label: "Add Statement Line Manually", module: MODULES.ACCOUNTING_RECONCILIATION, action: "create", moduleScope: "accounting" },
    ACCOUNTING_RECON_UPDATE_LINE: { key: "ACCOUNTING_RECON_UPDATE_LINE", label: "Update Statement Line", module: MODULES.ACCOUNTING_RECONCILIATION, action: "update", moduleScope: "accounting" },
    ACCOUNTING_RECON_DELETE_LINE: { key: "ACCOUNTING_RECON_DELETE_LINE", label: "Delete Statement Line", module: MODULES.ACCOUNTING_RECONCILIATION, action: "delete", moduleScope: "accounting" },
    ACCOUNTING_RECON_MATCH: { key: "ACCOUNTING_RECON_MATCH", label: "Match Statement Line to Journal Entry", module: MODULES.ACCOUNTING_RECONCILIATION, action: "special", moduleScope: "accounting" },
    ACCOUNTING_RECON_UNMATCH: { key: "ACCOUNTING_RECON_UNMATCH", label: "Unmatch Statement Line", module: MODULES.ACCOUNTING_RECONCILIATION, action: "special", moduleScope: "accounting" },
    ACCOUNTING_RECON_EXCLUDE_LINE: { key: "ACCOUNTING_RECON_EXCLUDE_LINE", label: "Exclude / Include Statement Line", module: MODULES.ACCOUNTING_RECONCILIATION, action: "special", moduleScope: "accounting" },
    ACCOUNTING_RECON_AUTO_MATCH: { key: "ACCOUNTING_RECON_AUTO_MATCH", label: "Run Auto-Match", module: MODULES.ACCOUNTING_RECONCILIATION, action: "special", moduleScope: "accounting" },
    ACCOUNTING_RECON_COMPLETE: { key: "ACCOUNTING_RECON_COMPLETE", label: "Complete Reconciliation", module: MODULES.ACCOUNTING_RECONCILIATION, action: "special", moduleScope: "accounting" },
    ACCOUNTING_RECON_VOID: { key: "ACCOUNTING_RECON_VOID", label: "Void Reconciliation", module: MODULES.ACCOUNTING_RECONCILIATION, action: "special", moduleScope: "accounting" },

    ACCOUNTING_REPORT_TRIAL_BALANCE: { key: "ACCOUNTING_REPORT_TRIAL_BALANCE", label: "View Trial Balance", module: MODULES.ACCOUNTING_REPORTS, action: "read", moduleScope: "accounting" },
    ACCOUNTING_REPORT_PROFIT_LOSS: { key: "ACCOUNTING_REPORT_PROFIT_LOSS", label: "View Profit & Loss Statement", module: MODULES.ACCOUNTING_REPORTS, action: "read", moduleScope: "accounting" },
    ACCOUNTING_REPORT_BALANCE_SHEET: { key: "ACCOUNTING_REPORT_BALANCE_SHEET", label: "View Balance Sheet", module: MODULES.ACCOUNTING_REPORTS, action: "read", moduleScope: "accounting" },
    ACCOUNTING_REPORT_GENERAL_LEDGER: { key: "ACCOUNTING_REPORT_GENERAL_LEDGER", label: "View General Ledger", module: MODULES.ACCOUNTING_REPORTS, action: "read", moduleScope: "accounting" },
    ACCOUNTING_REPORT_ACCOUNT_BALANCES: { key: "ACCOUNTING_REPORT_ACCOUNT_BALANCES", label: "View Account Balances", module: MODULES.ACCOUNTING_REPORTS, action: "read", moduleScope: "accounting" },
    ACCOUNTING_REPORT_VAT: { key: "ACCOUNTING_REPORT_VAT", label: "View VAT Report", module: MODULES.ACCOUNTING_REPORTS, action: "read", moduleScope: "accounting" },
    ACCOUNTING_REPORT_CASH_FLOW: { key: "ACCOUNTING_REPORT_CASH_FLOW", label: "View Cash Flow Summary", module: MODULES.ACCOUNTING_REPORTS, action: "read", moduleScope: "accounting" },
    ACCOUNTING_REPORT_CUSTOMER_STATEMENT: { key: "ACCOUNTING_REPORT_CUSTOMER_STATEMENT", label: "View Customer Statement", module: MODULES.ACCOUNTING_REPORTS, action: "read", moduleScope: "accounting" },
    ACCOUNTING_REPORT_SUPPLIER_STATEMENT: { key: "ACCOUNTING_REPORT_SUPPLIER_STATEMENT", label: "View Supplier Statement", module: MODULES.ACCOUNTING_REPORTS, action: "read", moduleScope: "accounting" },
    ACCOUNTING_REPORT_AR_AGING: { key: "ACCOUNTING_REPORT_AR_AGING", label: "View AR Aging Report", module: MODULES.ACCOUNTING_REPORTS, action: "read", moduleScope: "accounting" },
    ACCOUNTING_REPORT_AP_AGING: { key: "ACCOUNTING_REPORT_AP_AGING", label: "View AP Aging Report", module: MODULES.ACCOUNTING_REPORTS, action: "read", moduleScope: "accounting" },

    // ── DigiTax ─────────────────────────────────────────────────────────────────

    ACCOUNTING_DIGITAX_VIEW_CONFIG: { key: "ACCOUNTING_DIGITAX_VIEW_CONFIG", label: "View DigiTax Configuration", module: MODULES.ACCOUNTING_INVOICES, action: "read", moduleScope: "accounting" },
    ACCOUNTING_DIGITAX_MANAGE_SETTINGS: { key: "ACCOUNTING_DIGITAX_MANAGE_SETTINGS", label: "Manage DigiTax Shop Settings", module: MODULES.ACCOUNTING_INVOICES, action: "update", moduleScope: "accounting" },
    ACCOUNTING_DIGITAX_GENERATE_INVOICE: { key: "ACCOUNTING_DIGITAX_GENERATE_INVOICE", label: "Generate DigiTax Invoice", module: MODULES.ACCOUNTING_INVOICES, action: "create", moduleScope: "accounting" },
    ACCOUNTING_DIGITAX_VIEW_INVOICE_STATUS: { key: "ACCOUNTING_DIGITAX_VIEW_INVOICE_STATUS", label: "View DigiTax Invoice Status", module: MODULES.ACCOUNTING_INVOICES, action: "read", moduleScope: "accounting" },
    ACCOUNTING_DIGITAX_CANCEL_INVOICE: { key: "ACCOUNTING_DIGITAX_CANCEL_INVOICE", label: "Cancel DigiTax Invoice", module: MODULES.ACCOUNTING_INVOICES, action: "delete", moduleScope: "accounting" },

    // ══════════════════════════════════════════════════════════════════════════
    // CRM / MTEJA MODULE  (moduleScope: "crm")
    // Visible / assignable only when tenant.modules.crm === true
    // ══════════════════════════════════════════════════════════════════════════

    // ── Leads ─────────────────────────────────────────────────────────────────

    CRM_LEADS_VIEW: { key: "CRM_LEADS_VIEW", label: "View Leads", module: MODULES.CRM_LEADS, action: "read", moduleScope: "crm" },
    CRM_LEADS_VIEW_ONE: { key: "CRM_LEADS_VIEW_ONE", label: "View Lead Details", module: MODULES.CRM_LEADS, action: "read", moduleScope: "crm" },
    CRM_LEADS_CREATE: { key: "CRM_LEADS_CREATE", label: "Create Lead", module: MODULES.CRM_LEADS, action: "create", moduleScope: "crm" },
    CRM_LEADS_UPDATE: { key: "CRM_LEADS_UPDATE", label: "Update Lead", module: MODULES.CRM_LEADS, action: "update", moduleScope: "crm" },
    CRM_LEADS_UPDATE_STAGE: { key: "CRM_LEADS_UPDATE_STAGE", label: "Update Lead Stage", module: MODULES.CRM_LEADS, action: "special", moduleScope: "crm" },
    CRM_LEADS_CONVERT: { key: "CRM_LEADS_CONVERT", label: "Convert Lead to Customer", module: MODULES.CRM_LEADS, action: "special", moduleScope: "crm" },
    CRM_LEADS_DELETE: { key: "CRM_LEADS_DELETE", label: "Delete Lead", module: MODULES.CRM_LEADS, action: "delete", moduleScope: "crm" },
    CRM_LEADS_VIEW_PIPELINE: { key: "CRM_LEADS_VIEW_PIPELINE", label: "View Pipeline Summary", module: MODULES.CRM_LEADS, action: "read", moduleScope: "crm" },

    // ── Lead Activities ───────────────────────────────────────────────────────

    CRM_ACTIVITIES_VIEW: { key: "CRM_ACTIVITIES_VIEW", label: "View Lead Activities", module: MODULES.CRM_LEAD_ACTIVITIES, action: "read", moduleScope: "crm" },
    CRM_ACTIVITIES_CREATE: { key: "CRM_ACTIVITIES_CREATE", label: "Log Lead Activity", module: MODULES.CRM_LEAD_ACTIVITIES, action: "create", moduleScope: "crm" },
    CRM_ACTIVITIES_UPDATE: { key: "CRM_ACTIVITIES_UPDATE", label: "Update Lead Activity", module: MODULES.CRM_LEAD_ACTIVITIES, action: "update", moduleScope: "crm" },
    CRM_ACTIVITIES_DELETE: { key: "CRM_ACTIVITIES_DELETE", label: "Delete Lead Activity", module: MODULES.CRM_LEAD_ACTIVITIES, action: "delete", moduleScope: "crm" },
    CRM_ACTIVITIES_VIEW_SUMMARY: { key: "CRM_ACTIVITIES_VIEW_SUMMARY", label: "View Activity Summary", module: MODULES.CRM_LEAD_ACTIVITIES, action: "read", moduleScope: "crm" },

    // ── Lead Workflows ────────────────────────────────────────────────────────

    CRM_WORKFLOWS_VIEW: { key: "CRM_WORKFLOWS_VIEW", label: "View Lead Workflows", module: MODULES.CRM_LEAD_WORKFLOWS, action: "read", moduleScope: "crm" },
    CRM_WORKFLOWS_CREATE: { key: "CRM_WORKFLOWS_CREATE", label: "Create Lead Workflow", module: MODULES.CRM_LEAD_WORKFLOWS, action: "create", moduleScope: "crm" },
    CRM_WORKFLOWS_UPDATE: { key: "CRM_WORKFLOWS_UPDATE", label: "Update Lead Workflow", module: MODULES.CRM_LEAD_WORKFLOWS, action: "update", moduleScope: "crm" },
    CRM_WORKFLOWS_DELETE: { key: "CRM_WORKFLOWS_DELETE", label: "Delete Lead Workflow", module: MODULES.CRM_LEAD_WORKFLOWS, action: "delete", moduleScope: "crm" },
    CRM_WORKFLOWS_TOGGLE: { key: "CRM_WORKFLOWS_TOGGLE", label: "Activate / Deactivate Workflow", module: MODULES.CRM_LEAD_WORKFLOWS, action: "special", moduleScope: "crm" },
    CRM_WORKFLOWS_TRIGGER: { key: "CRM_WORKFLOWS_TRIGGER", label: "Manually Trigger Workflow for Lead", module: MODULES.CRM_LEAD_WORKFLOWS, action: "special", moduleScope: "crm" },
    CRM_WORKFLOWS_VIEW_LOGS: { key: "CRM_WORKFLOWS_VIEW_LOGS", label: "View Workflow Execution Logs", module: MODULES.CRM_LEAD_WORKFLOWS, action: "read", moduleScope: "crm" },

    // ── Campaigns ────────────────────────────────────────────────────────────

    CRM_CAMPAIGNS_VIEW: { key: "CRM_CAMPAIGNS_VIEW", label: "View Campaigns", module: MODULES.CRM_CAMPAIGNS, action: "read", moduleScope: "crm" },
    CRM_CAMPAIGNS_VIEW_ONE: { key: "CRM_CAMPAIGNS_VIEW_ONE", label: "View Campaign Details", module: MODULES.CRM_CAMPAIGNS, action: "read", moduleScope: "crm" },
    CRM_CAMPAIGNS_CREATE: { key: "CRM_CAMPAIGNS_CREATE", label: "Create Campaign", module: MODULES.CRM_CAMPAIGNS, action: "create", moduleScope: "crm" },
    CRM_CAMPAIGNS_UPDATE: { key: "CRM_CAMPAIGNS_UPDATE", label: "Update Campaign", module: MODULES.CRM_CAMPAIGNS, action: "update", moduleScope: "crm" },
    CRM_CAMPAIGNS_UPDATE_STATUS: { key: "CRM_CAMPAIGNS_UPDATE_STATUS", label: "Update Campaign Status", module: MODULES.CRM_CAMPAIGNS, action: "special", moduleScope: "crm" },
    CRM_CAMPAIGNS_UPDATE_ACTUALS: { key: "CRM_CAMPAIGNS_UPDATE_ACTUALS", label: "Update Campaign Actuals (Spend / Revenue)", module: MODULES.CRM_CAMPAIGNS, action: "special", moduleScope: "crm" },
    CRM_CAMPAIGNS_DELETE: { key: "CRM_CAMPAIGNS_DELETE", label: "Delete Campaign", module: MODULES.CRM_CAMPAIGNS, action: "delete", moduleScope: "crm" },

    // ── Sales Targets ─────────────────────────────────────────────────────────

    CRM_TARGETS_VIEW: { key: "CRM_TARGETS_VIEW", label: "View Sales Targets", module: MODULES.CRM_SALES_TARGETS, action: "read", moduleScope: "crm" },
    CRM_TARGETS_VIEW_ONE: { key: "CRM_TARGETS_VIEW_ONE", label: "View Sales Target Details", module: MODULES.CRM_SALES_TARGETS, action: "read", moduleScope: "crm" },
    CRM_TARGETS_VIEW_LEADERBOARD: { key: "CRM_TARGETS_VIEW_LEADERBOARD", label: "View Sales Leaderboard", module: MODULES.CRM_SALES_TARGETS, action: "read", moduleScope: "crm" },
    CRM_TARGETS_CREATE: { key: "CRM_TARGETS_CREATE", label: "Create Sales Target", module: MODULES.CRM_SALES_TARGETS, action: "create", moduleScope: "crm" },
    CRM_TARGETS_UPDATE: { key: "CRM_TARGETS_UPDATE", label: "Update Sales Target", module: MODULES.CRM_SALES_TARGETS, action: "update", moduleScope: "crm" },
    CRM_TARGETS_UPDATE_ACTUAL: { key: "CRM_TARGETS_UPDATE_ACTUAL", label: "Update Target Actual Value", module: MODULES.CRM_SALES_TARGETS, action: "special", moduleScope: "crm" },
    CRM_TARGETS_DELETE: { key: "CRM_TARGETS_DELETE", label: "Delete Sales Target", module: MODULES.CRM_SALES_TARGETS, action: "delete", moduleScope: "crm" },

    // ── Sales Budgets ─────────────────────────────────────────────────────────

    CRM_BUDGETS_VIEW: { key: "CRM_BUDGETS_VIEW", label: "View Sales Budgets", module: MODULES.CRM_SALES_BUDGETS, action: "read", moduleScope: "crm" },
    CRM_BUDGETS_VIEW_ONE: { key: "CRM_BUDGETS_VIEW_ONE", label: "View Sales Budget Details", module: MODULES.CRM_SALES_BUDGETS, action: "read", moduleScope: "crm" },
    CRM_BUDGETS_CREATE: { key: "CRM_BUDGETS_CREATE", label: "Create Sales Budget", module: MODULES.CRM_SALES_BUDGETS, action: "create", moduleScope: "crm" },
    CRM_BUDGETS_UPDATE: { key: "CRM_BUDGETS_UPDATE", label: "Update Sales Budget", module: MODULES.CRM_SALES_BUDGETS, action: "update", moduleScope: "crm" },
    CRM_BUDGETS_SUBMIT: { key: "CRM_BUDGETS_SUBMIT", label: "Submit Budget for Approval", module: MODULES.CRM_SALES_BUDGETS, action: "special", moduleScope: "crm" },
    CRM_BUDGETS_APPROVE: { key: "CRM_BUDGETS_APPROVE", label: "Approve / Reject Budget", module: MODULES.CRM_SALES_BUDGETS, action: "special", moduleScope: "crm" },
    CRM_BUDGETS_UPDATE_ACTUALS: { key: "CRM_BUDGETS_UPDATE_ACTUALS", label: "Update Budget Actuals", module: MODULES.CRM_SALES_BUDGETS, action: "special", moduleScope: "crm" },
    CRM_BUDGETS_DELETE: { key: "CRM_BUDGETS_DELETE", label: "Delete Sales Budget", module: MODULES.CRM_SALES_BUDGETS, action: "delete", moduleScope: "crm" },

    // ══════════════════════════════════════════════════════════════════════════
    // DALA / REAL ESTATE MODULE  (moduleScope: "dala")
    // Visible / assignable only when tenant.modules.dala === true
    // ══════════════════════════════════════════════════════════════════════════

    // ── Dashboard ─────────────────────────────────────────────────────────────

    DALA_DASHBOARD_VIEW: { key: "DALA_DASHBOARD_VIEW", label: "View Dala Dashboard", module: MODULES.DALA_DASHBOARD, action: "read", moduleScope: "dala" },

    // ── Properties ─────────────────────────────────────────────────────────────

    DALA_PROPERTIES_VIEW: { key: "DALA_PROPERTIES_VIEW", label: "View Properties", module: MODULES.DALA_PROPERTIES, action: "read", moduleScope: "dala" },
    DALA_PROPERTIES_VIEW_ONE: { key: "DALA_PROPERTIES_VIEW_ONE", label: "View Property Details", module: MODULES.DALA_PROPERTIES, action: "read", moduleScope: "dala" },
    DALA_PROPERTIES_CREATE: { key: "DALA_PROPERTIES_CREATE", label: "Create Property", module: MODULES.DALA_PROPERTIES, action: "create", moduleScope: "dala" },
    DALA_PROPERTIES_UPDATE: { key: "DALA_PROPERTIES_UPDATE", label: "Update Property", module: MODULES.DALA_PROPERTIES, action: "update", moduleScope: "dala" },
    DALA_PROPERTIES_DELETE: { key: "DALA_PROPERTIES_DELETE", label: "Delete Property", module: MODULES.DALA_PROPERTIES, action: "delete", moduleScope: "dala" },

    // ── Property Types ─────────────────────────────────────────────────────────

    DALA_PROPERTY_TYPES_VIEW: { key: "DALA_PROPERTY_TYPES_VIEW", label: "View Property Types", module: MODULES.DALA_PROPERTY_TYPES, action: "read", moduleScope: "dala" },
    DALA_PROPERTY_TYPES_CREATE: { key: "DALA_PROPERTY_TYPES_CREATE", label: "Create Property Type", module: MODULES.DALA_PROPERTY_TYPES, action: "create", moduleScope: "dala" },
    DALA_PROPERTY_TYPES_UPDATE: { key: "DALA_PROPERTY_TYPES_UPDATE", label: "Update Property Type", module: MODULES.DALA_PROPERTY_TYPES, action: "update", moduleScope: "dala" },
    DALA_PROPERTY_TYPES_DELETE: { key: "DALA_PROPERTY_TYPES_DELETE", label: "Delete Property Type", module: MODULES.DALA_PROPERTY_TYPES, action: "delete", moduleScope: "dala" },

    // ── Sales ─────────────────────────────────────────────────────────────────

    DALA_SALES_VIEW: { key: "DALA_SALES_VIEW", label: "View Sales", module: MODULES.DALA_SALES, action: "read", moduleScope: "dala" },
    DALA_SALES_VIEW_ONE: { key: "DALA_SALES_VIEW_ONE", label: "View Sale Details", module: MODULES.DALA_SALES, action: "read", moduleScope: "dala" },
    DALA_SALES_CREATE: { key: "DALA_SALES_CREATE", label: "Create Sale", module: MODULES.DALA_SALES, action: "create", moduleScope: "dala" },
    DALA_SALES_UPDATE: { key: "DALA_SALES_UPDATE", label: "Update Sale", module: MODULES.DALA_SALES, action: "update", moduleScope: "dala" },
    DALA_SALES_DELETE: { key: "DALA_SALES_DELETE", label: "Delete Sale", module: MODULES.DALA_SALES, action: "delete", moduleScope: "dala" },
    DALA_SALES_DOWNLOAD_OFFER_LETTER: { key: "DALA_SALES_DOWNLOAD_OFFER_LETTER", label: "Download Offer Letter", module: MODULES.DALA_SALES, action: "special", moduleScope: "dala" },

    // ── Leases ─────────────────────────────────────────────────────────────────

    DALA_LEASES_VIEW: { key: "DALA_LEASES_VIEW", label: "View Leases", module: MODULES.DALA_LEASES, action: "read", moduleScope: "dala" },
    DALA_LEASES_VIEW_ONE: { key: "DALA_LEASES_VIEW_ONE", label: "View Lease Details", module: MODULES.DALA_LEASES, action: "read", moduleScope: "dala" },
    DALA_LEASES_CREATE: { key: "DALA_LEASES_CREATE", label: "Create Lease", module: MODULES.DALA_LEASES, action: "create", moduleScope: "dala" },
    DALA_LEASES_UPDATE: { key: "DALA_LEASES_UPDATE", label: "Update Lease", module: MODULES.DALA_LEASES, action: "update", moduleScope: "dala" },
    DALA_LEASES_DELETE: { key: "DALA_LEASES_DELETE", label: "Delete Lease", module: MODULES.DALA_LEASES, action: "delete", moduleScope: "dala" },

    // ── Commissions ───────────────────────────────────────────────────────────

    DALA_COMMISSIONS_VIEW: { key: "DALA_COMMISSIONS_VIEW", label: "View Commissions", module: MODULES.DALA_COMMISSIONS, action: "read", moduleScope: "dala" },
    DALA_COMMISSIONS_VIEW_ONE: { key: "DALA_COMMISSIONS_VIEW_ONE", label: "View Commission Details", module: MODULES.DALA_COMMISSIONS, action: "read", moduleScope: "dala" },
    DALA_COMMISSIONS_CREATE: { key: "DALA_COMMISSIONS_CREATE", label: "Create Commission", module: MODULES.DALA_COMMISSIONS, action: "create", moduleScope: "dala" },
    DALA_COMMISSIONS_UPDATE: { key: "DALA_COMMISSIONS_UPDATE", label: "Update Commission", module: MODULES.DALA_COMMISSIONS, action: "update", moduleScope: "dala" },
    DALA_COMMISSIONS_DELETE: { key: "DALA_COMMISSIONS_DELETE", label: "Delete Commission", module: MODULES.DALA_COMMISSIONS, action: "delete", moduleScope: "dala" },

    // ── Rent Collection ───────────────────────────────────────────────────────

    DALA_RENT_COLLECTION_VIEW: { key: "DALA_RENT_COLLECTION_VIEW", label: "View Rent Collection", module: MODULES.DALA_RENT_COLLECTION, action: "read", moduleScope: "dala" },
    DALA_RENT_COLLECTION_VIEW_ONE: { key: "DALA_RENT_COLLECTION_VIEW_ONE", label: "View Rent Collection Details", module: MODULES.DALA_RENT_COLLECTION, action: "read", moduleScope: "dala" },
    DALA_RENT_COLLECTION_CREATE: { key: "DALA_RENT_COLLECTION_CREATE", label: "Record Rent Payment", module: MODULES.DALA_RENT_COLLECTION, action: "create", moduleScope: "dala" },
    DALA_RENT_COLLECTION_UPDATE: { key: "DALA_RENT_COLLECTION_UPDATE", label: "Update Rent Collection", module: MODULES.DALA_RENT_COLLECTION, action: "update", moduleScope: "dala" },
    DALA_RENT_COLLECTION_DELETE: { key: "DALA_RENT_COLLECTION_DELETE", label: "Delete Rent Collection", module: MODULES.DALA_RENT_COLLECTION, action: "delete", moduleScope: "dala" },

    // ── Maintenance ───────────────────────────────────────────────────────────

    DALA_MAINTENANCE_VIEW: { key: "DALA_MAINTENANCE_VIEW", label: "View Maintenance Requests", module: MODULES.DALA_MAINTENANCE, action: "read", moduleScope: "dala" },
    DALA_MAINTENANCE_VIEW_ONE: { key: "DALA_MAINTENANCE_VIEW_ONE", label: "View Maintenance Details", module: MODULES.DALA_MAINTENANCE, action: "read", moduleScope: "dala" },
    DALA_MAINTENANCE_CREATE: { key: "DALA_MAINTENANCE_CREATE", label: "Create Maintenance Request", module: MODULES.DALA_MAINTENANCE, action: "create", moduleScope: "dala" },
    DALA_MAINTENANCE_UPDATE: { key: "DALA_MAINTENANCE_UPDATE", label: "Update Maintenance Request", module: MODULES.DALA_MAINTENANCE, action: "update", moduleScope: "dala" },
    DALA_MAINTENANCE_DELETE: { key: "DALA_MAINTENANCE_DELETE", label: "Delete Maintenance Request", module: MODULES.DALA_MAINTENANCE, action: "delete", moduleScope: "dala" },

    // ── Reports ───────────────────────────────────────────────────────────────

    DALA_REPORTS_VIEW: { key: "DALA_REPORTS_VIEW", label: "View Dala Reports", module: MODULES.DALA_REPORTS, action: "read", moduleScope: "dala" },

} as const;

// ─── Key collections ──────────────────────────────────────────────────────────

export const ALL_PERMISSION_KEYS = Object.keys(PERMISSIONS) as string[];

export const CORE_PERMISSION_KEYS = ALL_PERMISSION_KEYS.filter(
    (k) => PERMISSIONS[k].moduleScope === "core"
);
export const HR_PERMISSION_KEYS = ALL_PERMISSION_KEYS.filter(
    (k) => PERMISSIONS[k].moduleScope === "hr"
);
export const ACCOUNTING_PERMISSION_KEYS = ALL_PERMISSION_KEYS.filter(
    (k) => PERMISSIONS[k].moduleScope === "accounting"
);
export const CRM_PERMISSION_KEYS = ALL_PERMISSION_KEYS.filter(
    (k) => PERMISSIONS[k].moduleScope === "crm"
);
export const DALA_PERMISSION_KEYS = ALL_PERMISSION_KEYS.filter(
    (k) => PERMISSIONS[k].moduleScope === "dala"
);

// ─── Tenant-aware helpers ─────────────────────────────────────────────────────

export const getPermissionsForTenant = (options: {
    hasHR?: boolean;
    hasAccounting?: boolean;
    hasCRM?: boolean;
    hasDala?: boolean;
    hasPOS?: boolean;
}): Permission[] =>
    Object.values(PERMISSIONS).filter((p) => {
        if (p.moduleScope === "core") return true;
        if (p.moduleScope === "pos") return !!options.hasPOS;
        if (p.moduleScope === "hr") return !!options.hasHR;
        if (p.moduleScope === "accounting") return !!options.hasAccounting;
        if (p.moduleScope === "crm") return !!options.hasCRM;
        if (p.moduleScope === "dala") return !!options.hasDala;
        return false;
    });

export const getPermissionsGroupedByModuleForTenant = (options: {
    hasHR?: boolean;
    hasAccounting?: boolean;
    hasCRM?: boolean;
    hasDala?: boolean;
    hasPOS?: boolean;
}): Record<string, Permission[]> =>
    getPermissionsForTenant(options).reduce<Record<string, Permission[]>>((acc, p) => {
        if (!acc[p.module]) acc[p.module] = [];
        acc[p.module].push(p);
        return acc;
    }, {});

// ─── Generic helpers ──────────────────────────────────────────────────────────

export const getPermissionsByModule = (moduleName: string): Permission[] =>
    Object.values(PERMISSIONS).filter((p) => p.module === moduleName);

export const getPermissionsGroupedByModule = (): Record<string, Permission[]> =>
    Object.values(PERMISSIONS).reduce<Record<string, Permission[]>>((acc, p) => {
        if (!acc[p.module]) acc[p.module] = [];
        acc[p.module].push(p);
        return acc;
    }, {});

export const getPermissionsByAction = (action: ActionType): Permission[] =>
    Object.values(PERMISSIONS).filter((p) => p.action === action);

// ─── Runtime permission checks ────────────────────────────────────────────────

export const hasPermission = (rolePermissions: string[], permissionKey: string): boolean =>
    rolePermissions.includes(permissionKey);

export const hasAllPermissions = (rolePermissions: string[], keys: string[]): boolean =>
    keys.every((k) => rolePermissions.includes(k));

export const hasAnyPermission = (rolePermissions: string[], keys: string[]): boolean =>
    keys.some((k) => rolePermissions.includes(k));

export const makePermissionChecker =
    (rolePermissions: string[], isAdmin: boolean) =>
        (permissionKey: string): boolean =>
            isAdmin || rolePermissions.includes(permissionKey);

// ─── Preset role templates ────────────────────────────────────────────────────

export const ROLE_PRESETS: Record<string, string[]> = {

    /** ADMIN — owns everything */
    ADMIN: ALL_PERMISSION_KEYS,

    /** MANAGER — everything except subscription management and initial seeding */
    MANAGER: ALL_PERMISSION_KEYS.filter((k) => ![
        "USERS_UPDATE_SUBSCRIPTION",
        "USERS_VERIFY_COMPANY_CODE",
        "USERS_FETCH_TENANT",
        "SYSTEM_SETUP_CREATE",
        "ACCOUNTING_COA_SEED_DEFAULTS",
        "HR_ATTENDANCE_RECONCILE",
        "HR_LEAVE_SEED_BALANCE",
        "CRM_BUDGETS_APPROVE",  // budget approval is senior management only
    ].includes(k)),

    /** CASHIER — POS / front-of-house operations only */
    CASHIER: [
        "CART_VIEW_ITEMS", "CART_CREATE", "CART_UPDATE", "CART_GET",
        "CART_ADD_ITEM", "CART_UPDATE_ITEM", "CART_DELETE_ITEM", "CART_DELETE_ALL_ITEMS",
        "CART_SEND_TO_KITCHEN", "CART_VOID", "CART_TRANSFER_ITEMS",
        "CART_PRINT_INVOICE", "CART_VIEW_INVOICES", "CART_REPRINT_INVOICE",
        "CART_VIEW_ACTIVE_SUBSCRIPTIONS",
        "ORDERS_VIEW", "ORDERS_VIEW_DASHBOARD",
        "PRODUCTS_VIEW", "INVENTORY_VIEW",
        "TABLES_VIEW", "TABLES_CREATE_AUTO_SLOT", "TABLES_TRANSFER_CART_ITEMS", "TABLE_LOCATIONS_VIEW",
        "CUSTOMERS_VIEW", "CUSTOMERS_VIEW_ONE", "CUSTOMERS_CREATE", "CUSTOMERS_LOG_VISIT",
        "PAYMENT_METHODS_VIEW", "MODIFIERS_VIEW", "ADDONS_VIEW",
        "NOTIFICATIONS_VIEW_MY", "NOTIFICATIONS_MARK_READ", "NOTIFICATIONS_MARK_ALL_READ",
        "GIFT_CARDS_VIEW_ONE",
        "OMNICHANNEL_VIEW",
    ],

    /** KITCHEN_STAFF — order visibility only */
    KITCHEN_STAFF: [
        "ORDERS_VIEW", "CART_VIEW_ITEMS",
        "NOTIFICATIONS_VIEW_MY", "NOTIFICATIONS_MARK_READ",
    ],

    /** INVENTORY_CLERK — stock, deliveries, POs, transfers */
    INVENTORY_CLERK: [
        "INVENTORY_VIEW", "INVENTORY_VIEW_ONE", "INVENTORY_CREATE", "INVENTORY_UPDATE",
        "INVENTORY_VIEW_NOTIFICATIONS", "INVENTORY_VIEW_USAGE_BY_DATE",
        "DELIVERY_VIEW", "DELIVERY_CREATE", "DELIVERY_UPDATE",
        "DELIVERY_VIEW_BY_DATE_RANGE", "DELIVERY_PRINT_NOTE",
        "SUPPLIERS_VIEW",
        "PURCHASE_ORDERS_VIEW", "PURCHASE_ORDERS_VIEW_ONE", "PURCHASE_ORDERS_CREATE",
        "PURCHASE_ORDERS_UPDATE", "PURCHASE_ORDERS_VIEW_PENDING_ITEMS", "PURCHASE_ORDERS_VIEW_DELIVERIES",
        "EMAIL_SEND_DELIVERY_NOTE", "EMAIL_SEND_PURCHASE_ORDER", "EMAIL_SEND_PURCHASE_ORDER_BULK",
        "TRANSFERS_VIEW", "TRANSFERS_VIEW_ONE", "TRANSFERS_CREATE", "TRANSFERS_VIEW_PENDING",
        "UOM_VIEW",
        "NOTIFICATIONS_VIEW_MY", "NOTIFICATIONS_MARK_READ",
    ],

    /** ANALYST — read-only POS reporting + report emails */
    ANALYST: [
        "ORDERS_VIEW", "ORDERS_VIEW_DASHBOARD", "ORDERS_VIEW_ADMIN_DASHBOARD",
        "ORDERS_VIEW_BEST_SELLERS", "ORDERS_VIEW_SALES_CHART",
        "REPORTS_ITEM_SALES", "REPORTS_PURCHASE_SUMMARY", "REPORTS_VAT_SUMMARY",
        "INVENTORY_VIEW", "INVENTORY_VIEW_USAGE_BY_DATE",
        "PRODUCTS_VIEW", "CUSTOMERS_VIEW",
        "DOCUMENTS_VIEW", "DOCUMENTS_VIEW_ONE", "DOCUMENTS_SEARCH",
        "EMAIL_SEND_SALES_REPORT", "EMAIL_SEND_PURCHASE_REPORT", "EMAIL_SEND_INVENTORY_REPORT",
        "NOTIFICATIONS_VIEW_MY", "NOTIFICATIONS_MARK_READ",
        // CRM read access for analysts
        "CRM_LEADS_VIEW", "CRM_LEADS_VIEW_ONE", "CRM_LEADS_VIEW_PIPELINE",
        "CRM_CAMPAIGNS_VIEW", "CRM_CAMPAIGNS_VIEW_ONE",
        "CRM_TARGETS_VIEW", "CRM_TARGETS_VIEW_ONE", "CRM_TARGETS_VIEW_LEADERBOARD",
        "CRM_BUDGETS_VIEW", "CRM_BUDGETS_VIEW_ONE",
        "CRM_ACTIVITIES_VIEW", "CRM_ACTIVITIES_VIEW_SUMMARY",
    ],

    /** HR_MANAGER — full HR module including all HR-scoped emails */
    HR_MANAGER: [
        ...HR_PERMISSION_KEYS,
        "USERS_VIEW", "USERS_VIEW_ONE",
        "SHIFTS_VIEW", "SHIFTS_CREATE", "SHIFTS_UPDATE",
        "SCHEDULES_VIEW", "SCHEDULES_CREATE", "SCHEDULES_UPDATE",
        "EMAIL_SEND_ATTENDANCE_REPORT",
        "EMAIL_SEND_LEAVE_APPLICATION", "EMAIL_SEND_LEAVE_HR_NOTIFICATION",
        "EMAIL_SEND_LEAVE_APPROVAL", "EMAIL_SEND_LEAVE_REJECTION",
        "NOTIFICATIONS_VIEW_MY", "NOTIFICATIONS_MARK_READ",
    ],

    /** HR_STAFF — self-service only */
    HR_STAFF: [
        "HR_LEAVE_APPLY", "HR_LEAVE_VIEW", "HR_LEAVE_VIEW_ONE", "HR_LEAVE_CANCEL", "HR_LEAVE_VIEW_BALANCE",
        "HR_ATTENDANCE_CLOCK_IN", "HR_ATTENDANCE_CLOCK_OUT",
        "HR_ATTENDANCE_VIEW_STATUS", "HR_ATTENDANCE_VIEW_MY",
        "EMAIL_SEND_LEAVE_APPLICATION",
        "NOTIFICATIONS_VIEW_MY", "NOTIFICATIONS_MARK_READ",
    ],

    /** ACCOUNTANT — full accounting operations */
    ACCOUNTANT: [
        "ACCOUNTING_DASHBOARD_VIEW",
        "ACCOUNTING_COA_VIEW", "ACCOUNTING_COA_VIEW_ONE", "ACCOUNTING_COA_VIEW_TREE",
        "ACCOUNTING_COA_VIEW_BY_TYPE", "ACCOUNTING_COA_VIEW_BANK", "ACCOUNTING_COA_VIEW_LEDGER",
        "ACCOUNTING_COA_CREATE", "ACCOUNTING_COA_UPDATE", "ACCOUNTING_COA_UPDATE_OPENING_BALANCE",
        "ACCOUNTING_JOURNAL_VIEW", "ACCOUNTING_JOURNAL_VIEW_ONE", "ACCOUNTING_JOURNAL_VIEW_SUMMARY",
        "ACCOUNTING_JOURNAL_VIEW_BY_SOURCE",
        "ACCOUNTING_JOURNAL_CREATE_MANUAL", "ACCOUNTING_JOURNAL_CREATE_EXPENSE", "ACCOUNTING_JOURNAL_POST",
        "ACCOUNTING_INVOICE_VIEW", "ACCOUNTING_INVOICE_VIEW_ONE", "ACCOUNTING_INVOICE_VIEW_SUMMARY",
        "ACCOUNTING_INVOICE_CREATE", "ACCOUNTING_INVOICE_UPDATE",
        "ACCOUNTING_INVOICE_RECORD_PAYMENT", "ACCOUNTING_INVOICE_CONVERT_QUOTE",
        "ACCOUNTING_INCOME_POST_DIRECT", "ACCOUNTING_INCOME_POST_EXPENSE",
        "ACCOUNTING_INCOME_SETTLE_INVOICE", "ACCOUNTING_INCOME_VIEW_HISTORY",
        "ACCOUNTING_NOTES_VIEW", "ACCOUNTING_NOTES_VIEW_ONE",
        "ACCOUNTING_NOTES_VIEW_BY_INVOICE", "ACCOUNTING_NOTES_VIEW_BY_CUSTOMER", "ACCOUNTING_NOTES_VIEW_BY_SUPPLIER",
        "ACCOUNTING_NOTES_CREATE", "ACCOUNTING_NOTES_UPDATE", "ACCOUNTING_NOTES_APPROVE",
        "ACCOUNTING_BANK_STMT_VIEW", "ACCOUNTING_BANK_STMT_VIEW_ONE", "ACCOUNTING_BANK_STMT_VIEW_SUMMARY",
        "ACCOUNTING_BANK_STMT_IMPORT", "ACCOUNTING_BANK_STMT_CATEGORIZE", "ACCOUNTING_BANK_STMT_BULK_CATEGORIZE",
        "ACCOUNTING_BANK_STMT_EXCLUDE", "ACCOUNTING_BANK_STMT_REAPPLY_RULES",
        "ACCOUNTING_BANK_STMT_PUSH_RECONCILIATION", "ACCOUNTING_BANK_STMT_PUSH_JOURNAL",
        "ACCOUNTING_BANK_STMT_COL_MAPPING_VIEW", "ACCOUNTING_BANK_STMT_COL_MAPPING_MANAGE",
        "ACCOUNTING_BANK_STMT_CAT_RULE_VIEW", "ACCOUNTING_BANK_STMT_CAT_RULE_MANAGE",
        "ACCOUNTING_BANK_STMT_CAT_MAP_VIEW", "ACCOUNTING_BANK_STMT_CAT_MAP_MANAGE",
        "ACCOUNTING_RECON_VIEW", "ACCOUNTING_RECON_VIEW_ONE", "ACCOUNTING_RECON_VIEW_UNRECONCILED",
        "ACCOUNTING_RECON_OPEN", "ACCOUNTING_RECON_IMPORT_LINES", "ACCOUNTING_RECON_ADD_LINE",
        "ACCOUNTING_RECON_UPDATE_LINE", "ACCOUNTING_RECON_MATCH", "ACCOUNTING_RECON_UNMATCH",
        "ACCOUNTING_RECON_EXCLUDE_LINE", "ACCOUNTING_RECON_AUTO_MATCH", "ACCOUNTING_RECON_COMPLETE",
        "ACCOUNTING_REPORT_TRIAL_BALANCE", "ACCOUNTING_REPORT_PROFIT_LOSS", "ACCOUNTING_REPORT_BALANCE_SHEET",
        "ACCOUNTING_REPORT_GENERAL_LEDGER", "ACCOUNTING_REPORT_ACCOUNT_BALANCES",
        "ACCOUNTING_REPORT_VAT", "ACCOUNTING_REPORT_CASH_FLOW",
        "ACCOUNTING_REPORT_CUSTOMER_STATEMENT", "ACCOUNTING_REPORT_SUPPLIER_STATEMENT",
        "ACCOUNTING_REPORT_AR_AGING", "ACCOUNTING_REPORT_AP_AGING",
        "ACCOUNTING_DIGITAX_VIEW_CONFIG", "ACCOUNTING_DIGITAX_MANAGE_SETTINGS",
        "ACCOUNTING_DIGITAX_GENERATE_INVOICE", "ACCOUNTING_DIGITAX_VIEW_INVOICE_STATUS", "ACCOUNTING_DIGITAX_CANCEL_INVOICE",
        "SUPPLIERS_VIEW", "CUSTOMERS_VIEW", "CUSTOMERS_VIEW_ONE", "PAYMENT_METHODS_VIEW",
        "DOCUMENTS_VIEW", "DOCUMENTS_VIEW_ONE", "DOCUMENTS_CREATE", "DOCUMENTS_UPDATE",
        "DOCUMENTS_DELETE", "DOCUMENTS_MANAGE_FOLDERS", "DOCUMENTS_UPLOAD_ATTACHMENTS",
        "DOCUMENTS_UPDATE_STATUS", "DOCUMENTS_SEARCH", "DOCUMENTS_EMBED",
        "EMAIL_SEND_FINANCIAL_REPORT",
        "OMNICHANNEL_VIEW", "OMNICHANNEL_SEND_MESSAGE", "OMNICHANNEL_MANAGE_CONVERSATIONS",
        "NOTIFICATIONS_VIEW_MY", "NOTIFICATIONS_MARK_READ",
        // CRM read access for accountants (budget tracking)
        "CRM_BUDGETS_VIEW", "CRM_BUDGETS_VIEW_ONE", "CRM_BUDGETS_UPDATE_ACTUALS",
        "CRM_TARGETS_VIEW", "CRM_TARGETS_VIEW_ONE", "CRM_TARGETS_VIEW_LEADERBOARD",
        "CRM_CAMPAIGNS_VIEW", "CRM_CAMPAIGNS_VIEW_ONE",
    ],

    /** ACCOUNTING_VIEWER — read-only */
    ACCOUNTING_VIEWER: [
        "ACCOUNTING_DASHBOARD_VIEW",
        "ACCOUNTING_COA_VIEW", "ACCOUNTING_COA_VIEW_ONE", "ACCOUNTING_COA_VIEW_TREE",
        "ACCOUNTING_COA_VIEW_BY_TYPE", "ACCOUNTING_COA_VIEW_BANK", "ACCOUNTING_COA_VIEW_LEDGER",
        "ACCOUNTING_JOURNAL_VIEW", "ACCOUNTING_JOURNAL_VIEW_ONE", "ACCOUNTING_JOURNAL_VIEW_SUMMARY",
        "ACCOUNTING_JOURNAL_VIEW_BY_SOURCE",
        "ACCOUNTING_INVOICE_VIEW", "ACCOUNTING_INVOICE_VIEW_ONE", "ACCOUNTING_INVOICE_VIEW_SUMMARY",
        "ACCOUNTING_INCOME_VIEW_HISTORY",
        "ACCOUNTING_NOTES_VIEW", "ACCOUNTING_NOTES_VIEW_ONE",
        "ACCOUNTING_NOTES_VIEW_BY_INVOICE", "ACCOUNTING_NOTES_VIEW_BY_CUSTOMER", "ACCOUNTING_NOTES_VIEW_BY_SUPPLIER",
        "ACCOUNTING_BANK_STMT_VIEW", "ACCOUNTING_BANK_STMT_VIEW_ONE", "ACCOUNTING_BANK_STMT_VIEW_SUMMARY",
        "ACCOUNTING_BANK_STMT_COL_MAPPING_VIEW", "ACCOUNTING_BANK_STMT_CAT_RULE_VIEW", "ACCOUNTING_BANK_STMT_CAT_MAP_VIEW",
        "ACCOUNTING_RECON_VIEW", "ACCOUNTING_RECON_VIEW_ONE", "ACCOUNTING_RECON_VIEW_UNRECONCILED",
        "ACCOUNTING_REPORT_TRIAL_BALANCE", "ACCOUNTING_REPORT_PROFIT_LOSS", "ACCOUNTING_REPORT_BALANCE_SHEET",
        "ACCOUNTING_REPORT_GENERAL_LEDGER", "ACCOUNTING_REPORT_ACCOUNT_BALANCES",
        "ACCOUNTING_REPORT_VAT", "ACCOUNTING_REPORT_CASH_FLOW",
        "ACCOUNTING_REPORT_CUSTOMER_STATEMENT", "ACCOUNTING_REPORT_SUPPLIER_STATEMENT",
        "ACCOUNTING_REPORT_AR_AGING", "ACCOUNTING_REPORT_AP_AGING",
        "ACCOUNTING_DIGITAX_VIEW_CONFIG", "ACCOUNTING_DIGITAX_VIEW_INVOICE_STATUS",
        "DOCUMENTS_VIEW", "DOCUMENTS_VIEW_ONE", "DOCUMENTS_SEARCH",
        "OMNICHANNEL_VIEW",
        "NOTIFICATIONS_VIEW_MY", "NOTIFICATIONS_MARK_READ",
    ],

    // ── CRM / Mteja role presets ───────────────────────────────────────────────

    /** CRM_MANAGER — full CRM access including budget approval and workflow management */
    CRM_MANAGER: [
        // Customers (base)
        "CUSTOMERS_VIEW", "CUSTOMERS_VIEW_ONE", "CUSTOMERS_CREATE", "CUSTOMERS_UPDATE",
        // Leads — full
        ...CRM_PERMISSION_KEYS.filter(k => k.startsWith("CRM_LEADS_")),
        // Activities — full
        ...CRM_PERMISSION_KEYS.filter(k => k.startsWith("CRM_ACTIVITIES_")),
        // Workflows — full
        ...CRM_PERMISSION_KEYS.filter(k => k.startsWith("CRM_WORKFLOWS_")),
        // Campaigns — full
        ...CRM_PERMISSION_KEYS.filter(k => k.startsWith("CRM_CAMPAIGNS_")),
        // Targets — full
        ...CRM_PERMISSION_KEYS.filter(k => k.startsWith("CRM_TARGETS_")),
        // Budgets — full including approve
        ...CRM_PERMISSION_KEYS.filter(k => k.startsWith("CRM_BUDGETS_")),
        // Conversations
        "OMNICHANNEL_VIEW", "OMNICHANNEL_SEND_MESSAGE", "OMNICHANNEL_MANAGE_CONVERSATIONS",
        "NOTIFICATIONS_VIEW_MY", "NOTIFICATIONS_MARK_READ",
    ],

    /** CRM_AGENT — sales rep; create/update leads and activities, no budget approval or workflow management */
    CRM_AGENT: [
        // Customers (base)
        "CUSTOMERS_VIEW", "CUSTOMERS_VIEW_ONE", "CUSTOMERS_CREATE", "CUSTOMERS_UPDATE",
        // Leads
        "CRM_LEADS_VIEW", "CRM_LEADS_VIEW_ONE", "CRM_LEADS_CREATE", "CRM_LEADS_UPDATE",
        "CRM_LEADS_UPDATE_STAGE", "CRM_LEADS_CONVERT", "CRM_LEADS_VIEW_PIPELINE",
        // Activities
        "CRM_ACTIVITIES_VIEW", "CRM_ACTIVITIES_CREATE", "CRM_ACTIVITIES_UPDATE",
        "CRM_ACTIVITIES_VIEW_SUMMARY",
        // Campaigns — read only
        "CRM_CAMPAIGNS_VIEW", "CRM_CAMPAIGNS_VIEW_ONE",
        // Targets — read + update own actual
        "CRM_TARGETS_VIEW", "CRM_TARGETS_VIEW_ONE", "CRM_TARGETS_VIEW_LEADERBOARD",
        "CRM_TARGETS_UPDATE_ACTUAL",
        // Budgets — read only
        "CRM_BUDGETS_VIEW", "CRM_BUDGETS_VIEW_ONE",
        // Conversations
        "OMNICHANNEL_VIEW", "OMNICHANNEL_SEND_MESSAGE",
        "NOTIFICATIONS_VIEW_MY", "NOTIFICATIONS_MARK_READ",
    ],

/** CRM_VIEWER — read-only CRM access (auditor / board) */
CRM_VIEWER: [
    "CUSTOMERS_VIEW", "CUSTOMERS_VIEW_ONE",
    "CRM_LEADS_VIEW", "CRM_LEADS_VIEW_ONE", "CRM_LEADS_VIEW_PIPELINE",
    "CRM_ACTIVITIES_VIEW", "CRM_ACTIVITIES_VIEW_SUMMARY",
    "CRM_WORKFLOWS_VIEW",
    "CRM_TARGETS_VIEW", "CRM_TARGETS_VIEW_ONE", "CRM_TARGETS_VIEW_LEADERBOARD",
    "CRM_CAMPAIGNS_VIEW", "CRM_CAMPAIGNS_VIEW_ONE",
    "CRM_BUDGETS_VIEW", "CRM_BUDGETS_VIEW_ONE",
    "NOTIFICATIONS_VIEW_MY", "NOTIFICATIONS_MARK_READ",
],

/** DIGITAX_MANAGER — full DigiTax operations access */
DIGITAX_MANAGER: [
    "ACCOUNTING_DIGITAX_VIEW_CONFIG", "ACCOUNTING_DIGITAX_MANAGE_SETTINGS",
    "ACCOUNTING_DIGITAX_GENERATE_INVOICE", "ACCOUNTING_DIGITAX_VIEW_INVOICE_STATUS", "ACCOUNTING_DIGITAX_CANCEL_INVOICE",
    // Basic accounting access needed for DigiTax operations
    "ACCOUNTING_DASHBOARD_VIEW",
    "ACCOUNTING_INVOICES_VIEW", "ACCOUNTING_INVOICES_VIEW_ONE",
    "DOCUMENTS_VIEW", "DOCUMENTS_VIEW_ONE",
    "NOTIFICATIONS_VIEW_MY", "NOTIFICATIONS_MARK_READ",
],

};