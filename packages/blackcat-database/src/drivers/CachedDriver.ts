import type { DatabaseDriver } from "../types";

/**
 * Tùy chọn cho {@link CachedDriver}.
 */
export interface CachedDriverOptions {
    /**
     * Thời gian chờ (ms) sau lần ghi cuối cùng trước khi flush xuống driver thật (debounce).
     *
     * @default 500
     */
    flushDelay?: number;
    /**
     * Thời gian tối đa (ms) dữ liệu được phép "bẩn" trước khi bắt buộc flush, kể cả khi vẫn liên tục có ghi mới.
     *
     * @default 5000
     */
    maxWait?: number;
    /**
     * Thời gian sống của cache (ms). Sau khoảng này (và không còn dữ liệu chưa flush), lần đọc tiếp theo
     * sẽ nạp lại từ driver thật. Hữu ích khi có tiến trình khác cùng sửa dữ liệu. `0` = không bao giờ hết hạn.
     *
     * @default 0
     */
    ttl?: number;
    /**
     * Số lần thử lại khi ghi xuống driver thật thất bại.
     *
     * @default 3
     */
    retry?: number;
    /**
     * Thời gian chờ cơ bản (ms) giữa các lần thử lại (nhân theo số lần thử).
     *
     * @default 500
     */
    retryDelay?: number;
    /**
     * Tự flush khi process kết thúc (`beforeExit`, `SIGINT`, `SIGTERM`).
     *
     * @default true
     */
    flushOnExit?: boolean;
    /**
     * Được gọi khi flush thất bại sau tất cả các lần thử lại (dữ liệu vẫn được giữ lại trong cache và sẽ được thử lại).
     */
    onError?: (error: unknown) => void;
}

/**
 * Driver bọc (wrapper) thêm **cache trong RAM + ghi trễ (write-behind)** cho bất kỳ driver nào.
 *
 * - `all()` trả về dữ liệu từ RAM (chỉ đọc driver thật lần đầu).
 * - `set()` chỉ đánh dấu "bẩn" rồi ghi xuống driver thật theo kiểu debounce (`flushDelay`, giới hạn bởi `maxWait`).
 * - Ghi thất bại sẽ được thử lại, dữ liệu không bị mất.
 *
 * ⚠️ Hãy gọi `await db.close()` (hoặc `await driver.close()`) khi tắt ứng dụng một cách chủ động.
 * Nếu process bị kill đột ngột (SIGKILL, mất điện), dữ liệu chưa flush sẽ mất.
 * Hook `flushOnExit` chỉ xử lý `beforeExit`, `SIGINT`, `SIGTERM`.
 *
 * @example
 * ```ts
 * const db = new Database({
 *     driver: new CachedDriver(new JSONDriver({ filePath: "./database.json" }), {
 *         flushDelay: 500,
 *         maxWait: 5000
 *     })
 * });
 * ```
 */
export class CachedDriver implements DatabaseDriver {
    /**
     * Driver thật phía sau cache.
     */
    public readonly driver: DatabaseDriver;
    private cache: any = undefined;
    private loadedAt = 0;
    private loading?: Promise<any>;
    private dirty = false;
    private firstDirtyAt = 0;
    private timer?: ReturnType<typeof setTimeout>;
    private flushing: Promise<void> = Promise.resolve();
    private closed = false;
    private hooks: Array<[string, (...args: any[]) => void]> = [];
    private readonly flushDelay: number;
    private readonly maxWait: number;
    private readonly ttl: number;
    private readonly retry: number;
    private readonly retryDelay: number;
    private readonly onError?: (error: unknown) => void;

    /**
     * @param driver Driver thật cần bọc cache.
     * @param options Tùy chọn cache.
     */
    constructor(driver: DatabaseDriver, options: CachedDriverOptions = {}) {
        this.driver = driver;
        this.flushDelay = options.flushDelay ?? 500;
        this.maxWait = options.maxWait ?? 5000;
        this.ttl = options.ttl ?? 0;
        this.retry = options.retry ?? 3;
        this.retryDelay = options.retryDelay ?? 500;
        this.onError = options.onError;
        if (options.flushOnExit ?? true) this.registerExitHooks();
    }

