// Saves a captured invoice (html2canvas canvas) as an A4 PDF.
//
// An invoice that runs a little past one page (e.g. once the services banner
// is added) is shrunk to fit a single page instead of spilling a strip onto
// page 2. Long invoices, which would become too small to read, are split
// across pages as before.
const A4_W = 210;
const A4_H = 297;
// Shrink to one page when the invoice is at most this many pages long
// (1.4 pages ends up at ~71% size, still readable)
const FIT_ONE_PAGE_UP_TO = 1.4;

export const saveCanvasAsA4Pdf = async (canvas: HTMLCanvasElement, filename: string) => {
    const { default: jsPDF } = await import("jspdf");
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const imgHeight = (canvas.height * A4_W) / canvas.width;

    if (imgHeight <= A4_H * FIT_ONE_PAGE_UP_TO) {
        const scale = Math.min(1, A4_H / imgHeight);
        const w = A4_W * scale;
        pdf.addImage(imgData, "PNG", (A4_W - w) / 2, 0, w, imgHeight * scale);
    } else {
        let heightLeft = imgHeight;
        let position = 0;
        pdf.addImage(imgData, "PNG", 0, position, A4_W, imgHeight);
        heightLeft -= A4_H;
        while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, "PNG", 0, position, A4_W, imgHeight);
            heightLeft -= A4_H;
        }
    }
    pdf.save(filename);
};
