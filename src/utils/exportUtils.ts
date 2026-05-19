import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExportConfig {
  title?: string;
  subtitle?: string;
  columns?: Array<{ header: string; dataKey: string }>;
}

export const exportToExcel = (data: any[], filename: string, setLoading?: (loading: boolean) => void) => {
  try {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    XLSX.writeFile(workbook, `${filename}.xlsx`);
    if (setLoading) setLoading(false);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    if (setLoading) setLoading(false);
  }
};

export const exportToCSV = (data: any[], filename: string, setLoading?: (loading: boolean) => void) => {
  try {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (setLoading) setLoading(false);
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    if (setLoading) setLoading(false);
  }
};

export const exportToPDF = (
  data: any[],
  filename: string,
  setLoading?: (loading: boolean) => void,
  config?: ExportConfig
) => {
  try {
    const doc = new jsPDF();

    if (config?.title) {
      doc.setFontSize(18);
      doc.text(config.title, 14, 22);
    }

    if (config?.subtitle) {
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(config.subtitle, 14, 30);
    }

    const columns = config?.columns || Object.keys(data[0] || {}).map(key => ({ header: key, dataKey: key }));

    autoTable(doc, {
      head: [columns.map(col => col.header)],
      body: data.map(row => columns.map(col => row[col.dataKey])),
      startY: config?.title ? 40 : 14,
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [24, 144, 255],
        textColor: 255,
        fontStyle: 'bold',
      },
    });

    doc.save(`${filename}.pdf`);
    if (setLoading) setLoading(false);
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    if (setLoading) setLoading(false);
  }
};
