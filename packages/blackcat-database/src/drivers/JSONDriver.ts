import { promises as fs } from "node:fs";
import { dirname } from "node:path";
import type { DatabaseDriver } from "../types";
import { AsyncQueue } from "../utils/AsyncQueue";

/**
 * Cấu hình khởi tạo cho {@link JSONDriver}.
 */
interface JSONDriverOptions {
    /**
     * Đường dẫn tới file JSON dùng làm database.
     *
     * Ví dụ:
     * ```ts
     * "./database.json"
     * "./data/users.json"
     * ```
     * Thư mục chứa file sẽ được tự tạo nếu chưa có.
     */
    filePath: string;
    /**
     * Nếu bật, nội dung JSON sẽ được **minify**
     * (không format khoảng trắng) để giảm dung lượng file.
     *
     * Nếu tắt, JSON sẽ được format với indentation để dễ đọc.
     *
     * @default false
     */
    minifyJSON?: boolean;
    /**
     * Chuỗi hoặc số khoảng trắng dùng để thụt lề khi `minifyJSON` tắt.
     *
     * @default "\t"
     */
    indent?: number | string;
    /**
     * Giữ thêm một bản sao `.bak` của lần ghi trước. Nếu file chính bị hỏng,
     * driver sẽ tự khôi phục từ bản `.bak`.
     *
     * @default false
     */
    backup?: boolean;
    /**
     * Gọi `fsync` trước khi đổi tên file tạm, đảm bảo dữ liệu thực sự xuống đĩa
     * (an toàn hơn khi mất điện nhưng chậm hơn).
     *
     * @default false
     */
    fsync?: boolean;
    /**
     * Được gọi khi file JSON bị hỏng (parse lỗi). `quarantinePath` là nơi file hỏng được chuyển tới.
     */
    onError?: (error: unknown, context: { filePath: string; phase: "parse"; quarantinePath: string }) => void;
}

/**
 * Driver lưu trữ dữ liệu dạng JSON.
 *
 * ⚠️ Đây **không phải database hoàn chỉnh**.
 * Class này chỉ đóng vai trò **driver lưu trữ (storage layer)**
 * cho class chính `Database`.
 *
 * Toàn bộ logic xử lý key path (`a.b.c`), validate dữ liệu,
 * và các thao tác database sẽ được thực hiện trong class `Database`.
 *
 * `JSONDriver` chỉ chịu trách nhiệm:
 *
 * - Đọc dữ liệu từ file JSON
 * - Ghi dữ liệu xuống file JSON **theo kiểu atomic** (ghi file tạm rồi đổi tên),
 *   nên process bị kill giữa chừng cũng không làm hỏng file.
 *
 * Nếu file bị hỏng (parse lỗi), file đó được **đổi tên** thành `<file>.corrupt-<timestamp>`
 * thay vì bị ghi đè, để bạn không bị mất dữ liệu.
 *
 * @example
 * ```ts
 * const database = new Database({
 *      driver: new JSONDriver({
 *          filePath: "./database.json",
 *          minifyJSON: false
 *      })
 * });
 * ```
 */
