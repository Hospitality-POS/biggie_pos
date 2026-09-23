export type QuickCreateModal =
  | "customer"
  | "supplier"
  | "coa"
  | "journal"
  | "payment-method"
  | "invoice"
  | "quote"
  | "income-expense"
  | null;

export interface QuickLinkAction {
  id: string;
  title: string;
  keywords?: string;
  hotkey?: string;
  icon?: string;
  mdIcon?: string;
  section?: string;
  handler?: () => void;
  children?: QuickLinkAction[];
  parent?: string;
}

export interface QuickLinkModuleFlags {
  hasPOS?: boolean;
  hasAccounting?: boolean;
  hasMteja?: boolean;
  hasBandu?: boolean;
  hasDala?: boolean;
}

export interface QuickLinksProps {
  moduleFlags?: QuickLinkModuleFlags;
  onSuccess?: () => void;
  className?: string;
}

export interface QuickLinksPaletteProps {
  moduleFlags?: QuickLinkModuleFlags;
  className?: string;
}

export interface QuickLinksModalsProps {
  shopId?: string;
  onSuccess?: () => void;
}
