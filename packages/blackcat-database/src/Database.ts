import { EventEmitter } from "node:events";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import type {
    DatabaseConfiguration, AutocompletableString, If, IsObject, ObjectPath, ObjectValue, Maybe, QueryFunction,
    RestOrArray, ExtractFromArray, DatabaseDriver, ArrayElement, DatabaseEvents, SetOptions, Query, FindOptions,
    PaginateOptions, Page, IterateOptions, AutoBackupOptions, UniqueBy, ValidatorContext
} from "./types";
import {
    BlackCatError, AsyncQueue, isObject, typeOf, isNumber, deepEqual, clone, fillDefaults, hasOwn, isContainer,
    getByPath, setByPath, deleteByPath, hasUnsafeSegment, matchesQuery, buildComparator, applyUpdate, applyNumber,
    assertAmount, applyInsert, applyReplaceAt, applyRemoveAt, resolveArray
} from "./utils";
import { ScopedDatabase } from "./ScopedDatabase";

export type { DatabaseDriver } from "./types";

/**
 * Kết quả của một thao tác ghi: `changed = false` nghĩa là không cần ghi xuống driver.
 */
type Mutation<T> = { result: T; changed: boolean; value?: unknown };

/**
 * Class Database cung cấp API thao tác dữ liệu dạng key-path
 * trên nhiều loại storage khác nhau thông qua `DatabaseDriver`.
 *
 * Mọi thao tác đều được xếp vào **một hàng đợi tuần tự**, nên các lệnh gọi song song
 * (ví dụ nhiều event cùng `add()` một key) không bị mất dữ liệu.
 * Mỗi thao tác ghi chỉ đọc **một lần** và ghi **một lần** xuống driver.
 *
 * @template V Kiểu dữ liệu tổng thể của database.
 *
 * @example
 * ```ts
 * const db = new Database<Schema>({
 *   driver: new JSONDriver({ filePath: "./database.json" }),
 * });
 * await db.set("guild.123.prefix", "!");
 * ```
 */
export class Database<V = any> {
    /**
     * Storage driver được sử dụng để đọc và ghi dữ liệu database.
     */
    public driver: DatabaseDriver;
    /**
     * Ký tự phân tách key path.
     */
    public readonly delimiter: string;

    private readonly config: DatabaseConfiguration;
    private readonly ttlKey: string;
    private readonly queue = new AsyncQueue();
    private readonly emitter = new EventEmitter();
    private driverReady = false;
    private initialized = false;
    private hasTTL = false;
    private sweeper?: ReturnType<typeof setInterval>;
    private backupTimer?: ReturnType<typeof setInterval>;
    private reads = 0;
    private writes = 0;
    private closed = false;

    /**
     * Khởi tạo Database instance.
     *
     * @param options Cấu hình database, xem {@link DatabaseConfiguration}.
     *
     * @example
     * ```ts
     * const db = new Database({
     *   driver: new JSONDriver({ filePath: "./database.json" }),
     *   cloneOnRead: false,
     *   defaults: { settings: { prefix: "!" } },
     * });
     * ```
     */
    constructor(options: DatabaseConfiguration) {
        if (!options?.driver) {
            throw new BlackCatError("REQUIRED_PARAMETER_MISSING", "driver");
        }
        this.driver = options.driver;
        this.config = options;
        this.delimiter = options.delimiter || ".";
        this.ttlKey = options.ttlKey ?? "__blackcat_ttl__";
        if (options.autoBackup) this.startAutoBackup(options.autoBackup);
    }

    private emitSafe(event: string, payload?: unknown): void {
        if (event === "error" && this.emitter.listenerCount("error") === 0) return;
        try {
            this.emitter.emit(event, payload);
        } catch (e) {
            // Lỗi trong listener của người dùng không được làm hỏng thao tác database.
        }
    }

    private notify(operation: string, key?: string, value?: unknown): void {
        const payload = { operation, key, value };
        this.emitSafe("change", payload);
        if (operation === "set" || operation === "update" || operation === "delete" || operation === "clear") {
            this.emitSafe(operation, payload);
        }
    }

    private async load(): Promise<Record<string, any>> {
        this.reads++;
        const data = await this.driver.all<any>();
        const root: Record<string, any> = isContainer(data) && !Array.isArray(data) ? data : {};
        if (this.hasTTL) {
            const expired = this.purgeExpired(root);
            if (expired.length) {
                await this.save(root);
                for (const key of expired) this.emitSafe("expire", { key });
            }
        }
        return root;
    }

    private async save(root: Record<string, any>): Promise<void> {
        this.writes++;
        await this.driver.set(root);
    }

    private async ensureReady(): Promise<void> {
        if (this.initialized) return;
        if (!this.driverReady) {
            await this.driver.init?.();
            this.driverReady = true;
        }
        const root = await this.load();
        let dirty = false;
        if (this.config.defaults && fillDefaults(root, this.config.defaults)) dirty = true;
        const map = this.ttlMap(root);
        if (map && Object.keys(map).length) {
            this.hasTTL = true;
            this.startSweeper();
            if (this.purgeExpired(root).length) dirty = true;
        }
        if (dirty) await this.save(root);
        this.initialized = true;
    }

    private exec<T>(operation: string, key: string | undefined, task: () => Promise<T>): Promise<T> {
        return this.queue.run(async () => {
            const startReads = this.reads;
            const startWrites = this.writes;
            const start = process.hrtime.bigint();
            try {
                await this.ensureReady();
                const result = await task();
                if (this.config.debug) {
                    const ms = Number(process.hrtime.bigint() - start) / 1e6;
                    console.debug(`[blackcat.js-database] ${operation}${key ? ` "${key}"` : ""} - ${ms.toFixed(2)}ms (read: ${this.reads - startReads}, write: ${this.writes - startWrites})`);
                }
                return result;
            } catch (error) {
                this.emitSafe("error", error);
                throw error;
            }
        });
    }

    private read<T>(operation: string, key: string | undefined, fn: (root: Record<string, any>) => T | Promise<T>): Promise<T> {
        return this.exec(operation, key, async () => fn(await this.load()));
    }

    private mutate<T>(operation: string, key: string | undefined, fn: (root: Record<string, any>) => Mutation<T> | Promise<Mutation<T>>): Promise<T> {
        return this.exec(operation, key, async () => {
            const root = await this.load();
            const mutation = await fn(root);
            if (mutation.changed) {
                await this.save(root);
                this.notify(operation, key, mutation.value);
            }
            return mutation.result;
        });
    }

    private out<T>(value: T): T {
        return this.config.cloneOnRead ? clone(value) : value;
    }

    private visible(root: Record<string, any>): Record<string, any> {
        if (this.hasTTL && hasOwn(root, this.ttlKey)) {
            const { [this.ttlKey]: _hidden, ...rest } = root;
            return rest;
        }
        return root;
    }