export class JSONDriver implements DatabaseDriver {
    /**
     * Đường dẫn tới file database JSON.
     */
    private filePath: string;
    /**
     * Cho biết có minify JSON khi ghi file hay không.
     */
    public minifyJSON: boolean;
    private indent: number | string;
    private backup: boolean;
    private fsync: boolean;
    private onError?: JSONDriverOptions["onError"];
    private ready?: Promise<void>;
    private writer = new AsyncQueue();
    /**
     * Khởi tạo một instance mới của {@link JSONDriver}.
     *
     * @param options - Cấu hình driver
     *
     * @example
     * ```ts
     * const database = new Database({
     *      driver: new JSONDriver({
     *          filePath: "./database.json"
     *      })
     * });
     * ```
     */
    constructor(options: JSONDriverOptions) {
        this.filePath = options.filePath || "database.json";
        this.minifyJSON = options.minifyJSON || false;
        this.indent = options.indent ?? "\t";
        this.backup = options.backup ?? false;
        this.fsync = options.fsync ?? false;
        this.onError = options.onError;
    }
    /**
     * Đảm bảo thư mục và file database tồn tại (chỉ chạy một lần).
     * Nếu file chưa tồn tại sẽ tự động tạo file `{}`.
     */
    public async init(): Promise<void> {
        this.ready ??= this.prepare();
        try {
            await this.ready;
        } catch (error) {
            this.ready = undefined;
            throw error;
        }
    }
    private async prepare(): Promise<void> {
        await fs.mkdir(dirname(this.filePath), { recursive: true });
        try {
            await fs.writeFile(this.filePath, "{}", { flag: "wx" });
        } catch (error: any) {
            if (error?.code !== "EEXIST") throw error;
        }
    }
    /**
     * Đọc toàn bộ dữ liệu từ file database JSON.
     *
     * - File rỗng → `{}`.
     * - File bị hỏng JSON → file được đổi tên (hoặc khôi phục từ `.bak`) và trả về `{}`.
     * - Lỗi I/O khác (quyền truy cập, ổ đĩa...) được **ném ra** để tránh ghi đè mất dữ liệu.
     *
     * @template V Kiểu dữ liệu database.
     * @returns Promise chứa toàn bộ dữ liệu database.
     */
    public async all<V>(): Promise<V> {
        await this.init();
        let content: string;
        try {
            content = await fs.readFile(this.filePath, "utf-8");
        } catch (error: any) {
            if (error?.code === "ENOENT") {
                this.ready = undefined;
                await this.init();
                return {} as V;
            }
            throw error;
        }
        if (content.trim() === "") return {} as V;
        try {
            return JSON.parse(content) as V;
        } catch (error) {
            return this.recover<V>(error);
        }
    }
    private async recover<V>(error: unknown): Promise<V> {
        const quarantinePath = `${this.filePath}.corrupt-${Date.now()}`;
        await fs.rename(this.filePath, quarantinePath).catch(() => undefined);
        console.error(`Không thể đọc file database: ${this.filePath} (đã chuyển file hỏng sang ${quarantinePath})`, error);
        this.onError?.(error, { filePath: this.filePath, phase: "parse", quarantinePath });
        if (this.backup) {
            try {
                const restored = JSON.parse(await fs.readFile(`${this.filePath}.bak`, "utf-8")) as V;
                await this.write(JSON.stringify(restored, null, this.minifyJSON ? undefined : this.indent));
                return restored;
            } catch {
                // Không có bản sao lưu dùng được, tiếp tục với database rỗng.
            }
        }
        await this.write("{}");
        return {} as V;
    }
    private write(json: string): Promise<void> {
        return this.writer.run(async () => {
            const tmp = `${this.filePath}.${process.pid}.tmp`;
            if (this.fsync) {
                const handle = await fs.open(tmp, "w");
                try {
                    await handle.writeFile(json);
                    await handle.sync();
                } finally {
                    await handle.close();
                }
            } else {
                await fs.writeFile(tmp, json);
            }
            if (this.backup) await fs.copyFile(this.filePath, `${this.filePath}.bak`).catch(() => undefined);
            try {
                await fs.rename(tmp, this.filePath);
            } catch (error: any) {
                // Một số hệ thống (Windows) không cho rename đè khi file đang bị khóa.
                if (error?.code === "EPERM" || error?.code === "EBUSY" || error?.code === "EEXIST") {
                    await fs.writeFile(this.filePath, json);
                    await fs.unlink(tmp).catch(() => undefined);
                } else {
                    await fs.unlink(tmp).catch(() => undefined);
                    throw error;
                }
            }
        });
    }
    /**
     * Ghi toàn bộ dữ liệu database xuống file JSON.
     *
     * Method này **không xử lý key path**.
     * Logic cập nhật dữ liệu sẽ được xử lý ở class `Database`
     * trước khi truyền object hoàn chỉnh vào đây.
     *
     * @param data Toàn bộ dữ liệu database sau khi đã được cập nhật.
     *
     * @template R Kiểu dữ liệu database.
     * @returns Promise chứa dữ liệu đã ghi.
     */
    public async set<R = any>(data: R): Promise<R> {
        // Serialize ngay (đồng bộ) để object không bị thay đổi giữa chừng bởi các thao tác khác.
        const json = JSON.stringify(data, null, this.minifyJSON ? undefined : this.indent);
        await this.init();
        await this.write(json);
        return data;
    }
    /**
     * Xóa toàn bộ database.
     *
     * Method này chỉ reset file JSON về `{}`.
     *
     * @returns `true` nếu reset thành công.
     */
    public async delete(): Promise<boolean> {
        await this.init();
        await this.write("{}");
        return true;
    }
}
