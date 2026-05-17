import { BASE_URL } from "@utils/config";

export interface ConnectedAgent {
  _id: string;
  agent_id: string;
  company_code: string;
  company_id: string;
  shop_id: string;
  zone: string;
  device_name: string;
  is_active: boolean;
  last_seen: string;
  createdAt: string;
  updatedAt: string;
  connected: boolean;
}

export interface PrintAgentStatus {
  agents: ConnectedAgent[];
  count: number;
}

const CATEGORY_PRINTER_KEY = "print_agent_category_mappings";

export interface CategoryPrinterMapping {
  main_category_name: string;
  agentId: string;
}

export function getCategoryPrinterMappings(): Map<string, string> {
  try {
    const stored = localStorage.getItem(CATEGORY_PRINTER_KEY);
    if (!stored) return new Map();
    const parsed = JSON.parse(stored) as CategoryPrinterMapping[];
    return new Map(parsed.map((m) => [m.main_category_name, m.agentId]));
  } catch {
    return new Map();
  }
}

export function setCategoryPrinterMapping(mainCategoryName: string, agentId: string): void {
  const map = getCategoryPrinterMappings();
  map.set(mainCategoryName, agentId);
  const arr = Array.from(map.entries()).map(([cat, agent]) => ({
    main_category_name: cat,
    agentId: agent,
  }));
  localStorage.setItem(CATEGORY_PRINTER_KEY, JSON.stringify(arr));
}

export function removeCategoryPrinterMapping(mainCategoryName: string): void {
  const map = getCategoryPrinterMappings();
  map.delete(mainCategoryName);
  const arr = Array.from(map.entries()).map(([cat, agent]) => ({
    main_category_name: cat,
    agentId: agent,
  }));
  localStorage.setItem(CATEGORY_PRINTER_KEY, JSON.stringify(arr));
}

export function getAgentForCategory(mainCategoryName: string): string | null {
  const map = getCategoryPrinterMappings();
  return map.get(mainCategoryName) ?? null;
}

export interface PrintLine {
  type: "header" | "item" | "total" | "divider" | "footer";
  text: string;
  qty?: number;
  price?: string;
}

export interface PrintJobPayload {
  shop_id: string;
  main_category_id: string;
  order_no?: string;
  content_type?: string;
  cut_paper?: boolean;
  priority?: "normal" | "urgent";
  lines: PrintLine[];
}

export interface PrintJobResult {
  message: string;
  jobId: string;
  agentsSent: number;
}

export async function getConnectedAgents(shopId: string, companyCode: string): Promise<PrintAgentStatus> {
  const res = await fetch(`${BASE_URL}/api/agents/connected?shop_id=${shopId}`, {
    headers: { "Content-Type": "application/json", companycode: companyCode },
  });
  if (!res.ok) throw new Error("Failed to fetch agent status");
  return res.json();
}

export function isPrinterOnline(agents: ConnectedAgent[], mainCategoryId: string): boolean {
  return agents.some((a) => String(a.main_category_id) === String(mainCategoryId));
}

export function getItemMainCategoryId(item: Record<string, unknown>): string | null {
  // Try multiple possible paths to find the category ID
  const id =
    (item.main_category_id as string) ||
    (item.category as string) ||
    ((item.product_id as Record<string, unknown>)?.category as string) ||
    ((item.product as Record<string, unknown>)?.category as string) ||
    ((item.category as Record<string, unknown>)?.main_category as string) ||
    ((item.category as Record<string, unknown>)?.main_category?._id as string) ||
    ((item.category as Record<string, unknown>)?.main_category?.name as string) ||
    ((item.product_id as Record<string, unknown>)?.main_category as string) ||
    ((item.product as Record<string, unknown>)?.category?.main_category as string) ||
    ((item.product as Record<string, unknown>)?.category?.main_category?.name as string) ||
    null;
  return id ? String(id) : null;
}

export function groupItemsByMainCategory(
  cartItems: Record<string, unknown>[]
): Map<string, Record<string, unknown>[]> {
  const map = new Map<string, Record<string, unknown>[]>();
  for (const item of cartItems) {
    const catId = getItemMainCategoryId(item);
    if (!catId) continue;
    if (!map.has(catId)) map.set(catId, []);
    map.get(catId)!.push(item);
  }
  return map;
}