    /**
     * Tách key thành các segment (dùng cho thao tác ghi): validate kiểu và chặn segment nguy hiểm.
     */
    private parseKey(key: unknown): string[] {
        if (key === undefined || key === null || key === "") {
            throw new BlackCatError("REQUIRED_PARAMETER_MISSING", "key");
        }
        if (typeof key !== "string") {
            throw new BlackCatError("INVALID_TYPE", "key", "string", typeOf(key));
        }
        const parts = key.split(this.delimiter);
        if (hasUnsafeSegment(parts)) {
            throw new BlackCatError("UNSAFE_KEY", key);
        }
        return parts;
    }

    private lookup(root: Record<string, any>, key: string | undefined): any {
        if (!key) return this.visible(root);
        const parts = key.split(this.delimiter);
        if (hasUnsafeSegment(parts)) return null;
        const value = getByPath(root, parts);
        return value === undefined ? null : value;
    }

    /**
     * Đọc giá trị theo key, dùng đường nhanh của driver (nếu có) để tránh đọc toàn bộ database.
     */
    private async fetch(key: string | undefined): Promise<any> {
        if (!key) return this.visible(await this.load());
        const parts = key.split(this.delimiter);
        if (hasUnsafeSegment(parts)) return null;
        if (this.driver.getPath && !this.hasTTL) {
            const result = await this.driver.getPath(parts);
            if (result) {
                this.reads++;
                return result.found ? (result.value ?? null) : null;
            }
        }
        const value = getByPath(await this.load(), parts);
        return value === undefined ? null : value;
    }

    private validate(key: string, value: unknown, operation: ValidatorContext["operation"]): void {
        const verdict = this.config.validator?.({ key, value, operation });
        if (verdict === false) throw new BlackCatError("VALIDATION_FAILED", key, "validator từ chối giá trị");
        if (typeof verdict === "string" && verdict) throw new BlackCatError("VALIDATION_FAILED", key, verdict);
    }

    private parseTTL(ttl: unknown): number | undefined {
        if (ttl === undefined) return undefined;
        if (typeof ttl !== "number" || !Number.isFinite(ttl) || ttl <= 0) {
            throw new BlackCatError("INVALID_OPTION", "ttl", "phải là số dương (ms)");
        }
        return ttl;
    }

    private ttlMap(root: Record<string, any>): Record<string, number> | undefined {
        const map = root[this.ttlKey];
        return isObject(map) ? map : undefined;
    }

    private purgeExpired(root: Record<string, any>): string[] {
        const map = this.ttlMap(root);
        if (!map) return [];
        const now = Date.now();
        const expired = Object.keys(map).filter((key) => typeof map[key] === "number" && map[key] <= now);
        if (!expired.length) return [];
        for (const key of expired) {
            deleteByPath(root, key.split(this.delimiter));
            delete map[key];
        }
        if (!Object.keys(map).length) {
            delete root[this.ttlKey];
            this.hasTTL = false;
            this.stopSweeper();
        }
        return expired;
    }

    private updateTTL(root: Record<string, any>, key: string, ttl?: number): void {
        if (ttl === undefined) {
            const map = this.ttlMap(root);
            if (!map) return;
            const prefix = key + this.delimiter;
            for (const entry of Object.keys(map)) {
                if (entry === key || entry.startsWith(prefix)) delete map[entry];
            }
            if (!Object.keys(map).length) {
                delete root[this.ttlKey];
                this.hasTTL = false;
                this.stopSweeper();
            }
            return;
        }
        const map = this.ttlMap(root) ?? (root[this.ttlKey] = {});
        map[key] = Date.now() + ttl;
        this.hasTTL = true;
        this.startSweeper();
    }

    private startSweeper(): void {
        const every = this.config.ttlSweepInterval ?? 60_000;
        if (this.sweeper || every <= 0 || this.closed) return;
        this.sweeper = setInterval(() => {
            this.exec("sweep", undefined, async () => { await this.load(); }).catch(() => undefined);
        }, every);
        this.sweeper.unref?.();
    }

    private stopSweeper(): void {
        if (this.sweeper) clearInterval(this.sweeper);
        this.sweeper = undefined;
    }

    private startAutoBackup(options: AutoBackupOptions): void {
        const every = options.every ?? 3_600_000;
        this.backupTimer = setInterval(() => {
            this.backup(options).catch((error) => this.emitSafe("error", error));
        }, every);
        this.backupTimer.unref?.();
    }

    private resetState(): void {
        this.hasTTL = false;
        this.stopSweeper();
        this.initialized = false;
    }

    /**
     * Lắng nghe sự kiện: `change`, `set`, `update`, `delete`, `clear`, `expire`, `error`.
     *
     * @example
     * ```ts
     * db.on("set", ({ key, value }) => console.log(key, value));
     * db.on("expire", ({ key }) => console.log(`${key} đã hết hạn`));
     * ```
     */
    public on<K extends keyof DatabaseEvents>(event: K, listener: (payload: DatabaseEvents[K]) => void): this {
        this.emitter.on(event, listener as (...args: any[]) => void);
        return this;
    }
    /**
     * Lắng nghe sự kiện một lần.
     */
    public once<K extends keyof DatabaseEvents>(event: K, listener: (payload: DatabaseEvents[K]) => void): this {
        this.emitter.once(event, listener as (...args: any[]) => void);
        return this;
    }
    /**
     * Hủy lắng nghe sự kiện.
     */
    public off<K extends keyof DatabaseEvents>(event: K, listener: (payload: DatabaseEvents[K]) => void): this {
        this.emitter.off(event, listener as (...args: any[]) => void);
        return this;
    }
    /**
     * Số lần đọc/ghi đã thực hiện xuống driver (hữu ích để đo hiệu quả tối ưu).
     */
    public get stats(): { reads: number; writes: number; queued: number } {
        return {
            reads: this.reads,
            writes: this.writes,
            queued: this.queue.size
        };
    }
    /**
     * Khởi tạo driver và áp dụng `defaults` ngay (không bắt buộc, vì database tự khởi tạo ở lần dùng đầu tiên).
     */
    public async init(): Promise<void> {
        await this.exec("init", undefined, async () => undefined);
    }
    /**
     * Ghi mọi dữ liệu đang chờ xuống storage (với driver có cache như {@link CachedDriver}).
     */
    public async flush(): Promise<void> {
        await this.queue.run(async () => {
            await this.driver.flush?.();
        });
    }
    /**
     * Dừng timer nền, flush dữ liệu và đóng driver. Nên gọi khi tắt ứng dụng.
     */
    public async close(): Promise<void> {
        if (this.closed) return;
        this.closed = true;
        if (this.backupTimer) clearInterval(this.backupTimer);
        this.stopSweeper();
        await this.queue.run(async () => {
            await this.driver.flush?.();
            await this.driver.close?.();
        });
    }
    /**
     * Tạo một database con có tiền tố key cố định.
     *
     * @example
     * ```ts
     * const guild = db.scope("guilds.123");
     * await guild.set("prefix", "!");        // = db.set("guilds.123.prefix", "!")
     * await guild.get("members.456.xp");
     * ```
     */
    public scope<S = any>(prefix: string): ScopedDatabase<S> {
        return new ScopedDatabase<S>(this, prefix);
    }
    /**
     * Lấy toàn bộ dữ liệu từ database thông qua driver.
     *
     * @returns Promise chứa toàn bộ dữ liệu database.
     *
     * @example
     * ```ts
     * const data = await db.all();
     * ```
     */
    public async all(): Promise<V> {
        return this.exec("all", undefined, async () => this.out(this.visible(await this.load()) as V));
    }
    /**
     * Lấy giá trị từ database theo key-path.
     *
     * Nếu không truyền `key`, method sẽ trả về **toàn bộ database**.
     * Nếu driver hỗ trợ `getPath` (SQLite, Mongo), chỉ giá trị cần thiết được đọc.
     *
     * @returns Giá trị tại key hoặc `null` nếu không tồn tại.
     *
     * @example
     * ```ts
     * const name = await db.get("user.profile.name");
     * const all = await db.get();
     * ```
     */
    public async get<P extends AutocompletableString<ObjectPath<V>>>(key?: AutocompletableString<P>): Promise<Maybe<ObjectValue<V, P>>> {
        if (key && typeof key !== "string") {
            throw new BlackCatError("INVALID_TYPE", "key", "string", typeOf(key));
        }
        return this.exec("get", key, async () => this.out(await this.fetch(key)));
    }

