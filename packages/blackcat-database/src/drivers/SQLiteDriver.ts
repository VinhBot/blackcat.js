import SQLite from "better-sqlite3";
import { DatabaseDriver } from "../types";

/**
 * Các tùy chọn cấu hình cho SQLiteDriver.
 * @hidden
 *
 * Interface này định nghĩa các thiết lập được sử dụng khi
 * khởi tạo driver SQLite cho hệ thống database.
 */
interface SQLiteDriverOptions {
    /**
     * Đường dẫn đến file cơ sở dữ liệu SQLite.
     *
     * Nếu không được cung cấp, driver có thể tạo
     * một file database mặc định tùy theo cách triển khai.
     *
     * Ví dụ:
     * `"./database.sqlite"`
     */
    filePath?: string;
    /**
     * Tên bảng được sử dụng để lưu trữ dữ liệu key-value.
     *
     * Nếu không được chỉ định, driver có thể sử dụng
     * một tên bảng mặc định (ví dụ: `"data"`).
     *
     * Ví dụ:
     * `"storage"`
     */
    table?: string;
}
/**
 * Driver lưu trữ dữ liệu bằng SQLite.
 *
 * ⚠️ Đây **không phải database chính**.
 * Class này chỉ là **driver lưu trữ phụ trợ** cho `Database`.
 *
 * Logic xử lý dữ liệu như:
 * - parse key path
 * - update object
 * - validation
 *
 * sẽ được thực hiện bởi class `Database`.
 *
 * Driver này chỉ:
 * - serialize database thành JSON
 * - lưu JSON vào SQLite
 * - trả về JSON khi đọc
 *
 * Toàn bộ database được lưu trong **một row duy nhất**.
 * 
 * @example
 * ```ts
 * const database = new Database({
 *      driver: new SQLiteDriver({
 *         filePath: "database.sqlite",
 *         table: "json_store"
 *      })
 * })
 * ```
 */
export class SQLiteDriver implements DatabaseDriver {
    /**
     * SQLite database instance.
     */
    private db: SQLite.Database;
    /**
     * Tên table lưu trữ dữ liệu JSON.
     */
    private table: string;
    /**
     * Khởi tạo SQLiteDriver.
     *
     * @param filePath Đường dẫn file SQLite
     * @param table Tên table lưu JSON database
     * @example
     * ```ts
     * const database = new Database({
     *      driver: new SQLiteDriver({
     *         filePath: "database.sqlite",
     *         table: "json_store"
     *      })
     * })
     * ```
     */
    constructor(options: SQLiteDriverOptions = {}) {
        this.db = new SQLite(options.filePath ?? "database.sqlite");
        this.table = options.table ?? "json_store";
        this.db.prepare(`CREATE TABLE IF NOT EXISTS ${this.table} (id INTEGER PRIMARY KEY, data TEXT)`).run();
        const row = this.db.prepare(`SELECT * FROM ${this.table} WHERE id = 1`).get();
        if (!row) {
            this.db.prepare(`INSERT INTO ${this.table} (id, data) VALUES (1, '{}')`).run();
        }
    }
    /**
     * Lấy toàn bộ dữ liệu database từ SQLite.
     *
     * @template T Kiểu dữ liệu database.
     */
    public async all<T = any>(): Promise<T> {
        const row = this.db.prepare(`SELECT data FROM ${this.table} WHERE id = 1`).get() as { data: string };
        return JSON.parse(row.data) as T;
    }
    /**
     * Ghi toàn bộ database vào SQLite.
     *
     * ⚠️ Method này **không xử lý key-path**.
     * `Database` đã cập nhật object trước khi truyền vào đây.
     *
     * @param data Toàn bộ database object
     */
    public async set<T = any>(data: T): Promise<T> {
        this.db.prepare(`UPDATE ${this.table} SET data = ? WHERE id = 1`).run(JSON.stringify(data));
        return data;
    }
    /**
     * Reset toàn bộ database.
     */
    public async delete(): Promise<boolean> {
        this.db.prepare(`UPDATE ${this.table} SET data = '{}' WHERE id = 1`).run();
        return true;
    }
}