export async function sendPrintJob(payload: PrintJobPayload, companyCode: string): Promise<PrintJobResult> {
  const res = await fetch(`${BASE_URL}/api/agents/print`, {
    method: "POST",
    headers: { "Content-Type": "application/json", companycode: companyCode },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Print failed");
  }
  return res.json();
}

export function buildKitchenLines(
  orderNo: string,
  cartItems: any[],
  tableName?: string,
  restaurantInfo?: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
  },
  categoryName?: string,
  cashSaleNo?: string,
  servedBy?: string,
  paymentInfo?: {
    method?: string;
    paybill?: string;
    account?: string;
  }
): PrintLine[] {
  const lines: PrintLine[] = [];
  
  // Restaurant header
  if (restaurantInfo?.name) {
    lines.push({ type: "header", text: String(restaurantInfo.name).toUpperCase() });
  }
  if (restaurantInfo?.address) {
    lines.push({ type: "footer", text: String(restaurantInfo.address).toUpperCase() });
  }
  if (restaurantInfo?.phone) {
    lines.push({ type: "footer", text: `TELEPHONE NO - ${restaurantInfo.phone}` });
  }
  if (restaurantInfo?.email) {
    lines.push({ type: "footer", text: restaurantInfo.email });
  }
  
  lines.push({ type: "divider", text: "" });
  
  // Category name
  if (categoryName) {
    lines.push({ type: "header", text: categoryName.toUpperCase() });
  }
  
  lines.push({ type: "divider", text: "" });
  
  // Order details
  if (cashSaleNo) {
    lines.push({ type: "footer", text: `Cash Sale: #${cashSaleNo}` });
  }
  lines.push({ type: "footer", text: `Order No: #${orderNo}` });
  lines.push({ type: "footer", text: `Date: ${new Date().toLocaleString("en-KE")}` });
  
  lines.push({ type: "divider", text: "----------------------------------------" });
  lines.push({ type: "footer", text: "ITEM                    QTY" });
  lines.push({ type: "divider", text: "----------------------------------------" });
  
  // Items
  cartItems.forEach((item) => {
    const itemName = item?.product_id?.name ?? item?.product_name ?? item?.name ?? "Item";
    const qty = item.quantity ?? 1;
    lines.push({
      type: "item" as const,
      text: `${itemName.padEnd(20)} ${qty}`,
      qty: qty,
    });
    
    // Add notes if present
    if (item.notes) {
      lines.push({
        type: "footer" as const,
        text: `  Notes: ${item.notes}`,
      });
    }
  });
  
  lines.push({ type: "divider", text: "----------------------------------------" });
  
  // Served by
  if (servedBy) {
    lines.push({ type: "footer", text: `Served By                         ${servedBy}` });
  }
  
  lines.push({ type: "divider", text: "" });
  
  // Payment info
  if (paymentInfo?.method) {
    lines.push({ type: "footer", text: paymentInfo.method.toUpperCase() });
  }
  if (paymentInfo?.paybill) {
    lines.push({ type: "footer", text: `PAYBILL: ${paymentInfo.paybill}` });
  }
  if (paymentInfo?.account) {
    lines.push({ type: "footer", text: `ACCOUNT #: ${paymentInfo.account}` });
  }
  
  lines.push({ type: "divider", text: "" });
  lines.push({ type: "header", text: "END" });
  
  return lines;
}

export function buildReceiptLines(
  orderNo: string,
  cartItems: any[],
  totalAmount: number,
  tableName?: string
): PrintLine[] {
  return [
    { type: "header", text: "RECEIPT" },
    { type: "footer", text: new Date().toLocaleString("en-KE") },
    { type: "divider", text: "" },
    ...cartItems.map((item) => ({
      type: "item" as const,
      text: item?.product_id?.name ?? item?.product_name ?? item?.name ?? "Item",
      qty: item.quantity ?? 1,
      price: `KES ${((item.price ?? 0) * (item.quantity ?? 1)).toFixed(2)}`,
    })),
    { type: "divider", text: "" },
    { type: "total", text: `TOTAL: KES ${totalAmount.toFixed(2)}` },
    { type: "footer", text: `ORDER #${orderNo}` },
    ...(tableName ? [{ type: "footer" as const, text: `Table: ${tableName}` }] : []),
    { type: "footer", text: "Thank you!" },
  ];
}