    /**
     * Tìm một bản ghi đầu tiên khớp điều kiện trong mảng tại `key`.
     * Nếu không truyền `query`, hoạt động như `get()`.
     *
     * `query` mặc định so sánh `==`; có thể dùng toán tử `$gt`, `$gte`, `$lt`, `$lte`, `$ne`, `$in`, `$nin`, `$exists`, `$regex`.
     *
     * @example
     * ```ts
     * await db.findOne("users", { id: 1 });
     * await db.findOne("users", { coins: { $gte: 100 } });
     * ```
     */
    public async findOne<P extends AutocompletableString<ObjectPath<V>>>(key?: AutocompletableString<P>, query?: Query<ArrayElement<ObjectValue<V, P>>>): Promise<Maybe<ObjectValue<V, P>>> {
        if (key && typeof key !== "string") {
            throw new BlackCatError("INVALID_TYPE", "key", "string", typeOf(key));
        }
        return this.exec("findOne", key, async () => {
            const data = await this.fetch(key);
            if (!query) return this.out(data);
            if (!Array.isArray(data)) return null;
            return this.out(data.find((item) => matchesQuery(item, query)) ?? null);
        });
    }

    /**
     * Tìm **tất cả** bản ghi khớp điều kiện, có thể sắp xếp và phân trang bằng `skip`/`limit`.
     *
     * @example
     * ```ts
     * const top = await db.findMany("users", { coins: { $gt: 0 } }, { sort: { coins: -1 }, limit: 10 });
     * ```
     */
    public async findMany<P extends AutocompletableString<ObjectPath<V>>>(key: AutocompletableString<P>, query?: Query<ArrayElement<ObjectValue<V, P>>>, options: FindOptions<ArrayElement<ObjectValue<V, P>>> = {}): Promise<ArrayElement<ObjectValue<V, P>>[]> {
        return this.exec("findMany", key, async () => {
            const data = await this.fetch(key);
            if (!Array.isArray(data)) return [];
            let items = query ? data.filter((item) => matchesQuery(item, query)) : [...data];
            if (options.sort) items.sort(buildComparator(options.sort));
            const skip = Math.max(0, options.skip ?? 0);
            if (skip || options.limit !== undefined) {
                items = items.slice(skip, options.limit === undefined ? undefined : skip + Math.max(0, options.limit));
            }
            return this.out(items);
        });
    }

    /**
     * Đếm số phần tử: với mảng là số phần tử khớp `query` (hoặc độ dài), với object là số key.
     *
     * @example
     * ```ts
     * await db.count("users", { coins: { $gt: 100 } });
     * ```
     */
    public async count<P extends AutocompletableString<ObjectPath<V>>>(key?: AutocompletableString<P>, query?: Query<ArrayElement<ObjectValue<V, P>>>): Promise<number> {
        return this.exec("count", key, async () => {
            const data = await this.fetch(key);
            if (Array.isArray(data)) return query ? data.filter((item) => matchesQuery(item, query)).length : data.length;
            return isObject(data) ? Object.keys(data).length : 0;
        });
    }

    /**
     * Phân trang một mảng (thường dùng cho bảng xếp hạng).
     *
     * @example
     * ```ts
     * const page = await db.paginate("users", { page: 2, pageSize: 10, sort: { coins: -1 } });
     * ```
     */
    public async paginate<P extends AutocompletableString<ObjectPath<V>>>(key: AutocompletableString<P>, options: PaginateOptions<ArrayElement<ObjectValue<V, P>>> = {}): Promise<Page<ArrayElement<ObjectValue<V, P>>>> {
        const page = options.page ?? 1;
        const pageSize = options.pageSize ?? 10;
        if (!Number.isInteger(page) || page < 1) throw new BlackCatError("INVALID_OPTION", "page", "phải là số nguyên >= 1");
        if (!Number.isInteger(pageSize) || pageSize < 1) throw new BlackCatError("INVALID_OPTION", "pageSize", "phải là số nguyên >= 1");
        return this.exec("paginate", key, async () => {
            const data = await this.fetch(key);
            let items: any[] = Array.isArray(data) ? data : [];
            if (options.query) {
                items = items.filter((item) => matchesQuery(item, options.query!));
            } else {
                items = [...items];
            }
            if (options.sort) items.sort(buildComparator(options.sort));
            const total = items.length;
            const totalPages = Math.max(1, Math.ceil(total / pageSize));
            return {
                items: this.out(items.slice((page - 1) * pageSize, page * pageSize)),
                page, pageSize, total, totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            };
        });
    }

    /**
     * Kiểm tra key có tồn tại (giá trị khác `null`/`undefined`) hay không.
     *
     * @example
     * ```ts
     * if (await db.has("user.profile")) { ... }
     * ```
     */
    public async has<P extends AutocompletableString<ObjectPath<V>>>(key: AutocompletableString<P>): Promise<boolean> {
        if (key && typeof key !== "string") {
            throw new BlackCatError("INVALID_TYPE", "key", "string", typeOf(key));
        }
        return this.exec("has", key, async () => {
            const value = await this.fetch(key);
            return value !== null && value !== undefined;
        });
    }

