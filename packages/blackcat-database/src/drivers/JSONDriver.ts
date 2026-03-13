import { promises as fs } from "fs";
import { DatabaseDriver } from "../types";

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
 * - Ghi dữ liệu xuống file JSON
 * 
 * @example  
 * ```ts
 * const database = new Database({
 *      driber: new JSONDriver({\
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
    /**
     * Khởi tạo một instance mới của {@link JSONDriver}.
     *
     * @param options - Cấu hình driver
     *
     * @param options.filePath
     * Đường dẫn tới file JSON dùng làm database.
     *
     * @param options.minifyJSON
     * Nếu `true`, nội dung JSON sẽ được minify khi ghi ra file để giảm dung lượng.
     *
     * @example
     * ```ts
     * const database = new Database({
     *      driver: db = new JSONDriver({
     *          filePath: "./database.json"
     *      })
     * });
     * ```
     */
    constructor(options: JSONDriverOptions) {
        this.filePath = options.filePath || "database.json";
        this.minifyJSON = options.minifyJSON || false;

    }
    /**
     * Đảm bảo file database tồn tại.
     * Nếu file chưa tồn tại sẽ tự động tạo file `{}`.
     */
    private async ensureFile(): Promise<void> {
        try {
            await fs.access(this.filePath);
        } catch {
            await fs.writeFile(this.filePath, "{}");
        }
    }
    /**
     * Đọc toàn bộ dữ liệu từ file database JSON.
     *
     * Nếu file không tồn tại hoặc lỗi parse,
     * method sẽ trả về object rỗng.
     *
     * @template V Kiểu dữ liệu database.
     * @returns Promise chứa toàn bộ dữ liệu database.
     */
    public async all<V>(): Promise<V> {
        await this.ensureFile();
        return fs.readFile(this.filePath, "utf-8").then((content) => JSON.parse(content) as V).catch((error) => {
            console.error(`Không thể đọc file database: ${this.filePath}`, error);
            return {} as V;
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
        await this.ensureFile();
        await fs.writeFile(this.filePath, JSON.stringify(data, null, this.minifyJSON ? undefined : "\t"));
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
        await this.ensureFile();
        await fs.writeFile(this.filePath, "{}");
        return true;
    }
}