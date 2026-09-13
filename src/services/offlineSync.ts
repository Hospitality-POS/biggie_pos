import { useState, useEffect, useCallback } from "react";
import { message } from "antd";
import { db, OfflineOrder } from "../db/index";
import axiosInstance from "./request";
import { BASE_URL } from "@utils/config";

const ORDERS_CREATE_URL = `${BASE_URL}/orders/create`;

export const saveOfflineOrder = async (
  orderData: Omit<OfflineOrder, "id" | "status" | "createdAt">
): Promise<OfflineOrder> => {
  const offlineOrder: OfflineOrder = {
    ...orderData,
    offlineId: orderData.offlineId || `OFF-${Date.now()}`,
    status: "pending",
    createdAt: Date.now(),
  };

  const id = await db.offlineOrders.add(offlineOrder);
  offlineOrder.id = id;

  // Dispatch custom event so UI components can update badge counts
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("offline-orders-updated"));
  }

  return offlineOrder;
};

export const getPendingOfflineOrders = async (): Promise<OfflineOrder[]> => {
  return db.offlineOrders.where("status").equals("pending").toArray();
};

export const getPendingOfflineOrdersCount = async (): Promise<number> => {
  return db.offlineOrders.where("status").equals("pending").count();
};

export const syncPendingOrders = async (): Promise<{
  synced: number;
  failed: number;
}> => {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    message.warning("Cannot sync while offline. Please check your internet connection.");
    return { synced: 0, failed: 0 };
  }

  const pending = await getPendingOfflineOrders();
  if (pending.length === 0) {
    return { synced: 0, failed: 0 };
  }

  let synced = 0;
  let failed = 0;

  for (const order of pending) {
    if (!order.id) continue;

    try {
      await db.offlineOrders.update(order.id, { status: "syncing" });

      const payload = {
        table_id: order.tableId,
        order_no: order.orderNumber,
        order_amount: order.orderAmount,
        cart_id: order.cartId,
        method_id: order.methodId,
        cart_items: order.cartItems,
        customer_id: order.customerId,
        customer_name: order.customerName,
        customer_phone: order.customerPhone,
        customer_email: order.customerEmail,
      };

      const response = await axiosInstance.post(ORDERS_CREATE_URL, payload);

      if (response.status === 200 || response.status === 201) {
        await db.offlineOrders.update(order.id, {
          status: "synced",
          syncedAt: Date.now(),
        });
        synced++;
      } else {
        throw new Error(response.data?.message || "Sync failed with status " + response.status);
      }
    } catch (err: any) {
      console.error("Failed to sync offline order:", order.orderNumber, err);
      await db.offlineOrders.update(order.id, {
        status: "pending", // Revert to pending so it can be retried
        errorMessage: err.message || "Failed to sync order",
      });
      failed++;
    }
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("offline-orders-updated"));
  }

  if (synced > 0) {
    message.success(`Successfully synced ${synced} offline order${synced > 1 ? "s" : ""}!`);
  }
  if (failed > 0) {
    message.warning(`${failed} offline order${failed > 1 ? "s" : ""} could not be synced yet.`);
  }

  return { synced, failed };
};

export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await getPendingOfflineOrdersCount();
      setPendingCount(count);
    } catch (e) {
      console.error("Failed to count pending orders", e);
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      message.info("Internet connection restored. Syncing offline orders...");
      syncPendingOrders();
    };

    const handleOffline = () => {
      setIsOnline(false);
      message.warning("Working offline. New orders will be stored locally until reconnected.");
    };

    const handleUpdate = () => {
      refreshPendingCount();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("offline-orders-updated", handleUpdate);

    refreshPendingCount();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("offline-orders-updated", handleUpdate);
    };
  }, [refreshPendingCount]);

  const triggerSync = async () => {
    setIsSyncing(true);
    try {
      await syncPendingOrders();
      await refreshPendingCount();
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    isOnline,
    pendingCount,
    isSyncing,
    triggerSync,
  };
};

export default {
  saveOfflineOrder,
  getPendingOfflineOrders,
  getPendingOfflineOrdersCount,
  syncPendingOrders,
  useNetworkStatus,
};
