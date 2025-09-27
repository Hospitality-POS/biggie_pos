import PrintPreviewModal from './components/PreviewPrintModal';
import { PurchaseOrderTable } from './components/PurchaseOrderTable';
import { usePurchaseOrders } from './hooks/usePurchaseOrders';


export const PurchaseOrderSettings = () => {
  const {
    loading,
    printModal,
    fetchPurchaseOrders,
    deletePurchaseOrder,
    updateStatus,
    exportToExcel,
    exportToPDF,
    showPrintPreview,
    showBulkPrintPreview,
    closePrintModal,
    generateSummary
  } = usePurchaseOrders();

  return (
    <>
      <PurchaseOrderTable
        loading={loading}
        onFetchData={fetchPurchaseOrders}
        onDeletePO={deletePurchaseOrder}
        onUpdateStatus={updateStatus}
        onPrintPO={showPrintPreview}
        onExportToExcel={exportToExcel}
        onExportToPDF={exportToPDF}
        onBulkPrint={showBulkPrintPreview}
        onGenerateSummary={generateSummary}
      />

      <PrintPreviewModal
        visible={printModal.visible}
        onClose={closePrintModal}
        data={printModal.data}
        type={printModal.type}
        title={printModal.title}
      />
    </>
  );
};

export default PurchaseOrderSettings;