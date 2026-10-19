import { gzip, gunzip } from "node:zlib";
import { promisify } from "node:util";
import type { DatabaseDriver } from "../types";
import { isContainer } from "../utils/path";

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);
const FIELD = "__blackcat_gzip__";

/**
 * Tùy chọn cho {@link CompressedDriver}.
 */
export interface CompressedDriverOptions {
    /**
     * Driver thật dùng để lưu dữ liệu đã nén.
     */
    driver: DatabaseDriver;
    /**
     * Mức nén gzip (0-9).
     *
     * @default 6
     */
    level?: number;
}

/**
 * Driver bọc nén **gzip** toàn bộ database trước khi lưu (tiết kiệm dung lượng cho DB lớn).
 * Dữ liệu cũ chưa nén vẫn đọc được. Có thể kết hợp với {@link EncryptedDriver}
 * (đặt `EncryptedDriver` bên ngoài `CompressedDriver`).
 *
 * @example
 * ```ts
 * const db = new Database({
 *     driver: new CompressedDriver({ driver: new JSONDriver({ filePath: "./data.json" }) })
 * });
 * ```
 */
export class CompressedDriver implements DatabaseDriver {
    private readonly inner: DatabaseDriver;
    private readonly level: number;

    constructor(options: CompressedDriverOptions) {
        this.inner = options.driver;
        this.level = options.level ?? 6;
    }

    public async init(): Promise<void> {
        await this.inner.init?.();
    }
    public async flush(): Promise<void> {
        await this.inner.flush?.();
    }
    public async close(): Promise<void> {
        await this.inner.close?.();
    }

    public async all<T = any>(): Promise<T> {
        const raw = await this.inner.all<any>();
        if (!isContainer(raw) || typeof raw[FIELD] !== "string") return raw as T;
        const buffer = await gunzipAsync(Buffer.from(raw[FIELD], "base64"));
        return JSON.parse(buffer.toString("utf8")) as T;
    }

    public async set<T = any>(data: T): Promise<T> {
        const compressed = await gzipAsync(JSON.stringify(data), { level: this.level });
        await this.inner.set({ [FIELD]: compressed.toString("base64") });
        return data;
    }

    public async delete(): Promise<boolean> {
        return this.inner.delete();
    }
}