    /**
     * `true` nếu còn dữ liệu chưa được ghi xuống driver thật.
     */
    public get isDirty(): boolean {
        return this.dirty;
    }

    private registerExitHooks(): void {
        const onBeforeExit = () => { this.flush().catch(() => undefined); };
        process.on("beforeExit", onBeforeExit);
        this.hooks.push(["beforeExit", onBeforeExit]);
        for (const signal of ["SIGINT", "SIGTERM"] as const) {
            const handler = () => {
                this.flush().catch(() => undefined).finally(() => {
                    process.removeListener(signal, handler);
                    // Nếu không còn ai khác xử lý tín hiệu, thực hiện hành vi mặc định (thoát process).
                    if (process.listenerCount(signal) === 0) process.kill(process.pid, signal);
                });
            };
            process.on(signal, handler);
            this.hooks.push([signal, handler]);
        }
    }

    private unregisterExitHooks(): void {
        for (const [event, handler] of this.hooks) process.removeListener(event, handler);
        this.hooks = [];
    }

    private clearTimer(): void {
        if (this.timer) clearTimeout(this.timer);
        this.timer = undefined;
    }

    private schedule(delay?: number): void {
        this.clearTimer();
        const waited = Date.now() - this.firstDirtyAt;
        const wait = delay ?? Math.max(0, Math.min(this.flushDelay, this.maxWait - waited));
        this.timer = setTimeout(() => { 
            this.flush().catch(() => undefined); 
        }, wait);
        this.timer.unref?.();
    }

    private async doFlush(): Promise<void> {
        if (!this.dirty) return;
        const snapshot = this.cache;
        this.dirty = false;
        this.firstDirtyAt = 0;
        for (let attempt = 0; ; attempt++) {
            try {
                await this.driver.set(snapshot);
                return;
            } catch (error) {
                if (attempt >= this.retry) {
                    // Giữ dữ liệu trong cache và thử lại sau.
                    this.dirty = true;
                    this.firstDirtyAt ||= Date.now();
                    if (!this.closed) this.schedule(Math.max(this.flushDelay, 5000));
                    this.onError?.(error);
                    throw error;
                }
                await new Promise((resolve) => setTimeout(resolve, this.retryDelay * (attempt + 1)));
            }
        }
    }

    /**
     * Khởi tạo driver phía sau.
     */
    public async init(): Promise<void> {
        await this.driver.init?.();
    }

    /**
     * Trả về dữ liệu từ cache (nạp từ driver thật ở lần đầu hoặc khi cache hết hạn).
     */
    public async all<T = any>(): Promise<T> {
        const expired = this.ttl > 0 && !this.dirty && Date.now() - this.loadedAt > this.ttl;
        if (this.cache === undefined || expired) {
            this.loading ??= (async () => {
                await this.flushing.catch(() => undefined);
                const data = await this.driver.all<T>();
                this.cache = data;
                this.loadedAt = Date.now();
                return data;
            })().finally(() => { 
                this.loading = undefined; 
            });
            await this.loading;
        }
        return this.cache as T;
    }

    /**
     * Cập nhật cache và lên lịch ghi xuống driver thật.
     */
    public async set<T = any>(data: T): Promise<T> {
        this.cache = data;
        this.loadedAt = Date.now();
        this.dirty = true;
        this.firstDirtyAt ||= Date.now();
        this.schedule();
        return data;
    }

    /**
     * Reset database về `{}` (được ghi xuống driver thật theo lịch).
     */
    public async delete(): Promise<boolean> {
        await this.set({});
        return true;
    }

    /**
     * Ghi ngay mọi dữ liệu chưa lưu xuống driver thật.
     */
    public flush(): Promise<void> {
        this.clearTimer();
        this.flushing = this.flushing.catch(() => undefined).then(() => this.doFlush());
        return this.flushing;
    }

    /**
     * Bỏ cache (sau khi flush). Lần đọc tiếp theo sẽ nạp lại từ driver thật.
     */
    public async invalidate(): Promise<void> {
        await this.flush();
        this.cache = undefined;
    }

    /**
     * Flush, gỡ các hook thoát process và đóng driver phía sau.
     */
    public async close(): Promise<void> {
        this.closed = true;
        this.clearTimer();
        this.unregisterExitHooks();
        await this.flush();
        await this.driver.close?.();
    }
}
