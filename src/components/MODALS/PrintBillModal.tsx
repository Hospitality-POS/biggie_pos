import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { QRCodeCanvas } from "qrcode.react";
import "./bill.css";
import { useReactToPrint } from "react-to-print";
import { BASE_URL } from "@utils/config";
import useSystemDetails from "@hooks/useSystemDetails";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  PrinterFilled,
  PrinterOutlined,
  SafetyCertificateFilled,
  FilePdfOutlined,
  FileTextOutlined,
  DollarOutlined,
  ReconciliationOutlined,
  MailOutlined,
  SendOutlined,
  LockOutlined,
  FontColorsOutlined,
  PercentageOutlined,
  IdcardOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  DownloadOutlined,
  WhatsAppOutlined,
} from "@ant-design/icons";
import {
  Button,
  Space,
  Select,
  Tag,
  Alert,
  message,
  Typography,
  Tooltip,
  Segmented,
  Slider as AntSlider,
  Switch,
} from "antd";
import { ModalForm } from "@ant-design/pro-form";
import { useQuery } from "@tanstack/react-query";
import { useAppSelector } from "src/store";
import { sendEmail, refToHtmlString } from "@services/emailReports";
import { getWhatsAppWebStatus, sendDocumentViaWhatsApp } from "@services/whatsappService";
import {
  usePrintDocument,
  type DocumentType,
  type PrintFormat,
} from "../MODALS/Hooks/usePrintDocument";
import { useIPPrinter } from "../../hooks/useIPPrinter";
import {
  sendPrintJob, buildKitchenLines, buildReceiptLines, groupItemsByMainCategory,
  getAgentForCategory, printFromCart,
} from "@services/printAgent";
import { fetchMainCategories } from "@services/categories";

import {
  C,
  DashedLine,
  SolidLine,
  DoubleLine,
  MetaRow,
  makeReceiptStyles,
  fontSizes,
  fmtN,
  attemptSave,
  type SendEmailValues,
  type SendWhatsAppValues,
} from "./print/printHelpers";
import SendEmailModal from "./print/SendEmailModal";
import SendWhatsAppModal from "./print/SendWhatsAppModal";
import ReprintReasonModal from "./print/ReprintReasonModal";

// ── Props ──────────────────────────────────────────────────────────────────
export interface PrintBillProps {
  cartDetails: any;
  data: any;
  subtotal?: number;
  totalVatAmount?: number;
  grandTotal?: number;
  isSpa?: boolean;
}