    /**
     * Lấy nhiều key trong **một lần đọc**. Kết quả theo đúng thứ tự `keys` (key không tồn tại → `null`).
     *
     * @example
     * ```ts
     * const [a, b] = await db.getMany(["user.1.name", "user.2.name"]);
     * ```
     */
    public async getMany(keys: string[]): Promise<any[]> {
        if (!Array.isArray(keys)) throw new BlackCatError("INVALID_TYPE", "keys", "array", typeOf(keys));
        return this.read("getMany", undefined, (root) => this.out(keys.map((key) => this.lookup(root, key))));
    }

    /**
     * Gán giá trị theo key-path (tự tạo object trung gian nếu cần).
     *
     * Với driver hỗ trợ `setPath`, chỉ phần dữ liệu thay đổi được ghi.
     *
     * @param options.ttl Thời gian sống (ms); hết hạn key sẽ tự bị xóa.
     *
     * @example
     * ```ts
     * await db.set("user.profile.name", "Vinh");
     * await db.set("cooldown.123", Date.now(), { ttl: 60_000 });
     * ```
     */
    public async set<P extends AutocompletableString<ObjectPath<V>>>(key: AutocompletableString<P>, value: ObjectValue<V, P>, options?: SetOptions): Promise<void> {
        const parts = this.parseKey(key);
        this.validate(key, value, "set");
        const ttl = this.parseTTL(options?.ttl);
        await this.exec("set", key, async () => {
            if (ttl === undefined && !this.hasTTL && this.driver.setPath && value !== undefined) {
                if (await this.driver.setPath(parts, value)) {
                    this.writes++;
                    this.notify("set", key, value);
                    return;
                }
            }
            const root = await this.load();
            setByPath(root, parts, value);
            if (ttl !== undefined || this.hasTTL) this.updateTTL(root, key, ttl);
            await this.save(root);
            this.notify("set", key, value);
        });
    }

    /**
     * Gán nhiều key trong **một lần đọc + một lần ghi**.
     *
     * @example
     * ```ts
     * await db.setMany({ "a.b": 1, "a.c": 2 });
     * await db.setMany([["x", 1], ["y", 2]]);
     * ```
     */
    public async setMany(entries: Record<string, unknown> | [string, unknown][]): Promise<void> {
        const list = Array.isArray(entries) ? entries : Object.entries(entries);
        const parsed = list.map(([key, value]) => {
            const parts = this.parseKey(key);
            this.validate(key, value, "setMany");
            return { key, value, parts };
        });
        if (!parsed.length) return;
        await this.exec("setMany", undefined, async () => {
            const root = await this.load();
            for (const { key, value, parts } of parsed) {
                setByPath(root, parts, value);
                if (this.hasTTL) this.updateTTL(root, key);
            }
            await this.save(root);
            for (const { key, value } of parsed) this.notify("set", key, value);
        });
    }

    /**
     * Lấy giá trị tại key; nếu chưa có thì gán `defaultValue` và trả về nó.
     *
     * @example
     * ```ts
     * const settings = await db.ensure("guild.123", { prefix: "!" });
     * ```
     */
    public async ensure<P extends AutocompletableString<ObjectPath<V>>>(key: AutocompletableString<P>, defaultValue: ObjectValue<V, P>): Promise<NonNullable<ObjectValue<V, P>>> {
        const parts = this.parseKey(key);
        this.validate(key, defaultValue, "ensure");
        return this.mutate("ensure", key, (root) => {
            const current = this.lookup(root, key);
            if (current !== null && current !== undefined) return { result: this.out(current), changed: false };
            setByPath(root, parts, defaultValue);
            return { result: defaultValue as NonNullable<ObjectValue<V, P>>, changed: true, value: defaultValue };
        });
    }

    /**
     * Cập nhật giá trị tại key:
     * - object + object → merge nông,
     * - mảng + mảng → nối thêm các phần tử chưa có (xem `uniqueBy`),
     * - còn lại → ghi đè.
     *
     * @param options.uniqueBy Cách loại trùng khi nối mảng: danh sách field hoặc hàm. Mặc định tương thích cũ (`username` + `guild`).
     *
     * @example
     * ```ts
     * await db.update("user.profile", { age: 25 });
     * await db.update("members", [{ id: 1 }], { uniqueBy: ["id"] });
     * ```
     */
    public async update<P extends AutocompletableString<ObjectPath<V>>>(key: AutocompletableString<P>, value: ObjectValue<V, P>, options?: { uniqueBy?: UniqueBy }): Promise<If<IsObject<V>, ObjectValue<V, P>>> {
        const parts = this.parseKey(key);
        this.validate(key, value, "update");
        return this.mutate("update", key, (root) => {
            const result = applyUpdate(root, parts, value, options?.uniqueBy ?? this.config.uniqueBy);
            if (this.hasTTL) this.updateTTL(root, key);
            return { result: this.out(result), changed: true, value: result };
        });
    }

    /**
     * Đồng bộ một giá trị: chỉ ghi khi thực sự có thay đổi.
     *
     * @param params.compare Hàm trả `true` nếu hai giá trị coi như giống nhau (bỏ qua cập nhật).
     * @param params.deep So sánh sâu từng field thay vì `Object.is`.
     * @returns Các field đã thay đổi (với object), hoặc `undefined`.
     *
     * @example
     * ```ts
     * await db.syncDatabase({ keys: "user.1", value: { name: "A", age: 20 }, deep: true });
     * ```
     */
    public async syncDatabase<P extends AutocompletableString<ObjectPath<V>>>({ keys, value, compare, deep }: {
        keys: AutocompletableString<P>,
        value: ObjectValue<V, P>,
        compare?: (oldData: ObjectValue<V, P>, newData: ObjectValue<V, P>) => boolean,
        deep?: boolean,
    }): Promise<Partial<ObjectValue<V, P>> | undefined> {
        const parts = this.parseKey(keys);
        this.validate(keys, value, "update");
        const same = deep ? deepEqual : Object.is;
        return this.mutate("syncDatabase", keys, (root) => {
            const oldValue = this.lookup(root, keys);
            if (oldValue === undefined || oldValue === null) {
                setByPath(root, parts, value);
                return { result: undefined, changed: true, value };
            }
            if (compare?.(oldValue, value)) return { result: undefined, changed: false };
            if (!isObject(oldValue) || !isObject(value)) {
                if (same(oldValue, value)) return { result: undefined, changed: false };
                applyUpdate(root, parts, value, this.config.uniqueBy);
                return { result: undefined, changed: true, value };
            }
            const changed: Record<string, unknown> = {};
            for (const field of Object.keys(value as object)) {
                if (!same((oldValue as any)[field], (value as any)[field])) changed[field] = (value as any)[field];
            }
            if (Object.keys(changed).length === 0) return { result: undefined, changed: false };
            applyUpdate(root, parts, changed, this.config.uniqueBy);
            return { result: changed as Partial<ObjectValue<V, P>>, changed: true, value: changed };
        });
    }

