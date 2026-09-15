import Dexie, { type Table } from "dexie";

export interface CacheEntry {
  key: string;
  data: unknown;
  expiresAt: number;
}

export interface OfflineOrder {
  id?: number;
  offlineId: string;
  orderNumber: string;
  cartId?: string;
  tableId?: string;
  orderAmount: number | number[];
  methodId: string | string[] | null;
  cartItems: any[];
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerId?: string | null;
  servedBy?: any;
  shopId?: string;
  status: "pending" | "syncing" | "synced" | "failed";
  createdAt: number;
  syncedAt?: number;
  errorMessage?: string;
}

export interface SyncQueueItem {
  id?: number;
  action: string;
  url: string;
  method: "POST" | "PUT" | "DELETE" | "PATCH";
  payload: any;
  createdAt: number;
  status: "pending" | "syncing" | "synced" | "failed";
  retries: number;
  error?: string;
}

class AppDB extends Dexie {
  cache!: Table<CacheEntry, string>;
  offlineOrders!: Table<OfflineOrder, number>;
  syncQueue!: Table<SyncQueueItem, number>;

  constructor() {
    super("biggieDB");
    this.version(1).stores({
      cache: "key, expiresAt",
    });
    this.version(2).stores({
      cache: "key, expiresAt",
      offlineOrders: "++id, offlineId, orderNumber, createdAt, status",
      syncQueue: "++id, action, createdAt, status",
    });
  }
}

export const db = new AppDB();