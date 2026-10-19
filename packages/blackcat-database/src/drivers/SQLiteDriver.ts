import type { DatabaseDriver, PathReadResult } from "../types";
import { BlackCatError } from "../utils/BlackCatError";
import { loadModule } from "../utils/loadModule";

interface SqliteStatement {
    get(...params: any[]): any;
    run(...params: any[]): { changes: number };
}
interface SqliteDatabase {
    prepare(sql: string): SqliteStatement;
    pragma(source: string): unknown;
    close(): void;
}

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
     * Ví dụ:
     * `"./database.sqlite"`
     */
    filePath?: string;
    /**
     * Tên bảng được sử dụng để lưu trữ dữ liệu key-value.
     * Chỉ chấp nhận chữ cái, chữ số và dấu gạch dưới.
     *
     * Ví dụ:
     * `"storage"`
     */
    table?: string;
    /**
     * Bật chế độ WAL (ghi nhanh hơn, đọc/ghi không chặn nhau).
     *
     * @default true
     */
    wal?: boolean;
    /**
     * Mức đồng bộ ghi xuống đĩa.
     *
     * @default "NORMAL"
     */
    synchronous?: "OFF" | "NORMAL" | "FULL";
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
 * Toàn bộ database được lưu trong **một row duy nhất**. Với `get`/`set` theo key,
 * driver dùng hàm JSON của SQLite (`json_extract`, `json_set`) để không phải đọc/ghi cả database.
 *
 * `better-sqlite3` là **optional dependency**: chỉ được nạp khi bạn thực sự dùng driver này.
 * Việc mở file được thực hiện ở thao tác đầu tiên (lỗi mở file sẽ được ném ra ở đó).
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
    private db?: SqliteDatabase;
    private table: string;
    private ready: Promise<void>;
    private nativePaths = false;
    private stmts!: {
        get: SqliteStatement;
        set: SqliteStatement;
        reset: SqliteStatement;
        read?: SqliteStatement;
        write?: SqliteStatement;
    };
    /**
     * Khởi tạo SQLiteDriver.
     *
     * @param options Cấu hình driver.
     */
    constructor(options: SQLiteDriverOptions = {}) {
        this.table = options.table ?? "json_store";
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(this.table)) {
            throw new BlackCatError("INVALID_OPTION", "table", "chỉ được chứa chữ cái, chữ số, dấu gạch dưới và không bắt đầu bằng số");
        }
        this.ready = this.open(options);
        this.ready.catch(() => undefined);
    }
    private async open(options: SQLiteDriverOptions): Promise<void> {
        const Sqlite = await loadModule<new (file: string) => SqliteDatabase>("better-sqlite3");
        const filePath = options.filePath ?? "database.sqlite";
        const db = new Sqlite(filePath);
        if ((options.wal ?? true) && filePath !== ":memory:") db.pragma("journal_mode = WAL");
        db.pragma(`synchronous = ${options.synchronous ?? "NORMAL"}`);
        const table = `"${this.table}"`;
        db.prepare(`CREATE TABLE IF NOT EXISTS ${table} (id INTEGER PRIMARY KEY, data TEXT)`).run();
        db.prepare(`INSERT OR IGNORE INTO ${table} (id, data) VALUES (1, '{}')`).run();
        this.stmts = {
            get: db.prepare(`SELECT data FROM ${table} WHERE id = 1`),
            set: db.prepare(`UPDATE ${table} SET data = ? WHERE id = 1`),
            reset: db.prepare(`UPDATE ${table} SET data = '{}' WHERE id = 1`)
        };
        try {
            this.stmts.read = db.prepare(`SELECT json_type(data, @path) AS type, json_extract(data, @path) AS value FROM ${table} WHERE id = 1`);
            this.stmts.write = db.prepare(`UPDATE ${table} SET data = json_set(data, @path, json(@value)) WHERE id = 1 AND json_type(data, @parent) = 'object'`);
            this.nativePaths = true;
        } catch {
            this.nativePaths = false; // SQLite không có JSON1 → dùng cách đọc/ghi toàn bộ.
        }
        this.db = db;
    }
    private jsonPath(parts: string[]): string | null {
        if (parts.some((part) => part.length === 0 || /["\\\u0000-\u001f]/.test(part))) return null;
        return "$" + parts.map((part) => `."${part}"`).join("");
    }
    /**
     * Khởi tạo driver (mở file, tạo bảng).
     */
    public async init(): Promise<void> {
        await this.ready;
    }
    /**
     * Lấy toàn bộ dữ liệu database từ SQLite.
     *
     * @template T Kiểu dữ liệu database.
     */
    public async all<T = any>(): Promise<T> {
        await this.ready;
        const row = this.stmts.get.get() as { data: string } | undefined;
        return JSON.parse(row?.data ?? "{}") as T;
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
        const json = JSON.stringify(data);
        await this.ready;
        this.stmts.set.run(json);
        return data;
    }
    /**
     * Reset toàn bộ database.
     */
    public async delete(): Promise<boolean> {
        await this.ready;
        this.stmts.reset.run();
        return true;
    }
    /**
     * Đường nhanh: đọc một giá trị theo path bằng `json_extract`.
     */
    public async getPath(parts: string[]): Promise<PathReadResult | undefined> {
        await this.ready;
        const path = this.nativePaths ? this.jsonPath(parts) : null;
        if (!path || !this.stmts.read) return undefined;
        const row = this.stmts.read.get({ path }) as { type: string | null; value: unknown } | undefined;
        if (!row) return undefined;
        switch (row.type) {
            case null:
                // Path số có thể là index của mảng → để Database tự xử lý để chắc chắn.
                return parts.some((part) => /^\d+$/.test(part)) ? undefined : { found: false };
            case "null": return { found: true, value: null };
            case "true": return { found: true, value: true };
            case "false": return { found: true, value: false };
            case "array":
            case "object": return { found: true, value: JSON.parse(String(row.value)) };
            default: return { found: true, value: row.value };
        }
    }
    /**
     * Đường nhanh: ghi một giá trị theo path bằng `json_set`.
     * Chỉ áp dụng khi object cha đã tồn tại; ngược lại trả `false` để `Database` ghi theo cách thông thường.
     */
    public async setPath(parts: string[], value: unknown): Promise<boolean> {
        await this.ready;
        const path = this.nativePaths ? this.jsonPath(parts) : null;
        const parent = this.nativePaths ? this.jsonPath(parts.slice(0, -1)) : null;
        const json = JSON.stringify(value);
        if (!path || !parent || typeof json !== "string" || !this.stmts.write) return false;
        return this.stmts.write.run({ path, parent, value: json }).changes === 1;
    }
    /**
     * Đóng kết nối SQLite.
     */
    public async close(): Promise<void> {
        await this.ready.catch(() => undefined);
        this.db?.close();
        this.db = undefined;
    }
}
