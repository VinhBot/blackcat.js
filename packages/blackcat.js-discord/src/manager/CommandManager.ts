import type { Message, MessageReplyOptions, OmitPartialGroupDMChannel } from "discord.js";
import { Collection } from "discord.js";
import { pathToFileURL } from "url";
import { promises as fs } from "fs";
import path from "path";

import type { Client } from "../Client.ts";
import type { CommandBuilder } from "../builder/CommandBuilder.ts";
import type { CommandToggleInfo, DisabledCommandsSnapshot } from ".";
import {
    ArgumentParseError,
    PermissionManager,
    buildUsage,
    cooldownManager,
    parseArguments,
    validateArgumentDefinitions,
    CommandToggle,
    toGuildIDList
} from ".";
/**
 * @hidden
 */
type Prefix = | string | string[] | ((guildID: string) => Promise<string | string[]> | string | string[]);
/**
 * Cấu hình khởi tạo {@link CommandManager}.
 *
 * Interface này quyết định cách command được load, prefix được xử lý,
 * event `messageCreate` có được đăng ký tự động hay không, và cách xử lý lỗi khi load command.
 *
 * @example
 * ```ts
 * const manager = new CommandManager({
 *   directory: "./commands",
 *   prefix: "!",
 *   registerMessageCreateEvent: true,
 *   mentionPrefix: true,
 *   onLoad(command) {
 *     console.log(`Loaded: ${command.commandName}`);
 *   },
 *   onError({ file, error }) {
 *     console.error(`Không thể load ${file}`, error);
 *   },
 * });
 * ```
 */
export interface CommandManagerOptions {
    /**
     * Đường dẫn tới thư mục chứa các file command.
     *
     * CommandManager sẽ quét đệ quy toàn bộ thư mục này và tự động load các file `.js` hoặc `.ts`, trừ file `.d.ts`.
     *
     * Category của command sẽ được lấy từ thư mục cấp đầu tiên bên trong `directory`.
     *
     * @example
     * ```ts
     * const manager = new CommandManager({
     *   directory: "./commands",
     *   prefix: "!",
     * });
     * ```
     *
     * @example
     * ```txt
     * commands/
     * ├── admin/
     * │   └── ban.ts      // category: "admin"
     * └── info/
     *     └── help.ts     // category: "info"
     * ```
     */
    directory?: string;
    /**
     * Prefix của bot.
     *
     * Prefix là chuỗi đứng đầu tin nhắn để bot biết tin nhắn đó là command.
     * Có thể dùng một prefix, nhiều prefix, hoặc hàm trả về prefix theo từng guild.
     *
     * @example
     * ```ts
     * prefix: "!"
     * ```
     *
     * @example
     * ```ts
     * prefix: ["!", "?"]
     * ```
     *
     * @example
     * ```ts
     * prefix: async (guildID) => {
     *   const config = await getGuildConfig(guildID);
     *   return config.prefix;
     * }
     * ```
     */
    prefix: Prefix;
    /**
     * Có tự động đăng ký listener cho event `messageCreate` hay không.
     *
     * Mặc định là `true`. Nếu đặt là `false`, bạn cần tự xử lý message hoặc gọi các API resolve command thủ công.
     *
     * @defaultValue true
     *
     * @example
     * ```ts
     * const manager = new CommandManager({
     *   directory: "./commands",
     *   prefix: "!",
     *   registerMessageCreateEvent: false,
     * });
     * ```
     */
    registerMessageCreateEvent?: boolean;
    /**
     * Có cho phép dùng mention bot như một prefix hay không.
     *
     * Khi bật, người dùng có thể gọi command bằng cú pháp:
     * `<@bot_id> help`.
     *
     * @defaultValue true
     *
     * @example
     * ```ts
     * const manager = new CommandManager({
     *   directory: "./commands",
     *   prefix: "!",
     *   mentionPrefix: true,
     * });
     * ```
     */
    mentionPrefix?: boolean;
    /**
     * Hàm tạo nội dung phản hồi khi người dùng chỉ mention bot
     * hoặc nhập prefix nhưng không nhập tên command.
     *
     * Hàm nhận danh sách prefix hiện tại và trả về chuỗi hoặc `MessageReplyOptions`.
     *
     * @example
     * ```ts
     * mentionPrefixResponse: (prefixes) => {
     *   return `Prefix hiện tại: ${prefixes.join(", ")}`;
     * }
     * ```
     *
     * @example
     * ```ts
     * mentionPrefixResponse: (prefixes) => ({
     *   content: `Bạn có thể dùng: ${prefixes.map((p) => `\`${p}\``).join(", ")}`,
     *   allowedMentions: { repliedUser: false },
     * })
     * ```
     */
    mentionPrefixResponse?: (prefix: string[]) => string | MessageReplyOptions;
    /**
     * Tuỳ biến thông báo khi người dùng nhập sai/thiếu argument (chỉ áp dụng cho lệnh có `options`).
     *
     * Mặc định gửi: nội dung lỗi + dòng "Cách dùng". Trả về `null` để không phản hồi gì.
     *
     * @example
     * ```ts
     * argumentErrorResponse: (error, ctx) => `❌ ${error.message}\n📖 Cách dùng: \`${ctx.usage}\``
     * ```
     */
    argumentErrorResponse?: (error: ArgumentParseError, ctx: { prefix: string; usage: string; command: CommandBuilder<any, any> }) => string | MessageReplyOptions | null;
    /**
     * Tuỳ biến tin nhắn khi lệnh bị tắt trong guild (xem `disable()`).
     * Trả về `null` để không phản hồi gì. Mặc định: "⛔ Lệnh ... đã bị tắt trong server này."
     */
    disabledResponse?: (ctx: { commandName: string; guildID: string; prefix: string }) => string | MessageReplyOptions | null;
    /**
     * Được gọi mỗi khi lệnh được bật/tắt — dùng để lưu trạng thái xuống file/database.
     */
    onToggle?: (info: CommandToggleInfo) => void;
    /**
     * Callback được gọi sau khi một command được load thành công.
     *
     * Hữu ích để log, thống kê hoặc kiểm tra command trong quá trình khởi động bot.
     *
     * @example
     * ```ts
     * onLoad(command) {
     *   console.log(`Đã load command: ${command.commandName}`);
     * }
     * ```
     */
    onLoad?: (command: CommandBuilder, manager: CommandManager) => void;
    /**
     * Callback được gọi khi một file command load thất bại.
     *
     * Nếu không truyền `onError`, lỗi khi load command sẽ bị bỏ qua trong hàm `loadFile`.
     *
     * @example
     * ```ts
     * onError({ file, error }) {
     *   console.error(`Lỗi khi load file ${file}:`, error.message);
     * }
     * ```
     */
    onError?: (data: { file: string; error: Error }) => void;
}

