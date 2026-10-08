import React, { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getCurrentTenantId } from "@services/tenants";
import AddCustomerModal from "@pages/Customer/AddCustomerModal";
import AddProSupplierModal from "@components/MODALS/pro/AddProSupplierModal";
import AddProPaymentMethodSettingsModal from "@components/MODALS/pro/AddProPaymentSettingsModal";
import AccountFormDrawer from "@pages/ChartOfAccounts/AccountFormDrawer";
import JournalEntryFormDrawer from "@pages/JournalEntry/JournalEntryFormDrawer";
import ManualInvoiceModal from "@pages/OrderManagement/Invoices/ManualInvoiceModal";
import ManualIncomeModal from "@pages/OrderManagement/Orders/ManualIncomeModal";
import { useQuickLinks } from "../hooks/useQuickLinks";
import type { QuickLinksModalsProps } from "../types/quicklinks.types";

const QuickLinksModals: React.FC<QuickLinksModalsProps> = ({ shopId, onSuccess }) => {
  const queryClient = useQueryClient();
  const { activeModal, closeModal } = useQuickLinks();

  const currentShopId = shopId || getCurrentTenantId() || "";

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["customers"] });
    queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    queryClient.invalidateQueries({ queryKey: ["accounts"] });
    queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
    queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
    queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
    queryClient.invalidateQueries({ queryKey: ["invoices"] });
    queryClient.invalidateQueries({ queryKey: ["invoices-unsettled"] });
    queryClient.invalidateQueries({ queryKey: ["quotes"] });
    queryClient.invalidateQueries({ queryKey: ["income-expense"] });
    queryClient.invalidateQueries({ queryKey: ["income-history"] });
    queryClient.invalidateQueries({ queryKey: ["bank-imports"] });
    queryClient.invalidateQueries({ queryKey: ["documents"] });
    queryClient.invalidateQueries({ queryKey: ["folders"] });
    queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
    queryClient.invalidateQueries({ queryKey: ["crm-campaigns"] });
    if (onSuccess) {
      onSuccess();
    }
  };

  const fakeActionRef = useMemo(
    () => ({ current: { reload: invalidateAll, reset: invalidateAll } }),
    [invalidateAll]
  );

  const handleSuccess = () => {
    invalidateAll();
    closeModal();
  };

  return (
    <>
      <AddCustomerModal
        visible={activeModal === "customer"}
        onClose={closeModal}
        onSuccess={handleSuccess}
        mode="add"
      />

      <AddProSupplierModal
        actionRef={fakeActionRef}
        edit={false}
        externalOpen={activeModal === "supplier"}
        onExternalClose={closeModal}
      />

      <AccountFormDrawer
        open={activeModal === "coa"}
        onClose={closeModal}
        onSuccess={handleSuccess}
        editingAccount={null}
        accounts={[]}
        shopId={currentShopId}
      />

      <JournalEntryFormDrawer
        open={activeModal === "journal"}
        onClose={closeModal}
        onSuccess={handleSuccess}
        shopId={currentShopId}
      />

      <AddProPaymentMethodSettingsModal
        actionRef={fakeActionRef}
        edit={false}
        externalOpen={activeModal === "payment-method"}
        onExternalClose={closeModal}
      />

      <ManualInvoiceModal
        open={activeModal === "invoice"}
        onClose={closeModal}
      />

      <ManualInvoiceModal
        open={activeModal === "quote"}
        onClose={closeModal}
        quoteOnly
      />

      <ManualIncomeModal
        open={activeModal === "income-expense"}
        onClose={closeModal}
      />
    </>
  );
};

export default QuickLinksModals;
