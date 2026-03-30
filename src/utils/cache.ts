import { db } from "../../src/db/index";

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const setCache = async (key: string, data: unknown, ttlMs = DEFAULT_TTL_MS): Promise<void> => {
    await db.cache.put({
        key,
        data,
        expiresAt: Date.now() + ttlMs,
    });
};

export const getCache = async <T>(key: string): Promise<T | null> => {
    const entry = await db.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        await db.cache.delete(key);
        return null;
    }
    return entry.data as T;
};

export const deleteCache = async (key: string): Promise<void> => {
    await db.cache.delete(key);
};

export const clearCacheByPrefix = async (prefix: string): Promise<void> => {
    const keys = await db.cache
        .filter((entry) => entry.key.startsWith(prefix))
        .primaryKeys();
    await db.cache.bulkDelete(keys);
};

export const clearAllCache = async (): Promise<void> => {
    await db.cache.clear();
};