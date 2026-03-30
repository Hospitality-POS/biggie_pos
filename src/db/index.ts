import Dexie, { type Table } from "dexie";

export interface CacheEntry {
    key: string;
    data: unknown;
    expiresAt: number;
}

class AppDB extends Dexie {
    cache!: Table<CacheEntry, string>;

    constructor() {
        super("biggieDB");
        this.version(1).stores({
            cache: "key, expiresAt",
        });
    }
}

export const db = new AppDB();