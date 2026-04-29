import path from "node:path";
import fs from "node:fs";
import url from "node:url";

import type { EventBuilderOptions, Client } from "..";

/**
 * Cấu hình cho {@link EventManager}.
 */
export interface EventManagerOptions {
    /** 
     * Thư mục chứa các event files.
     * 
     * Cấu trúc đề xuất:
     * ```
     * events/
     *   client/
     *     ready.ts
     *   guild/
     *     guildCreate.ts
     * ```
     */
    directory: string;
    /**
     * Danh sách scope được phép load.
     *
     * Ví dụ:
     * ```
     * scopes: ["client", "guild"]
     * ```
     *
     * Nếu sử dụng `"*"` thì tất cả scope trong thư mục sẽ được load.
     */
    scopes: readonly string[];
    /** 
     * Callback được gọi khi load event thành công.
     *
     * @param event.eventName - Tên Discord event
     * @param event.file - Tên file event
     * @param event.scope - Scope chứa event
     */
    onLoad?: (event: { eventName: string; file: string; scope: string }) => void;
    /** 
     * Callback được gọi khi xảy ra lỗi khi load event.
     *
     * @param event.error - Thông tin lỗi
     * @param event.file - File gây lỗi
     * @param event.scope - Scope của event
     */
    onError?: (event: { error: unknown; file: string; scope: string }) => void;
}

/**
 * Manager chịu trách nhiệm:
 *
 * - Load event files từ filesystem
 * - Gắn events vào Discord Client
 * - Phân chia events theo **scope**
 */
export class EventManager {
    /**
     * Options cấu hình cho EventManager.
     */
    public readonly options: EventManagerOptions;
    /**
     * Khởi tạo EventManager.
     *
     * @param client - Instance bot client
     * @param options - Cấu hình manager
     */
    constructor(options: EventManagerOptions) {
        this.options = options;
    }
    /**
     * Load toàn bộ events từ thư mục đã cấu hình.
     *
     * Quy trình:
     *
     * 1. Đọc tất cả thư mục scope
     * 2. Xác định scope cần load
     * 3. Load từng file event
     * 4. Gắn listener vào client
     *
     * @returns Promise hoàn thành khi load xong
     */
    public async load(client: Client): Promise<void> {
        const options = this.options;
        if (!options?.directory || !options?.scopes) return;
        if (!Array.isArray(options.scopes)) return options.onError?.({
            error: "[EventManager] 'scopes' phải là một array",
            file: "không xác định",
            scope: "không xác định"
        });
        if (options.scopes.length === 0) return;
        const entries = await fs.promises.readdir(options.directory, {
            withFileTypes: true
        });
        const availableScopes = entries.filter((e) => e.isDirectory()).map((e) => e.name); // Lấy tất cả folder scope có sẵn.
        const scopesToLoad = options.scopes.includes("*") ? availableScopes : options.scopes; // Nếu dùng "*" → load tất cả scope.
        // Validate scope (trừ khi dùng "*")
        if (!options.scopes.includes("*")) {
            const invalidScopes = options.scopes.filter((scope) => !availableScopes.includes(scope));
            if (invalidScopes.length > 0) options.onError?.({
                error: `[registerEvents] Phạm vi không hợp lệ: ${invalidScopes.join(", ")}. Phạm vi có sẵn: ${availableScopes.join(", ")}`,
                file: "không xác định",
                scope: scopesToLoad.join(", ")
            });
        }
        for (const scope of scopesToLoad) {
            const scopePath = path.join(options.directory, scope);
            const files = await fs.promises.readdir(scopePath);
            for (const file of files) {
                if (!/\.(ts|js)$/.test(file)) continue;
                try {
                    const event: EventBuilderOptions = await import(url.pathToFileURL(path.join(scopePath, file)).href).then((d) => d.default);
                    if (!event.eventName || typeof event.execute !== "function") {
                        options.onError?.({ error: new Error("Mô-đun sự kiện không hợp lệ"), file, scope });
                    }
                    if (event.once) {
                        client.once(event.eventName, (...args: any) => event.execute(client, ...args));
                    } else {
                        client.on(event.eventName, (...args: any) => event.execute(client, ...args));
                    }
                    options.onLoad?.({ eventName: event.eventName, file, scope });
                } catch (error) {
                    options.onError?.({ error, file, scope });
                }
            }
        }
    }
}