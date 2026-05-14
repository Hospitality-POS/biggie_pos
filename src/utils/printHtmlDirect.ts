/**
 * Print receipt HTML using an invisible iframe.
 * No API call needed — purely client-side.
 */
export const printHtmlDirect = (htmlContent: string, paperWidth: number = 80): void => {
  const pageWidth = paperWidth === 58 ? "58mm" : "80mm";

  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Receipt</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body {
          width: ${pageWidth};
          font-family: 'Courier New', Courier, monospace;
          font-size: 12px;
          color: #000;
        }
        body { padding: 2px; }
        @page { size: ${pageWidth} auto; margin: 0; }
        canvas { display: none; }
        table { width: 100%; border-collapse: collapse; }
        td, th { padding: 2px 0; font-size: 10px; }
        .center { text-align: center; }
        .right { text-align: right; }
        .bold { font-weight: bold; }
        .border-top { border-top: 1px dashed #000; margin-top: 4px; padding-top: 4px; }
        .border-bottom { border-bottom: 1px dashed #000; margin-bottom: 4px; padding-bottom: 4px; }
        .header { font-size: 14px; font-weight: bold; margin-bottom: 8px; }
        .footer { font-size: 10px; margin-top: 8px; }
        .total-row { font-weight: bold; font-size: 11px; }
      </style>
    </head>
    <body>${htmlContent}</body>
    </html>
  `;

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  document.body.appendChild(iframe);

  iframe.contentDocument?.open();
  iframe.contentDocument?.write(printContent);
  iframe.contentDocument?.close();

  if (iframe.contentWindow) {
    iframe.contentWindow.onafterprint = () => {
      document.body.removeChild(iframe);
    };

    // Slight delay to let content render
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }, 300);
  } else {
    document.body.removeChild(iframe);
    console.error("Failed to create iframe for printing");
  }
};
