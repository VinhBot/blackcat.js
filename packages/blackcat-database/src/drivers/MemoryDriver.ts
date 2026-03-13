import { DatabaseDriver } from "../types";

/**
 * Driver lưu trữ dữ liệu trong RAM.
 *
 * ⚠️ Đây **không phải database chính**.
 * Class này chỉ là **storage driver phụ trợ** cho class `Database`.
 *
 * Toàn bộ logic xử lý:
 * - key path (`a.b.c`)
 * - validation
 * - update dữ liệu
 *
 * đều được thực hiện trong class `Database`.
 *
 * `MemoryDriver` chỉ chịu trách nhiệm:
 * - lưu trữ object database trong RAM
 * - trả về toàn bộ dữ liệu
 *
 * Dữ liệu sẽ **mất khi ứng dụng restart**.
 *
 * Phù hợp cho:
 * - testing
 * - cache runtime
 * - development
 * 
 * @example
 * ```ts
 * const database = new Database({
 *      driver: new MemoryDriver({
 *          users: {},
 *          guilds: {},
 *          settings: {
 *              prefix: "!"
 *          }
 *      })
 * });
 * ```
 * 
 *  hoặc 
 * 
 * ```ts
 * const database = new Database({
 *     driver: new MemoryDriver()
 * });
 * ```
 */
export class MemoryDriver implements DatabaseDriver {
    /**
     * Object chứa toàn bộ dữ liệu database trong RAM.
     */
    private store: Record<string, any>;
    /**
     * Khởi tạo MemoryDriver.
     *
     * @param initialData Dữ liệu khởi tạo ban đầu.
     * * @example
     * ```ts
     * const database = new Database({
     *      driver: new MemoryDriver({
     *          users: {},
     *          guilds: {},
     *          settings: {
     *              prefix: "!"
     *          }
     *      })
     * });
     * ```
     * 
     *  hoặc 
     * 
     * ```ts
     * const database = new Database({
     *     driver: new MemoryDriver()
     * });
     * ```
     */
    constructor(initialData: Record<string, any> = {}) {
        this.store = initialData;
    }
    /**
     * Trả về toàn bộ dữ liệu database.
     *
     * @template T Kiểu dữ liệu database.
     */
    public async all<T = any>(): Promise<T> {
        return this.store as T;
    }
    /**
     * Ghi toàn bộ database vào memory.
     *
     * ⚠️ Method này **không xử lý key-path**.
     * Dữ liệu đã được xử lý trước bởi `Database`.
     *
     * @param data Toàn bộ database object
     */
    public async set<T = any>(data: T): Promise<T> {
        this.store = data as any;
        return data;
    }
    /**
     * Xóa toàn bộ dữ liệu database trong memory.
     */
    public async delete(): Promise<boolean> {
        this.store = {};
        return true;
    }
}