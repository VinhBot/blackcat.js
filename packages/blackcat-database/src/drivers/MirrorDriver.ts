import type { DatabaseDriver } from "../types";

/**
 * Tùy chọn cho {@link MirrorDriver}.
 */
export interface MirrorDriverOptions {
    /**
     * Driver chính: nguồn đọc dữ liệu và nơi ghi bắt buộc phải thành công.
     */
    primary: DatabaseDriver;
    /**
     * Các driver phụ: nhận bản sao mỗi lần ghi (ví dụ sao lưu sang SQLite/Mongo).
     */
    mirrors: DatabaseDriver[];
    /**
     * Được gọi khi ghi vào một driver phụ thất bại (mặc định: bỏ qua lỗi).
     */
    onError?: (error: unknown, mirror: DatabaseDriver, operation: "set" | "delete") => void;
    /**
     * Nếu `true`, lỗi ở driver phụ cũng được ném ra.
     *
     * @default false
     */
    strict?: boolean;
}

/**
 * Driver ghi **đồng thời** vào nhiều driver: đọc từ `primary`, ghi vào `primary` rồi tới các `mirrors`.
 * Dùng để có bản sao dự phòng tự động.
 *
 * @example
 * ```ts
 * const db = new Database({
 *     driver: new MirrorDriver({
 *         primary: new JSONDriver({ filePath: "./database.json" }),
 *         mirrors: [new SQLiteDriver({ filePath: "./backup.sqlite" })]
 *     })
 * });
 * ```
 */
export class MirrorDriver implements DatabaseDriver {
    private readonly primary: DatabaseDriver;
    private readonly mirrors: DatabaseDriver[];
    private readonly onError?: MirrorDriverOptions["onError"];
    private readonly strict: boolean;

    constructor(options: MirrorDriverOptions) {
        this.primary = options.primary;
        this.mirrors = options.mirrors;
        this.onError = options.onError;
        this.strict = options.strict ?? false;
    }

    private async broadcast(operation: "set" | "delete", task: (driver: DatabaseDriver) => Promise<unknown>): Promise<void> {
        const results = await Promise.allSettled(this.mirrors.map((mirror) => task(mirror)));
        let firstError: unknown;
        results.forEach((result, index) => {
            if (result.status === "rejected") {
                this.onError?.(result.reason, this.mirrors[index], operation);
                firstError ??= result.reason;
            }
        });
        if (this.strict && firstError !== undefined) throw firstError;
    }

    public async init(): Promise<void> {
        await this.primary.init?.();
        await Promise.all(this.mirrors.map((mirror) => mirror.init?.()));
    }

    public async flush(): Promise<void> {
        await this.primary.flush?.();
        await Promise.allSettled(this.mirrors.map((mirror) => mirror.flush?.()));
    }

    public async close(): Promise<void> {
        await this.primary.close?.();
        await Promise.allSettled(this.mirrors.map((mirror) => mirror.close?.()));
    }

    public all<T = any>(): Promise<T> {
        return this.primary.all<T>();
    }

    public async set<T = any>(data: T): Promise<T> {
        await this.primary.set(data);
        await this.broadcast("set", (mirror) => mirror.set(data));
        return data;
    }

    public async delete(): Promise<boolean> {
        const result = await this.primary.delete();
        await this.broadcast("delete", (mirror) => mirror.delete());
        return result;
    }
}