    // ───────────────────────────── Xóa ─────────────────────────────

    /**
     * Xóa giá trị tại key.
     *
     * @returns `true` nếu đã xóa, `false` nếu key không tồn tại.
     *
     * @example
     * ```ts
     * await db.delete("user.profile.name");
     * ```
     */
    public async delete<P extends AutocompletableString<ObjectPath<V>>>(key?: AutocompletableString<P>): Promise<boolean> {
        if (typeof key !== "string") {
            throw new BlackCatError("INVALID_TYPE", "key", "string", typeof key);
        }
        const parts = key.split(this.delimiter);
        if (hasUnsafeSegment(parts)) return false;
        return this.mutate("delete", key, (root) => {
            const removed = deleteByPath(root, parts);
            if (removed && this.hasTTL) this.updateTTL(root, key);
            return { result: removed, changed: removed };
        });
    }

    /**
     * Xóa nhiều key trong **một lần đọc + một lần ghi**.
     *
     * @returns Số key đã xóa.
     */
    public async deleteKeys(keys: string[]): Promise<number> {
        if (!Array.isArray(keys)) throw new BlackCatError("INVALID_TYPE", "keys", "array", typeOf(keys));
        return this.mutate("deleteKeys", undefined, (root) => {
            let removed = 0;
            for (const key of keys) {
                if (typeof key !== "string") continue;
                const parts = key.split(this.delimiter);
                if (hasUnsafeSegment(parts)) continue;
                if (deleteByPath(root, parts)) {
                    removed++;
                    if (this.hasTTL) this.updateTTL(root, key);
                }
            }
            return { result: removed, changed: removed > 0 };
        });
    }

    /**
     * Xóa toàn bộ database.
     */
    public async deleteAll(): Promise<boolean> {
        return this.exec("deleteAll", undefined, async () => {
            this.writes++;
            const result = await this.driver.delete();
            this.hasTTL = false;
            this.stopSweeper();
            this.notify("clear");
            return result;
        });
    }

    /**
     * Làm rỗng object/mảng tại `key` nhưng giữ lại chính key đó (không truyền `key` = `deleteAll`).
     *
     * @returns Số phần tử đã xóa.
     */
    public async clear<P extends AutocompletableString<ObjectPath<V>>>(key?: AutocompletableString<P>): Promise<number> {
        if (!key) {
            const total = await this.size();
            await this.deleteAll();
            return total;
        }
        const parts = this.parseKey(key);
        return this.mutate("clear", key, (root) => {
            const data = this.lookup(root, key);
            if (Array.isArray(data)) {
                const count = data.length;
                setByPath(root, parts, []);
                return { result: count, changed: count > 0 };
            }
            if (isObject(data)) {
                const count = Object.keys(data).length;
                setByPath(root, parts, {});
                return { result: count, changed: count > 0 };
            }
            return { result: 0, changed: false };
        });
    }

    /**
     * Xóa các phần tử của mảng tại `key` khớp với `query`.
     *
     * @returns Số phần tử đã xóa (không ghi xuống driver nếu không có gì bị xóa).
     *
     * @example
     * ```ts
     * await db.deleteMany("users", { coins: { $lt: 1 } });
     * ```
     */
    public async deleteMany<P extends AutocompletableString<ObjectPath<V>>>(key: AutocompletableString<P>, query: Query<ArrayElement<ObjectValue<V, P>>>): Promise<number> {
        if (!query || typeof query !== "object") {
            throw new BlackCatError("INVALID_TYPE", "query", "object", typeOf(query));
        }
        if (!key) return 0;
        const parts = this.parseKey(key);
        return this.mutate("deleteMany", key, (root) => {
            const data = this.lookup(root, key);
            if (!Array.isArray(data)) return { result: 0, changed: false };
            const kept = data.filter((item: any) => !matchesQuery(item, query));
            const removed = data.length - kept.length;
            if (!removed) return { result: 0, changed: false };
            setByPath(root, parts, kept);
            return { result: removed, changed: true };
        });
    }

    /**
     * Cập nhật (merge nông) mọi phần tử của mảng tại `key` khớp với `query`.
     *
     * @returns Số phần tử đã cập nhật.
     *
     * @example
     * ```ts
     * await db.updateMany("users", { banned: false }, { warned: true });
     * ```
     */
    public async updateMany<P extends AutocompletableString<ObjectPath<V>>>(key: AutocompletableString<P>, query: Query<ArrayElement<ObjectValue<V, P>>>, patch: Partial<ArrayElement<ObjectValue<V, P>>>): Promise<number> {
        if (!query || typeof query !== "object") {
            throw new BlackCatError("INVALID_TYPE", "query", "object", typeOf(query));
        }
        if (!patch || typeof patch !== "object") {
            throw new BlackCatError("INVALID_TYPE", "patch", "object", typeOf(patch));
        }
        if (!key) return 0;
        return this.mutate("updateMany", key, (root) => {
            const data = this.lookup(root, key);
            if (!Array.isArray(data)) return { result: 0, changed: false };
            let updated = 0;
            for (const item of data) {
                if (isContainer(item) && matchesQuery(item, query)) {
                    Object.assign(item, patch);
                    updated++;
                }
            }
            return { result: updated, changed: updated > 0 };
        });
    }

    // ───────────────────────────── Number ─────────────────────────────

    /**
     * Cộng một số vào giá trị tại key (mặc định `0` nếu chưa có).
     *
     * @returns Giá trị mới.
     *
     * @example
     * ```ts
     * await db.add("user.coins", 10);
     * ```
     */
    public async add<P extends AutocompletableString<ObjectPath<V>>>(key: AutocompletableString<P>, numberToAdd: number): Promise<number> {
        const amount = assertAmount("numberToAdd", numberToAdd);
        const parts = this.parseKey(key);
        return this.mutate("add", key, (root) => {
            const result = applyNumber(root, parts, amount);
            return { result, changed: true, value: result };
        });
    }

    /**
     * Trừ một số khỏi giá trị tại key (mặc định `0` nếu chưa có).
     *
     * @returns Giá trị mới.
     *
     * @example
     * ```ts
     * await db.subtract("user.coins", 5);
     * ```
     */
    public async subtract<P extends AutocompletableString<ObjectPath<V>>>(key: AutocompletableString<P>, numberToSubtract: number): Promise<number> {
        const amount = assertAmount("numberToSubtract", numberToSubtract);
        const parts = this.parseKey(key);
        return this.mutate("subtract", key, (root) => {
            const result = applyNumber(root, parts, -amount);
            return { result, changed: true, value: result };
        });
    }

