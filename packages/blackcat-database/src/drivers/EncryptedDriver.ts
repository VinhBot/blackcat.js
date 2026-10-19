import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import type { DatabaseDriver } from "../types";
import { BlackCatError } from "../utils/BlackCatError";
import { isContainer } from "../utils/path";

const FIELD = "__blackcat_encrypted__";

/**
 * Tùy chọn cho {@link EncryptedDriver}.
 */
export interface EncryptedDriverOptions {
    /**
     * Driver thật dùng để lưu dữ liệu đã mã hóa.
     */
    driver: DatabaseDriver;
    /**
     * Khóa mã hóa: chuỗi bất kỳ (được băm bằng scrypt) hoặc `Buffer` đúng 32 byte.
     */
    key: string | Buffer;
    /**
     * Salt dùng khi băm khóa dạng chuỗi.
     *
     * @default "blackcat.js-database"
     */
    salt?: string;
}

/**
 * Driver bọc mã hóa **AES-256-GCM** toàn bộ database trước khi lưu.
 *
 * Dữ liệu cũ chưa mã hóa vẫn đọc được; lần ghi tiếp theo sẽ được mã hóa.
 * Nếu sai khóa hoặc dữ liệu bị chỉnh sửa, ném `DECRYPT_FAILED`.
 *
 * ⚠️ Đừng mất khóa: không có cách khôi phục dữ liệu.
 *
 * @example
 * ```ts
 * const db = new Database({
 *     driver: new EncryptedDriver({
 *         driver: new JSONDriver({ filePath: "./secure.json" }),
 *         key: process.env.DB_KEY!
 *     })
 * });
 * ```
 */
export class EncryptedDriver implements DatabaseDriver {
    private readonly inner: DatabaseDriver;
    private readonly key: Buffer;

    constructor(options: EncryptedDriverOptions) {
        this.inner = options.driver;
        if (typeof options.key === "string") {
            if (!options.key) throw new BlackCatError("INVALID_OPTION", "key", "không được để trống");
            this.key = scryptSync(options.key, options.salt ?? "blackcat.js-database", 32);
        } else if (options.key?.length === 32) {
            this.key = options.key;
        } else {
            throw new BlackCatError("INVALID_OPTION", "key", "Buffer phải dài đúng 32 byte");
        }
    }

    private encrypt(plain: string): string {
        const iv = randomBytes(12);
        const cipher = createCipheriv("aes-256-gcm", this.key, iv);
        const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
        return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64");
    }

    private decrypt(payload: string): string {
        try {
            const raw = Buffer.from(payload, "base64");
            const decipher = createDecipheriv("aes-256-gcm", this.key, raw.subarray(0, 12));
            decipher.setAuthTag(raw.subarray(12, 28));
            return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
        } catch (error) {
            throw new BlackCatError("DECRYPT_FAILED").withCause(error);
        }
    }

    public async init(): Promise<void> { await this.inner.init?.(); }
    public async flush(): Promise<void> { await this.inner.flush?.(); }
    public async close(): Promise<void> { await this.inner.close?.(); }

    public async all<T = any>(): Promise<T> {
        const raw = await this.inner.all<any>();
        if (!isContainer(raw) || typeof raw[FIELD] !== "string") return raw as T;
        return JSON.parse(this.decrypt(raw[FIELD])) as T;
    }

    public async set<T = any>(data: T): Promise<T> {
        await this.inner.set({ [FIELD]: this.encrypt(JSON.stringify(data)) });
        return data;
    }

    public async delete(): Promise<boolean> {
        return this.inner.delete();
    }
}