// ── Main component ─────────────────────────────────────────────────────────
const PrintBillModal: React.FC<PrintBillProps> = ({
  cartDetails,
  data,
  subtotal: customSubtotal,
  totalVatAmount: customTotalVat,
  grandTotal: customGrandTotal,
  isSpa = false,
}) => {
  const { subtotal, totalVatAmount, grandTotal } = useAppSelector((s) => s.cart);
  const { user } = useAppSelector((state) => state.auth);
  const { loading: ipPrinterLoading } = useIPPrinter();

  // Use custom totals if provided, otherwise fall back to cart state
  const finalSubtotal = customSubtotal !== undefined ? customSubtotal : subtotal;
  const finalTotalVat = customTotalVat !== undefined ? customTotalVat : totalVatAmount;
  const finalGrandTotal = customGrandTotal !== undefined ? customGrandTotal : grandTotal;

  const componentRef = useRef<HTMLDivElement | null>(null);
  const [refReady, setRefReady] = useState(false);
  const [useIPPrinterMode, setUseIPPrinterMode] = useState(false); // Disabled by default

  const printableRef = useCallback((node: HTMLDivElement | null) => {
    componentRef.current = node;
    setRefReady(!!node);
  }, []);

  const [isPdfView, setIsPdfView] = useState(false);
  const [isBold, setIsBold] = useState(true); // synced from sysSettings via useEffect below
  const [fontSize, setFontSize] = useState(14); // synced from sysSettings via useEffect below
  const [showDiscount, setShowDiscount] = useState(true);
  const [showVat, setShowVat] = useState(true);
  const [documentType, setDocumentType] = useState<DocumentType>("bill");
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [reasonModalOpen, setReasonModalOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendingWhatsapp, setSendingWhatsapp] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [sendingToPrinter, setSendingToPrinter] = useState(false);
  const [autoPrinting, setAutoPrinting] = useState(false);
  const [mainCategories, setMainCategories] = useState<Array<any>>([]);

  const companyCode = useMemo(() => {
    try {
      const t = localStorage.getItem("tenant");
      return t ? (JSON.parse(t)?.tenant_code ?? "") : "";
    } catch {
      return "";
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const data = await fetchMainCategories();
      setMainCategories(data?.data || data || []);
    } catch {
      console.error("Failed to fetch categories");
    }
  }, []);

  const getMainCategoryName = useCallback((leafCategoryId: string): string => {
    console.log("[getMainCategoryName] Looking for leaf category ID:", leafCategoryId);
    console.log("[getMainCategoryName] Main categories:", mainCategories);
    
    // Search through the main categories hierarchy to find the leaf category
    for (const mainCat of mainCategories) {
      // Check sub-categories
      if (mainCat.sub_categories) {
        for (const subCat of mainCat.sub_categories) {
          // Check categories (leaf level)
          if (subCat.categories) {
            for (const cat of subCat.categories) {
              if (cat._id === leafCategoryId) {
                console.log("[getMainCategoryName] Found leaf category in hierarchy, main category:", mainCat.name);
                return mainCat.name;
              }
            }
          }
          // Also check if the sub-category itself matches
          if (subCat._id === leafCategoryId) {
            console.log("[getMainCategoryName] Found sub-category in hierarchy, main category:", mainCat.name);
            return mainCat.name;
          }
        }
      }
    }
    
    console.log("[getMainCategoryName] Not found in hierarchy, returning ID");
    return leafCategoryId;
  }, [mainCategories]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Load global print_by_agent setting from localStorage
  useEffect(() => {
    const savedPrintByAgent = localStorage.getItem("print_by_agent_enabled");
    setUseIPPrinterMode(savedPrintByAgent === "true");
  }, []);

  const pendingPrintRef = useRef(false);
  const [printTrigger, setPrintTrigger] = useState(0);

  const storedTenant = localStorage.getItem("tenant");
  const tenant = storedTenant ? JSON.parse(storedTenant) : null;
  const isElectronicsStore = tenant?.business_type?.name === "Electronics";
  const hasDuka = tenant?.pos_integration?.enabled === true;
  const hasMteja = tenant?.modules?.crm === true;
  const clientLogoUrl = tenant?.tenant_logo?.url;

  // ── WhatsApp connection status (only relevant when Mteja is enabled) ──────
  // Note: the button itself is shown whenever Mteja is enabled — we don't
  // hide it just because the live status check hasn't resolved "ready" yet
  // (e.g. right after a reconnect/QR scan). Instead we surface a clear
  // message if the user tries to send while it's not actually connected.
  const { data: whatsappStatusData, isLoading: whatsappStatusLoading } = useQuery({
    queryKey: ["whatsapp-web-status-print-bill"],
    queryFn: () => getWhatsAppWebStatus(localStorage.getItem("shopId") || undefined),
    enabled: hasMteja,
    refetchInterval: 15000,
  });
  const isWhatsAppConnected = !!whatsappStatusData?.ready;
  const canSendWhatsApp = hasMteja;
  
  // ETR data from invoice
  const etrEnabled = cartDetails?.etr_enabled === true;
  const digitax = cartDetails?.digitax;
  const shopKraPin = cartDetails?.shop_kra_pin || tenant?.kra_pin;

  // Get VAT mode and rate from tenant settings (normalize to uppercase)
  const rawVatMode = (tenant?.vat_pricing_mode || "EXCLUSIVE").toString().toUpperCase();
  const VAT_RATE = (tenant?.is_vat_enabled ?? true) ? (tenant?.vat_standard_rate || 0.16) : 0;

  // Detect effective VAT mode: prefer tenant setting, but also detect from
  // actual store values when the setting is missing or doesn't match reality.
  // In INCLUSIVE mode the store sets subtotal = grossTotal and
  // totalVatAmount/subtotal ≈ VAT_RATE/(1+VAT_RATE).
  let vatMode: "INCLUSIVE" | "EXCLUSIVE" = rawVatMode === "INCLUSIVE" ? "INCLUSIVE" : "EXCLUSIVE";
  if (vatMode === "EXCLUSIVE" && finalSubtotal > 0 && finalTotalVat > 0 && VAT_RATE > 0) {
    const inclusiveRatio = VAT_RATE / (1 + VAT_RATE);
    const actualRatio = finalTotalVat / finalSubtotal;
    if (Math.abs(actualRatio - inclusiveRatio) < 0.02) {
      vatMode = "INCLUSIVE";
    }
  }

  // debug removed

  const {
    BRAND_NAME1, EMAIL_URL, PHONE_NO, PO_BOX,
    QR_Code, Paybill_bs, Paybill_ac, TILL_NO, PIN, bank_details,
    receipt_font_size, receipt_text_bold,
  } = useSystemDetails();

  // Sync receipt appearance defaults from system settings when they load
  useEffect(() => {
    if (receipt_font_size > 0) setFontSize(receipt_font_size);
    setIsBold(receipt_text_bold);
  }, [receipt_font_size, receipt_text_bold]);

  const {
    canPrint, isReprint, printsRemaining,
    printStatus, statusLoading, recordPrint,
  } = usePrintDocument({
    orderNo: cartDetails?.order_no,
    documentType,
    cartDetails,
    data,
    subtotal: finalSubtotal,
    totalVatAmount: finalTotalVat,
    grandTotal: finalGrandTotal,
  });

  // Calculate net subtotal for inclusive VAT
  const netSubtotal = vatMode === "INCLUSIVE" ? finalSubtotal - finalTotalVat : finalSubtotal;

  // Derived discount amount
  const discountAmount =
    cartDetails?.discount > 0
      ? cartDetails.discount_type === "percentage"
        ? parseFloat((finalSubtotal * (cartDetails.discount / 100)).toFixed(2))
        : cartDetails.discount
      : 0;

  // ── Display price helper (always returns VAT-exclusive unit price) ─────
  const getExclPrice = useCallback(
    (item: any): number => {
      let price = item.price;
      if (vatMode === "INCLUSIVE" && VAT_RATE > 0) {
        price = price / (1 + VAT_RATE);
      }
      return price;
    },
    [vatMode, VAT_RATE]
  );

  const getDisplayPrice = useCallback(
    (item: any): number => {
      const price = getExclPrice(item);
      if (!price || isNaN(price)) return 0;
      if (showDiscount || discountAmount === 0) return price;
      const itemTotal = price * item.quantity;
      const netSub = vatMode === "INCLUSIVE" ? finalSubtotal - finalTotalVat : finalSubtotal;
      const discountRatio = netSub > 0 ? discountAmount / netSub : 0;
      return (itemTotal * (1 - discountRatio)) / item.quantity;
    },
    [showDiscount, discountAmount, finalSubtotal, finalTotalVat, vatMode, getExclPrice]
  );

  // Strip trailing .00 from whole numbers to save column space on thermal receipts
  const fmtN = (n: number) => n % 1 === 0 ? String(Math.round(n)) : n.toFixed(2);

  const triggerPrint = useReactToPrint({
    content: () => componentRef.current,
    onBeforeGetContent: () =>
      new Promise<void>((resolve, reject) => {
        if (componentRef.current) resolve();
        else reject(new Error("[react-to-print] ref is null"));
      }),
    onAfterPrint: () => setIsPrinting(false),
    onPrintError: (_loc, err) => {
      console.error("Print error:", err);
      message.error("Failed to print document");
      setIsPrinting(false);
    },
    pageStyle: isPdfView
      ? `@page { size: A4; margin: 20mm; }
         @media print { * { color-adjust: exact !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } body { margin: 0; padding: 0; } }`
      : `@page { size: 80mm auto; margin: 4mm 4mm 24mm 4mm; }
         @media print {
           * {
             color-adjust: exact !important;
             -webkit-print-color-adjust: exact !important;
             print-color-adjust: exact !important;
             color: black !important;
             box-sizing: border-box !important;
             max-width: 100% !important;
             word-break: break-word !important;
             overflow-wrap: break-word !important;
             ${isBold ? "font-weight: bold !important;" : ""}
           }
           body { margin: 0; padding: 0; width: 100%; }
           table { width: 100% !important; table-layout: fixed !important; }
           td, th { overflow: hidden !important; }
         }`,
  });

  useEffect(() => {
    if (pendingPrintRef.current && refReady && componentRef.current) {
      pendingPrintRef.current = false;
      triggerPrint();
    }
  }, [printTrigger, refReady, triggerPrint]);

  const getDocumentTypeConfig = () => {
    switch (documentType) {
      case "receipt": return { label: "RECEIPT", color: "#52c41a", icon: <FileTextOutlined />, amountLabel: "Amount Paid" };
      case "invoice": return { label: "INVOICE", color: "#1890ff", icon: <ReconciliationOutlined />, amountLabel: "Amount Due" };
      case "quotation": return { label: "QUOTATION", color: "#fa8c16", icon: <DollarOutlined />, amountLabel: "Total Estimate" };
      default: return { label: "BILL", color: "#722ed1", icon: <FileTextOutlined />, amountLabel: "Amount Due" };
    }
  };
  const docConfig = getDocumentTypeConfig();

  const executePrint = useCallback(async (reason?: string) => {
    if (!canPrint) {
      message.error("Print limit reached. Printing is not allowed for this document.");
      return;
    }
    
    setIsPrinting(true);
    
    try {
      if (useIPPrinterMode) {
        // Use agent-based printing via new /api/printer/print endpoint
        console.log('🔍 PrintBillModal - Agent Printer Mode - Using /api/printer/print endpoint');
        
        const cartId = cartDetails?._id;
        const shopId = localStorage.getItem("shopId") ?? "";
        
        const t = localStorage.getItem("tenant");
        const companyCode = t ? (JSON.parse(t)?.tenant_code ?? "") : "";

        if (!cartId) {
          message.error("Cart ID not found for printing");
          setIsPrinting(false);
          return;
        }

        const result = await printFromCart(cartId, shopId, companyCode);
        
        // Record the print
        const printFormat: PrintFormat = "thermal";
        const { saved, blocked } = await attemptSave(recordPrint, { print_format: printFormat, reason });
        if (blocked) { setIsPrinting(false); return; }
        if (saved) {
          message.success(result.message || "Print job sent successfully");
        }
      } else {
        // Use browser printing
        if (!refReady || !componentRef.current) {
          message.warning("Document is not ready yet. Please try again.");
          setIsPrinting(false);
          return;
        }
        const printFormat: PrintFormat = isPdfView ? "pdf" : "thermal";
        const { saved, blocked } = await attemptSave(recordPrint, { print_format: printFormat, reason });
        if (blocked) { setIsPrinting(false); return; }
        if (saved) {
          message.success(`${printFormat === "pdf" ? "PDF" : "Print"} ${isReprint ? "reprinted" : "printed"} and recorded successfully`);
        }
        pendingPrintRef.current = true;
        setPrintTrigger((n) => n + 1);
      }
    } catch (err) {
      console.error("executePrint error:", err);
      message.error("Failed to process print request");
    } finally {
      setIsPrinting(false);
    }
  }, [canPrint, isPdfView, refReady, recordPrint, isReprint, useIPPrinterMode, cartDetails]);

  const agentShopId = localStorage.getItem("shopId") ?? "";

  const handleSendToPrinter = async () => {
    console.log("[handleSendToPrinter] Called, data:", data);
    const items: any[] = Array.isArray(data) ? data : [];
    console.log("[handleSendToPrinter] Items count:", items.length);
    if (!items.length) return;
    setSendingToPrinter(true);
    const grouped = groupItemsByMainCategory(items);
    console.log("[handleSendToPrinter] Grouped categories:", grouped.size);
    if (grouped.size === 0) {
      message.warning("No category info found on items — cannot route to printer");
      setSendingToPrinter(false);
      return;
    }
    let sent = 0;
    const skippedCategories: string[] = [];
    for (const [categoryId, grpItems] of grouped) {
      // Convert category ID to main category name
      const mainCategoryName = getMainCategoryName(categoryId);
      console.log("[handleSendToPrinter] Category ID:", categoryId, "Main category name:", mainCategoryName);
      const agentId = getAgentForCategory(mainCategoryName);
      console.log("[handleSendToPrinter] Agent for", mainCategoryName, ":", agentId);
      if (!agentId) {
        skippedCategories.push(mainCategoryName);
        continue;
      }
      await sendPrintJob({
        shop_id: agentShopId,
        main_category_id: mainCategoryName,
        order_no: cartDetails?.order_no,
        content_type: "food_order",
        cut_paper: true,
        priority: "normal",
        lines: (() => {
          return buildKitchenLines(
            cartDetails?.order_no ?? "",
            grpItems,
            cartDetails?.table_name,
            {
              name: BRAND_NAME1,
              address: PO_BOX,
              phone: PHONE_NO,
              email: EMAIL_URL,
            },
            mainCategoryName,
            cartDetails?._id,
            cartDetails?.created_by_name || cartDetails?.served_by,
            {
              method: cartDetails?.payment_method,
              paybill: Paybill_bs,
              account: Paybill_ac,
            }
          );
        })(),
      }, companyCode)
        .then((r) => { if (r.agentsSent > 0) sent++; })
        .catch((e) => console.warn(`[send] category ${mainCategoryName}:`, e.message));
    }
    if (sent > 0) {
      let msg = "Order sent to printer(s)!";
      if (skippedCategories.length > 0) {
        msg += ` (Skipped: ${skippedCategories.join(", ")} - no printer assigned)`;
      }
      message.success(msg);
    } else {
      message.warning("No printers assigned to any categories in this order");
    }
    setSendingToPrinter(false);
  };

  const handleAutoPrint = async () => {
    const items: any[] = Array.isArray(data) ? data : [];
    if (!items.length) return;
    setAutoPrinting(true);
    const grouped = groupItemsByMainCategory(items);
    if (grouped.size === 0) {
      message.warning("No category info found on items — cannot auto print");
      setAutoPrinting(false);
      return;
    }
    let sent = 0;
    const skippedCategories: string[] = [];
    for (const [categoryId, grpItems] of grouped) {
      // Convert category ID to main category name
      const mainCategoryName = getMainCategoryName(categoryId);
      const agentId = getAgentForCategory(mainCategoryName);
      if (!agentId) {
        skippedCategories.push(mainCategoryName);
        continue;
      }
      await sendPrintJob({
        shop_id: agentShopId,
        main_category_id: mainCategoryName,
        order_no: cartDetails?.order_no,
        content_type: "receipt",
        cut_paper: true,
        priority: "normal",
        lines: buildReceiptLines(cartDetails?.order_no ?? "", grpItems, finalGrandTotal, cartDetails?.table_name),
      }, companyCode)
        .then((r) => { if (r.agentsSent > 0) sent++; })
        .catch((e) => console.warn(`[autoprint] category ${mainCategoryName}:`, e.message));
    }
    if (sent > 0) {
      let msg = "Receipt sent to printer(s)!";
      if (skippedCategories.length > 0) {
        msg += ` (Skipped: ${skippedCategories.join(", ")} - no printer assigned)`;
      }
      message.success(msg);
    } else {
      message.warning("No printers assigned to any categories in this order");
    }
    setAutoPrinting(false);
  };

  const handleFinish = async () => {
    if (!canPrint) { message.error("Print limit reached."); return false; }
    if (isReprint && printStatus?.requires_reason) { setReasonModalOpen(true); return false; }
    await executePrint();
    return true;
  };

  const handleSendEmail = async (values: SendEmailValues) => {
    setSending(true);
    try {
      const htmlTable = refToHtmlString(componentRef);
      const fmtAmt = (n: number) =>
        `KES ${n.toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;
      const ok = await sendEmail({
        to: values.to,
        recipientName: values.recipientName ?? cartDetails?.client_name ?? cartDetails?.clientName ?? undefined,
        intro: values.intro,
        cc: values.cc,
        subject: `${docConfig.label} — ${cartDetails?.order_no ?? "Order"}`,
        bannerLabel: `${docConfig.label} — ${cartDetails?.order_no ?? ""}`,
        bannerType: "Sales",
        summary: [
          { label: "Subtotal", value: fmtAmt(netSubtotal), color: C.primary },
          { label: "VAT", value: fmtAmt(finalTotalVat), color: "#6366f1" },
          { label: docConfig.amountLabel, value: fmtAmt(finalGrandTotal), color: "#10b981" },
        ],
        htmlTable,
        outro: `Thank you for your ${documentType === "quotation" ? "interest" : "business"}!`,
      });
      if (ok) setEmailModalOpen(false);
    } finally {
      setSending(false);
    }
  };

  // Builds the bill PDF from the printable ref and returns both the jsPDF
  // instance and a base64 data URL — shared by download & WhatsApp send.
  const buildPdf = async () => {
    if (!componentRef.current) {
      message.error("Document is not ready yet. Please try again.");
      return null;
    }
    const element = componentRef.current;
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: isPdfView ? 'a4' : [80, canvas.height * 80 / canvas.width],
    });

    const imgWidth = isPdfView ? 210 : 80;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

    const filename = `${docConfig.label}_${cartDetails?.order_no || 'receipt'}.pdf`;
    const base64Pdf = pdf.output('datauristring');

    return { pdf, filename, base64Pdf };
  };

  const handleDownloadPDF = async () => {
    try {
      const result = await buildPdf();
      if (!result) return;
      result.pdf.save(result.filename);
      message.success("PDF downloaded successfully");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      message.error("Failed to download PDF");
    }
  };

  const handleSendWhatsApp = async (values: SendWhatsAppValues) => {
    setSendingWhatsapp(true);
    try {
      const result = await buildPdf();
      if (!result) return;

      const shopId = localStorage.getItem("shopId") ?? "";
      if (!shopId) {
        message.error("No shop selected — cannot send document.");
        return;
      }

      const ok = await sendDocumentViaWhatsApp({
        shop_id: shopId,
        phone_number: values.phone_number,
        base64_pdf: result.base64Pdf,
        filename: result.filename,
        caption: `${docConfig.label} — ${cartDetails?.order_no ?? "Order"}`,
        customer_id: cartDetails?.customer_id?._id ?? cartDetails?.customer_id ?? null,
        customer_name: customerName,
      });
      if (ok) setWhatsappModalOpen(false);
    } catch (error) {
      console.error("Error sending document via WhatsApp:", error);
    } finally {
      setSendingWhatsapp(false);
    }
  };

  // ── Styles ─────────────────────────────────────────────────────────────
  const S = makeReceiptStyles(isBold, fontSize);

  // PDF styles (always professional, unaffected by bold toggle)
  const pdfBase = { fontFamily: "'Segoe UI', Roboto, sans-serif", color: "#333" };
  const pdfHdr = { ...pdfBase, fontSize: "28px", fontWeight: 700, color: "#1a1a1a" };
  const pdfSub = { ...pdfBase, fontSize: "16px", fontWeight: 600, color: "#444" };
  const pdfNorm = { ...pdfBase, fontSize: "14px", fontWeight: 400 };
  const pdfTH = { padding: "12px 8px", fontWeight: 700, fontSize: "15px", color: "#1a1a1a", backgroundColor: "#f5f5f5", borderBottom: "2px solid #ddd" };
  const pdfTD = { padding: "10px 8px", fontSize: "14px", color: "#333", borderBottom: "1px solid #eee" };
  const pdfWarranty = { textAlign: "center" as const, border: "3px solid #000", padding: "15px", margin: "20px 0", backgroundColor: "#fff9e6", fontWeight: 700, fontSize: "18px", borderRadius: "8px" };

  const printDate = new Date();
  const printDateStr = printDate.toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });
  const printTimeStr = `${String(printDate.getHours()).padStart(2, "0")}:${String(printDate.getMinutes()).padStart(2, "0")}`;

  // Customer details with KRA PIN
  const customerName =
    cartDetails?.client_name ||
    cartDetails?.clientName ||
    cartDetails?.customer_id?.customer_name ||
    (isSpa ? "" : "Walk-in Customer");
  const customerPhone =
    cartDetails?.client_phone ||
    cartDetails?.clientPhone ||
    cartDetails?.customer_id?.phone ||
    "";
  const customerEmail =
    cartDetails?.client_email ||
    cartDetails?.clientEmail ||
    cartDetails?.customer_id?.email ||
    "";
  const customerAddress =
    cartDetails?.client_address ||
    cartDetails?.clientAddress ||
    cartDetails?.customer_id?.address ||
    "";
  const customerKraPin =
    cartDetails?.client_kra_pin ||
    cartDetails?.clientKraPin ||
    cartDetails?.client_pin ||
    cartDetails?.customer_id?.kra_pin ||
    "";
  const hasClient = !!(customerName || customerPhone || customerEmail || customerKraPin);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <>
      <ModalForm
        className="receiptM"
        modalProps={{ centered: true, destroyOnClose: true, width: isPdfView ? 900 : 680 }}
        submitter={{
          render: (_, defaultDoms) => (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", flexWrap: "wrap", gap: 8 }}>
              <Space wrap>
                <Button
                  icon={<MailOutlined />}
                  onClick={() => setEmailModalOpen(true)}
                  style={{ borderColor: C.primary, color: C.primary, borderRadius: 7 }}
                  disabled={!canPrint || isPrinting}
                >
                  Send via Email
                </Button>
                {canSendWhatsApp && (
                  <Tooltip
                    title={
                      whatsappStatusLoading
                        ? "Checking WhatsApp Web connection…"
                        : !isWhatsAppConnected
                          ? "WhatsApp Web is not connected. Go to Omnichannel > Connect WhatsApp and scan the QR code."
                          : undefined
                    }
                  >
                    <Button
                      icon={<WhatsAppOutlined />}
                      loading={sendingWhatsapp}
                      onClick={() => {
                        if (!isWhatsAppConnected) {
                          message.warning("WhatsApp Web is not connected. Please connect it from Omnichannel > Connect WhatsApp first.");
                          return;
                        }
                        if (customerPhone) {
                          // Customer already attached with a phone number — send straight away
                          handleSendWhatsApp({ phone_number: customerPhone });
                        } else {
                          // No number on file — ask for one
                          setWhatsappModalOpen(true);
                        }
                      }}
                      style={{ borderColor: "#25D366", color: "#25D366", borderRadius: 7 }}
                      disabled={!canPrint || isPrinting}
                    >
                      Send via WhatsApp
                    </Button>
                  </Tooltip>
                )}
              </Space>
              <Space wrap>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={handleDownloadPDF}
                  style={{ borderColor: "#1890ff", color: "#1890ff", borderRadius: 7 }}
                  disabled={!canPrint || isPrinting}
                >
                  Download PDF
                </Button>
                {/* Send button moved to CartDrawer */}
                {/* <Button
                  icon={<SendOutlined />}
                  loading={sendingToPrinter}
                  disabled={!data?.length || isPrinting}
                  onClick={handleSendToPrinter}
                  style={{ borderColor: "#f97316", color: "#f97316", borderRadius: 7 }}
                >
                  Send
                </Button> */}
                {/* Auto Print button hidden for now */}
                {/* <Button
                  icon={<PrinterFilled />}
                  loading={autoPrinting}
                  disabled={!data?.length || isPrinting}
                  onClick={handleAutoPrint}
                  style={{ borderColor: C.primary, color: C.primary, borderRadius: 7 }}
                >
                  Auto Print
                </Button> */}
                {defaultDoms[0]}{defaultDoms[1]}
              </Space>
            </div>
          ),
          submitButtonProps: {
            icon: isPdfView ? <FilePdfOutlined /> : <PrinterFilled />,
            style: { background: C.primary, borderColor: C.primary },
            disabled: !canPrint || isPrinting || (useIPPrinterMode && ipPrinterLoading),
            loading: isPrinting || (useIPPrinterMode && ipPrinterLoading),
          },
          searchConfig: {
            submitText: isPdfView ? "Save as PDF" : isReprint ? "Reprint Document" : "Print Document",
            resetText: "Cancel",
          },
        }}
        trigger={
          <Button type="primary" icon={canPrint ? <PrinterOutlined /> : <LockOutlined />} disabled={statusLoading || !hasDuka}>
            {isReprint ? "Reprint Bill" : "Print Bill"}
          </Button>
        }
        onFinish={handleFinish}
      >
        {!hasDuka ? (
          <Alert
            type="warning"
            showIcon
            icon={<WarningOutlined />}
            message="Duka (POS) module is not enabled"
            description="Please enable Duka by Base in your tenant settings to use thermal printing."
            style={{ marginBottom: 16, borderRadius: 8 }}
          />
        ) : (
          <>
        {/* ── Alerts ──────────────────────────────────────────────────── */}
        {!canPrint && (
          <Alert type="error" showIcon icon={<LockOutlined />}
            message="Print limit reached"
            description={`This document has reached the maximum number of prints allowed.${isPdfView ? " PDF saving is also disabled." : ""}`}
            style={{ marginBottom: 16, borderRadius: 8 }}
          />
        )}
        {isReprint && canPrint && printsRemaining !== null && (
          <Alert
            type="warning"
            showIcon
            icon={<WarningOutlined />}
            message={`Reprint allowed: ${printsRemaining} more print${printsRemaining === 1 ? "" : "s"} remaining`}
            style={{ marginBottom: 16, borderRadius: 8 }}
          />
        )}

        {/* ── IP Printer Toggle ─────────────────────────────────────────────── */}
        {/* <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Typography.Text strong>Use IP Printer</Typography.Text>
              <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
                Print directly to configured thermal printer (currently disabled)
              </div>
            </div>
            <Switch
              checked={useIPPrinterMode}
              onChange={setUseIPPrinterMode}
              checkedChildren="IP"
              unCheckedChildren="Browser"
            />
          </div>
        </div> */}

        {/* ── Print Controls ────────────────────────────────────────────────── */}
        <div style={{
          background: "#fafafa", border: "1px solid #e8e8e8", borderRadius: 10,
          padding: "12px 16px", marginBottom: 20,
          display: "flex", flexDirection: "column", gap: 12,
        }}>
          {/* Row 1: Document type */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>
              Document Type :
            </span>
            <Select
              value={documentType}
              onChange={(v: DocumentType) => setDocumentType(v)}
              style={{ width: 170 }}
              options={[
                { label: "Bill", value: "bill" },
                { label: "Receipt", value: "receipt" },
                { label: "Invoice", value: "invoice" },
                { label: "Quotation", value: "quotation" },
              ]}
            />
            <Tag color={docConfig.color} style={{ fontSize: 13, padding: "3px 10px", borderRadius: 6, margin: 0 }}>
              {docConfig.icon}&nbsp;{docConfig.label}
            </Tag>
          </div>

          {/* Row 2: Format + Font controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <PrinterOutlined style={{ fontSize: 16, color: "#6b7280" }} />
              <span style={{ fontSize: 13, color: "#374151" }}>Thermal</span>
              <Switch
                checked={isPdfView}
                onChange={setIsPdfView}
                checkedChildren="PDF"
                unCheckedChildren="POS"
                disabled={!canPrint}
                style={{ background: isPdfView ? C.primary : undefined }}
              />
              <span style={{ fontSize: 13, color: "#374151" }}>A4 PDF</span>
              <FilePdfOutlined style={{ fontSize: 16, color: "#6b7280" }} />
            </div>

            <div style={{ width: 1, height: 24, background: "#e5e7eb" }} />

            {!isPdfView && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <FontColorsOutlined style={{ fontSize: 16, color: "#6b7280" }} />
                  <span style={{ fontSize: 13, color: "#374151" }}>Text Weight:</span>
                  <Segmented
                    size="small"
                    value={isBold ? "bold" : "normal"}
                    onChange={(v) => setIsBold(v === "bold")}
                    options={[
                      {
                        label: (
                          <Tooltip title="Bold — high contrast, easy to scan">
                            <span style={{ fontWeight: 700, fontSize: 13 }}>Bold</span>
                          </Tooltip>
                        ),
                        value: "bold",
                      },
                      {
                        label: (
                          <Tooltip title="Normal — cleaner, lighter look">
                            <span style={{ fontWeight: 400, fontSize: 13 }}>Normal</span>
                          </Tooltip>
                        ),
                        value: "normal",
                      },
                    ]}
                  />
                </div>

                <div style={{ width: 1, height: 24, background: "#e5e7eb" }} />

                <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                  <Tooltip title="Decrease Font Size">
                    <ZoomOutOutlined style={{ fontSize: 16, color: "#6b7280" }} />
                  </Tooltip>
                  <AntSlider
                    min={8}
                    max={20}
                    value={fontSize}
                    onChange={setFontSize}
                    style={{ width: 130, margin: 0 }}
                    tooltip={{ formatter: (v) => `${v}px` }}
                    marks={{
                      8: "",
                      11: "",
                      13: "",
                      15: "",
                      17: "",
                      20: "",
                    }}
                  />
                  <Tooltip title="Increase Font Size">
                    <ZoomInOutlined style={{ fontSize: 16, color: "#6b7280" }} />
                  </Tooltip>
                  <span style={{ fontSize: 12, color: "#6b7280", minWidth: 45 }}>
                    {fontSize}px
                  </span>
                  <Select
                    value={fontSize}
                    onChange={setFontSize}
                    size="small"
                    style={{ width: 110 }}
                    options={fontSizes.map((fs) => ({ label: fs.label, value: fs.value }))}
                  />
                </div>
              </>
            )}
          </div>

          {/* Row 3: Show/hide Discount & VAT */}
          <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>
              Show on Print:
            </span>

            <Tooltip title={discountAmount > 0 ? "Toggle discount line on printed document" : "No discount applied to this order"}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <PercentageOutlined style={{ fontSize: 15, color: showDiscount ? C.primary : "#9ca3af" }} />
                <span style={{ fontSize: 13, color: "#374151" }}>Discount</span>
                <Switch
                  size="small"
                  checked={showDiscount}
                  onChange={setShowDiscount}
                  disabled={discountAmount === 0}
                  style={{ background: showDiscount && discountAmount > 0 ? C.primary : undefined }}
                />
              </div>
            </Tooltip>

            <div style={{ width: 1, height: 20, background: "#e5e7eb" }} />

            <Tooltip title="Toggle VAT line on printed document">
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <DollarOutlined style={{ fontSize: 15, color: showVat ? C.primary : "#9ca3af" }} />
                <span style={{ fontSize: 13, color: "#374151" }}>VAT</span>
                <Switch
                  size="small"
                  checked={showVat}
                  onChange={setShowVat}
                  style={{ background: showVat ? C.primary : undefined }}
                />
              </div>
            </Tooltip>
          </div>
        </div>


        {/* ── THERMAL RECEIPT ─────────────────────────────────────────── */}
        {/*
          FIX: Replaced fixed <table> with colgroup approach using a two-row layout.
          The items table now uses a stacked layout:
            Row 1: # | Qty | Description (full width, wraps naturally)
            Row 2: (empty) | (empty) | Price | VAT | Total  (right-aligned numerics)
          This prevents column header overlap on the narrow 80mm roll.
          No description shown on thermal (desc only on PDF).
        */}
        <div
          ref={!isPdfView ? printableRef : undefined}
          className="receipt"
          id="receipt"
          style={{
            color: "#000000",
            display: isPdfView ? "none" : "block",
            maxWidth: "300px",
            width: "100%",
            boxSizing: "border-box",
            overflowX: "hidden",
            margin: "0 auto",
            fontFamily: "'Courier New', Courier, monospace",
          }}
        >
          {/* ── HEADER ───────────────────────────────────────────────── */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ textAlign: "center", marginBottom: 4 }}>
              <div style={S.shopName}>{BRAND_NAME1}</div>
              {PIN && <div style={S.meta}>PIN: {PIN}</div>}
              <div style={S.meta}>Tel: {PHONE_NO}</div>
              <div style={S.meta}>{EMAIL_URL}</div>
            </div>

            <SolidLine />

            <div style={{ ...S.docType, marginBottom: 4 }}>{docConfig.label}</div>

            {/* ETR Information */}
            {/* {etrEnabled && digitax && digitax.receipt_number && digitax.receipt_number !== 0 && (
              <div style={{ marginBottom: 4, textAlign: "center" }}>
                <div style={{ ...S.meta, fontSize: String(fontSize - 2) + "px", color: "#389e0d" }}>
                  Receipt No: {digitax.receipt_number}
                </div>
              </div>
            )} */}

            <MetaRow
              left={<span style={S.meta}>
                {documentType === "receipt" ? "Receipt No" :
                  documentType === "invoice" ? "Invoice No" :
                    documentType === "quotation" ? "Quote No" : "Bill No"}:{" "}
                {cartDetails?.order_no || "N/A"}
              </span>}
              right={<span style={S.meta}>{printDateStr}</span>}
            />
            <SolidLine />
          </div>

          {/* ── BILL TO / CLIENT ──────────────────────────────────────────────── */}
          {(hasClient || !isSpa) && (
            <div style={{
              marginBottom: 6,
              border: "1px solid #ccc",
              padding: "5px 6px",
              background: "#f9f9f9",
            }}>
              <div style={{ ...S.label, marginBottom: 2 }}>{isSpa ? "CLIENT:" : "BILL TO:"}</div>
              <div style={S.value}>{customerName || "Walk-in Customer"}</div>
              {customerPhone && <div style={S.meta}>Tel: {customerPhone}</div>}
              {customerEmail && <div style={S.meta}>Email: {customerEmail}</div>}
              {customerAddress && <div style={S.meta}>Addr: {customerAddress}</div>}
              {customerKraPin && (
                <div style={{ ...S.meta, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                  <IdcardOutlined style={{ fontSize: fontSize - 2 }} /> KRA PIN: {customerKraPin}
                </div>
              )}
            </div>
          )}

          <DashedLine />

          {/* ── ORDER META ───────────────────────────────────────────── */}
          <MetaRow left={<span style={S.meta}>Order: {cartDetails?.order_no}</span>} />
          <MetaRow
            left={<span style={S.meta}>Cashier: {cartDetails?.served_by?.username || cartDetails?.created_by?.username || "Staff"}</span>}
            right={cartDetails?.table_id?.name ? <span style={S.meta}>Table: {cartDetails.table_id.name}</span> : undefined}
          />
          <MetaRow
            left={<span style={S.meta}>Date: {printDateStr}</span>}
            right={<span style={S.meta}>Time: {printTimeStr}</span>}
          />

          <DashedLine />

          {/* ── ITEMS LIST (THERMAL) ──────────────────────────────────
              Replaced multi-column table with simple div rows.
              - Header: one flex row, all labels on one line, no wrapping
              - Each item:
                  Line 1 (flex): "#  Qty  Name..." — name wraps freely, 
                                 numbers stay right-aligned and never squeeze
                  Line 2 (flex, right-aligned): Price | VAT | Total
              No table columns = no Qty wrapping, no right-side overflow.
              Name can be as long as needed; it just wraps to more lines.
          ──────────────────────────────────────────────────────────── */}
          <div style={{ width: "100%" }}>
            {/* Header row */}
            <div style={{
              display: "flex",
              borderBottom: "1px solid #000",
              paddingBottom: 3,
              marginBottom: 2,
            }}>
              {/* # column — commented out for now */}
              {/* <span style={{ ...S.tblHdr, width: 16, flexShrink: 0 }}>#</span> */}
              <span style={{ ...S.tblHdr, width: 32, flexShrink: 0, whiteSpace: "nowrap" }}>Qty</span>
              <span style={{ ...S.tblHdr, flex: 1 }}>Item</span>
              <span style={{ ...S.tblHdr, width: 56, flexShrink: 0, textAlign: "right", whiteSpace: "nowrap" }}>Price</span>
              {/* VAT column — commented out for now */}
              {/* <span style={{ ...S.tblHdr, width: 40, flexShrink: 0, textAlign: "right" }}>VAT</span> */}
              <span style={{ ...S.tblHdr, width: 56, flexShrink: 0, textAlign: "right", whiteSpace: "nowrap" }}>Total</span>
            </div>

            {data?.map((item: any, index: number) => {
              const displayPrice = getDisplayPrice(item);
              const exclLine = getExclPrice(item) * (item.quantity || 0);
              const itemVat = (vatMode === "INCLUSIVE" && VAT_RATE > 0) ? exclLine * VAT_RATE : 0;
              const lineTotal = (displayPrice || 0) * (item.quantity || 0);

              return (
                /* Single flex row — all columns together, name wraps, numbers stay top-right */
                <div key={item._id || index} style={{ display: "flex", alignItems: "flex-start", marginBottom: 4, paddingTop: 2 }}>
                  {/* # column — commented out for now */}
                  {/* <span style={{ ...S.tblData, width: 16, flexShrink: 0 }}>{index + 1}</span> */}

                  {/* Qty */}
                  <span style={{ ...S.tblData, width: 32, flexShrink: 0, whiteSpace: "nowrap" }}>{item.quantity || 0}</span>

                  {/* Name — flex:1 so it takes all remaining space and wraps */}
                  <span style={{
                    ...S.tblData,
                    flex: 1,
                    minWidth: 0,
                    wordBreak: "break-word",
                    overflowWrap: "break-word",
                    whiteSpace: "normal",
                  }}>
                    {item?.product_id?.name || item?.description || 'Item'}
                    {item.notes && (
                      <span style={{ ...S.tblSub, display: "block", color: "#666" }}>({item.notes})</span>
                    )}
                    {item.quantity > 1 && (
                      <span style={{ ...S.tblSub, display: "block" }}>@ {fmtN(displayPrice || 0)} ea</span>
                    )}
                  </span>

                  {/* Price */}
                  <span style={{ ...S.tblData, width: 56, flexShrink: 0, textAlign: "right", whiteSpace: "nowrap" }}>
                    {fmtN(displayPrice || 0)}
                  </span>

                  {/* VAT column — commented out for now */}
                  {/* <span style={{ ...S.tblData, width: 40, flexShrink: 0, textAlign: "right", whiteSpace: "nowrap" }}>
                    {itemVat.toFixed(2)}
                  </span> */}

                  {/* Total */}
                  <span style={{ ...S.tblData, width: 56, flexShrink: 0, textAlign: "right", whiteSpace: "nowrap" }}>
                    {fmtN(lineTotal)}
                  </span>
                </div>
              );
            })}
          </div>

          <DashedLine />

          {/* ── TOTALS ───────────────────────────────────────────────── */}
          {/* Totals — full width so large fonts never overflow the roll */}
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {(showDiscount || discountAmount === 0) && (
                <tr>
                  <td style={{ ...S.value, paddingBottom: 2 }}>Subtotal</td>
                  <td style={{ ...S.value, paddingBottom: 2, textAlign: "right", whiteSpace: "nowrap" }}>
                    {netSubtotal.toLocaleString()}
                  </td>
                </tr>
              )}
              {showDiscount && discountAmount > 0 && (
                <tr>
                  <td style={{ ...S.value, paddingBottom: 2 }}>
                    Disc{cartDetails.discount_type === "percentage" ? ` ${cartDetails.discount}%` : ""}
                  </td>
                  <td style={{ ...S.value, paddingBottom: 2, textAlign: "right", whiteSpace: "nowrap" }}>
                    -{discountAmount.toFixed(2)}
                  </td>
                </tr>
              )}
              {showVat && (
                <tr>
                  <td style={{ ...S.value, paddingBottom: 2 }}>VAT</td>
                  <td style={{ ...S.value, paddingBottom: 2, textAlign: "right", whiteSpace: "nowrap" }}>
                    {finalTotalVat.toFixed(2)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <DoubleLine />
          {/* Grand total — full width, amount right-aligned */}
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td style={S.total}>{docConfig.amountLabel.toUpperCase()}</td>
                <td style={{ ...S.total, textAlign: "right", whiteSpace: "nowrap" }}>
                  {finalGrandTotal.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>

          {/* ── PAYMENT INFO ─────────────────────────────────────────── */}
          {(Paybill_bs || TILL_NO) && (
            <>
              <DashedLine />
              <div style={{ textAlign: "center" }}>
                <div style={S.label}>Payment Details</div>
                {Paybill_bs && (
                  <>
                    <div style={S.meta}>Paybill: {Paybill_bs}</div>
                    {Paybill_ac && <div style={S.meta}>Account: {Paybill_ac}</div>}
                  </>
                )}
                {TILL_NO && (
                  <div style={S.meta}>Till No: {TILL_NO}</div>
                )}
              </div>
            </>
          )}

          {/* ── WARRANTY (electronics) ───────────────────────────────── */}
          {isElectronicsStore && documentType !== "quotation" && (
            <>
              <DashedLine />
              <div style={{
                border: "2px solid #000", padding: "6px 8px",
                margin: "6px 0", textAlign: "center", background: "#f9f9f9",
              }}>
                <span style={{ ...S.label, fontSize: String(fontSize - 1) + "px" }}>
                  <SafetyCertificateFilled /> WARRANTY: 6 MONTHS <SafetyCertificateFilled />
                </span>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={S.meta}>* This receipt is your warranty certificate *</div>
                <div style={S.meta}>* Please retain for warranty claims *</div>
              </div>
            </>
          )}

          {/* ── QUOTATION NOTICE ─────────────────────────────────────── */}
          {documentType === "quotation" && (
            <>
              <DashedLine />
              <div style={{ textAlign: "center" }}>
                <div style={S.meta}>* Valid for 30 days from date of issue *</div>
                <div style={S.meta}>* Prices subject to change *</div>
              </div>
            </>
          )}

          {/* ── FOOTER ───────────────────────────────────────────────── */}
          <DashedLine />
          {/* paddingBottom: the physical distance from the last printed line
              to where the printer's cutter blade sits. Most 80mm thermal
              printers need 15-20mm of feed after the last character so the
              cut lands below "Powered By Basepoint Cloud", not through it. */}
          <div style={{ textAlign: "center", marginTop: 4, paddingBottom: "20mm" }}>
            {/* ETR QR Code - use backend digitax data */}
            {etrEnabled && digitax?.offline_url ? (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: String(fontSize - 2) + "px", color: "#52c41a", marginBottom: 2, fontWeight: 600 }}>
                  ETR VERIFICATION
                </div>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>
                  <QRCodeCanvas value={digitax.offline_url} size={60} className="etr-qrcode" />
                </div>
                <div style={{ fontSize: String(fontSize - 3) + "px", color: "#666" }}>
                  Scan to verify tax receipt
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>
                <QRCodeCanvas value={QR_Code} size={80} className="qrcode" />
              </div>
            )}
            <div style={S.footer}>
              Thank you for your {documentType === "quotation" ? "interest" : "business"}!
            </div>
            <div style={S.footer}>{EMAIL_URL}</div>
            <div style={S.footer}>Printed: {printDateStr} {printTimeStr}</div>
            <div style={{ ...S.footer, marginTop: 4, fontSize: String(fontSize - 2) + "px", color: "#555" }}>
              Powered By Basepoint
            </div>
          </div>
        </div>
        {/* ── END THERMAL ─────────────────────────────────────────────── */}

        {/* ── PDF / A4 VIEW ────────────────────────────────────────────── */}
        {/*
          FIX: Added "Description" column to the PDF items table.
          Shows item.product_id?.desc (or item.desc) below the product name
          in a subtle smaller style. Only rendered in PDF mode — thermal
          receipt is unchanged and does not show descriptions.
        */}
        {isPdfView && user ? (
          <div
            ref={printableRef}
            style={{ backgroundColor: "#fff", padding: "40px", maxWidth: "800px", margin: "0 auto", boxShadow: "0 0 10px rgba(0,0,0,0.1)" }}
          >
            {/* PDF Header */}
            <div style={{ borderBottom: "3px solid #333", paddingBottom: 16, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                  {/* Client Logo */}
                  {clientLogoUrl && user && (
                    <div style={{ flexShrink: 0 }}>
                      <img
                        src={clientLogoUrl}
                        alt="Client Logo"
                        style={{
                          width: 80,
                          height: 80,
                          borderRadius: 8,
                          objectFit: "contain",
                          border: "1px solid #e2e8f0"
                        }}
                      />
                    </div>
                  )}
                  <div>
                    <div style={pdfHdr}>{BRAND_NAME1}</div>
                    <div style={pdfNorm}>PIN: {PIN || "N/A"}</div>
                    <div style={pdfNorm}>P.O. Box {PO_BOX || "N/A"}</div>
                    <div style={pdfNorm}>Tel: {PHONE_NO}</div>
                    <div style={pdfNorm}>Email: {EMAIL_URL}</div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ backgroundColor: docConfig.color, color: "#fff", padding: "8px 20px", borderRadius: "8px", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                    {docConfig.icon}
                    <div style={{ fontSize: "20px", fontWeight: 700, color: "#fff", margin: 0 }}>{docConfig.label}</div>
                  </div>
                  <div style={pdfNorm}>Date: {printDateStr}</div>
                  <div style={pdfNorm}>Invoice No: {cartDetails?.order_no || "N/A"}</div>
                  <div style={pdfNorm}>LPO No: {cartDetails?.lpo_no || "N/A"}</div>
                  
                  {/* ETR Information */}
                  {etrEnabled && digitax && digitax.receipt_number && digitax.receipt_number !== 0 && (
                    <div style={{ marginTop: 6, padding: 6, backgroundColor: "#f6ffed", border: "1px solid #b7eb8f", borderRadius: 4 }}>
                      <div style={{ color: "#389e0d", fontSize: "11px" }}>
                        Receipt No: {digitax.receipt_number}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                {/* ETR QR Code - replaces regular QR code when present */}
                {etrEnabled && digitax?.offline_url ? (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ color: "#52c41a", fontWeight: 600, fontSize: "10px", marginBottom: 4 }}>
                      ETR VERIFICATION
                    </div>
                    <QRCodeCanvas value={digitax.offline_url} size={100} />
                    <div style={{ color: "#666", fontSize: "8px", marginTop: 4 }}>
                      Scan to verify tax receipt
                    </div>
                  </div>
                ) : (
                  /* Regular QR Code - only shown when ETR is not enabled */
                  <QRCodeCanvas value={QR_Code} size={100} />
                )}
              </div>
            </div>

            {/* Bill To */}
            <div style={{ marginBottom: 16, backgroundColor: "#f8fafc", borderRadius: 6, padding: 12, border: "1px solid #e2e8f0" }}>
              <div style={pdfSub}>{isSpa ? "CLIENT:" : "BILL TO:"}</div>
              <div style={pdfNorm}><strong>{customerName || "Walk-in Customer"}</strong></div>
              {customerPhone && <div style={pdfNorm}>Phone: {customerPhone}</div>}
              {customerEmail && <div style={pdfNorm}>Email: {customerEmail}</div>}
              {customerAddress && <div style={pdfNorm}>Address: {customerAddress}</div>}
              {customerKraPin && (
                <div style={pdfNorm}>
                  <IdcardOutlined style={{ marginRight: 4 }} /> KRA PIN: {customerKraPin}
                </div>
              )}
            </div>

            {/* Order meta */}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, backgroundColor: "#f8fafc", borderRadius: 6, padding: 12 }}>
              <div>
                <div style={pdfSub}>{documentType === "quotation" ? "Quote" : "Order"} No: {cartDetails?.order_no}</div>
                <div style={pdfNorm}>Table: {cartDetails?.table_id?.name}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={pdfNorm}>Date: {printDateStr}</div>
                <div style={pdfNorm}>Time: {printTimeStr}</div>
                <div style={pdfNorm}>Cashier: {cartDetails?.served_by?.username || cartDetails?.created_by?.username || "Staff"}</div>
              </div>
            </div>

            {/* ── PDF Items table — includes Description column ───────── */}
            <div style={{ marginBottom: 16 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ ...pdfTH, width: "5%" }}>#</th>
                    <th style={{ ...pdfTH, width: "7%" }}>Qty</th>
                    {/* Description column added — wider to accommodate both name + desc */}
                    <th style={{ ...pdfTH }}>Item &amp; Description</th>
                    <th style={{ ...pdfTH, textAlign: "right", width: "13%" }}>Unit Price</th>
                    <th style={{ ...pdfTH, textAlign: "right", width: "10%" }}>VAT</th>
                    <th style={{ ...pdfTH, textAlign: "right", width: "12%" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.map((item: any, index: number) => {
                    // Inline VAT-exclusive computation
                    const rawPrice = typeof item.price === "string" ? parseFloat(item.price) : (item.price || 0);
                    const unitExcl = (vatMode === "INCLUSIVE" && VAT_RATE > 0) ? rawPrice / (1 + VAT_RATE) : rawPrice;
                    const lineExcl = unitExcl * (item.quantity || 1);
                    const itemVat = (vatMode === "INCLUSIVE" && VAT_RATE > 0) ? lineExcl * VAT_RATE : 0;
                    const lineTotal = lineExcl + itemVat;
                    // Support both nested product_id.desc and flat item.desc
                    const itemDesc = item?.product_id?.desc || item?.product_id?.description || item?.desc || item?.description || "";
                    return (
                      <tr key={item._id || index}>
                        <td style={pdfTD}>{index + 1}</td>
                        <td style={pdfTD}>{item.quantity}</td>
                        {/* Name + description stacked in one cell */}
                        <td style={pdfTD}>
                          <div style={{ fontWeight: 600, color: "#1a1a1a", fontSize: "14px" }}>
                            {item?.product_id?.name || item?.description || 'Item'}
                          </div>
                          {item.notes && (
                            <div style={{
                              fontSize: "12px",
                              color: "#6b7280",
                              marginTop: "3px",
                              lineHeight: "1.4",
                            }}>
                              ({item.notes})
                            </div>
                          )}
                          {itemDesc && (
                            <div style={{
                              fontSize: "12px",
                              color: "#6b7280",
                              marginTop: "3px",
                              lineHeight: "1.4",
                              fontStyle: "italic",
                            }}>
                              {itemDesc}
                            </div>
                          )}
                        </td>
                        <td style={{ ...pdfTD, textAlign: "right" }}>{unitExcl.toFixed(2)}</td>
                        <td style={{ ...pdfTD, textAlign: "right" }}>{itemVat.toFixed(2)}</td>
                        <td style={{ ...pdfTD, textAlign: "right" }}>{lineTotal.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* PDF Totals */}
            <div style={{ marginLeft: "auto", maxWidth: "380px", padding: 12, backgroundColor: "#f9f9f9", borderRadius: 6, border: "1px solid #e2e8f0" }}>
              {(showDiscount || discountAmount === 0) && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <div style={pdfNorm}>Subtotal</div>
                  <div style={pdfNorm}>Ksh {netSubtotal.toLocaleString()}</div>
                </div>
              )}
              {showDiscount && discountAmount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <div style={pdfNorm}>
                    {cartDetails.discount_type === "percentage" ? "Discount (" + String(cartDetails.discount) + "%)" : "Discount"}
                  </div>
                  <div style={{ ...pdfNorm, color: "#d32f2f" }}>- Ksh {discountAmount.toFixed(2)}</div>
                </div>
              )}
              {showVat && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <div style={pdfNorm}>VAT</div>
                  <div style={pdfNorm}>Ksh {finalTotalVat.toFixed(2)}</div>
                </div>
              )}
              <hr style={{ border: "none", borderTop: "2px solid #333", margin: "10px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ ...pdfHdr, fontSize: "20px" }}>{docConfig.amountLabel}</div>
                <div style={{ ...pdfHdr, fontSize: "20px" }}>Ksh {finalGrandTotal.toLocaleString()}</div>
              </div>
            </div>

            {/* Payment Details — PDF: always show if Paybill or Till No exists */}
            {(Paybill_bs || TILL_NO) && (
              <div style={{ marginTop: 16, marginBottom: 12, backgroundColor: "#f0f9ff", borderRadius: 6, padding: 12, border: "1px solid #bae6fd" }}>
                <div style={{ ...pdfSub, textAlign: "center" }}>Payment Details</div>
                {Paybill_bs && (
                  <div style={{ ...pdfNorm, textAlign: "center" }}>
                    Paybill: {Paybill_bs}{Paybill_ac ? " | Account: " + Paybill_ac : ""}
                  </div>
                )}
                {TILL_NO && (
                  <div style={{ ...pdfNorm, textAlign: "center" }}>
                    Till No: {TILL_NO}
                  </div>
                )}
              </div>
            )}

            {/* Bank Details */}
            {bank_details && (bank_details.bank_name || bank_details.account_no) && (
              <div style={{ marginTop: 16, marginBottom: 12, backgroundColor: "#fef3c7", borderRadius: 6, padding: 12, border: "1px solid #fde68a" }}>
                <div style={{ ...pdfSub, textAlign: "center" }}>Bank Details</div>
                {bank_details.account_no && <div style={{ ...pdfNorm, textAlign: "center" }}>Account: {bank_details.account_no}</div>}
                {bank_details.account_name && <div style={{ ...pdfNorm, textAlign: "center" }}>Account Name: {bank_details.account_name}</div>}
                {bank_details.bank_name && <div style={{ ...pdfNorm, textAlign: "center" }}>Bank: {bank_details.bank_name}</div>}
                {bank_details.branch && <div style={{ ...pdfNorm, textAlign: "center" }}>Branch: {bank_details.branch}</div>}
                {bank_details.swift_code && <div style={{ ...pdfNorm, textAlign: "center" }}>SWIFT: {bank_details.swift_code}</div>}
                {bank_details.paybill_no && <div style={{ ...pdfNorm, textAlign: "center" }}>Paybill: {bank_details.paybill_no}</div>}
              </div>
            )}

            {/* Warranty */}
            {isElectronicsStore && documentType !== "quotation" && (
              <div style={{ marginTop: 20, marginBottom: 16 }}>
                <div style={pdfWarranty}>
                  <SafetyCertificateFilled style={{ marginRight: 8 }} />WARRANTY: 6 MONTHS<SafetyCertificateFilled style={{ marginLeft: 8 }} />
                </div>
                <div style={{ textAlign: "center", marginTop: 6 }}>
                  <div style={pdfNorm}>This receipt serves as your warranty certificate</div>
                  <div style={pdfNorm}>Please retain for warranty claims</div>
                </div>
              </div>
            )}

            {/* Quotation terms */}
            {documentType === "quotation" && (
              <div style={{ marginTop: 20, marginBottom: 16, backgroundColor: "#fffbe6", border: "2px solid #faad14", borderRadius: "8px", padding: 12 }}>
                <div style={{ ...pdfSub, textAlign: "center", marginBottom: 8 }}>Quotation Terms & Conditions</div>
                <div style={{ ...pdfNorm, marginBottom: 4 }}>• Valid for 30 days from date of issue</div>
                <div style={{ ...pdfNorm, marginBottom: 4 }}>• Prices subject to change without prior notice</div>
                <div style={{ ...pdfNorm, marginBottom: 4 }}>• Final pricing may vary based on product availability</div>
              </div>
            )}

            {/* PDF Footer */}
            <div style={{ borderTop: "2px solid #ddd", paddingTop: 16, marginTop: 20, textAlign: "center" }}>
              <div style={{ ...pdfSub, marginBottom: 8 }}>
                Thank you for your {documentType === "quotation" ? "interest" : "business"}!
              </div>
              <div style={{ ...pdfNorm, marginBottom: 4 }}>Email: {EMAIL_URL}</div>
              <div style={{ ...pdfNorm, marginBottom: 4 }}>Printed: {printDateStr} {printTimeStr}</div>
            </div>
          </div>
        ) : (
          isPdfView && (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              minHeight: '400px',
              backgroundColor: '#fff',
              padding: '40px',
              maxWidth: '800px',
              margin: '0 auto',
              boxShadow: '0 0 10px rgba(0,0,0,0.1)',
              borderRadius: '8px'
            }}>
              <LockOutlined style={{ fontSize: '48px', color: C.primary, marginBottom: '16px' }} />
              <div style={{ color: C.primary, marginBottom: '8px', textAlign: 'center', fontSize: '24px', fontWeight: 600 }}>
                Authentication Required
              </div>
              <div style={{ color: '#666', textAlign: 'center', maxWidth: '400px', fontSize: '14px' }}>
                Please log in to view and print PDF documents. This feature requires user authentication for security purposes.
              </div>
            </div>
          )
        )}
          </>
        )}

        <div style={{ marginTop: 8 }} />
      </ModalForm>

      <SendEmailModal
        open={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        onSend={handleSendEmail}
        sending={sending}
        docLabel={docConfig.label}
      />

      {canSendWhatsApp && (
        <SendWhatsAppModal
          open={whatsappModalOpen}
          onClose={() => setWhatsappModalOpen(false)}
          onSend={handleSendWhatsApp}
          sending={sendingWhatsapp}
          docLabel={docConfig.label}
          defaultPhone={customerPhone}
        />
      )}

      <ReprintReasonModal
        open={reasonModalOpen}
        onConfirm={async (reason) => { setReasonModalOpen(false); await executePrint(reason); }}
        onCancel={() => setReasonModalOpen(false)}
      />
    </>
  );
};

export default PrintBillModal;