    /**
     * Cộng/trừ (số âm) kèm giới hạn `min`/`max`.
     *
     * @returns Giá trị mới sau khi kẹp trong khoảng cho phép.
     *
     * @example
     * ```ts
     * await db.increment("user.hp", -30, { min: 0, max: 100 });
     * ```
     */
    public async increment<P extends AutocompletableString<ObjectPath<V>>>(key: AutocompletableString<P>, amount: number, limits?: { min?: number; max?: number }): Promise<number> {
        const value = assertAmount("amount", amount);
        const parts = this.parseKey(key);
        return this.mutate("increment", key, (root) => {
            const result = applyNumber(root, parts, value, limits);
            return { result, changed: true, value: result };
        });
    }

    // ───────────────────────────── Array ─────────────────────────────

    /**
     * Thêm giá trị vào **đầu** mảng (bỏ qua giá trị đã có sẵn trong mảng).
     *
     * @returns Mảng sau khi thêm.
     */
    public async unshift<P extends ObjectPath<V>>(key: AutocompletableString<P>, ...values: RestOrArray<ExtractFromArray<ObjectValue<V, P>>>): Promise<ExtractFromArray<ObjectValue<V, P>>[]> {
        return this.insert("unshift", key, values as unknown[], "start");
    }

    /**
     * Thêm giá trị vào **cuối** mảng (bỏ qua giá trị đã có sẵn trong mảng).
     *
     * @returns Mảng sau khi thêm.
     *
     * @example
     * ```ts
     * await db.push("users", { id: 1 });
     * await db.push("numbers", 1, 2, 3);
     * ```
     */
    public async push<P extends ObjectPath<V>>(key: AutocompletableString<P>, ...values: RestOrArray<ExtractFromArray<ObjectValue<V, P>>>): Promise<ExtractFromArray<ObjectValue<V, P>>[]> {
        return this.insert("push", key, values as unknown[], "end");
    }

    private insert(operation: string, key: string, values: unknown[], position: "start" | "end"): Promise<any> {
        if (!values.length) {
            throw new BlackCatError("REQUIRED_PARAMETER_MISSING", "values");
        }
        const parts = this.parseKey(key);
        return this.mutate(operation, key, (root) => {
            const { array, added } = applyInsert(root, parts, key, values, position, Boolean(this.config.autoCreateArrays));
            return { result: this.out(array), changed: added > 0, value: array };
        });
    }

    /**
     * Thay phần tử tại `targetArrayElementIndex` (hỗ trợ index âm) bằng `value`.
     *
     * @throws {BlackCatError} `INDEX_OUT_OF_BOUNDS` nếu index nằm ngoài mảng.
     *
     * @example
     * ```ts
     * await db.pull("users", 0, { id: 2 });
     * ```
     */
    public async pull<P extends AutocompletableString<ObjectPath<V>>>(key: AutocompletableString<P>, targetArrayElementIndex: number, value: ExtractFromArray<ObjectValue<V, P>>): Promise<ExtractFromArray<ObjectValue<V, P>>[]> {
        if (!isNumber(targetArrayElementIndex)) {
            throw new BlackCatError("INVALID_TYPE", "targetArrayElementIndex", "number", typeOf(targetArrayElementIndex));
        }
        if (value === undefined) {
            throw new BlackCatError("REQUIRED_PARAMETER_MISSING", "value");
        }
        const parts = this.parseKey(key);
        return this.mutate("pull", key, (root) => {
            const array = applyReplaceAt(root, parts, key, Number(targetArrayElementIndex), value);
            return { result: this.out(array), changed: true, value: array };
        });
    }

    /**
     * Bí danh rõ nghĩa hơn của {@link Database.pull} (vì nó **thay thế** phần tử, không xóa).
     */
    public replaceAt<P extends AutocompletableString<ObjectPath<V>>>(key: AutocompletableString<P>, index: number, value: ExtractFromArray<ObjectValue<V, P>>): Promise<ExtractFromArray<ObjectValue<V, P>>[]> {
        return this.pull(key, index, value);
    }

    /**
     * Xóa các phần tử của mảng theo index (loại trùng index, hỗ trợ index âm).
     *
     * @returns Các phần tử đã xóa.
     *
     * @example
     * ```ts
     * await db.pop("users", 0);
     * await db.pop("users", [0, 2]);
     * ```
     */
    public async pop<P extends AutocompletableString<ObjectPath<V>>>(key: AutocompletableString<P>, ...targetArrayElementIndexes: RestOrArray<ExtractFromArray<number>>): Promise<ExtractFromArray<ObjectValue<V, P>>[]> {
        const parts = this.parseKey(key);
        if (!targetArrayElementIndexes.length) {
            throw new BlackCatError("REQUIRED_PARAMETER_MISSING", "targetArrayElementIndex");
        }
        const indexes = Array.isArray(targetArrayElementIndexes[0]) ? (targetArrayElementIndexes[0] as number[]) : (targetArrayElementIndexes as number[]);
        if (indexes.some((index) => !isNumber(index))) {
            throw new BlackCatError("ONE_OR_MORE_ARRAY_TYPES_INVALID", "targetArrayElementIndexes", "number", `[${indexes.map((element) => typeOf(element))}]`);
        }
        return this.mutate("pop", key, (root) => {
            const found = getByPath(root, parts);
            if (found === undefined || found === null) return { result: [], changed: false };
            const array = resolveArray(root, parts, key, false);
            const removed = applyRemoveAt(array, indexes.map(Number));
            return { result: this.out(removed), changed: removed.length > 0, value: array };
        });
    }

    /**
     * Kiểm tra giá trị tại key có phải mảng hay không.
     */
    public async isTargetArray<P extends AutocompletableString<ObjectPath<V>>>(key: AutocompletableString<P>): Promise<boolean> {
        return this.exec("isTargetArray", key, async () => Array.isArray(await this.fetch(key)));
    }

    /**
     * Kiểm tra giá trị tại key có phải số hay không.
     */
    public async isTargetNumber<P extends AutocompletableString<ObjectPath<V>>>(key: AutocompletableString<P>): Promise<boolean> {
        return this.exec("isTargetNumber", key, async () => isNumber(await this.fetch(key)));
    }

    /**
     * Lấy một phần tử ngẫu nhiên từ mảng tại key (`null` nếu mảng rỗng).
     *
     * @throws {BlackCatError} `INVALID_TARGET` nếu giá trị không phải mảng.
     */
    public async random<P extends AutocompletableString<ObjectPath<V>>>(key: AutocompletableString<P>): Promise<Maybe<ObjectValue<V, P>>> {
        return this.exec("random", key, async () => {
            const array = await this.fetch(key);
            if (!Array.isArray(array)) {
                throw new BlackCatError("INVALID_TARGET", "array", typeOf(array));
            }
            return this.out(array[Math.floor(Math.random() * array.length)] ?? null);
        });
    }

    // ───────────────────────────── Keys / values / entries ─────────────────────────────

