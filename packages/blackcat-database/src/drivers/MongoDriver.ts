import type { MongoClient, Db, Collection } from "mongodb";
import type { DatabaseDriver, PathReadResult } from "../types";
import { loadModule } from "../utils/loadModule";

/**
 * Ngữ cảnh truyền vào callback `onLoad` khi kết nối MongoDB thành công.
 */
interface MongoDriverOnLoadContext {
    client: MongoClient;
    db: Db;
    collection: Collection<DatabaseDocument>;
    databaseName: string;
    collectionName: string;
}

/**
 * Ngữ cảnh truyền vào callback `onError` khi kết nối MongoDB thất bại.
 */
interface MongoDriverOnErrorContext {
    error: unknown;
    databaseName: string;
    collectionName: string;
}

/**
 * Tùy chọn khởi tạo {@link MongoDriver}.
 */
interface MongoDriverOptions {
    /**
     * Chuỗi kết nối MongoDB.
     *
     * @default "mongodb://localhost:27017"
     */
    mongourl?: string;
    /**
     * Tên database.
     *
     * @default "database"
     */
    databaseName?: string;
    /**
     * Tên collection lưu dữ liệu.
     *
     * @default "json_store"
     */
    collectionName?: string;
    /**
     * Được gọi **một lần** khi kết nối thành công.
     */
    onLoad?: (ctx: MongoDriverOnLoadContext) => any;
    /**
     * Được gọi khi kết nối thất bại.
     */
    onError?: (ctx: MongoDriverOnErrorContext) => any;
}

interface DatabaseDocument<V = any> {
    _id: string;
    data: V;
}

const DOCUMENT_ID = "database";

/**
 * Driver lưu trữ dữ liệu bằng MongoDB.
 *
 * ⚠️ Đây **không phải database chính**, chỉ là **driver lưu trữ** cho `Database`.
 * Toàn bộ database được lưu trong **một document** (`_id: "database"`).
 * Với `get`/`set` theo key, driver dùng projection và `$set` theo path nên không phải
 * đọc/ghi cả document.
 *
 * `mongodb` là **optional dependency**: chỉ được nạp khi driver thực sự được dùng.
 * Kết nối được tạo ở thao tác đầu tiên và chỉ tạo **một lần** dù có nhiều lời gọi song song.
 *
 * @example
 * ```ts
 * const database = new Database({
 *     driver: new MongoDriver({
 *         mongourl: "mongodb://localhost:27017",
 *         databaseName: "mybot",
 *         collectionName: "json_store"
 *     })
 * });
 * ```
 */
export class MongoDriver implements DatabaseDriver {
    private client?: MongoClient;
    private collection!: Collection<DatabaseDocument>;
    private db?: Db;
    private mongourl: string;
    private databaseName: string;
    private collectionName: string;
    /**
     * Callback khi kết nối thành công.
     */
    onLoad?: (ctx: MongoDriverOnLoadContext) => any;
    /**
     * Callback khi kết nối thất bại.
     */
    onError?: (ctx: MongoDriverOnErrorContext) => any;
    private isLoaded = false;
    private connecting?: Promise<void>;

    /**
     * Khởi tạo MongoDriver.
     *
     * @param options Cấu hình driver.
     */
    constructor(options: MongoDriverOptions = {}) {
        const {
            mongourl = "mongodb://localhost:27017",
            databaseName = "database",
            collectionName = "json_store"
        } = options;
        this.mongourl = mongourl;
        this.databaseName = databaseName;
        this.collectionName = collectionName;
        this.onLoad = options.onLoad;
        this.onError = options.onError;
    }

    private connect(): Promise<void> {
        this.connecting ??= this.doConnect().catch((error) => {
            this.connecting = undefined;
            throw error;
        });
        return this.connecting;
    }

