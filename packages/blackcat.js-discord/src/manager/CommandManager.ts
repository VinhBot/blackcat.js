import { Collection, Message } from "discord.js";
import path from "path";
import url from "url";
import fs from "fs";

import { Client, CommandBuilder } from "..";

/**
 * Cấu hình cho {@link CommandManager}.
 */
export interface CommandManagerOptions {
    /**
     * Thư mục chứa message command files.
     */
    directory: string;
    /**
     * Prefix được sử dụng để gọi command.
     *
     * Có thể là:
     *
     * - một prefix duy nhất
     * - nhiều prefix
     *
     * Ví dụ:
     * ```ts
     * prefix: "!"
     * prefix: ["!", "?"]
     * ```
     */
    prefix: string | string[];
    /**
     * Callback được gọi khi command được load thành công.
     *
     * @param command - Command đã được load
     */
    onLoad?: (command: CommandBuilder) => void;
    /**
     * Callback được gọi khi xảy ra lỗi khi load command.
     *
     * @param data.file - File gây lỗi
     * @param data.error - Error chi tiết
     */
    onError?: (data: { file: string; error: Error }) => void;
}

/**
 * Manager chịu trách nhiệm:
 *
 * - Load message commands từ filesystem
 * - Quản lý command registry
 * - Quản lý aliases
 * - Phân loại command theo category
 * - Xử lý messageCreate để thực thi command
 */
export class CommandManager {
    private readonly directory: string | undefined;
    private readonly prefix: string | string[] | undefined;
    private readonly onLoad?: CommandManagerOptions["onLoad"];
    private readonly onError?: CommandManagerOptions["onError"];
    /**
     * Khởi tạo CommandManager.
     *
     * @param client - Instance bot client
     * @param options - Cấu hình manager
     */
    constructor(options?: CommandManagerOptions) {
        this.directory = options?.directory;
        this.prefix = options?.prefix;
        this.onLoad = options?.onLoad;
        this.onError = options?.onError;
    }
    /**
     * Load toàn bộ message commands từ thư mục đã cấu hình.
     */
    public async loadAll(client: Client): Promise<void> {
        if (!this.directory) return;
        this._attachMessageListener(client);
        await this._readDirectory(client, path.resolve(this.directory));
    }
    /**
     * Đọc đệ quy các file command trong thư mục.
     * @hidden
     *
     * @param dir - Thư mục cần đọc
     */
    private async _readDirectory(client: Client, dir: string): Promise<void> {
        const entries = await fs.promises.readdir(dir, {
            withFileTypes: true
        });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                await this._readDirectory(client, fullPath);
                continue;
            }
            if (!entry.name.endsWith(".js") && !entry.name.endsWith(".ts")) {
                continue;
            }
            await this._loadFile(client, fullPath);
        }
    }
    /**
     * Load một file command.
     * @hidden
     *
     * @param filePath - Đường dẫn file command
     */
    private async _loadFile(client: Client, filePath: string): Promise<void> {
        try {
            const imported = await import(url.pathToFileURL(filePath).href);
            const command: CommandBuilder = imported.default ?? imported;
            if (!command?.commandName) {
                throw new Error("thiếu commandName");
            }
            if (typeof command.execute !== "function") {
                throw new Error("thiếu execute function");
            }
            const { commands, aliases, categories } = client;
            if (commands.has(command.commandName)) {
                throw new Error(`Lệnh bị trùng lặp: ${command.commandName}`);
            }
            if (!this.directory) return;
            const category = path.relative(path.resolve(this.directory), filePath).split(path.sep)[0];
            command.category = category;
            commands.set(command.commandName, command);
            /* ===== Alias ===== */
            if (command.aliases?.length) {
                for (const alias of command.aliases) {
                    if (aliases.has(alias)) {
                        throw new Error(`Lệnh phụ trùng lặp: ${alias}`);
                    }
                    aliases.set(alias, command.commandName);
                }
            }
            /* ===== Category ===== */
            let categoryCollection = categories.get(category);
            if (!categoryCollection) {
                categoryCollection = new Collection();
                categories.set(category, categoryCollection);
            }
            categoryCollection.set(command.commandName, command);
            this.onLoad?.(command);
        } catch (error) {
            this.onError?.({ file: filePath, error: error as Error });
        }
    }
    /**
     * Gắn listener cho sự kiện `messageCreate`.
     * @hidden
     *
     * Listener này sẽ:
     * - kiểm tra prefix
     * - parse arguments
     * - resolve command
     * - thực thi command
     */
    private _attachMessageListener(client: Client): void {
        client.on("messageCreate", async (message) => {
            if (message.author.bot) return;
            const usedPrefix = this._getPrefix(message.content);
            if (!usedPrefix) return;
            const args = message.content.slice(usedPrefix.length).trim().split(/\s+/);
            const commandName = args.shift()?.toLowerCase();
            if (!commandName) return;
            const command = this.resolve(client, commandName);
            if (!command) return;
            try {
                await command.execute(client, message as Message<true>, args);
            } catch (error) {
                console.error(error);
            }
        });
    }
    /**
     * Xác định prefix được sử dụng trong message.
     * @hidden
     *
     * @param content - Nội dung message
     * @returns Prefix được sử dụng hoặc `null`
     */
    private _getPrefix(content: string): string | null {
        const prefix = this.prefix as string;
        if (Array.isArray(prefix)) {
            for (const p of prefix) {
                if (content.startsWith(p)) return p;
            }
            return null;
        }
        return content.startsWith(prefix as string) ? prefix as string : null;
    }
    /**
     * Resolve command từ:
     * @hidden
     *
     * - command name
     * - alias
     *
     * @param name - Tên command hoặc alias
     * @returns Command tương ứng hoặc `null`
     */
    private resolve(client: Client, name: string): CommandBuilder | null {
        const direct = client.commands.get(name);
        if (direct) return direct;
        const alias = client.aliases.get(name);
        if (!alias) return null;
        return client.commands.get(alias) ?? null;
    }
    /**
     * Reload toàn bộ commands.
     *
     * Quy trình:
     *
     * 1. Xóa commands
     * 2. Xóa aliases
     * 3. Xóa categories
     * 4. Load lại từ filesystem
     */
    public async reloadAll(client: Client): Promise<void> {
        client.commands.clear();
        client.aliases.clear();
        client.categories.clear();
        await this.loadAll(client);
    }
}