    /**
     * Danh sách key của object (hoặc index của mảng) tại `key`; không truyền `key` = key cấp cao nhất.
     *
     * Khi có `key`, mặc định bỏ qua các giá trị `null`/`undefined` (đặt `skipNullish: false` để giữ lại).
     */
    public async keys<P extends AutocompletableString<ObjectPath<V>>>(key?: P, options?: IterateOptions): Promise<ObjectPath<P>[]> {
        return this.read("keys", key, (root) => {
            const data = this.lookup(root, key);
            const skip = options?.skipNullish ?? Boolean(key);
            return Object.keys(data || {}).filter((name) => !skip || (data[name] !== undefined && data[name] !== null)) as ObjectPath<P>[];
        });
    }

    /**
     * Danh sách giá trị của object (hoặc phần tử của mảng) tại `key`.
     */
    public async values<P extends AutocompletableString<ObjectPath<V>>>(key?: P, options?: IterateOptions): Promise<ObjectValue<V, P>[]> {
        return this.read("values", key, (root) => {
            const data = this.lookup(root, key);
            const values = Object.values(data || {}) as any[];
            return this.out((options?.skipNullish ? values.filter((value) => value !== undefined && value !== null) : values) as ObjectValue<V, P>[]);
        });
    }

    /**
     * Danh sách `[key, value]` của object (hoặc mảng) tại `key`.
     *
     * @example
     * ```ts
     * for (const [id, user] of await db.entries("users")) { ... }
     * ```
     */
    public async entries<P extends AutocompletableString<ObjectPath<V>>>(key?: P, options?: IterateOptions): Promise<[string, ObjectValue<V, P>][]> {
        return this.read("entries", key, (root) => {
            const data = this.lookup(root, key);
            const entries = Object.entries(data || {}) as [string, any][];
            return this.out((options?.skipNullish ? entries.filter(([, value]) => value !== undefined && value !== null) : entries) as [string, ObjectValue<V, P>][]);
        });
    }

    /**
     * Chuyển các entry cấp `key` thành `Map`.
     */
    public async toMap<P extends AutocompletableString<ObjectPath<V>>>(key?: P): Promise<Map<string, ObjectValue<V, P>>> {
        return new Map(await this.entries(key));
    }

    /**
     * Số key cấp cao nhất của database.
     */
    public async size(): Promise<number> {
        return this.read("size", undefined, (root) => Object.keys(this.visible(root)).length);
    }

    /**
     * Duyệt `[key, value]` cấp cao nhất bằng `for await`.
     *
     * @example
     * ```ts
     * for await (const [guildId, data] of db) { ... }
     * ```
     */
    public async *[Symbol.asyncIterator](): AsyncGenerator<[string, any]> {
        for (const entry of await this.entries()) yield entry as [string, any];
    }

    // ───────────────────────────── Query (find / map / filter ...) ─────────────────────────────

    private async queryValues(first: unknown, second: unknown): Promise<{ values: any[]; fn: (...args: any[]) => any }> {
        const [key, fn] = typeof first === "function" ? [undefined, first] : [first as string | undefined, second];
        if (typeof fn !== "function") {
            throw new BlackCatError("INVALID_TYPE", "queryFunction", "function", typeOf(fn));
        }
        return { values: await this.values(key as any), fn: fn as (...args: any[]) => any };
    }

    /**
     * Tìm phần tử đầu tiên thoả hàm điều kiện, trên giá trị cấp cao nhất hoặc trên mảng/object tại `key`.
     *
     * @example
     * ```ts
     * await db.find((guild) => guild.premium);
     * await db.find("users", (user) => user.id === 1);
     * ```
     */
    public find(queryFunction: QueryFunction<V>): Promise<Maybe<V>>;
    public find<P extends AutocompletableString<ObjectPath<V>>>(key: P, queryFunction: QueryFunction<any>): Promise<Maybe<any>>;
    public async find(first: any, second?: any): Promise<any> {
        const { values, fn } = await this.queryValues(first, second);
        return values.find(fn) ?? null;
    }

    /**
     * `map` trên giá trị cấp cao nhất hoặc trên mảng/object tại `key`.
     */
    public map<TReturnType>(queryFunction: QueryFunction<V, TReturnType>): Promise<TReturnType[]>;
    public map<TReturnType, P extends AutocompletableString<ObjectPath<V>> = any>(key: P, queryFunction: QueryFunction<any, TReturnType>): Promise<TReturnType[]>;
    public async map(first: any, second?: any): Promise<any[]> {
        const { values, fn } = await this.queryValues(first, second);
        return values.map(fn);
    }

    /**
     * `findIndex` trên giá trị cấp cao nhất hoặc trên mảng/object tại `key`.
     */
    public findIndex(queryFunction: QueryFunction<V>): Promise<number>;
    public findIndex<P extends AutocompletableString<ObjectPath<V>>>(key: P, queryFunction: QueryFunction<any>): Promise<number>;
    public async findIndex(first: any, second?: any): Promise<number> {
        const { values, fn } = await this.queryValues(first, second);
        return values.findIndex(fn);
    }

    /**
     * `filter` trên giá trị cấp cao nhất hoặc trên mảng/object tại `key`.
     */
    public filter(queryFunction: QueryFunction<V>): Promise<V[]>;
    public filter<P extends AutocompletableString<ObjectPath<V>>>(key: P, queryFunction: QueryFunction<any>): Promise<any[]>;
    public async filter(first: any, second?: any): Promise<any[]> {
        const { values, fn } = await this.queryValues(first, second);
        return values.filter(fn);
    }

    /**
     * `some` trên giá trị cấp cao nhất hoặc trên mảng/object tại `key`.
     */
    public some(queryFunction: QueryFunction<V>): Promise<boolean>;
    public some<P extends AutocompletableString<ObjectPath<V>>>(key: P, queryFunction: QueryFunction<any>): Promise<boolean>;
    public async some(first: any, second?: any): Promise<boolean> {
        const { values, fn } = await this.queryValues(first, second);
        return values.some(fn);
    }

    /**
     * `every` trên giá trị cấp cao nhất hoặc trên mảng/object tại `key`.
     */
    public every(queryFunction: QueryFunction<V>): Promise<boolean>;
    public every<P extends AutocompletableString<ObjectPath<V>>>(key: P, queryFunction: QueryFunction<any>): Promise<boolean>;
    public async every(first: any, second?: any): Promise<boolean> {
        const { values, fn } = await this.queryValues(first, second);
        return values.every(fn);
    }

    // ───────────────────────────── Transaction ─────────────────────────────