    private async doConnect(): Promise<void> {
        try {
            const lib = await loadModule<any>("mongodb");
            const MongoClientCtor = lib.MongoClient ?? lib.default?.MongoClient;
            const client: MongoClient = new MongoClientCtor(this.mongourl);
            await client.connect();
            this.client = client;
            this.db = client.db(this.databaseName);
            this.collection = this.db.collection<DatabaseDocument>(this.collectionName);
            // Một lệnh duy nhất thay cho "findOne rồi insertOne" (tránh race khi nhiều tiến trình khởi động cùng lúc).
            await this.collection.updateOne(
                { _id: DOCUMENT_ID },
                { $setOnInsert: { data: {} } },
                { upsert: true }
            );
            if (!this.isLoaded) {
                this.isLoaded = true;
                this.onLoad?.({
                    client,
                    db: this.db,
                    collection: this.collection,
                    databaseName: this.databaseName,
                    collectionName: this.collectionName
                });
            }
        } catch (error) {
            this.onError?.({
                error,
                databaseName: this.databaseName,
                collectionName: this.collectionName
            });
            throw error;
        }
    }

    private safeField(parts: string[]): string | null {
        const ok = parts.length > 0 && parts.every((part) => part.length > 0 && !part.includes(".") && !part.startsWith("$") && !part.includes("\u0000"));
        return ok ? `data.${parts.join(".")}` : null;
    }

    /**
     * Kết nối tới MongoDB (an toàn khi gọi nhiều lần).
     */
    public async init(): Promise<void> {
        await this.connect();
    }

    /**
     * Lấy toàn bộ dữ liệu database.
     *
     * @template T Kiểu dữ liệu database.
     */
    public async all<T = any>(): Promise<T> {
        await this.connect();
        const doc = await this.collection.findOne({ _id: DOCUMENT_ID });
        return (doc?.data ?? {}) as T;
    }

    /**
     * Ghi toàn bộ database.
     *
     * @param data Toàn bộ database object.
     */
    public async set<T = any>(data: T): Promise<T> {
        await this.connect();
        await this.collection.updateOne(
            { _id: DOCUMENT_ID },
            { $set: { data } },
            { upsert: true }
        );
        return data;
    }

    /**
     * Reset toàn bộ database về `{}`.
     */
    public async delete(): Promise<boolean> {
        await this.connect();
        await this.collection.updateOne(
            { _id: DOCUMENT_ID },
            { $set: { data: {} } },
            { upsert: true }
        );
        return true;
    }

    /**
     * Đường nhanh: đọc một giá trị theo path bằng projection.
     */
    public async getPath(parts: string[]): Promise<PathReadResult | undefined> {
        const field = this.safeField(parts);
        if (!field) return undefined;
        await this.connect();
        const doc = await this.collection.findOne({ _id: DOCUMENT_ID }, { projection: { [field]: 1 } });
        if (!doc) return undefined;
        let current: any = doc.data;
        for (const part of parts) {
            // Projection trên mảng trả về cấu trúc khác → để Database tự xử lý để chắc chắn.
            if (Array.isArray(current)) return undefined;
            if (current === null || typeof current !== "object" || !Object.prototype.hasOwnProperty.call(current, part)) {
                return { found: false };
            }
            current = current[part];
        }
        return { found: true, value: current };
    }

    /**
     * Đường nhanh: ghi một giá trị theo path bằng `$set`.
     * Trả `false` (để `Database` ghi theo cách thông thường) nếu path không hợp lệ hoặc Mongo từ chối.
     */
    public async setPath(parts: string[], value: unknown): Promise<boolean> {
        const field = this.safeField(parts);
        if (!field || value === undefined) return false;
        await this.connect();
        try {
            const result = await this.collection.updateOne({ _id: DOCUMENT_ID }, { $set: { [field]: value } });
            return result.matchedCount === 1;
        } catch {
            return false;
        }
    }

    /**
     * Đóng kết nối MongoDB.
     */
    public async close(): Promise<void> {
        const client = this.client;
        this.client = undefined;
        this.db = undefined;
        this.connecting = undefined;
        await client?.close();
    }
}
