import { MongoClient, Db, Collection } from "mongodb";
import type { DatabaseDriver } from "../types";


/**
 * Context được truyền vào callback `onLoad` của MongoDriver.
 * @hidden
 */
interface MongoDriverOnLoadContext {
    /**
     * Instance MongoClient đã kết nối.
     */
    client: MongoClient;
    /**
     * Database hiện tại.
     */
    db: Db;
    /**
     * Collection đang được sử dụng.
     */
    collection: Collection<DatabaseDocument>;
    /**
     * Tên database.
     */
    databaseName: string;
    /**
     * Tên collection.
     */
    collectionName: string;
}

/**
 * Context được truyền vào callback `onError` của MongoDriver.
 * @hidden
 */
interface MongoDriverOnErrorContext {
    /**
     * Lỗi phát sinh.
     *
     * Có thể là bất kỳ kiểu nào (`unknown`),
     * nên cần type guard hoặc cast khi xử lý.
     */
    error: unknown;
    /**
     * Tên database tại thời điểm xảy ra lỗi.
     */
    databaseName: string;
    /**
     * Tên collection tại thời điểm xảy ra lỗi.
     */
    collectionName: string;
}

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
    /**
     * Callback khi kết nối thành công.
     */
    onLoad?: (ctx: MongoDriverOnLoadContext) => any;
    /**
     * Callback khi xảy ra lỗi.
     */
    onError?: (ctx: MongoDriverOnErrorContext) => any;
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
 * import { Database, MongoDriver } from "blackcat.js-database";
 * 
 * const database = new Database({ 
 *      driver: new MongoDriver({
 *          mongourl: "mongodb://localhost:27017", 
 *          databaseName: "mydb",  
 *          collectionName: "store",
 *          onLoad: ({ db, collection, databaseName }) => {
 *              console.log(`✅ Đã kết nối với cơ sở dữ liệu: ${databaseName}`);
 *              console.log(`📦 Bộ sưu tập: ${collection.collectionName}`);
 *          }, 
 *          onError: ({ error, databaseName }) => {
 *              console.error(`❌ Không thể kết nối với cơ sở dữ liệu: ${databaseName}`);
 *              console.error(error);
 *          }
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
     * Callback khi kết nối thành công.
     */
    onLoad?: (ctx: MongoDriverOnLoadContext) => any;
    /**
     * Callback khi xảy ra lỗi.
     */
    onError?: (ctx: MongoDriverOnErrorContext) => any;
    /**
     * Trạng thái đã gọi onLoad chưa (tránh spam)
     */
    private isLoaded = false;
    /**
     * Khởi tạo MongoDriver.
     *
     * @param options Cấu hình MongoDB driver.
     * 
     * @example 
     * ```ts
     * import { Database, MongoDriver } from "blackcat.js-database";
     * 
     * const database = new Database({ 
     *      driver: new MongoDriver({
     *          mongourl: "mongodb://localhost:27017", 
     *          databaseName: "mydb",  
     *          collectionName: "store",
     *          onLoad: ({ db, collection, databaseName }) => {
     *              console.log(`✅ Đã kết nối với cơ sở dữ liệu: ${databaseName}`);
     *              console.log(`📦 Bộ sưu tập: ${collection.collectionName}`);
     *          },
     *          onError: ({ error, databaseName }) => {
     *              console.error(`❌ Không thể kết nối với cơ sở dữ liệu: ${databaseName}`); 
     *              console.error(error);
     *          }
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
        this.onLoad = options.onLoad;
        this.onError = options.onError;
    }
    /**
     * Thiết lập kết nối MongoDB nếu chưa kết nối.
     */
    private async connect(): Promise<void> {
        if (!this.db) {
            try {
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
                if (!this.isLoaded) {
                    this.isLoaded = true;
                    this.onLoad?.({
                        client: this.client,
                        db: this.db,
                        collection: this.collection,
                        databaseName: this.databaseName,
                        collectionName: this.collectionName
                    });
                }
            } catch (error) {
                this.onError?.({
                    error: error,
                    databaseName: this.databaseName,
                    collectionName: this.collectionName
                });
                throw error;
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