    /**
     * Chạy nhiều thao tác **nguyên tử**: đọc một lần, ghi một lần, và nếu `fn` ném lỗi thì **không ghi gì** (rollback).
     *
     * @example
     * ```ts
     * await db.transaction((tx) => {
     *   tx.subtract("user.1.coins", 100);
     *   tx.add("user.2.coins", 100);
     * });
     * ```
     */
    public async transaction<T>(fn: (tx: Transaction) => T | Promise<T>): Promise<T> {
        return this.exec("transaction", undefined, async () => {
            const draft = clone(await this.load());
            const tx = new Transaction(draft, {
                delimiter: this.delimiter,
                parseKey: (key) => this.parseKey(key),
                uniqueBy: this.config.uniqueBy,
                autoCreateArrays: Boolean(this.config.autoCreateArrays),
                validate: (key, value, operation) => this.validate(key, value, operation)
            });
            const result = await fn(tx);
            if (tx.changed) {
                await this.save(draft);
                this.notify("transaction");
            }
            return result;
        });
    }

    // ───────────────────────────── Import / export / backup / migrate ─────────────────────────────

    /**
     * Xuất toàn bộ database thành chuỗi JSON.
     */
    public async export(): Promise<string> {
        return JSON.stringify(await this.all(), null, 2);
    }

    /**
     * Nhập dữ liệu (chuỗi JSON hoặc object).
     *
     * @param options.merge `true` để gộp (ghi đè theo từng key cấp cao nhất), `false` (mặc định) để thay toàn bộ.
     */
    public async import(data: string | Record<string, any>, options: { merge?: boolean } = {}): Promise<void> {
        const parsed = typeof data === "string" ? JSON.parse(data) : data;
        if (!isObject(parsed)) {
            throw new BlackCatError("INVALID_TYPE", "data", "object", typeOf(parsed));
        }
        await this.exec("import", undefined, async () => {
            let root: Record<string, any>;
            if (options.merge) {
                root = await this.load();
                Object.assign(root, clone(parsed));
            } else {
                root = clone(parsed);
                this.resetState();
            }
            await this.save(root);
            this.notify("import");
        });
    }

    /**
     * Sao lưu toàn bộ database ra một file JSON có gắn thời gian.
     *
     * @returns Đường dẫn file backup.
     *
     * @example
     * ```ts
     * await db.backup({ dir: "./backups", keep: 10 });
     * ```
     */
    public async backup(options: AutoBackupOptions = {}): Promise<string> {
        const dir = options.dir ?? this.config.autoBackup?.dir ?? "./backups";
        const keep = options.keep ?? this.config.autoBackup?.keep ?? 5;
        const json = await this.export();
        await fs.mkdir(dir, { recursive: true });
        const file = join(dir, `backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
        await fs.writeFile(file, json);
        if (keep > 0) {
            const files = (await fs.readdir(dir)).filter((name: string) => /^backup-.*\.json$/.test(name)).sort();
            for (const old of files.slice(0, Math.max(0, files.length - keep))) {
                await fs.unlink(join(dir, old)).catch(() => undefined);
            }
        }
        return file;
    }

    /**
     * Sao chép toàn bộ dữ liệu từ driver này sang driver khác (ví dụ JSON → SQLite).
     *
     * @param options.overwrite Cho phép ghi đè khi driver đích đã có dữ liệu.
     * @returns Số key cấp cao nhất đã chuyển.
     *
     * @example
     * ```ts
     * await Database.migrate(new JSONDriver({ filePath: "./old.json" }), new SQLiteDriver({ filePath: "./new.sqlite" }));
     * ```
     */
    public static async migrate(from: DatabaseDriver, to: DatabaseDriver, options: { overwrite?: boolean } = {}): Promise<number> {
        await from.init?.();
        await to.init?.();
        const data = await from.all<Record<string, any>>();
        if (!options.overwrite) {
            const existing = await to.all<Record<string, any>>();
            if (isObject(existing) && Object.keys(existing).length > 0) {
                throw new BlackCatError("INVALID_OPTION", "overwrite", "driver đích đã có dữ liệu (đặt overwrite: true để ghi đè)");
            }
        }
        await to.set(data);
        await to.flush?.();
        return Object.keys(data ?? {}).length;
    }
}

/**
 * Ngữ cảnh nội bộ cho {@link Transaction}.
 * @hidden
 */
interface TransactionContext {
    delimiter: string;
    parseKey(key: unknown): string[];
    uniqueBy?: UniqueBy;
    autoCreateArrays: boolean;
    validate(key: string, value: unknown, operation: ValidatorContext["operation"]): void;
}

/**
 * Đối tượng thao tác đồng bộ trong {@link Database.transaction}. Mọi thay đổi chỉ áp dụng
 * khi `transaction` hoàn tất thành công.
 */
export class Transaction {
    /** `true` nếu đã có thay đổi. */
    public changed = false;
    /** @hidden */
    constructor(private readonly root: Record<string, any>, private readonly ctx: TransactionContext) { }
    /** Lấy giá trị (`null` nếu không tồn tại). */
    public get(key: string): any {
        const parts = key.split(this.ctx.delimiter);
        if (hasUnsafeSegment(parts)) return null;
        return getByPath(this.root, parts) ?? null;
    }
    /** Kiểm tra key tồn tại. */
    public has(key: string): boolean {
        return this.get(key) !== null;
    }
    /** Gán giá trị. */
    public set(key: string, value: unknown): void {
        const parts = this.ctx.parseKey(key);
        this.ctx.validate(key, value, "set");
        setByPath(this.root, parts, value);
        this.changed = true;
    }
    /** Lấy giá trị, nếu chưa có thì gán mặc định. */
    public ensure<T>(key: string, defaultValue: T): T {
        const current = this.get(key);
        if (current !== null) return current;
        this.set(key, defaultValue);
        return defaultValue;
    }
    /** Cập nhật (merge object / nối mảng). */
    public update(key: string, value: unknown): any {
        const parts = this.ctx.parseKey(key);
        this.ctx.validate(key, value, "update");
        this.changed = true;
        return applyUpdate(this.root, parts, value, this.ctx.uniqueBy);
    }
    /** Xóa key. */
    public delete(key: string): boolean {
        const parts = key.split(this.ctx.delimiter);
        if (hasUnsafeSegment(parts)) return false;
        const removed = deleteByPath(this.root, parts);
        if (removed) this.changed = true;
        return removed;
    }
    /** Cộng số. */
    public add(key: string, amount: number): number {
        const value = assertAmount("numberToAdd", amount);
        const result = applyNumber(this.root, this.ctx.parseKey(key), value);
        this.changed = true;
        return result;
    }
    /** Trừ số. */
    public subtract(key: string, amount: number): number {
        const value = assertAmount("numberToSubtract", amount);
        const result = applyNumber(this.root, this.ctx.parseKey(key), -value);
        this.changed = true;
        return result;
    }
    /** Thêm vào cuối mảng. */
    public push(key: string, ...values: unknown[]): any[] {
        if (!values.length) throw new BlackCatError("REQUIRED_PARAMETER_MISSING", "values");
        const { array, added } = applyInsert(this.root, this.ctx.parseKey(key), key, values, "end", this.ctx.autoCreateArrays);
        if (added) this.changed = true;
        return array;
    }
}
