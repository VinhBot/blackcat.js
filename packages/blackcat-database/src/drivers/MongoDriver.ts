import { MongoClient, Db, Collection } from "mongodb";
import type { DatabaseDriver } from "../types";

/**
 * Cấu hình cho MongoDriver.
 */
interface MongoDriverOptions {
    /**
     * Chuỗi kết nối MongoDB.
     *
     * @default "mongodb://localhost:27017"
     */
    mongourl?: string;
    /**
     * Tên database MongoDB.
     *
     * @default "database"
     */
    databaseName?: string;
    /**
     * Tên collection lưu dữ liệu JSON.
     *
     * @default "json_store"
     */
    collectionName?: string;
}
/**
 * Schema document dùng để lưu trữ database trong MongoDB.
 */
interface DatabaseDocument<V = any> {
    _id: string;
    data: V;
}
/**
 * Driver lưu trữ dữ liệu bằng MongoDB.
 *
 * ⚠️ Đây **không phải database chính**.
 * Class này chỉ là **driver lưu trữ phụ trợ** cho class `Database`.
 *
 * Logic xử lý:
 * - parse key path
 * - validate dữ liệu
 * - cập nhật object
 *
 * sẽ được xử lý bởi class `Database`.
 *
 * `MongoDriver` chỉ chịu trách nhiệm:
 * - lưu toàn bộ database object
 * - trả về database object
 *
 * Toàn bộ database được lưu trong **một document duy nhất**.
 * 
 * @example 
 * ```ts
 * const database = new Database({ 
 *      driver: new MongoDriver({
 *          mongourl: "mongodb://localhost:27017", 
 *          databaseName: "mydb",  
 *          collectionName: "store" 
 *      })
 * });
 * ```
 */
export class MongoDriver implements DatabaseDriver {
    /**
     * MongoDB client instance.
     */
    private client: MongoClient;
    /**
     * MongoDB database instance.
     */
    private db!: Db;
    /**
     * Collection lưu dữ liệu JSON.
     */
    private collection!: Collection<DatabaseDocument>;
    /**
     * Tên database MongoDB.
     */
    private databaseName: string;
    /**
     * Tên collection MongoDB.
     */
    private collectionName: string;
    /**
     * Khởi tạo MongoDriver.
     *
     * @param options Cấu hình MongoDB driver.
     * 
     * @example 
     * ```ts
     * const database = new Database({ 
     *      driver: new MongoDriver({
     *          mongourl: "mongodb://localhost:27017", 
     *          databaseName: "mydb",  
     *          collectionName: "store" 
     *      })
     * });
     */
    constructor(options: MongoDriverOptions = {}) {
        const {
            mongourl = "mongodb://localhost:27017",
            databaseName = "database",
            collectionName = "json_store"
        } = options;
        this.client = new MongoClient(mongourl);
        this.databaseName = databaseName;
        this.collectionName = collectionName;
    }
    /**
     * Thiết lập kết nối MongoDB nếu chưa kết nối.
     */
    private async connect(): Promise<void> {
        if (!this.db) {
            await this.client.connect();
            this.db = this.client.db(this.databaseName);
            this.collection = this.db.collection(this.collectionName);
            const doc = await this.collection.findOne({ _id: "database" });
            if (!doc) {
                await this.collection.insertOne({
                    _id: "database",
                    data: {}
                });
            }
        }
    }
    /**
     * Lấy toàn bộ dữ liệu database từ MongoDB.
     */
    public async all<T = any>(): Promise<T> {
        await this.connect();
        const doc = await this.collection.findOne({ _id: "database" });
        return (doc?.data ?? {}) as T;
    }
    /**
     * Ghi toàn bộ database vào MongoDB.
     *
     * ⚠️ Method này **không xử lý key-path**.
     * Object database đã được xử lý bởi class `Database`.
     * 
     * @param data Toàn bộ object database
     */
    public async set<T = any>(data: T): Promise<T> {
        await this.connect();
        await this.collection.updateOne(
            { _id: "database" },
            { $set: { data } }
        );
        return data;
    }
    /**
     * Reset toàn bộ database về object rỗng.
     */
    public async delete(): Promise<boolean> {
        await this.connect();
        await this.collection.updateOne(
            { _id: "database" },
            { $set: { data: {} } }
        );
        return true;
    }
}