/**
 * Quản lý hệ thống prefix command cho Discord bot.
 *
 * Class này chịu trách nhiệm:
 * - Load command từ thư mục.
 * - Đăng ký command, alias và category vào client.
 * - Resolve command theo tên hoặc alias.
 * - Tự động xử lý event `messageCreate`.
 * - Kiểm tra cooldown và permission trước khi chạy command.
 *
 * @example
 * ```ts
 * const manager = new CommandManager({
 *   directory: "./commands",
 *   prefix: "!",
 * });
 *
 * await manager.loadAll(client);
 * ```
 */
export class CommandManager {
    public client!: Client;
    private readonly directory?: string;
    private readonly prefix: Prefix;
    private readonly registerMessageCreateEvent: boolean;
    private readonly mentionPrefix: boolean;
    private readonly mentionPrefixResponse: (prefix: string[]) => string | MessageReplyOptions;
    private readonly onLoad?: CommandManagerOptions["onLoad"];
    private readonly onError?: CommandManagerOptions["onError"];
    private readonly argumentErrorResponse?: CommandManagerOptions["argumentErrorResponse"];
    private readonly disabledResponse?: CommandManagerOptions["disabledResponse"];
    private readonly toggle: CommandToggle;
    private readonly attachedClients = new WeakSet<Client>();
    private readonly loadedFiles = new Map<string, string>();
    /**
     * Tạo một CommandManager mới.
     *
     * Constructor chỉ lưu cấu hình, chưa load command ngay.
     * Để load command, hãy gọi {@link CommandManager.loadAll}.
     *
     * @param options - Cấu hình cho CommandManager.
     *
     * @example
     * ```ts
     * const manager = new CommandManager({
     *   directory: "./commands",
     *   prefix: ["!", "?"],
     *   mentionPrefix: true,
     * });
     * ```
     */
    public constructor(options: CommandManagerOptions) {
        this.directory = options.directory;
        this.prefix = options.prefix;
        this.registerMessageCreateEvent = options.registerMessageCreateEvent ?? true;
        this.mentionPrefix = options.mentionPrefix ?? true;
        this.mentionPrefixResponse = options.mentionPrefixResponse ?? ((prefixes) => `Prefix của tôi là: ${prefixes.map((p) => `\`${p}\``).join(", ")}`);
        this.onLoad = options.onLoad;
        this.onError = options.onError;
        this.argumentErrorResponse = options.argumentErrorResponse;
        this.disabledResponse = options.disabledResponse;
        this.toggle = new CommandToggle(options.onToggle);
    }
    /**
     * Gán instance client cho manager.
     *
     * Method này được gọi bởi Client trong quá trình khởi tạo để inject client vào manager sau khi client đã được tạo.
     *
     * @param client Instance Discord client.
     *
     * @returns Chính instance hiện tại để hỗ trợ chaining.
     *
     * @example
     * ```ts
     * commandManager.setClient(client);
     * ```
     */
    public setClient(client: Client): this {
        this.client = client;
        return this;
    }
    /**
     * Đăng ký một hoặc nhiều command vào command manager.
     * 
     * Nếu command hoặc alias đã tồn tại, hàm sẽ ném ra lỗi.
     *
     * @param command - Command hoặc danh sách command cần đăng ký.
     *
     * @throws {Error}
     * Ném ra lỗi nếu:
     * - Tên command bị trùng lặp.
     * - Alias bị trùng lặp.
     * - Command không hợp lệ.
     *
     * @example
     * ```ts
     * manager.registerCommand(pingCommand);
     * ```
     *
     * @example
     * ```ts
     * manager.registerCommand([
     *   pingCommand,
     *   helpCommand,
     *   avatarCommand,
     * ]);
     * ```
     */
    public registerCommand(command: CommandBuilder<any, any> | CommandBuilder<any, any>[]): void {
        for (const cmd of Array.isArray(command) ? command : [command]) {
            this.validateCommand(cmd);
            this.addCommand(cmd, cmd.category ?? "unknown");
        }
    }
    /**
     * Đăng ký lệnh theo kiểu "tất cả hoặc không gì cả": kiểm tra mọi xung đột (tên, alias)
     * TRƯỚC khi ghi vào collection nên không bao giờ để lại lệnh đăng ký dở dang.
     * @hidden
     */
    private addCommand(command: CommandBuilder<any, any>, category: string, filePath?: string, silent = false): void {
        const commandName = this.normalize(command.commandName);
        const taken = (key: string) => this.client.commands.has(key) || this.client.aliases.has(key);
        if (taken(commandName)) throw new Error(`Lệnh bị trùng lặp: ${commandName}`);
        const aliases = [...new Set((command.aliases ?? []).map((alias) => this.normalize(alias)).filter(Boolean))];
        for (const alias of aliases) {
            if (alias === commandName || taken(alias)) throw new Error(`Lệnh phụ trùng lặp: ${alias}`);
        }
        command.commandName = commandName;
        command.category = category;
        command.aliases = aliases;
        this.client.commands.set(commandName, command);
        for (const alias of aliases) this.client.aliases.set(alias, commandName);
        this.registerCategory(category, command);
        if (filePath) this.loadedFiles.set(commandName, filePath);
        if (!silent) this.onLoad?.(command, this);
    }
    /**
     * Load toàn bộ command từ thư mục đã cấu hình.
     *
     * Nếu `registerMessageCreateEvent` là `true`, hàm này cũng tự động gắn listener
     * cho event `messageCreate` để bot có thể xử lý prefix command.
     *
     * @returns Promise hoàn tất sau khi toàn bộ command hợp lệ được load.
     *
     * @example
     * ```ts
     * const manager = new CommandManager({
     *   directory: "./commands",
     *   prefix: "!",
     * });
     *
     * await manager.loadAll();
     * console.log(`Đã load ${manager.getCommandCount()} command`);
     * ```
     */
    public async loadAll(): Promise<void> {
        if (this.registerMessageCreateEvent) {
            this.attachMessageListener();
        }
        if (this.directory !== undefined) {
            await this.readDirectory(path.resolve(this.directory));
        }
    }
    /**
     * Tắt một lệnh trong một hoặc nhiều guild. Có thể truyền tên lệnh hoặc alias.
     *
     * Người dùng gọi lệnh bị tắt sẽ nhận thông báo "đã bị tắt" (tuỳ biến bằng `disabledResponse`).
     * Trong DM lệnh không bị ảnh hưởng. Trạng thái lưu trong bộ nhớ — dùng `onToggle` +
     * `importDisabled()` nếu cần lưu bền vững.
     *
     * @returns `false` nếu không tìm thấy lệnh.
     *
     * @example
     * ```ts
     * client.commandManager.disable("ping", "123456789012345678");
     * client.commandManager.disable("ping", [guildA, guildB]);
     * ```
     */
    public disable(commandName: string, guildID: string | string[]): boolean {
        const command = this.resolve(commandName);
        if (!command) return false;
        for (const id of toGuildIDList(guildID)) this.toggle.disable(command.commandName, id);
        return true;
    }
    /**
     * Bật lại một lệnh trong một hoặc nhiều guild.
     *
     * @returns `false` nếu không tìm thấy lệnh.
     */
    public enable(commandName: string, guildID: string | string[]): boolean {
        const command = this.resolve(commandName);
        if (!command) return false;
        for (const id of toGuildIDList(guildID)) this.toggle.enable(command.commandName, id);
        return true;
    }
    /**
     * Kiểm tra lệnh (hoặc alias) có đang bị tắt trong guild hay không. Trong DM luôn là `false`.
     */
    public isDisabled(commandName: string, guildID?: string | null): boolean {
        const command = this.resolve(commandName);
        return command ? this.toggle.isDisabled(command.commandName, guildID) : false;
    }
    /**
     * Danh sách lệnh đang bị tắt trong một guild.
     */
    public getDisabledCommands(guildID: string): string[] {
        return this.toggle.list(guildID);
    }
    /**
     * Xuất trạng thái bật/tắt để lưu xuống file/database.
     *
     * @example
     * ```ts
     * fs.writeFileSync("disabled.json", JSON.stringify(client.commandManager.exportDisabled()));
     * ```
     */
    public exportDisabled(): DisabledCommandsSnapshot {
        return this.toggle.export();
    }
    /**
     * Nạp lại trạng thái bật/tắt đã lưu (mặc định thay thế hoàn toàn, `merge: true` để gộp).
     */
    public importDisabled(data: DisabledCommandsSnapshot, options?: { merge?: boolean }): void {
        this.toggle.import(data, options);
    }
    /**
     * Lấy command theo tên chính xác sau khi normalize.
     *
     * Hàm này chỉ tìm trong `client.commands`, không resolve alias.
     * Nếu bạn muốn tìm cả alias, hãy dùng {@link CommandManager.resolve}.
     *
     * @param commandName - Tên command cần tìm.
     * @returns Command nếu tồn tại, ngược lại trả về `undefined`.
     *
     * @example
     * ```ts
     * const help = manager.getCommand("help");
     *
     * if (help) {
     *   console.log(help.commandName);
     * }
     * ```
     */
    public getCommand(commandName: string): CommandBuilder<any, any> | undefined {
        return this.client.commands.get(this.normalize(commandName));
    }
    /**
     * Kiểm tra command hoặc alias có tồn tại hay không.
     *
     * Hàm này dùng {@link CommandManager.resolve}, nên có thể kiểm tra cả tên command
     * lẫn alias của command.
     *
     * @param commandName - Tên command hoặc alias cần kiểm tra.
     * @returns `true` nếu tìm thấy command, ngược lại là `false`.
     *
     * @example
     * ```ts
     * if (manager.hasCommand("h")) {
     *   console.log("Alias hoặc command này tồn tại");
     * }
     * ```
     */
    public hasCommand(commandName: string): boolean {
        return Boolean(this.resolve(commandName));
    }
    /**
     * Resolve command từ tên command hoặc alias.
     *
     * Tên truyền vào sẽ được trim và chuyển về chữ thường trước khi tìm kiếm.
     * 
     * @param name - Tên command hoặc alias.
     * @returns Command tìm được, hoặc `null` nếu không tồn tại.
     *
     * @example
     * ```ts
     * const command = manager.resolve("help");
     * const commandFromAlias = manager.resolve("h");
     *
     * if (commandFromAlias) {
     *   await commandFromAlias.execute(client, message, []);
     * }
     * ```
     */
    public resolve(commandName: string): CommandBuilder<any, any> | null {
        const key = this.normalize(commandName);
        const aliasTarget = this.client.aliases.get(key);
        return this.client.commands.get(key) ?? (aliasTarget ? this.client.commands.get(aliasTarget) : undefined) ?? null;
    }
    /**
     * Lấy danh sách tên command đã load.
     *
     * @returns Mảng tên command đã normalize.
     *
     * @example
     * ```ts
     * const names = manager.getCommandNames();
     * console.log(names.join(", "));
     * ```
     */
    public getCommandNames(): string[] {
        return [...this.client.commands.keys()];
    }
    /**
     * Lấy toàn bộ command đã load.
     *
     * @returns Mảng các command builder.
     *
     * @example
     * ```ts
     * for (const command of manager.getAllCommands()) {
     *   console.log(command.commandName);
     * }
     * ```
     */
    public getAllCommands(): CommandBuilder<any, any>[] {
        return [...this.client.commands.values()];
    }
    /**
     * Lấy tổng số command hiện đang được quản lý.
     *
     * @returns Số lượng command đã load.
     *
     * @example
     * ```ts
     * console.log(`Bot hiện có ${manager.getCommandCount()} command`);
     * ```
     */
    public getCommandCount(): number {
        return this.client.commands.size;
    }
    /**
     * Lấy collection command theo category.
     *
     * Category được suy ra từ thư mục cấp đầu tiên bên trong `directory`.
     *
     * @param category - Tên category cần lấy.
     * @returns Collection command thuộc category, hoặc `undefined` nếu không tồn tại.
     *
     * @example
     * ```ts
     * const adminCommands = manager.getCategory("admin");
     *
     * if (adminCommands) {
     *   console.log([...adminCommands.keys()]);
     * }
     * ```
     */
    public getCategory(category: string): Collection<string, CommandBuilder<any, any>> | undefined {
        return this.client.categories.get(category);
    }
    /**
     * Lấy danh sách tên category hiện có.
     *
     * @returns Mảng tên category.
     *
     * @example
     * ```ts
     * const categories = manager.getCategoryNames();
     * console.log(categories);
     * ```
     */
    public getCategoryNames(): string[] {
        const categories = this.getCategories();
        return [...categories.keys()];
    }
    /**
     * Lấy toàn bộ category và command bên trong từng category.
     *
     * @returns Collection có key là tên category và value là collection command.
     *
     * @example
     * ```ts
     * for (const [category, commands] of manager.getCategories()) {
     *   console.log(category, commands.size);
     * }
     * ```
     */
    public getCategories(): Collection<string, Collection<string, CommandBuilder<any, any>>> {
        return this.client.categories;
    }
    /**
     * Lấy danh sách prefix hiện tại.
     *
     * Nếu prefix là function, hàm sẽ gọi function đó với `guildID`.
     * Nếu prefix trả về string đơn, hàm sẽ bọc thành mảng một phần tử.
     *
     * @param guildID - ID của guild cần lấy prefix. Mặc định là chuỗi rỗng.
     * @returns Mảng prefix có thể dùng trong guild đó.
     *
     * @example
     * ```ts
     * const prefixes = await manager.getPrefixes(message.guildId ?? "");
     * console.log(prefixes);
     * ```
     */
    public async getPrefixes(guildID = ""): Promise<string[]> {
        const resolved = typeof this.prefix === "function" ? await this.prefix(guildID) : this.prefix;
        return Array.isArray(resolved) ? resolved : [resolved];
    }
    /**
     * Xóa toàn bộ command hiện tại và load lại từ thư mục.
     *
     * Hàm này clear `commands`, `aliases` và `categories` trước khi gọi lại
     * {@link CommandManager.loadAll}.
     *
     * @returns Promise hoàn tất sau khi reload xong.
     *
     * @example
     * ```ts
     * await manager.reloadAll();
     * console.log("Đã reload toàn bộ command");
     * ```
     */
    public async reloadAll(): Promise<void> {
        this.client.commands.clear();
        this.client.aliases.clear();
        this.client.categories.clear();
        this.loadedFiles.clear();
        if (this.registerMessageCreateEvent) this.attachMessageListener();
        if (this.directory !== undefined) {
            // cacheBust: bắt buộc để ESM import lại nội dung file mới thay vì dùng module đã cache.
            await this.readDirectory(path.resolve(this.directory), true);
        }
    }
    /**
     * Gỡ một command khỏi client.
     *
     * Hàm này cũng xóa các alias trỏ tới command và xóa command khỏi category.
     * Nếu category rỗng sau khi xóa, category đó cũng bị xóa khỏi client.
     *
     * @param commandName - Tên command hoặc alias cần gỡ.
     * @returns `true` nếu gỡ thành công, `false` nếu không tìm thấy command.
     *
     * @example
     * ```ts
     * const removed = manager.unloadCommand("help");
     *
     * if (removed) {
     *   console.log("Đã gỡ command help");
     * }
     * ```
     */
    public unloadCommand(commandName: string): boolean {
        const command = this.resolve(commandName);
        if (!command) return false;
        const key = this.normalize(command.commandName);
        this.client.commands.delete(key);
        this.loadedFiles.delete(key);
        for (const [alias, target] of this.client.aliases) {
            if (this.normalize(target) === key) this.client.aliases.delete(alias);
        }
        for (const [category, commands] of this.getCategories()) {
            commands.delete(key);
            if (!commands.size) this.client.categories.delete(category);
        }
        return true;
    }
    /**
     * Reload một command cụ thể.
     *
     * Hàm này tìm command theo tên hoặc alias, unload command đó, sau đó quét lại
     * thư mục command để load phiên bản mới.
     * 
     * @param commandName - Tên command hoặc alias cần reload.
     * @returns `true` nếu command được reload thành công, ngược lại là `false`.
     *
     * @example
     * ```ts
     * const ok = await manager.reloadCommand("help");
     *
     * if (ok) {
     *   console.log("Đã reload command help");
     * }
     * ```
     */
    public async reloadCommand(commandName: string): Promise<boolean> {
        const previous = this.resolve(commandName);
        if (!previous) return false;
        const name = previous.commandName;
        const filePath = this.loadedFiles.get(name);
        // Lệnh đăng ký thủ công (registerCommand) hoặc đã bị xóa file thì không có gì để reload.
        if (!filePath) return false;
        this.unloadCommand(name);
        await this.loadFile(filePath, true);
        if (this.hasCommand(name)) return true;
        // Reload thất bại (lỗi cú pháp, ...): khôi phục lệnh cũ để bot không mất lệnh.
        try {
            this.addCommand(previous, previous.category ?? "unknown", filePath, true);
        } catch { /* bỏ qua */ }
        return false;
    }
    /**
     * Quét đệ quy một thư mục và load mọi file command hợp lệ.
     *
     * @internal
     *
     * @param directory - Đường dẫn tuyệt đối tới thư mục cần quét.
     *
     * @example
     * ```ts
     * await this.readDirectory(path.resolve("./commands"));
     * ```
     */
    private async readDirectory(directory: string, cacheBust = false): Promise<void> {
        if (!directory) return;
        const entries = (await fs.readdir(directory, {
            withFileTypes: true,
        })).sort((a, b) => a.name.localeCompare(b.name));
        // Tuần tự + sắp xếp để thứ tự load/phát hiện trùng lặp luôn ổn định.
        for (const entry of entries) {
            const fullPath = path.join(directory, entry.name);
            if (entry.isDirectory()) {
                await this.readDirectory(fullPath, cacheBust);
                continue;
            }
            if (!this.isCommandFile(entry.name)) continue;
            await this.loadFile(fullPath, cacheBust);
        }
    }
    /**
     * Import một file command và đăng ký command đó vào client.
     *
     * Hàm này sẽ:
     * - Import file bằng file URL.
     * - Tạo command instance nếu export là class.
     * - Kiểm tra command có `commandName` và `execute`.
     * - Normalize tên command.
     * - Gán category dựa trên đường dẫn file.
     * - Đăng ký command, alias và category.
     * - Gọi callback `onLoad` nếu có.
     *
     * Nếu xảy ra lỗi trong quá trình load, hàm sẽ gọi `onError` nếu callback này được cấu hình.
     *
     * @internal
     *
     * @param client - Client dùng để lưu command đã load.
     * @param filePath - Đường dẫn tuyệt đối tới file command.
     * @returns Promise hoàn tất sau khi file được xử lý.
     *
     * @example
     * ```ts
     * await this.loadFile("C:/bot/commands/info/help.ts");
     * ```
     */
    private async loadFile(filePath: string, cacheBust = false): Promise<void> {
        if (!filePath) return;
        try {
            const fileURL = pathToFileURL(filePath);
            if (cacheBust) fileURL.searchParams.set("update", Date.now().toString());
            const imported = await import(fileURL.href);
            const command = this.createCommand(imported);
            this.validateCommand(command);
            this.addCommand(command, this.getCategoryFromPath(filePath), filePath);
        } catch (error) {
            this.onError?.({
                file: filePath,
                error: error instanceof Error ? error : new Error(String(error)),
            });
        }
    }
    /**
     * Gắn listener `messageCreate` vào client để tự động xử lý prefix command.
     *
     * Hàm này chỉ gắn listener một lần cho mỗi client nhờ `WeakSet`.
     * Khi có tin nhắn mới, listener sẽ:
     * - Bỏ qua tin nhắn từ bot.
     * - Kiểm tra prefix hoặc mention prefix.
     * - Resolve command theo tên hoặc alias.
     * - Kiểm tra cooldown.
     * - Kiểm tra permission.
     * - Gọi `command.execute`.
     *
     * @example
     * ```ts
     * this.attachMessageListener();
     * ```
     */
    private attachMessageListener(): void {
        if (this.attachedClients.has(this.client)) return;
        this.attachedClients.add(this.client);
        this.client.discord.on("messageCreate", async (message) => {
            try {
                await this.handleMessage(message);
            } catch (error) {
                // Không để lỗi bất kỳ (prefix function, reply thất bại, ...) thành unhandledRejection.
                console.error("[CommandManager] messageCreate:", error);
            }
        });
    }
    /**
     * Xử lý một tin nhắn: tách prefix, tìm lệnh, kiểm tra quyền → cooldown → thực thi.
     * @hidden
     */
    private async handleMessage(message: OmitPartialGroupDMChannel<Message>): Promise<void> {
        if (message.author.bot || message.system || message.webhookId) return;
        const prefixes = await this.getPrefixes(message.guildId ?? "");
        const resolved = this.resolvePrefix(message.content, prefixes);
        if (!resolved) return;
        const content = message.content.slice(resolved.prefix.length).trim();
        if (!content) {
            // Chỉ trả lời "prefix của tôi là..." khi người dùng MENTION bot, không phải khi gõ mỗi prefix.
            if (resolved.viaMention) await message.reply(this.mentionPrefixResponse(prefixes));
            return;
        }
        const [rawCommandName, ...args] = content.split(/\s+/);
        const command = this.resolve(rawCommandName);
        if (!command) return;
        try {
            // lệnh bị tắt trong guild này → báo và dừng.
            if (await this.replyIfDisabled(message, command, resolved.prefix)) return;
            // permission TRƯỚC cooldown: người không có quyền không được phép "đốt" cooldown của người khác.
            const permission = await this.checkPermission(message, command);
            if (permission && !permission.success) {
                // User bị chặn: bỏ qua im lặng (tránh bot bị lợi dụng để spam).
                if (permission.reason !== "USER_BLOCKED") await message.reply(permission.message);
                return;
            }
            // Parse argument TRƯỚC cooldown: nhập sai cú pháp không bị tính là đã dùng lệnh.
            let options: Record<string, unknown> = {};
            if (command.options) {
                try {
                    options = await parseArguments(this.client, message, content.slice(rawCommandName.length), command.options);
                } catch (error) {
                    if (error instanceof ArgumentParseError) {
                        await this.replyArgumentError(message, command, error, resolved.prefix);
                        return;
                    }
                    throw error;
                }
            }
            const cooldownMessage = await this.checkCooldown(message, command);
            if (cooldownMessage) {
                await message.reply(cooldownMessage);
                return;
            }
            await command.execute(this.client as Client<true>, message, args, options as never);
        } catch (error) {
            console.error(`[Command Error] ${rawCommandName}`, error);
        }
    }
    /**
     * Xác định prefix được sử dụng trong nội dung tin nhắn.
     *
     * Hàm này kiểm tra prefix theo thứ tự:
     * - Prefix cấu hình trong `prefix`.
     * - Mention bot nếu `mentionPrefix` được bật.
     *
     * Nếu nội dung không bắt đầu bằng prefix hợp lệ, hàm trả về `null`.
     *
     * @internal
     *
     * @param content - Nội dung tin nhắn cần kiểm tra.
     * @param guildID - ID guild dùng để lấy prefix động.
     * @returns Prefix khớp với nội dung tin nhắn, hoặc `null` nếu không có prefix hợp lệ.
     *
     * @example
     * ```ts
     * const usedPrefix = await this.resolvePrefix("!help", "123456789");
     *
     * if (usedPrefix) {
     *   console.log(`Người dùng đã gọi command bằng prefix ${usedPrefix}`);
     * }
     * ```
     */
    private resolvePrefix(content: string, prefixes: string[]): { prefix: string; viaMention: boolean } | null {
        // Ưu tiên prefix dài nhất để "!!" không bị nhận nhầm thành "!".
        const prefix = [...prefixes].filter(Boolean).sort((a, b) => b.length - a.length).find((item) => content.startsWith(item));
        if (prefix) return { prefix, viaMention: false };
        const botID = this.client.discord.user?.id;
        if (!this.mentionPrefix || !botID) return null;
        const mention = content.match(new RegExp(`^<@!?${botID}>\\s*`))?.[0];
        return mention ? { prefix: mention, viaMention: true } : null;
    }
    /**
     * Đăng ký command vào category tương ứng.
     *
     * Nếu category chưa tồn tại, hàm sẽ tạo `Collection` mới.
     * Nếu category đã tồn tại, command sẽ được thêm vào collection hiện có.
     *
     * @internal
     * 
     * @param category - Tên category của command.
     * @param command - Command cần thêm vào category.
     *
     * @example
     * ```ts
     * this.registerCategory("admin", command);
     * ```
     */
    private registerCategory(category: string, command: CommandBuilder<any, any>): void {
        const commands = this.getCategory(category) ?? new Collection<string, CommandBuilder<any, any>>();
        commands.set(command.commandName, command);
        this.client.categories.set(category, commands);
    }
    /**
     * Tạo command từ module đã import.
     *
     * Hàm này hỗ trợ hai kiểu export:
     * - Export object command trực tiếp.
     * - Export class command, khi đó hàm sẽ tự khởi tạo bằng `new`.
     *
     * Nếu module có `default export`, giá trị default sẽ được ưu tiên.
     *
     * @internal
     *
     * @param imported - Module command sau khi import động.
     * @returns CommandBuilder đã sẵn sàng để validate và đăng ký.
     *
     * @example
     * ```ts
     * const imported = await import(pathToFileURL(filePath).href);
     * const command = this.createCommand(imported);
     * ```
     */
    public createCommand(imported: any): CommandBuilder<any, any> {
        const value = imported.default ?? imported;
        return this.client.isClass(value) ? new value() : value;
    }
    /**
     * Kiểm tra command có đủ dữ liệu bắt buộc hay không.
     *
     * Một command hợp lệ cần có:
     * - `commandName`
     * - `execute` là function
     *
     * @internal
     *
     * @param command - Command cần kiểm tra.
     * @throws Error nếu command thiếu `commandName`.
     * @throws Error nếu command thiếu `execute` hoặc `execute` không phải function.
     *
     * @example
     * ```ts
     * this.validateCommand(command);
     * ```
     */
    public validateCommand(command: CommandBuilder<any, any>): void {
        if (!command?.commandName) throw new Error("Thiếu commandName");
        if (typeof command.execute !== "function") throw new Error("Thiếu execute function");
        validateArgumentDefinitions(command.options, command.commandName);
    }
    /**
     * Lấy tên category từ đường dẫn file command.
     *
     * Category được xác định bằng thư mục cấp đầu tiên bên trong `this.directory`.
     * Nếu không xác định được category, hàm trả về `"default"`.
     *
     * @internal
     *
     * @param filePath - Đường dẫn tuyệt đối tới file command.
     * @returns Tên category của command.
     *
     * @example
     * ```ts
     * // this.directory = "./commands"
     * const category = this.getCategoryFromPath("C:/bot/commands/admin/ban.ts");
     * console.log(category); // "admin"
     * ```
     */
    public getCategoryFromPath(filePath: string): string {
        if (!this.directory) return "unknown";
        const parts = path.relative(path.resolve(this.directory), filePath).split(path.sep);
        // File nằm ngay thư mục gốc (không có thư mục con) → "default" thay vì tên file.
        return parts.length > 1 ? parts[0] : "default";
    }
    /**
     * Kiểm tra một file có phải file command hợp lệ hay không.
     *
     * File hợp lệ là file kết thúc bằng `.js` hoặc `.ts`,
     * nhưng không được là file khai báo type `.d.ts`.
     *
     * @internal
     *
     * @param fileName - Tên file cần kiểm tra.
     * @returns `true` nếu file có thể được load như command, ngược lại là `false`.
     *
     * @example
     * ```ts
     * this.isCommandFile("help.ts"); // true
     * this.isCommandFile("types.d.ts"); // false
     * this.isCommandFile("README.md"); // false
     * ```
     */
    public isCommandFile(fileName: string): boolean {
        return /\.(js|ts|mjs|mts)$/.test(fileName) && !/\.d\.m?ts$/.test(fileName);
    }
    /**
     * Chuẩn hóa tên command hoặc alias.
     * b
     * Hàm này loại bỏ khoảng trắng ở đầu/cuối chuỗi và chuyển toàn bộ ký tự
     * về chữ thường. Việc normalize giúp command và alias được resolve ổn định,
     * không phụ thuộc vào cách người dùng viết hoa hoặc thêm khoảng trắng.
     *
     * @internal
     *
     * @param value - Chuỗi cần chuẩn hóa.
     * @returns Chuỗi đã được trim và chuyển về chữ thường.
     *
     * @example
     * ```ts
     * this.normalize(" Help "); // "help"
     * this.normalize("BAN"); // "ban"
     * ```
     */
    private normalize(value: string): string {
        return value.trim().toLowerCase();
    }
    /**
     * Phản hồi khi lệnh đang bị tắt trong guild hiện tại.
     * @returns `true` nếu lệnh bị tắt (đã chặn thực thi).
     */
    private async replyIfDisabled(message: OmitPartialGroupDMChannel<Message>, command: CommandBuilder<any, any>, prefix: string): Promise<boolean> {
        if (!message.guildId || !this.toggle.isDisabled(command.commandName, message.guildId)) return false;
        const response = this.disabledResponse ? this.disabledResponse({
            commandName: command.commandName,
            guildID: message.guildId,
            prefix: prefix
        }) : `⛔ Lệnh **${command.commandName}** đã bị tắt trong server này.`;
        if (response !== null) await message.reply(response);
        return true;
    }
    /**
     * Gửi thông báo lỗi argument kèm cách dùng.
     */
    private async replyArgumentError(message: OmitPartialGroupDMChannel<Message>, command: CommandBuilder<any, any>, error: ArgumentParseError, prefix: string): Promise<void> {
        const usage = command.usage ?? buildUsage(prefix, command.commandName, command.options);
        const response = this.argumentErrorResponse ? this.argumentErrorResponse(error, { prefix, usage, command }) : `❌ ${error.message}\nCách dùng: \`${usage}\``;
        if (response !== null) await message.reply(response);
    }
    /**
     * Kiểm tra cooldown của command đối với người dùng hiện tại.
     */
    private async checkCooldown<InGuild extends boolean = boolean>(message: OmitPartialGroupDMChannel<Message<InGuild>>, command: CommandBuilder<any, any>) {
        if (!command.cooldown) return;
        return cooldownManager.check(command, {
            type: "message",
            commandName: command.commandName,
            client: this.client,
            userId: message.author.id,
            guildId: message.guildId,
            member: message.member,
        });
    }
    /**
     * Kiểm tra quyền của người dùng trước khi thực thi command.
     */
    private async checkPermission<InGuild extends boolean = boolean>(message: OmitPartialGroupDMChannel<Message<InGuild>>, command: CommandBuilder<any, any>,) {
        if (!command.permission) return;
        const manager = new PermissionManager(command.permission);
        return manager.check(this.client, {
            client: this.client,
            commandName: command.commandName,
            userID: message.author.id,
            guildID: message.guild?.id,
            guild: message.guild,
            channel: message.channel,
            member: message.member ?? undefined,
            user: message.author,
            bot: message.client.user!,
        });
    }
}