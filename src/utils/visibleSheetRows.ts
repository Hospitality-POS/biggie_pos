import * as XLSX from "xlsx";

// Workbooks often carry hidden working tabs (e.g. a full-year export behind a
// single visible "April" tab). Statement imports should only see what the
// user sees in Excel: the first visible sheet, minus any hidden rows.
// The workbook must be read with `cellStyles: true` for hidden rows to be known.
export const getVisibleSheetRows = (workbook: XLSX.WorkBook): any[][] => {
    const sheetMeta = workbook.Workbook?.Sheets || [];
    const sheetName =
        workbook.SheetNames.find((_, i) => !sheetMeta[i]?.Hidden) || workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    if (!sheet || !sheet["!ref"]) return [];

    const startRow = XLSX.utils.decode_range(sheet["!ref"]).s.r;
    const rowMeta = sheet["!rows"] || [];
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", blankrows: true });

    return rows.filter((row, i) => !rowMeta[startRow + i]?.hidden && row.some((c) => c !== ""));
};
